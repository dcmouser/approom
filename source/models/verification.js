/**
 * @module models/verification
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 5/15/19
 * @description
 * Handles things that are pending verification (user email change, registration, etc.)
 *
 * ##### Notes
 * ATTN: 11/6/19
 * For additional security we store only the LONG HASHED value of the short verification uniquecode, while sending user a short plaintext version of the code
 * that protects us from database stealing (see https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)
 * so that if someone gets access to the database, they can't "easily" reverse the uniquecodes to do the pending password resets and registrations
 * HOWEVER there are some caveats:
 *  1. the uniquecodes are SHORT (by default like 5 characters long), so they could be easily bruteforce reverses
 *  2. we are using sha512 but not deliberately slowing it down
 *  3. we are not using a unique salt, but rather a fixed site secret salt.  This is unfortunate but is needed so we can quickly search for a verification code by its code as input by the user
 * ATTN:TODO 11/6/19 - One way we could fix these weaknesses would be if the plaintext code we gave people were actually in two parts like (AAAAA-BBBBB) where the AAAAA part was stored in plaintext in the db and the BBBBB part was hashed in the database
 *   with proper bsrypt/random salt.  Then we would LOOK UP the verification using AAAAA but verify the hashed part of BBBBB.  It would double the length of the code we need to give to user, but it would make rainbow table brute force much harder..
 * ATTN: TODO 11/10/19 - Do we want to do more loops of hashing to make brute force more time consuming?
 */

"use strict";


//---------------------------------------------------------------------------
// modules
const mongoose = require("mongoose");


// requirement service locator
const jrequire = require("../helpers/jrequire");

// models
const ModelBaseMongoose = jrequire("models/model_base_mongoose");
const UserModel = jrequire("models/user");
const LoginModel = jrequire("models/login");

// controllers
const arserver = jrequire("arserver");

// our helper modules
const jrhMisc = require("../helpers/jrh_misc");
const jrdebug = require("../helpers/jrdebug");
const jrhCrypto = require("../helpers/jrh_crypto");
const JrResult = require("../helpers/jrresult");
//---------------------------------------------------------------------------



//---------------------------------------------------------------------------
// constants

const DefCodeLength = 5;
const DefMaxUniqueCodeCollissions = 10;
//
const DefExpirationDurationMinutesLong = 24 * 60;
const DefExpirationDurationMinutesNormal = 30;
const DefExpirationDurationMinutesShort = 5;
//---------------------------------------------------------------------------





/**
 * Handles things that are pending verification (user email change, registration, etc.)
 *
 * @class VerificationModel
 * @extends {ModelBaseMongoose}
 */
class VerificationModel extends ModelBaseMongoose {


	//---------------------------------------------------------------------------
	// global static version info
	static getVersion() { return 1; }

	// collection name for this model
	static getCollectionName() {
		return "verifications";
	}

	static getNiceName() {
		return "Verification";
	}

	// name for acl lookup
	static getAclName() {
		return "verification";
	}

	// name for logging
	static getLoggingString() {
		return "Verification";
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	static getSchemaDefinition() {
		return {
			...(this.getBaseSchemaDefinition()),
			uniqueCodeHashed: {
				type: String,
				unique: true,
				required: true,
			},
			type: {
				type: String,
			},
			key: {
				type: String,
			},
			val: {
				type: String,
			},
			userId: {
				type: mongoose.Schema.ObjectId,
			},
			loginId: {
				type: mongoose.Schema.ObjectId,
			},
			usedDate: {
				type: Date,
			},
			expirationDate: {
				type: Date,
			},
		};
	}

	static getSchemaDefinitionExtra() {
		return {
			...(this.getBaseSchemaDefinitionExtra()),
			uniqueCodeHashed: {
				label: "Unique code (hashed)",
			},
			type: {
				label: "Type",
			},
			key: {
				label: "Key",
			},
			val: {
				label: "Val",
			},
			userId: {
				label: "User Id",
				crudLink: UserModel.getCrudUrlBase(),
			},
			loginId: {
				label: "Login Id",
				crudLink: LoginModel.getCrudUrlBase(),
			},
			usedDate: {
				label: "Date used",
			},
			expirationDate: {
				label: "Date expired",
			},
		};
	}
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	// accessors

	getTypestr() {
		return this.type;
	}

	getUserId() {
		return this.userId;
	}

	getUniqueCode() {
		// ATTN: NOTE THAT this value is NOT stored in the database
		return this.uniqueCode;
	}

	setUniqueCode(val) {
		this.uniqueCode = val;
	}

	getUniqueCodeHashed() {
		return this.uniqueCodeHashed;
	}


	getVerifiedValue(key) {
		if (this.key === key) {
			return this.val;
		}
		return undefined;
	}

	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	// lookup by id
	static async findOneById(id) {
		// return null if not found
		if (!id) {
			return null;
		}
		//
		var doc = await this.mongooseModel.findOne({ _id: id }).exec();
		return doc;
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	static async createModel(type, key, val, userId, loginId, extraData, expirationMinutes) {
		// base create

		var verification = super.createModel();

		// store values
		verification.type = type;
		verification.key = key;
		verification.val = val;
		verification.userId = userId;
		verification.loginId = loginId;
		verification.extraData = extraData;
		verification.expirationDate = jrhMisc.DateNowPlusMinutes(expirationMinutes);
		verification.usedDate = null;
		// NOTE: verification.uniqueCode set below

		// and save it
		// note: we may have to try this multiple times if there is a collission with our uniqueCode
		var verificationdoc;
		var tryCount = 0;
		while (true) {
			try {
				++tryCount;
				// generate a hopefully unique code (in plaintext; this will not be stored in db)
				verification.uniqueCode = await this.generateUniqueCode();
				// hash it
				verification.uniqueCodeHashed = await this.calcHashOfVerificationCode(verification.uniqueCode);
				// try to save it
				verificationdoc = await verification.dbSave();
				// success
				break;
			} catch (err) {
				// if we are here we caught an error above
				// collission, generate a new code
				if (tryCount === DefMaxUniqueCodeCollissions - 1) {
					// we have failed a lot, maybe we can try a cleanup of our old verifications from database
					await this.pruneOldVerifications(true);
				} else if (tryCount === DefMaxUniqueCodeCollissions) {
					// we failed
					throw (err);
				}
			}
		}

		// return saved verification doc (or null if error)
		return verificationdoc;
	}
	//---------------------------------------------------------------------------








































	//---------------------------------------------------------------------------
	// create a new account email verification, and email it
	static async createVerificationNewAccountEmail(emailAddress, userId, loginId, extraData) {
		// first let's cancel all other verifications of same type from this user
		var vtype = "newAccountEmail";
		await this.cancelVerifications({ type: vtype, email: emailAddress });

		// make the verification item and email the user about it with verification code
		var verification = await this.createModel(vtype, "email", emailAddress, userId, loginId, extraData, DefExpirationDurationMinutesNormal);
		//
		var mailobj = {
			revealEmail: true,
			subject: "E-mail verification for new website account",
			text: `
We have received a request to create a new account on our website.
If this request was made by you, please click on the link below to verify that you are the owner of this email address (${emailAddress}):
${verification.createVerificationCodeUrl()}
`,
		};
		return await verification.sendViaEmail(mailobj, emailAddress);
	}



	// create a one-time login token for the user, and email it
	static async createVerificationOneTimeLoginTokenEmail(emailAddress, userId, flagRevealEmail, extraData) {
		// first let's cancel all other verifications of same type from this user
		var vtype = "onetimeLogin";
		await this.cancelVerifications({ type: vtype, userId });

		// make the verification item and email and/or call the user with the one time login/verification code
		var verification = await this.createModel(vtype, null, null, userId, null, extraData, DefExpirationDurationMinutesShort);
		//
		var mailobj = {
			revealEmail: flagRevealEmail,
			subject: "Link for one-time login via E-Mail",
			text: `
We have received a request for a one-time login via E-mail code.
If this request was made by you, please click on the link below to log into the website:
${verification.createVerificationCodeUrl()}

If this request was not made by you, please ignore this email.
`,
		};
		return await verification.sendViaEmail(mailobj, emailAddress);
	}



	// user wants to change their email address
	static async createAndSendVerificationEmailChange(emailAddressOld, emailAddressNew, userId) {
		// first let's cancel all other verifications of same type from this user
		var vtype = "changeEmail";
		await this.cancelVerifications({ type: vtype, userId });

		// make the verification item and email and/or call the user with the one time login/verification code
		var verification = await this.createModel(vtype, "email", emailAddressNew, userId, null, {}, DefExpirationDurationMinutesLong);
		//
		var mailobj = {
			revealEmail: true,
			subject: "Request for change of account E-mail address, confirmation needed",
			text: `
We have received a request to change the E-mail address associated with your account.
From ${emailAddressOld} to ${emailAddressNew}.

If this request was made by you, please click on the link below to confirm the E-mail address chage.
${verification.createVerificationCodeUrl()}

If this request was not made by you, please ignore this email.
`,
		};
		return await verification.sendViaEmail(mailobj, emailAddressNew);
	}
	//---------------------------------------------------------------------------











































	//---------------------------------------------------------------------------
	static async generateUniqueCode() {
		return jrhCrypto.genRandomStringHumanEasier(DefCodeLength);
	}



	createVerificationCodeUrl(baseUrl) {
		// create a link to verify this entry
		// require here to avoid circular reference problem
		if (!baseUrl) {
			baseUrl = "verify";
		}
		return arserver.calcAbsoluteSiteUrlPreferHttps(baseUrl + "/code/" + this.uniqueCode);
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	static async calcHashOfVerificationCode(verificationCode) {
		// hash the verification code -- this is what we will store in our database
		// this function needs to retun the SAME HASH no matter when we call it, so that we can search for result; that's why we used a fixed salt
		return await jrhCrypto.hashPlaintextStringInsecureButSearchable(verificationCode, arserver.getConfigVal("crypto:VERIFICATIONCODESALT"));
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	static async findOneByCode(verificationCode) {
		// find it and return it
		// hash code (predictable hash)
		var verificationCodeHashed = await this.calcHashOfVerificationCode(verificationCode);
		// find it
		var verification = await this.findOneByCodeHashed(verificationCodeHashed);
		// NOW we save in it the plaintext code, in case caller wants to refer to it (it will NOT be saved in db)
		if (verification) {
			verification.uniqueCode = verificationCode;
		}
		return verification;
	}


	static async findOneByCodeHashed(verificationCodeHashed) {
		// find it and return it
		var verification = this.mongooseModel.findOne({ uniqueCodeHashed: verificationCodeHashed }).exec();
		return verification;
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	async sendViaEmail(mailobj, emailAddress) {
		// send this verification object to user by email
		//
		// add fields
		mailobj.to = emailAddress;
		//
		// require here to avoid circular reference problem
		var retv = await arserver.sendMail(mailobj);
		//
		return retv;
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	static async pruneOldVerifications(flagDesperate) {
		// ATTN: 5/25/19 - unfinished
		jrdebug.debug("In pruneOldVerifications.");
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	// verify different kinds of codes
	// always return a JrResult object which can indicate success or failure
	// this is called by verify route
	static async verifiyCode(code, extraValues, req, res) {

		var verification = await this.findOneByCode(code);
		if (!verification) {
			// not found
			return {
				jrResult: JrResult.makeError("Verification code (" + code + ") not found."),
				successRedirectTo: null,
			};
		}

		// make sure it's still valid (not used or expired, etc.)
		var validityResult = verification.isStillValid(req);
		if (validityResult.isError()) {
			return {
				jrResult: validityResult,
				successRedirectTo: null,
			};
		}

		// get the user
		var userId = verification.getUserId();
		var user;
		if (userId) {
			user = await UserModel.findOneById(userId, true);
			if (!user) {
				return {
					jrResult: JrResult.makeError("The user associated with this verification code could not be found."),
					successRedirectTo: null,
				};
			}
		}

		// ok its not used, and not expired
		// let's use it up and return success if we can
		return await verification.useNow(user, extraValues, req, res);
	}
	//---------------------------------------------------------------------------








	//---------------------------------------------------------------------------
	isUsed() {
		if (this.usedDate != null) {
			return true;
		}
		return false;
	}


	isExpired() {
		// expiration date some minutes from creation date
		if (this.creationDate > this.expirationDate) {
			return true;
		}
		return false;
	}


	isStillValid(req) {
		// make sure it's not used

		if (this.isUsed()) {
			// already used
			// however, for certain verifications we allow reuse
			if (!this.canUserReuse(req)) {
				return JrResult.makeError("Verification code (" + this.getUniqueCode() + ") has already been used, and cannot be used again.");
			}
		}
		if (this.isExpired()) {
			// expired
			return JrResult.makeError("Verification code (" + this.getUniqueCode() + ") has expired.");
		}
		// all good
		return JrResult.makeSuccess();
	}


	saveSessionUseIfReusable(req) {
		if (this.allowsUsedReuse) {
			this.saveSessionUse(req);
		}
	}


	canUserReuse(req) {
		// we could require them to have the verification code in their session
		const flagRequireSessionOwnership = true;
		//
		if (this.allowsUsedReuse() && (!flagRequireSessionOwnership || this.isVerifiedInSession(req))) {
			return true;
		}
		return false;
	}

	allowsUsedReuse() {
		// certain verification types are valid for REUSE because they prove something that can be used multiple times
		// for example this is true for new registration email proofs
		if (this.type === "newAccountEmail") {
			return true;
		}
		return false;
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	// session helper stuff
	// see server.js for where this info is read

	saveSessionUse(req) {
		// add verification info to session so it can be reused
		const idstr = this.getIdAsString();
		req.session.lastVerificationId = idstr;
		req.session.lastVerificationCodePlaintext = this.getUniqueCode();
		req.session.lastVerificationDate = new Date();
	}

	isVerifiedInSession(req) {
		// see if this verification is stored in the users session
		const idstr = this.getIdAsString();
		if (req.session.lastVerificationId === idstr) {
			return true;
		}
		return false;
	}
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	isValidNewAccountEmailReady(req) {
		var verificationType = this.getTypestr();
		if (verificationType !== "newAccountEmail") {
			return false;
		}
		// now we need to check if its valid and expired
		var verificationResult = this.isStillValid(req);
		if (verificationResult.isError()) {
			return false;
		}
		// it's good
		return true;
	}
	//---------------------------------------------------------------------------











	//---------------------------------------------------------------------------
	async useNow(user, extraValues, req, res) {
		// consume the verification and process it
		// ATTN: there is a small chance a verification code could be used twice, if called twice in the middle of checking unused and marking it used
		// if we are worried about this we can use the enabled field and do a findAndUpdate set it to 0 so that it can only succeed once,
		// ATTN: there is also the dilemma, do we use up token and then try to perform action, or vice versa; in case of error it matters
		// ATTN: unfinished
		// @return JrResult
		var successRedirectTo;

		// switch for the different kinds of verifications

		if (this.type === "newAccountEmail") {
			return await this.useNowNewAccountEmail(user, extraValues, req, res);
		}
		if (this.type === "onetimeLogin") {
			return await this.useNowOneTimeLogin(user, req, res);
		}
		if (this.type === "changeEmail") {
			return await this.useNowEmailChange(user, req, res);
		}

		// unknown
		var jrResult = JrResult.makeError("Unknown verification token type (" + this.type + ")");
		return { jrResult, successRedirectTo };
	}


	async useUpAndSave(req, flagForgetFromSession) {
		// mark use as used
		this.usedDate = new Date();
		this.disabled = 0;
		// save it to mark it as used
		await this.dbSave();
		if (flagForgetFromSession) {
			arserver.forgetLastSessionVerification(req);
		} else {
			// remember it in session; this is useful for multi-step verification, such as creating an account after verifying email addres
			this.saveSessionUse(req);
		}
		return JrResult.makeSuccess();
	}
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	async useNowOneTimeLogin(user, req, res) {
		// one-time login the user associated with this email address
		// this could be used as an alternative to logging in with password
		var jrResult;
		var successRedirectTo;

		// do the work of logging them in using this verification (addes to passport session, uses up verification model, etc.)
		jrResult = await arserver.asyncLoginUserToSessionThroughPassport(req, user);
		if (!jrResult.isError()) {
			var retvResult = await this.useUpAndSave(req, true);
			jrResult.mergeIn(retvResult);
			if (!retvResult.isError()) {
				jrResult.pushSuccess("You have successfully logged in using your one-time login code.");
			}
		}

		return { jrResult, successRedirectTo };
	}
	//---------------------------------------------------------------------------





	//---------------------------------------------------------------------------
	async useNowNewAccountEmail(user, extraValues, req, res) {
		// create the new user account
		//
		// ATTN: at this point we should check if there is already a user with username or if username is blank, and if so present user with form before they process
		// and don't use up the verification item until they do.
		// ATTN: if email already exists, then complain and reject

		// ATTN: they have validated their email account and now we can create a new User account for them
		// EXCEPT that they may not have specified a username or password, or the email even be in use by someone else
		// so really we are not ready to create their new account, but rather check some stuff, gather more info, and let them create account
		// the fact that they have verified their email means we are now at least ready to let them create an account
		// but also note that in some use cases perhaps we dont need to gather extra info from them, if we don't care about usernames and passwords...

		var successRedirectTo;
		var jrResult = JrResult.makeNew();
		var retvResult;

		// controllers
		const registrationAid = jrequire("registrationaid");

		// properties
		var email = this.val;
		var username = jrhMisc.firstCoercedTrueValue(this.getExtraData("username"), extraValues.username);
		var realName = jrhMisc.firstCoercedTrueValue(this.getExtraData("realName"), extraValues.realName);
		var passwordHashed = this.getExtraData("passwordHashed");

		// first step, let's check if the email has alread been used by someone, if so then we can just redirect them to try to sign up again and cancel this verification
		var existingUserWithEmail = await UserModel.findOneByUsernameEmail(email);
		if (existingUserWithEmail) {
			// error, a user with this email already exist; but they just confirmed that THEY own the email which means that
			// first they signed up when the email wasn't in use, and then later confirmed it through another different verification, and then tried to access via this verification
			// we could prevent this case by ensuring we cancel all verifications related to an email once a user confirms/claims that email, but better safe than sorry here
			// or it means they somehow intercepted someone's verification code that they shouldn't have; regardless it's not important, we block it
			jrResult.pushError("This email already has already been claimed/verified by an existing user account (" + existingUserWithEmail.getUsername() + ").");
			// use it up since we are done with it at this point
			await this.useUpAndSave(req, true);
			// return error
			return { jrResult, successRedirectTo };
		}

		// ok their verified email is unique, now we'd PROBABLY like to present them with a registration form where they can give us a username and password of their choosing
		// we can default to any values we found in their signup (or bridged login) request
		// note that we are going to have to check the verified email AGAIN when they submit this next form, so really we could skip all testing of it here
		// and just check it when they submit the second form..

		// BUT ANOTHER OPTION, if they provided sufficient info at their initial registration (username, password) in addition to email address
		// would be to complete their registration right now (asusming username is unique, etc.)

		// do they NEED full register form?
		var readyToCreateUser = true;
		var requiredFields = registrationAid.calcRequiredRegistrationFieldsFinal();
		if (requiredFields.includes("username") && !username) {
			readyToCreateUser = false;
		}
		if (requiredFields.includes("password") && !passwordHashed) {
			readyToCreateUser = false;
		}
		if (requiredFields.includes("realName") && !realName) {
			readyToCreateUser = false;
		}
		// validate fields -- we ignore errors here, we just dont go through with creation of user if we hit one
		if (readyToCreateUser) {
			// temporary non-fatal test to determine if we have enough info to create user right now
			// valid username?
			retvResult = JrResult.makeNew();
			var flagRequired = requiredFields.includes("username");
			var flagCheckDisallowedUsername = true;
			await UserModel.validateUsername(retvResult, username, true, flagRequired, flagCheckDisallowedUsername, null);
			if (retvResult.isError()) {
				// not a fatal error, just means we can't create user yet
				readyToCreateUser = false;
			}
		}

		if (readyToCreateUser) {
			// we think we have enough info, we can go ahead and directly create the user
			var userData = {
				username,
				email,
				passwordHashed,
				realName,
			};
			// temporary non-fatal test to determine if we have enough info to create user right now
			retvResult = JrResult.makeNew();
			await registrationAid.createFullNewUserAccountForLoggedInUser(retvResult, req, this, userData);
			if (!retvResult.isError()) {
				// success creating user, so let them know, log them in and redirect to profile
				successRedirectTo = "/profile";
				jrResult.mergeIn(retvResult);
				jrResult.pushSuccess("Your email address has been verified.", true);
				// they may have been auto-logged-in
				if (arserver.getLoggedInLocalUserIdFromSession(req)) {
					// they have been logged in after verifying, so send them to their profile.
					successRedirectTo = "/profile";
				} else {
					successRedirectTo = "/login";
				}
			} else {
				// something went wrong tryign to create user; not fatal, just drop down
				// not a fatal error, just means we can't create user yet
				readyToCreateUser = false;
			}
		}

		if (!readyToCreateUser) {
			// OTHERWISE ANOTHER OPTION would be to treat them as logged-in-via-verification
			// the advantage of this approach is that it matches the analogy of letting a person do a kind of pre-login via bridged login
			// in this case the person is not really logged in as a USER, but they are in our session with a unique paired provider+providerid pair as identification
			// with session data available for us to help facilitate a full account creation form filling
			// in other words, this simply helps us remember that the session user has verified their email address so we can use up the verification token, even though we
			//  haven't yet created their new account, and are deferring that until we gather more info
			jrResult = await this.useUpAndSave(req, false);
			// should we use up the verification?
			if (!jrResult.isError()) {
				successRedirectTo = "/register";
				// we don't push this success message into session, BECAUSE we are redirecting them to a page that will say it
				jrResult = jrResult.pushSuccess("Your email address has been verified.");
				// await this.useUpAndSave(req, false);
			}
		}

		return { jrResult, successRedirectTo };
	}
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	async useNowEmailChange(user, req, res) {
		// one-time login the user associated with this email address
		// this could be used as an alternative to logging in with password
		var jrResult = JrResult.makeNew();
		var successRedirectTo;

		// change the email address
		var emailAddressNew = this.val;
		// NOTE: we cannot assume the new email address is still validated so we have to validate it AGAIN
		emailAddressNew = await UserModel.validateEmail(jrResult, emailAddressNew, true, false, user);
		if (!jrResult.isError()) {
			// save change
			user.email = emailAddressNew;
			await user.dbSave(jrResult);
			// now use up the verification
			var retvResult = await this.useUpAndSave(req, true);
			if (!retvResult.isError()) {
				jrResult.pushSuccess("Your new E-mail address (" + emailAddressNew + ") has now been confirmed.");
			}
			// merge in result
			jrResult.mergeIn(retvResult);
		}

		return { jrResult, successRedirectTo };
	}
	//---------------------------------------------------------------------------






	//---------------------------------------------------------------------------
	static async cancelVerifications(findObj) {
		// delete any extant verifications that match findObj; this is called when sending new ones that should override old
		await VerificationModel.mongooseModel.deleteMany(findObj).exec();
	}
	//---------------------------------------------------------------------------





}




// export the class as the sole export
module.exports = VerificationModel;
