/**
 * @module models/session
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 10/25/19
 * @description
 * The session model db table is used by a 3rd party session manager
 * So our defining it here is a little unusual, it just lets us PEEK into the table with our crud functions
 * ##### Notes
 *  * ATTN: We need to be careful that our definition of the table schema does not interfere with the cookie module definition, etc.
 */

"use strict";


// modules
const mongoose = require("mongoose");

// requirement service locator
const jrequire = require("../helpers/jrequire");

// models
const ModelBaseMongooseMinimal = jrequire("models/model_base_mongoose_minimal");




/**
 * Class mirroring the session model db table is used by a 3rd party session manager
 *
 * @class SessionModel
 * @extends {ModelBaseMongooseMinimal}
 */
class SessionModel extends ModelBaseMongooseMinimal {

	//---------------------------------------------------------------------------
	getModelClass() {
		// subclass overriding function that returns class instance (each subclass MUST implement this)
		return SessionModel;
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	// NOTE: we have to replace this function because _id is a string in this 3rd party db table
	// ATTN: is there a danger of OUR db definition overriding the 3rd party one, when we just want to peek into theirs?
	static getBaseSchemaDefinition() {
		// used by log and other minimal models?
		return {
			_id: {
				label: "Id",
				readOnly: ["edit"],
				mongoose: {
					type: String,
					// auto: true,
				},
			},
		};
	}


	static calcSchemaDefinition() {
		return {
			...(this.getBaseSchemaDefinition()),
			//
			expires: {
				label: "Date expires",
				readOnly: ["edit"],
				mongoose: {
					type: Date,
				},
			},
			session: {
				label: "Session data",
				readOnly: ["edit"],
				mongoose: {
					type: String,
				},
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

	// name for logging
	static getLoggingString() {
		return "Session";
	}
	//---------------------------------------------------------------------------


	/*
	//---------------------------------------------------------------------------
	static calcSchemaDefinition() {
		return {
			...(this.getBaseSchemaDefinition()),
			//
			expires: {
				label: "Date expires",
				mongoose: {
					type: Date,
				},
			},
			session: {
				label: "Session data",
				readOnly: ["edit"],
				mongoose: {
					type: String,
				},
			},
		};
	}
	//---------------------------------------------------------------------------
	*/


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
		if (!jrhMongo.isValidMongooseObjectId(val)) {
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
