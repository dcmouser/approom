/**
 * @module models/log
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 5/1/19
 * @description
 * Class representing the log data model table object
 */

"use strict";


// modules
const mongoose = require("mongoose");


// requirement service locator
const jrequire = require("../helpers/jrequire");

// models
const ModelBaseMongooseMinimal = jrequire("models/model_base_mongoose_minimal");

// helpers
const jrhMisc = require("../helpers/jrh_misc");





/**
 * Class representing the log data model table object
 *
 * @class LogModel
 * @extends {ModelBaseMongooseMinimal}
 */
class LogModel extends ModelBaseMongooseMinimal {

	//---------------------------------------------------------------------------
	getModelClass() {
		// subclass overriding function that returns class instance (each subclass MUST implement this)
		return LogModel;
	}
	//---------------------------------------------------------------------------


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

	// name for logging
	static getLoggingString() {
		return "Log";
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	static calcSchemaDefinition() {
		const UserModel = jrequire("models/user");
		return {
			...(this.getBaseSchemaDefinition()),
			//
			creationDate: {
				label: "Date created",
				readOnly: ["edit"],
				format: "date",
				mongoose: {
					type: Date,
				},
			},
			type: {
				label: "Type",
				mongoose: {
					type: String,
				},
			},
			message: {
				label: "Message",
				mongoose: {
					type: String,
				},
			},
			userid: {
				label: "User",
				readOnly: ["edit"],
				valueFunction: this.makeModelValueFunctionObjectId(UserModel),
				mongoose: {
					type: mongoose.Schema.ObjectId,
				},
			},
			ip: {
				label: "IP",
				readOnly: ["edit"],
				mongoose: {
					type: String,
				},
			},
			extraData: {
				label: "Extra data",
				valueFunction: this.makeModelValueFunctionExtraData(),
				filterSize: 0,
				mongoose: {
					type: mongoose.Mixed,
				},
			},
		};
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	// defaults for crud list
	static getCrudDefaults() {
		return {
			sortField: "creationDate",
			sortDir: "desc",
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






	//---------------------------------------------------------------------------
	// create a new log model object (suitable for saving) from standard log data
	// this could throw exception on failure to save to database, etc.
	static async createLogDbModelInstanceFromLogDataAndSave(type, message, extraData, mergeData) {
		var logObj;

		if (message && !(typeof message === "string")) {
			// unusual case where the message is an object; for db we should json stringify as message
			// in this way the db log message is a pure stringified json object
			logObj = {
				type,
				message: JSON.stringify(message),
				...mergeData,
				extraData,
			};
		} else {
			if (true && mergeData) {
				// ATTN: we want merge data to be part of log properties
				// merge mergeData into extraData since log object doesn't have other fields
				logObj = {
					type,
					message,
					extraData,
					...mergeData,
				};
			} else {
				logObj = {
					type,
					message,
					...mergeData,
					extraData,
				};
			}
		}

		// create the model
		const logModel = LogModel.createModel(logObj);

		// test
		if (false) {
			throw Error("Testing throwing error from logdb save");
		}

		// save it to db
		await logModel.dbSave();
	}




	//---------------------------------------------------------------------------




}

// export the class as the sole export
module.exports = LogModel;
