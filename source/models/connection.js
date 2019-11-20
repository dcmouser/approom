/**
 * @module models/connection
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 5/1/19
 * @description
 * A Connection model represents someone who is connected into the system, whethther they are a logged-in "User" or just an anonymous guest
 */

"use strict";


// requirement service locator
const jrequire = require("../helpers/jrequire");

// models
const ModelBaseMongoose = jrequire("models/model_base_mongoose");







/**
 * A Connection model represents someone who is connected into the system, whethther they are a logged-in "User" or just an anonymous guest
 *
 * @class ConnectionModel
 * @extends {ModelBaseMongoose}
 */
class ConnectionModel extends ModelBaseMongoose {

	//---------------------------------------------------------------------------
	// global static version info
	static getVersion() { return 1; }

	// collection name for this model
	static getCollectionName() {
		return "connections";
	}

	static getNiceName() {
		return "Connection";
	}

	// name for acl lookup
	static getAclName() {
		return "connection";
	}

	// name for logging
	static getLoggingString() {
		return "Conn";
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	static getSchemaDefinition() {
		return {
			...(this.getBaseSchemaDefinition()),
			ip: {
				type: String,
			},
		};
	}

	static getSchemaDefinitionExtra() {
		return {
			...(this.getBaseSchemaDefinitionExtra()),
			ip: {
				label: "IP",
			},
		};
	}
	//---------------------------------------------------------------------------


}


// export the class as the sole export
module.exports = ConnectionModel;
