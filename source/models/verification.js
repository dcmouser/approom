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
 * ATTN: TODO: 11/6/19 - One way we could fix these weaknesses would be if the plaintext code we gave people were actually in two parts like (AAAAA-BBBBB) where the AAAAA part was stored in plaintext in the db and the BBBBB part was hashed in the database
 *   with proper bsrypt/random salt.  Then we would LOOK UP the verification using AAAAA but verify the hashed part of BBBBB.  It would double the length of the code we need to give to user, but it would make rainbow table brute force much harder..
 * ATTN: TODO: 11/10/19 - Do we want to do more loops of hashing to make brute force more time consuming?
 */

"use strict";


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
const JrContext = require("../helpers/jrcontext");
const JrResult = require("../helpers/jrresult");
const jrhMisc = require("../helpers/jrh_misc");
const jrdebug = require("../helpers/jrdebug");
const jrhCrypto = require("../helpers/jrh_crypto");
const jrhText = require("../helpers/jrh_text");

// constants
const appdef = jrequire("appdef");









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
	getModelClass() {
		// subclass overriding function that returns class instance (each subclass MUST implement this)
		return VerificationModel;
	}
	//---------------------------------------------------------------------------


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
	static calcSchemaDefinition() {
		return {
			...(this.getBaseSchemaDefinition()),
			//
			uniqueCodeHashed: {
				label: "Unique code (hashed)",
				mongoose: {
					type: String,
					unique: true,
					required: true,
				},
			},
			type: {
				label: "Type",
				mongoose: {
					type: String,
				},
			},
			key: {
				label: "Key",
				mongoose: {
					type: String,
				},
			},
			val: {
				label: "Val",
				mongoose: {
					type: String,
				},
			},
			userId: {
				label: "User Id",
				refModelClass: UserModel,
				valueFunction: this.makeModelValueFunctionObjectId(UserModel),
				mongoose: {
					type: mongoose.Schema.ObjectId,
				},
			},
			loginId: {
				label: "Login Id",
				refModelClass: LoginModel,
				mongoose: {
					type: mongoose.Schema.ObjectId,
				},
			},
			ipCreated: {
				label: "IP created",
				readOnly: true,
				mongoose: {
					type: String,
				},
			},
			ipUsed: {
				label: "IP used",
				readOnly: true,
				mongoose: {
					type: String,
				},
			},
			usedDate: {
				label: "Date used",
				mongoose: {
					type: Date,
				},
				readOnly: true,
			},
			expirationDate: {
				label: "Date expired",
				mongoose: {
					type: Date,
				},
				readOnly: true,
			},
		};
	}
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	// accessors

	getTypestr() {
		return this.type;
	}

	getUserIdAsM() {
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


	getValEnsureKey(key) {
		// return value of .val but ensure key is what we expected
		if (this.key === key) {
			return this.val;
		}
		return undefined;
	}
	//---------------------------------------------------------------------------





	//---------------------------------------------------------------------------
	static async createVerificationModel(jrContext, type, key, val, userId, loginId, extraData, expirationMinutes) {
		// base create

		const verification = super.createModel();

		// store values
		verification.type = type;
		verification.key = key;
		verification.val = val;
		verification.userId = userId;
		verification.loginId = loginId;
		verification.extraData = extraData;
		verification.expirationDate = jrhMisc.DateNowPlusMinutes(expirationMinutes);
		verification.usedDate = null;
		verification.ipCreated = jrContext.getReqIpClean();
		// NOTE: verification.uniqueCode set below

		// and save it
		// note: we may have to try this multiple times if there is a collission with our uniqueCode
		let verificationdoc;
		let tryCount = 0;
		while (true) {
			try {
				++tryCount;
				// generate a hopefully unique code (in plaintext; this will not be stored in db)
				verification.uniqueCode = await this.generateUniqueCode();
				// hash it
				verification.uniqueCodeHashed = await this.calcHashOfVerificationCode(verification.uniqueCode);
				// try to save it
				// Exception will be thrown on save attempt error
				verificationdoc = await verification.dbSaveThrowException(jrContext);
				// success
				break;
			} catch (err) {
				// if we are here we caught an error above
				// collission, generate a new code
				if (tryCount === DefMaxUniqueCodeCollissions - 1) {
					// we have failed a lot, maybe we can try a cleanup of our old verifications from database
					await this.pruneOldVerifications(jrContext, true);
				} else if (tryCount === DefMaxUniqueCodeCollissions) {
					// we failed, rethrow
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
	static async createVerificationNewAccountEmail(jrContext, emailAddress, userId, loginId, extraData) {
		// first let's cancel all other verifications of same type from this user
		const vtype = "newAccountEmail";
		await this.cancelVerifications({ type: vtype, email: emailAddress });

		// make the verification item and email the user about it with verification code; exception will be thrown on error to save verification
		const verification = await this.createVerificationModel(jrContext, vtype, "email", emailAddress, userId, loginId, extraData, DefExpirationDurationMinutesNormal);

		const mailobj = {
			revealEmail: true,
			subject: "E-mail verification for new website account",
			text: `
	We have received a request to create a new account on our website.
	If this request was made by you, please click on the link below to verify that you are the owner of this email address (${emailAddress}):
	${verification.createVerificationCodeUrl()}
	`,
		};
		await verification.sendViaEmail(jrContext, mailobj, emailAddress);
	}



	// create a one-time login token for the user, and email it
	static async createVerificationOneTimeLoginTokenEmail(jrContext, emailAddress, userId, flagRevealEmail, extraData) {
		// first let's cancel all other verifications of same type from this user
		const vtype = "onetimeLogin";
		await this.cancelVerifications({ type: vtype, userId });

		// make the verification item and email and/or call the user with the one time login/verification code; exception will be thrown on error to save verification
		const verification = await this.createVerificationModel(jrContext, vtype, null, null, userId, null, extraData, DefExpirationDurationMinutesShort);
		//
		const mailobj = {
			revealEmail: flagRevealEmail,
			subject: "Link for one-time login via E-Mail",
			text: `
	We have received a request for a one-time login via E-mail code.
	If this request was made by you, please click on the link below to log into the website:
	${verification.createVerificationCodeUrl()}

	If this request was not made by you, please ignore this email.
	`,
		};
		await verification.sendViaEmail(jrContext, mailobj, emailAddress);
	}



	// user wants to change their email address
	static async createAndSendVerificationEmailChange(jrContext, emailAddressOld, emailAddressNew, userId) {
		// first let's cancel all other verifications of same type from this user
		const vtype = "changeEmail";
		await this.cancelVerifications({ type: vtype, userId });

		// make the verification item and email and/or call the user with the one time login/verification code; exception will be thrown on error to save verification
		const verification = await this.createVerificationModel(jrContext, vtype, "email", emailAddressNew, userId, null, {}, DefExpirationDurationMinutesLong);
		//
		const mailobj = {
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
		await verification.sendViaEmail(jrContext, mailobj, emailAddressNew);
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
		return await jrhCrypto.hashPlaintextStringInsecureButSearchable(verificationCode, arserver.getConfigVal(appdef.DefConfigKeyCrypto));
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	static async mFindVerificationByCode(verificationCode) {
		// find it and return it
		// hash code (predictable hash)
		const verificationCodeHashed = await this.calcHashOfVerificationCode(verificationCode);
		// find it
		const verification = await this.mFindVerificationByCodeHashed(verificationCodeHashed);
		// NOW we save in it the plaintext code, in case caller wants to refer to it (it will NOT be saved in db)
		if (verification) {
			verification.uniqueCode = verificationCode;
		}
		return verification;
	}


	static async mFindVerificationByCodeHashed(verificationCodeHashed) {
		// find it and return it
		const verification = this.mFindOne({ uniqueCodeHashed: verificationCodeHashed });
		return verification;
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	async sendViaEmail(jrContext, mailobj, emailAddress) {
		// send this verification object to user by email
		//
		// add fields
		mailobj.to = emailAddress;
		//
		// require here to avoid circular reference problem
		await arserver.sendMail(jrContext, mailobj);
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	static async pruneOldVerifications(jrContext, flagDesperate) {
		// ATTN: UNFINISHED: -5/25/19 this is not implemented yet
		await arserver.logr(jrContext, appdef.DefLogTypeAdminMaintenance, "pruning old verifications");
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	// verify different kinds of codes
	// always return a JrResult object which can indicate success or failure
	// this is called by verify route
	static async verifiyCode(jrContext, code, extraValues) {

		const verification = await this.mFindVerificationByCode(code);
		if (!verification) {
			// not found
			jrContext.pushError("Verification code (" + code + ") not found.");
			return null;
		}

		// make sure it's still valid (not used or expired, etc.)
		verification.isStillValid(jrContext);
		if (jrContext.isError()) {
			return null;
		}

		// get the user
		const userId = verification.getUserIdAsM();
		let user;
		if (userId) {
			user = await UserModel.mFindUserByIdAndUpdateLastLoginDate(userId);
			if (!user) {
				jrContext.pushError("The user associated with this verification code could not be found.");
				return null;
			}
		}

		// ok its not used, and not expired
		// let's use it up and return success if we can
		return await verification.useNow(jrContext, user, extraValues);
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


	isStillValid(jrContext) {
		// make sure it's not used

		if (this.isUsed()) {
			// already used
			// however, for certain verifications we allow reuse
			if (!this.canUserReuse(jrContext)) {
				jrContext.pushError("Verification code (" + this.getUniqueCode() + ") has already been used, and cannot be used again.");
				return false;
			}
		}
		if (this.isExpired()) {
			// expired
			jrContext.pushError("Verification code (" + this.getUniqueCode() + ") has expired.");
			return false;
		}
		// all good
		// jrContext.pushSuccess("Verification code is valid.");
		return true;
	}


	saveSessionUseIfReusable(jrContext) {
		if (this.allowsUsedReuse) {
			this.saveSessionUse(jrContext);
		}
	}


	canUserReuse(jrContext) {
		// we could require them to have the verification code in their session
		const flagRequireSessionOwnership = true;
		//
		if (this.allowsUsedReuse() && (!flagRequireSessionOwnership || this.isVerifiedInSession(jrContext))) {
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

	saveSessionUse(jrContext) {
		// add verification info to session so it can be reused
		const idstr = this.getIdAsString();
		jrContext.req.session.arLastVerificationId = idstr;
		jrContext.req.session.arLastVerificationCodePlaintext = this.getUniqueCode();
		jrContext.req.session.arLastVerificationDate = new Date();
	}

	isVerifiedInSession(jrContext) {
		// see if this verification is stored in the users session
		const idstr = this.getIdAsString();
		if (jrContext.req.session.arLastVerificationId === idstr) {
			return true;
		}
		return false;
	}
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	isValidNewAccountEmailReady(jrContext) {
		const verificationType = this.getTypestr();
		if (verificationType !== "newAccountEmail") {
			return false;
		}
		// now we need to check if its valid and expired
		const verificationResult = this.isStillValid(jrContext);
		if (verificationResult.isError()) {
			return false;
		}
		// it's good
		return true;
	}
	//---------------------------------------------------------------------------











	//---------------------------------------------------------------------------
	async useNow(jrContext, user, extraValues) {
		// consume the verification and process it
		// ATTN: there is a small chance a verification code could be used twice, if called twice in the middle of checking unused and marking it used
		// if we are worried about this we can use the enabled field and do a findAndUpdate set it to 0 so that it can only succeed once,
		// ATTN: there is also the dilemma, do we use up token and then try to perform action, or vice versa; in case of error it matters
		// @return JrResult
		let successRedirectTo;

		// switch for the different kinds of verifications

		if (this.type === "newAccountEmail") {
			return await this.useNowNewAccountEmail(jrContext, user, extraValues);
		}
		if (this.type === "onetimeLogin") {
			return await this.useNowOneTimeLogin(jrContext, user);
		}
		if (this.type === "changeEmail") {
			return await this.useNowEmailChange(jrContext, user);
		}

		// unknown
		jrContext.pushError("Unknown verification token type (" + this.type + ")");
		return successRedirectTo;
	}


	async useUpAndSave(jrContext, flagForgetFromSession) {
		// mark use as used
		this.usedDate = new Date();
		this.disabled = 0;
		this.ipUsed = jrContext.getReqIpClean();
		// save it to mark it as used
		await this.dbSaveAddError(jrContext);
		// ATTN: TODO: Check result from jrContext and not clear session if error?
		if (!jrContext.isError()) {
			if (flagForgetFromSession) {
				arserver.clearLastSessionVerificationAll(jrContext);
			} else {
				// remember it in session; this is useful for multi-step verification, such as creating an account after verifying email addres
				this.saveSessionUse(jrContext);
			}
		}
	}
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	async useNowOneTimeLogin(jrContext, user) {
		// one-time login the user associated with this email address
		// this could be used as an alternative to logging in with password
		let successRedirectTo;

		// do the work of logging them in using this verification (addes to passport session, uses up verification model, etc.)
		await arserver.asyncManuallyLoginUserToSessionThroughPassport(jrContext, user, "oneTimeEmail");
		if (!jrContext.isError()) {
			await this.useUpAndSave(jrContext, true);
			if (!jrContext.isError()) {
				jrContext.pushSuccess("You have successfully logged in using your one-time login code.");
			}
		}

		return successRedirectTo;
	}
	//---------------------------------------------------------------------------





	//---------------------------------------------------------------------------
	async useNowNewAccountEmail(jrContext, user, extraValues) {
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

		let successRedirectTo;
		let retvResult;

		// controllers
		const registrationAid = jrequire("registrationaid");

		// properties
		const email = this.val;
		const username = jrhMisc.firstCoercedTrueValue(this.getExtraDataField("username"), extraValues.username);
		const realName = jrhMisc.firstCoercedTrueValue(this.getExtraDataField("realName"), extraValues.realName);
		const passwordHashed = this.getExtraDataField("passwordHashed");

		// first step, let's check if the email has alread been used by someone, if so then we can just redirect them to try to sign up again and cancel this verification
		const existingUserWithEmail = await UserModel.mFindUserByUsernameEmail(email);
		if (existingUserWithEmail) {
			// error, a user with this email already exist; but they just confirmed that THEY own the email which means that
			// first they signed up when the email wasn't in use, and then later confirmed it through another different verification, and then tried to access via this verification
			// we could prevent this case by ensuring we cancel all verifications related to an email once a user confirms/claims that email, but better safe than sorry here
			// or it means they somehow intercepted someone's verification code that they shouldn't have; regardless it's not important, we block it
			jrContext.pushError("This email already has already been claimed/verified by an existing user account (" + existingUserWithEmail.getUsername() + ").");
			// use it up since we are done with it at this point
			await this.useUpAndSave(jrContext, true);
			// return error
			return successRedirectTo;
		}

		// ok their verified email is unique, now we'd PROBABLY like to present them with a registration form where they can give us a username and password of their choosing
		// we can default to any values we found in their signup (or bridged login) request
		// note that we are going to have to check the verified email AGAIN when they submit this next form, so really we could skip all testing of it here
		// and just check it when they submit the second form..

		// BUT ANOTHER OPTION, if they provided sufficient info at their initial registration (username, password) in addition to email address
		// would be to complete their registration right now (asusming username is unique, etc.)

		// do they NEED full register form?
		let readyToCreateUser = true;
		const requiredFields = registrationAid.calcRequiredRegistrationFieldsFinal();
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
			const flagRequired = requiredFields.includes("username");
			const flagCheckDisallowedUsername = true;
			await UserModel.validateUsername(retvResult, username, true, flagRequired, flagCheckDisallowedUsername, null);
			if (retvResult.isError()) {
				// not a fatal error, just means we can't create user yet
				readyToCreateUser = false;
			}
		}

		if (readyToCreateUser) {
			// we think we have enough info, we can go ahead and directly create the user
			const userData = {
				username,
				email,
				passwordHashed,
				realName,
			};
			// temporary non-fatal test to determine if we have enough info to create user right now
			await registrationAid.createFullNewUserAccountForLoggedInUser(jrContext, this, userData);
			if (!jrContext.isError()) {
				// success creating user, so let them know, log them in and redirect to profile
				successRedirectTo = "/profile";
				jrContext.pushSuccess("Your email address has been verified.", true);
				// they may have been auto-logged-in
				if (arserver.isSessionLoggedIn(jrContext)) {
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
			await this.useUpAndSave(jrContext, false);
			// should we use up the verification?
			if (!jrContext.isError()) {
				successRedirectTo = "/register";
				// we don't push this success message into session, BECAUSE we are redirecting them to a page that will say it
				jrContext.pushSuccess("Your email address has been verified.");
			}
		}

		return successRedirectTo;
	}
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	async useNowEmailChange(jrContext, user) {
		// one-time login the user associated with this email address
		// this could be used as an alternative to logging in with password
		const successRedirectTo = null;

		// change the email address
		let emailAddressNew = this.val;
		// NOTE: we cannot assume the new email address is still validated so we have to validate it AGAIN
		emailAddressNew = await UserModel.validateEmail(jrContext, emailAddressNew, true, false, user);
		if (!jrContext.isError()) {
			// save change
			user.email = emailAddressNew;
			await user.dbSaveAddError(jrContext);
			if (!jrContext.isError()) {
				// now use up the verification
				await this.useUpAndSave(jrContext, true);
				if (!jrContext.isError()) {
					jrContext.pushSuccess("Your new E-mail address (" + emailAddressNew + ") has now been confirmed.");
				}
			}
		}

		return successRedirectTo;
	}
	//---------------------------------------------------------------------------






	//---------------------------------------------------------------------------
	static async cancelVerifications(findObj) {
		// delete any extant verifications that match findObj; this is called when sending new ones that should override old
		await VerificationModel.mFindAndDeleteMany(findObj);
	}
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	static async findAllVerificationsChangeEmail(jrContext, flagOnlyValidPending, userId) {
		const cond = {
			type: "changeEmail",
			userId,
		};
		if (flagOnlyValidPending) {
			this.addConditionsForVerificationSearchValidPending(cond);
		}
		// now do the search
		const verifications = await this.mFindAll(cond);
		return verifications;
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	static addConditionsForVerificationSearchValidPending(cond) {
		// add conditions to only find unused items
		cond.usedDate = null;
		cond.expirationDate = {
			$gte: new Date(),
		};
	}
	//---------------------------------------------------------------------------











}




// export the class as the sole export
module.exports = VerificationModel;
