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
			}
			// if we are here we got an error
			// collission, generate a new code
			if (tryCount == DEF_MaxUniqueCodeCollissions-1) {
				// we have failed a lot, maybe we can try a cleanup of our old verifications from database
				await this.pruneOldVerifications(true);
			} else if (tryCount == DEF_MaxUniqueCodeCollissions) {
				// we failed
				verificationdoc = null;
				break;
			}
		}

		// return saved verification doc (or null if error)
		return verificationdoc;
	}


	// create an email verification
	static async createVerificationNewAccountEmail(emailAddress, userId, loginId, extraData) {
		// make the verification item and email the user about it with verification code
		var verification = await this.createModel("newAccountEmail", "email", emailAddress, userId, loginId, extraData, DEF_ExpirationDurationMinutesNormal);
		if (verification == null) {
			return null;
		}
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
		if (verification == null) {
			return null;
		}
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
		//jrlog.debugObj(retv,"Result of sendmail");
		return retv;
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	static async pruneOldVerifications(flag_desperate) {
		jrlog.debug("In pruneOldVerifications.");
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	static async verifiyCode(code, extraValues, req) {
		// verify the code, return an object where obj.success is true/false obj.message is message to display
		var retvo = {
			success: false
		};
		var verification = await this.findOneByCode(code);
		if (verification == null) {
			// not found
			retvo.message = "Code not found."
			return retvo;
		} 

		// found verification code, is it already used?
		if (verification.isUsed()) {
			// already used
			retvo.message = "This code has already been used.";
			return retvo;
		}

		// ok it's not been used, is it expired?
		if (verification.isExpired()) {
			retvo.message = "This verification code has expired.";
			return retvo;
		}

		// ok its not used, and not expired

		// let's mark it as used
		return await verification.useNow(extraValues, req);
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



	async useNow(extraValues, req) {
		// consume the verification and process it
		// ATTN: there is a small chance a verification code could be used twice, if called twice in the middle of checking unused and marking it used
		// if we are worried about this we can use the enabled field and do a findAndUpdate set it to 0 so that it can only succeed once, 
		var retvo = {};

		if (this.type == "newAccountEmail") {
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
			retvo.message = "New account with username '"+user.username+"' has been created";
			retvo.success = true;
			await this.useUpAndSave();
		} else if (this.type == "onetimeLogin") {
			// login the user associated with this email address
			var userId = this.userId;
			var user = await UserModel.findOneById(userId, true);
			//jrlog.debugObj(userId,"userId");
			//jrlog.debugObj(user,"user");
			var userPassport = user.getMinimalPassportProfile();
			await req.login(userPassport, async function(err) {
  				if (err) { 
  					jrlog.debug("Error tryign to log in user.");
  				} else {
  					// success
					retvo.message = "You have been logged in";
					retvo.success = true;
				}
			});

			if (retvo.success) {
				await this.useUpAndSave();
			}

		} else {
			retvo.message = "Unknown verification token type (" + this.type + ")";
			retvo.success = false;
		}

		return retvo;
	}


	async useUpAndSave() {	
		// mark use as used
		this.usedDate = new Date;
		this.enabled = 0;
		// save it to mark it as used
		this.save();
	}
	//---------------------------------------------------------------------------

}


// export the class as the sole export
module.exports = VerificationModel;
