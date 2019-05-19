// approom
// verification model
// v1.0.0 on 5/15/19 by mouser@donationcoder.com
//
// Handles things that are pending verification (user email change, registration, etc.)

"use strict";

// modules
const ModelBaseMongoose = require("./modelBaseMongoose");

// our helper modules
const jrhelpers = require("../helpers/jrhelpers");



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
			extraData: {type: String},
		}, {collection: this.getCollectionName()});
		return this.schema;
	}



	//---------------------------------------------------------------------------
	static createModel(userId, loginId, extraData) {
		// base create
		var verification = super.createModel();

		// ATTN: to do - create other properties including unique code
		verification.userId = userId;
		verification.loginId = loginId;
		verification.extraData = JSON.stringify(extraData);

		return verification;
	}



	// create an email verification
	static async createVerificationEmail(emailAddress, userId, loginId, extraData) {
		// ATTN: unfinished
		// make the verification item and email the user about it with verification code
		var verification = this.createModel(userId, loginId, extraData);
		return verification;
	}



	// verify sometone's mobile phone number
	static async createVerificationMobilePhone(phoneNumber, userId, loginId, extraData) {
		// ATTN: unfinished
		// make the verification item and text user with verification code
		var verification = this.createModel(userId, loginId, extraData);
		return verification;
	}



	// verify sometone's voice phone number
	static async createVerificationVoicePhone(phoneNumber, userId, loginId, extraData) {
		// ATTN: unfinished
		// make the verification item and call the user with voice verification code
		var verification = this.createModel(userId, loginId, extraData);
		return verification;
	}



	// generate a one-time login token for the user
	static async createVerificationOneTimeLoginToken(emailAddress, mobilePhoneNumber, voicePhoneNumber, userId, loginId, extraData) {
		// ATTN: unfinished
		// make the verification item and email and/or call the user with the one time login/verification code
		var verification = this.createModel(userId, loginId, extraData);
		return verification;
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	static findOneByCode(verificationCode) {
		// find it and return it
		// ATTN: unfinished
		return null;
	}
	//---------------------------------------------------------------------------


}


// export the class as the sole export
module.exports = VerificationModel;
