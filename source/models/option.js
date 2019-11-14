/**
 * @module models/option
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 5/15/19
 * @description
 * The database object that represents database-stored options (those not stored in config files)
 */

"use strict";


// models
const ModelBaseMongoose = require("./model_base_mongoose");




/**
 * The database object that represents database-stored options (those not stored in config files)
 *
 * @class OptionModel
 * @extends {ModelBaseMongoose}
 */
class OptionModel extends ModelBaseMongoose {

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
	static getSchemaDefinition() {
		return {
			...(this.getBaseSchemaDefinition()),
			key: {
				type: String,
			},
			val: {
				type: String,
			},
		};
	}

	static getSchemaDefinitionExtra() {
		return {
			...(this.getBaseSchemaDefinitionExtra()),
			key: {
				label: "Key",
			},
			val: {
				label: "Value",
			},
		};
	}
	//---------------------------------------------------------------------------


}


// export the class as the sole export
module.exports = OptionModel;
