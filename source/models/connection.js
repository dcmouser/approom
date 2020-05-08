/**
 * @module models/connection
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 5/1/19
 * @description
 * A Connection model represents someone who is connected into the system, whethther they are a logged-in "User" or just an anonymous guest
 *
 * ATTN: THIS CLASS IS NOT USED YET (5/8/20); it is included only as a placeholder to remind us to add this functionality later
 */

"use strict";


// requirement service locator
const jrequire = require("../helpers/jrequire");

// models
const ModelBaseMongooseMinimal = jrequire("models/model_base_mongoose_minimal");







/**
 * A Connection model represents someone who is connected into the system, whethther they are a logged-in "User" or just an anonymous guest
 *
 * @class ConnectionModel
 * @extends {ModelBaseMongoose}
 */
class ConnectionModel extends ModelBaseMongooseMinimal {

	//---------------------------------------------------------------------------
	getModelClass() {
		// subclass overriding function that returns class instance (each subclass MUST implement this)
		return ConnectionModel;
	}
	//---------------------------------------------------------------------------


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
	static calcSchemaDefinition() {
		return {
			...(this.getBaseSchemaDefinition()),
			//
			ip: {
				label: "IP",
				mongoose: {
					type: String,
				},
			},
		};
	}
	//---------------------------------------------------------------------------


}


// export the class as the sole export
module.exports = ConnectionModel;
