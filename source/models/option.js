// approom
// option model
// v1.0.0 on 5/15/19 by mouser@donationcoder.com
//
// Handles system options that we want to store in db

"use strict";

// models
const ModelBaseMongoose = require("./modelBaseMongoose");



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
