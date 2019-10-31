// approom
// log model
// v1.0.0 on 5/15/19 by mouser@donationcoder.com
//
// The Log model stores a db table of system logs

"use strict";

// models
const ModelBaseMongooseMinimal = require("./modelBaseMongooseMinimal");

// helpers
const jrhmisc = require("../helpers/jrhmisc");



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

	// name for acl lookup
	static getAclName() {
		return "log";
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	static getSchemaDefinition() {
		return {
			...(this.getBaseSchemaDefinition()),
			creationDate: {
				type: Date,
			},
			type: {
				type: String,
			},
			message: {
				type: String,
			},
			severity: {
				type: Number,
			},
			extraData: {
				type: Map,
			},
		};
	}

	static getSchemaDefinitionExtra() {
		return {
			...(this.getBaseSchemaDefinitionExtra()),
			creationDate: {
				label: "Date created",
				readOnly: ["edit"],
			},
			type: {
				label: "Type",
			},
			message: {
				label: "Message",
			},
			severity: {
				label: "Severity",
			},
			extraData: {
				label: "Extra data",
				valueFunction: this.makeModelValueFunctionExtraData(),
				filterSize: 0,
				readOnly: ["edit"],
			},
		};
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	// Override to create minimal model
	// create new obj -- used by classes which are super minimal (LogModel)
	static createModel(inobj) {
		var model = super.createModel(inobj);
		model.creationDate = new Date();
		return model;
	}
	//---------------------------------------------------------------------------



}

// export the class as the sole export
module.exports = LogModel;
