// approom
// log model
// v1.0.0 on 5/15/19 by mouser@donationcoder.com
//
// The Log model stores a db table of system logs

"use strict";

// models
const ModelBaseMongooseMinimal = require("./modelBaseMongooseMinimal");



class LogModel extends ModelBaseMongooseMinimal {

	//---------------------------------------------------------------------------
	// global static version info
	static getVersion() { return 1; }

	// collection name for this model
	static getCollectionName() {
		return "logs";
	}

	static getNiceName() {
		return "LogEntry";
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	static getSchemaDefinition() {
		return {
			...(this.getBaseSchemaDefinition()),
			type: {
				type: String,
			},
			message: {
				type: String,
			},
			severity: {
				type: Number,
			},
		};
	}

	static getSchemaDefinitionExtra() {
		return {
			...(this.getBaseSchemaDefinitionExtra()),
			type: {
				label: "Type",
			},
			message: {
				label: "Message",
			},
			severity: {
				label: "Severity",
			},
		};
	}
	//---------------------------------------------------------------------------




}

// export the class as the sole export
module.exports = LogModel;
