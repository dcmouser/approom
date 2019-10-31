// approom
// 3rd party session model -- this minimal wrapper just lets us crud access it
// v1.0.0 on 10/25/19 by mouser@donationcoder.com
//
// The session model db table is used by a 3rd party session manager
// So our defining it here is a little unusual, it just lets us PEEK into the table with our crud functions
// ATTN: We need to be careful that our definition of the table schema does not interfere with the cookie module definition, etc.

"use strict";

// modules
const mongoose = require("mongoose");

// models
const ModelBaseMongooseMinimal = require("./modelBaseMongooseMinimal");



class SessionModel extends ModelBaseMongooseMinimal {

	//---------------------------------------------------------------------------
	// NOTE: we have to replace this function because _id is a string in this 3rd party db table
	// ATTN: is there a danger of OUR db definition overriding the 3rd party one, when we just want to peek into theirs?
	static getBaseSchemaDefinition() {
		// used by log and other minimal models?
		return {
			_id: {
				type: String,
				/* auto: true, */
			},

		};
	}
	//---------------------------------------------------------------------------

	//---------------------------------------------------------------------------
	// global static version info
	static getVersion() { return 1; }

	// collection name for this model
	static getCollectionName() {
		return "sessions";
	}

	static getNiceName() {
		return "Session";
	}

	// name for acl lookup
	static getAclName() {
		return "session";
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	static getSchemaDefinition() {
		return {
			...(this.getBaseSchemaDefinition()),
			expires: {
				type: Date,
			},
			session: {
				type: String,
				readOnly: ["edit"],
			},
		};
	}

	static getSchemaDefinitionExtra() {
		return {
			...(this.getBaseSchemaDefinitionExtra()),
			expires: {
				label: "Date expires",
			},
			session: {
				label: "Session data",
			},
		};
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	// Override to create minimal model
	// create new obj -- used by classes which are super minimal (LogModel)
	static createModel(inobj) {
		var model = super.createModel(inobj);
		model.expires = null;
		model.session = null;
		return model;
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	// Session model is not created by us, so we have to replace this functions for our crud to work, since we arent using a normal objectid for the session _id

	static validateModelFieldId(jrResult, val) {
		/*
		if (!jrhelpers.isValidMongooseObjectId(val)) {
			jrResult.pushError("No valid id specified.");
			return null;
		}
		*/
		return val;
	}
	//---------------------------------------------------------------------------



}

// export the class as the sole export
module.exports = SessionModel;
