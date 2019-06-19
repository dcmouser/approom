// approom
// verification model
// v1.0.0 on 5/15/19 by mouser@donationcoder.com
//
// Handles things that are pending verification (user email change, registration, etc.)

"use strict";

// modules
const ModelBaseMongoose = require("./modelBaseMongoose");
const UserModel = require("./user");
const RegistrationAid = require("../controllers/registrationaid");

// our helper modules
const jrhelpers = require("../helpers/jrhelpers");
const jrlog = require("../helpers/jrlog");
const jrcrypto = require("../helpers/jrcrypto");
const JrResult = require("../helpers/jrresult");



//---------------------------------------------------------------------------
const DefCodeLength = 5;
const DefMaxUniqueCodeCollissions = 10;
//
const DefExpirationDurationMinutesLong = 24 * 60;
const DefExpirationDurationMinutesNormal = 30;
const DefExpirationDurationMinutesShort = 5;
//---------------------------------------------------------------------------




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

	// User model mongoose db schema
	static buildSchema(mongooser) {
		this.schema = new mongooser.Schema(this.calcSchemaDefinition(), {
			collection: this.getCollectionName(),
		});
		return this.schema;
	}

	static calcSchemaDefinition() {
		return {
			...(this.getUniversalSchemaObj()),
			uniqueCode: { type: String, unique: true, required: true },
			type: { type: String },
			key: { type: String },
			val: { type: String },
			userId: { type: String },
			loginId: { type: String },
			usedDate: { type: Date },
			expirationDate: { type: Date },
			extraData: { type: String },
		};
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	// accessors

	getTypestr() {
		return this.type;
	}


	getUniqueCode() {
		return this.uniqueCode;
	}

	getExtraData() {
		if (!this.extraData) {
			return {};
		}
		return JSON.parse(this.extraData);
	}

	getVerifiedValue(key) {
		if (this.key === key) {
			return this.val;
		}
		return undefined;
	}

	getExtraValue(key) {
		var extraData = this.getExtraData();
		if (key in extraData) {
			return extraData[key];
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
		verification.extraData = JSON.stringify(extraData);
		verification.expirationDate = jrhelpers.DateNowPlusMinutes(expirationMinutes);
		verification.usedDate = null;
		// NOTE: verification.uniqueCode set below

		// and save it
		// note: we may have to try this multiple times if there is a collission with our uniqueCode
		var verificationdoc;
		var tryCount = 0;
		while (true) {
			try {
				++tryCount;
				// generate a hopefully unique code
				verification.uniqueCode = await this.generateUniqueCode();
				// try to save it
				verificationdoc = await verification.save();
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


	// create an email verification
	static async createVerificationNewAccountEmail(emailAddress, userId, loginId, extraData) {
		// make the verification item and email the user about it with verification code
		var verification = await this.createModel("newAccountEmail", "email", emailAddress, userId, loginId, extraData, DefExpirationDurationMinutesNormal);
		//
		var mailobj = {
			subject: "E-mail verification for new website account",
			text: "We have received a request to create a new account on our website.\n\n"
			+ "If this request was made by you, please click on the link below to verify that you are the owner of this email address(" + emailAddress + "):\n"
			+ " " + verification.createVerificationCodeUrl(),
			revealEmail: true,
		};
		return await verification.sendViaEmail(mailobj, emailAddress);
	}




	// generate a one-time login token for the user
	static async createVerificationOneTimeLoginTokenEmail(emailAddress, userId, loginId, flagRevealEmail, extraData) {
		// ATTN: unfinished
		// make the verification item and email and/or call the user with the one time login/verification code
		var verification = await this.createModel("onetimeLogin", null, null, userId, loginId, extraData, DefExpirationDurationMinutesShort);
		//
		var mailobj = {
			revealEmail: flagRevealEmail,
			subject: "Link for one-time login via E-Mail",
			text: "We have received a request for a one-time login via E-mail code.\n"
			+ "If this request was made by you, please click on the link below to log into the website.\n"
			+ " " + verification.createVerificationCodeUrl(),
		};
		return await verification.sendViaEmail(mailobj, emailAddress);
	}



	static async generateUniqueCode() {
		return jrcrypto.genRandomStringHumanEasier(DefCodeLength);
	}



	createVerificationCodeUrl(baseUrl) {
		// create a link to verify this entry
		// require here to avoid circular reference problem
		if (!baseUrl) {
			baseUrl = "verify";
		}
		const arserver = require("./server");
		return arserver.calcAbsoluteSiteUrlPreferHttps(baseUrl + "/code/" + this.uniqueCode);
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	static async findOneByCode(verificationCode) {
		// find it and return it
		var verification = this.mongooseModel.findOne({ uniqueCode: verificationCode }).exec();
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
		const arserver = require("./server");
		var retv = await arserver.sendMail(mailobj);
		//
		return retv;
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	static async pruneOldVerifications(flagDesperate) {
		// ATTN: 5/25/19 - unfinished
		jrlog.debug("In pruneOldVerifications.");
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
				jrResult: JrResult.makeError("VerificationError", "Code not found."),
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

		// ok its not used, and not expired
		// let's use it up and return success if we can
		return await verification.useNow(extraValues, req, res);
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
				return JrResult.makeError("VerifcationError", "Verification code (" + this.getUniqueCode() + ") has already been used up.");
			}
		}
		if (this.isExpired()) {
			// expired
			return JrResult.makeError("VerifcationError", "Verification code (" + this.getUniqueCode() + ") has expired.");
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
	saveSessionUse(req) {
		// add verification id to session so it can be reused
		const idstr = this.getIdAsString();
		req.session.lastVerificationId = idstr;
		req.session.lastVerificationDate = new Date();
	}

	forgetSessionUse(req) {
		// forget last verification id
		delete req.session.lastVerificationId;
		delete req.session.lastVerificationDate;
	}

	isVerifiedInSession(req) {
		// see if this verification is stored in the users session
		const idstr = this.getIdAsString();
		if (req.session.lastVerificationId === idstr) {
			return true;
		}
		return false;
	}

	//

	static getLastSessionedVerificationId(req) {
		return req.session.lastVerificationId;
	}

	static async getLastSessionedVerification(req) {
		const verificationId = this.getLastSessionedVerificationId(req);
		if (!verificationId) {
			return undefined;
		}
		var verification = await this.findOneById(verificationId);
		return verification;
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
	async useNow(extraValues, req, res) {
		// consume the verification and process it
		// ATTN: there is a small chance a verification code could be used twice, if called twice in the middle of checking unused and marking it used
		// if we are worried about this we can use the enabled field and do a findAndUpdate set it to 0 so that it can only succeed once,
		// ATTN: there is also the dilemma, do we use up token and then try to perform action, or vice versa; in case of error it matters
		// ATTN: unfinished
		// @return JrResult
		var successRedirect;

		// switch for the different kinds of verifications

		if (this.type === "newAccountEmail") {
			return await this.useNowNewAccountEmail(extraValues, req, res);
		}
		if (this.type === "onetimeLogin") {
			return await this.useNowOneTimeLogin(req, res);
		}

		// unknown
		var jrResult = JrResult.makeError("VerificationError", "Unknown verification token type (" + this.type + ")");
		return { jrResult, successRedirect };
	}


	async useUpAndSave(req, flagForgetFromSession) {
		// mark use as used
		this.usedDate = new Date();
		this.enabled = 0;
		// save it to mark it as used
		await this.save();
		if (flagForgetFromSession) {
			this.forgetSessionUse(req);
		} else {
			// remember it in session; this is useful for multi-step verification, such as creating an account after verifying email addres
			this.saveSessionUse(req);
		}
		return JrResult.makeSuccess();
	}
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	async useNowOneTimeLogin(req, res) {
		// one-time login the user associated with this email address
		// this could be used as an alternative to logging in with password
		var jrResult;
		var successRedirect;

		// get the user
		var userId = this.userId;
		var user = await UserModel.findOneById(userId, true);
		if (!user) {
			jrResult = JrResult.makeError("VerificationError", "Unknown user in useNowOneTimeLogin.");
		} else {
			// do the work of logging them in using this verification (addes to passport session, uses up verification model, etc.)
			jrResult = this.useUpAndSave(req, true);
			//
			if (!jrResult.isError()) {
				jrResult.pushSuccess("You have successfully logged in using your one-time login code.");
			}
		}

		return { jrResult, successRedirect };
	}
	//---------------------------------------------------------------------------





	//---------------------------------------------------------------------------
	async useNowNewAccountEmail(extraValues, req, res) {
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
		var jrResult;
		var retvResult;

		// models
		const arserver = require("./server");

		// data from extraData
		var extraData = JSON.parse(this.extraData);

		// properties
		var email = this.val;
		var username = jrhelpers.firstNonEmptyValue(extraData.username, extraValues.username);
		var realname = jrhelpers.firstNonEmptyValue(extraData.realname, extraValues.realname);
		var passwordHashed = extraData.passwordHashed;

		// first step, let's check if the email has alread been used by someone, if so then we can just redirect them to try to sign up again and cancel this verification
		var user = await UserModel.findOneByUsernameEmail(email);
		if (user) {
			// error, a user with this email already exist; but they just confirmed that THEY own the email which means that
			// first they signed up when the email wasn't in use, and then later confirmed it, and then tried to access via this verification
			// we could prevent this case by ensuring we cancel all verifications related to an email once a user confirms/claims that email, but better safe than sorry here
			// or it means they somehow intercepted someone's verification code that they shouldn't have; regardless it's not important
			jrResult = JrResult.makeError("VerificationError", "This email already has already been claimed by an existing user account (" + user.getUsername() + ").");
			// use it up since we are done with it at this point
			await this.useUpAndSave(req, true);
			// return error
			return { jrResult, successRedirectTo };
		}

		// ok their verified email is unique, now we'd PROBABLY like to present them with a form where they can give us a username and password of their choosing
		// we can default to any values we found in their signup (or bridged login) request
		// note that we are going to have to check the verified email AGAIN when they submit this next form, so really we could skip all testing of it here
		// and just check it when they submit the second form..

		// ONE OPTION, if they provided sufficient info at their initial registration (username, password) in addition to email address
		// would be to complete their registration right now (asusming username is unique, etc.)

		// do they NEED full register form?
		var readyToCreateUser = true;
		var requiredFields = RegistrationAid.calcRequiredRegistrationFieldsFinal();
		if (requiredFields.includes("username") && !username) {
			readyToCreateUser = false;
		}
		if (requiredFields.includes("password") && !passwordHashed) {
			readyToCreateUser = false;
		}
		if (requiredFields.includes("realname") && !realname) {
			readyToCreateUser = false;
		}
		// validate fields -- we ignore errors here, we just dont go through with creation of user if we hit one
		if (readyToCreateUser) {
			// valid username?
			retvResult = await UserModel.validateUsername(username, true, !requiredFields.includes("username"));
			if (retvResult.isError()) {
				readyToCreateUser = false;
			}
		}

		if (readyToCreateUser) {
			// we can go ahead and directly create the user
			var userData = {
				username,
				email,
				passwordHashed,
				realname,
			};
			retvResult = await RegistrationAid.createFullNewUserAccount(req, this, userData);
			if (!retvResult.isError()) {
				// success creating user, so let them know, log them in and redirect to profile
				successRedirectTo = "/profile";
				jrResult = JrResult.makeSuccess("Your email address has been verified.");
				jrResult.mergeIn(retvResult);
				// they may have been auto-logged-in
				if (arserver.getLoggedInLocalUserIdFromSession(req)) {
					// they have been logged in after verifying, so send them to their profile.
					successRedirectTo = "/profile";
				} else {
					successRedirectTo = "/login";
				}
			} else {
				// failure creating user, just drop down
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
				// jrResult = jrResult.pushSuccess("Your email address has been verified..");
				// await this.useUpAndSave(req, false);
			}
		}

		return { jrResult, successRedirectTo };
	}
	//---------------------------------------------------------------------------












}


// export the class as the sole export
module.exports = VerificationModel;
