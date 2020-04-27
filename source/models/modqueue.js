/**
 * @module models/modqueue
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 12/1/19
 * @description
 * The database object that represents a moderation queue, of things requiring admin approval
 */

"use strict";


// requirement service locator
const jrequire = require("../helpers/jrequire");

// models
const ModelBaseMongoose = jrequire("models/model_base_mongoose");



/**
 * The database object that represents a moderation queue, of things requiring admin approval
 *
 * @class ModQueueModel
 * @extends {ModelBaseMongoose}
 */
class ModQueueModel extends ModelBaseMongoose {

	//---------------------------------------------------------------------------
	getModelClass() {
		// subclass overriding function that returns class instance (each subclass MUST implement this)
		return ModQueueModel;
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	// global static version info
	static getVersion() { return 1; }

	// collection name for this model
	static getCollectionName() {
		return "modqueue";
	}

	static getNiceName() {
		return "ModerationItem";
	}

	// name for acl lookup
	static getAclName() {
		return "modqueue";
	}

	// name for logging
	static getLoggingString() {
		return "ModerationItem";
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	static calcSchemaDefinition() {
		return {
			...(this.getBaseSchemaDefinition()),
			//
			key: {
				label: "Key",
				mongoose: {
					type: String,
				},
			},
			val: {
				label: "Value",
				mongoose: {
					type: String,
				},
			},
		};
	}
	//---------------------------------------------------------------------------


}


// export the class as the sole export
module.exports = ModQueueModel;
