// approom
// verification model
// v1.0.0 on 5/15/19 by mouser@donationcoder.com
//
// Handles things that are pending verification (user email change, registration, etc.)

"use strict";

// modules
const ModelBaseMongoose = require("./modelBaseMongoose");
const UserModel = require("./user");

// our helper modules
const jrhelpers = require("../helpers/jrhelpers");
const jrlog = require("../helpers/jrlog");
const jrcrypto = require("../helpers/jrcrypto");
const JrResult = require("../helpers/jrresult");



//---------------------------------------------------------------------------
const DEF_CodeLength = 4;
const DEF_MaxUniqueCodeCollissions = 10;
//
const DEF_ExpirationDurationMinutesLong = 24*60;
const DEF_ExpirationDurationMinutesNormal = 30;
const DEF_ExpirationDurationMinutesShort = 5;
//---------------------------------------------------------------------------




class VerificationModel extends ModelBaseMongoose {

	// global static version info
	static getVersion() { return 1; }

	// collection name for this model
	static getCollectionName() {
		return "verifications";
	}

	// User model mongoose db schema
	static buildSchema(mongooser) {
		this.schema = new mongooser.Schema({
			...(this.getUniversalSchemaObj()),
			uniqueCode: {type: String, unique: true, required: true},
			type: {type: String},
			key: {type: String},
			val: {type: String},
			userId: {type: String},
			loginId: {type: String},
			usedDate: {type: Date},
			expirationDate: {type: Date},
			extraData: {type: String},
		}, {collection: this.getCollectionName()});
		return this.schema;
	}



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
		//NOTE: verification.uniqueCode set below

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
			} catch(err) {
				// if we are here we caught an error above
				// collission, generate a new code
				if (tryCount == DEF_MaxUniqueCodeCollissions-1) {
					// we have failed a lot, maybe we can try a cleanup of our old verifications from database
					await this.pruneOldVerifications(true);
				} else if (tryCount == DEF_MaxUniqueCodeCollissions) {
					// we failed
					throw(lasterr);
				}
			}
		}

		// return saved verification doc (or null if error)
		return verificationdoc;
	}


	// create an email verification
	static async createVerificationNewAccountEmail(emailAddress, userId, loginId, extraData) {
		// make the verification item and email the user about it with verification code
		var verification = await this.createModel("newAccountEmail", "email", emailAddress, userId, loginId, extraData, DEF_ExpirationDurationMinutesNormal);
		// 
		var mailobj = {
			subject: "Email verification code",
			text: "Please click on the link below to verify that you are the owner of this email address("+emailAddress+"):\n"
			+ " " + verification.createVerificationCodeUrl()
		};
		return await verification.sendViaEmail(mailobj, emailAddress);
	}




	// generate a one-time login token for the user
	static async createVerificationOneTimeLoginTokenEmail(emailAddress, mobilePhoneNumber, voicePhoneNumber, userId, loginId, extraData) {
		// ATTN: unfinished
		// make the verification item and email and/or call the user with the one time login/verification code
		var verification = await this.createModel("onetimeLogin", null, null, userId, loginId, extraData, DEF_ExpirationDurationMinutesShort);
		// 
		var mailobj = {
			subject: "Email verification code",
			text: "Please click on the link below to verify that you are the owner of this email address("+emailAddress+"):\n"
			+ " " + verification.createVerificationCodeUrl()
		};
		return await verification.sendViaEmail(mailobj, emailAddress);
	}


/*
	// create an email verification
	static async createVerificationEmail(emailAddress, userId, loginId, extraData) {
		// ATTN: unfinished
		// make the verification item and email the user about it with verification code
		var verification = await this.createModel("email", "email", emailAddress, userId, loginId, extraData);
		return await verification.sendViaEmail();
	}


ATTN: Not implemented yet
	// verify sometone's mobile phone number
	static async createVerificationMobilePhone(phoneNumber, userId, loginId, extraData) {
		// ATTN: unfinished
		// make the verification item and text user with verification code
		var verification = await this.createModel("mobilePhone", "phone", phoneNumber, userId, loginId, extraData);
	}



	// verify sometone's voice phone number
	static async createVerificationVoicePhone(phoneNumber, userId, loginId, extraData) {
		// ATTN: unfinished
		// make the verification item and call the user with voice verification code
		var verification = await this.createModel("voicePhone", "phone", phoneNumber,userId, loginId, extraData);
	}



*/


	static async generateUniqueCode() {
		// ATTN: test
		return jrcrypto.genRandomString(DEF_CodeLength).toUpperCase();
	}



	createVerificationCodeUrl() {
		// create a link to verify this entry
		// require here to avoid circular reference problem
		const arserver = require("./server");
		return arserver.calcAbsoluteSiteUrlPreferHttps("verify/code/"+this.uniqueCode);
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	static async findOneByCode(verificationCode) {
		// find it and return it
		var verification = this.mongooseModel.findOne({uniqueCode: verificationCode}).exec();
		return verification;
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	async sendViaEmail(mailobj, emailAddress) {
		// send this verification object to user by email
		//
		// add fields
		mailobj.to = emailAddress;
		//console.log("showing mailobj");
		//jrlog.debugObj(mailobj);
		//console.log(mailobj);
		//
		// require here to avoid circular reference problem
		const arserver = require("./server");
		var retv = await arserver.sendMail(mailobj);
		//
		return retv;
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	static async pruneOldVerifications(flag_desperate) {
		jrlog.debug("In pruneOldVerifications.");
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	// verify different kinds of codes
	// always return a JrResult object which can indicate success or failure
	static async verifiyCode(code, extraValues, req) {

		var verification = await this.findOneByCode(code);
		if (verification == null) {
			// not found
			return JrResult.makeNew("VerificationError").pushError("Code not found.");
		} 

		// found verification code, is it already used?
		if (verification.isUsed()) {
			// already used
			return JrResult.makeNew("VerificationError").pushError("This code ("+code+") has already been used.");
		}

		// ok it's not been used, is it expired?
		if (verification.isExpired()) {
			return JrResult.makeNew("VerificationError").pushError("This verification code ("+code+") has expired.");
		}

		// ok its not used, and not expired
		// let's use it up and return success if we can
		var jrResult = await verification.useNow(extraValues, req);
		return jrResult;
	}


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
	//---------------------------------------------------------------------------






	

	//---------------------------------------------------------------------------
	async useNow(extraValues, req) {
		// consume the verification and process it
		// ATTN: there is a small chance a verification code could be used twice, if called twice in the middle of checking unused and marking it used
		// if we are worried about this we can use the enabled field and do a findAndUpdate set it to 0 so that it can only succeed once, 
		// ATTN: there is also the dilemma, do we use up token and then try to perform action, or vice versa; in case of error it matters
		// ATTN: unfinished
		// @return JrResult

		// switch for the different kinds of verifications

		if (this.type == "newAccountEmail") {
			return await this.useNowNewAccountEmail(extraValues,req);
		}
		
		else if (this.type == "onetimeLogin") {
			var jrResult = await this.useNowOneTimeLogin(extraValues,req);
			return jrResult;
		}
		
		// unknown
		return JrResult.makeNew("VerificationError").pushError("Unknown verification token type (" + this.type + ")");
	}


	async useNowNewAccountEmail(extraValues, req) {
		// create the new user account
		// ATTN: at this point we should check if there is already a user with username or if username is blank, and if so present user with form before they process
		// and don't use up the verification item until they do.
		// ATTN: if email already exists, then complain and reject
		// data from extraData
		var extraData = JSON.parse(this.extraData);
		var userObj = {
			username: jrhelpers.firstNonEmptyValue(extraData.username, extraValues.username),
			passwordHashedObj: extraData.passwordHashed,
			email: this.val,
			realname: jrhelpers.firstNonEmptyValue(extraData.realname, extraValues.realname)
		};
		var user = await UserModel.createUserFromObj(userObj);
		// success
		await this.useUpAndSave();
		return JrResult.makeSucces("Your new account with username '"+user.username+"' has been created");
	}


	async useNowOneTimeLogin(extraValues, req) {
		// login the user associated with this email address
		var userId = this.userId;
		var user = await UserModel.findOneById(userId, true);
		var userPassport = user.getMinimalPassportProfile();
		//
		var jrResult;
		var success = false;

		// ATTN: call passport login helper; im not sure errors return as expected?
		var unusableLoginResult = await req.login(userPassport, function (err)  {
			if (err) { 
				jrResult = JrResult.makeNew("VerificationError").pushError(JrResult.passportErrorAsString(err));
			} else {
				success = true;
			}
			// note that if we try to handle success actions in here that have to async await, like a model save, we wind up in trouble for some reason -- weird things happen that i don't understand
			// so instead we drop down on success and can check jrResult
		});

		if (success) {
			// success
			await this.useUpAndSave();
			jrResult = JrResult.makeSuccess("You are now logged in.");
		} else if (jrResult == undefined) {
			// unknown exception error that happened in passport login attempt?
			jrResult = JrResult.makeNew("VerificationError").pushError("Unknown passport login error in useNowOneTimeLogin.");
		}

		return jrResult;
	}


	async useUpAndSave() {	
		// mark use as used
		this.usedDate = new Date;
		this.enabled = 0;
		// save it to mark it as used
		await this.save();
	}
	//---------------------------------------------------------------------------




}


// export the class as the sole export
module.exports = VerificationModel;
