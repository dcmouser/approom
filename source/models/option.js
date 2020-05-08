/**
 * @module models/option
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 5/15/19
 * @description
 * The database object that represents database-stored options (those not stored in config files)
 * ATTN: THIS CLASS IS NOT USED YET (5/8/20); it is included only as a placeholder to remind us to add this functionality later
 */

"use strict";


// requirement service locator
const jrequire = require("../helpers/jrequire");

// models
const ModelBaseMongoose = jrequire("models/model_base_mongoose");



/**
 * The database object that represents database-stored options (those not stored in config files)
 *
 * @class OptionModel
 * @extends {ModelBaseMongoose}
 */
class OptionModel extends ModelBaseMongoose {

	//---------------------------------------------------------------------------
	getModelClass() {
		// subclass overriding function that returns class instance (each subclass MUST implement this)
		return OptionModel;
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	// global static version info
	static getVersion() { return 1; }

	// collection name for this model
	static getCollectionName() {
		return "options";
	}

	static getNiceName() {
		return "Option";
	}

	// name for acl lookup
	static getAclName() {
		return "option";
	}

	// name for logging
	static getLoggingString() {
		return "Option";
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
module.exports = OptionModel;
