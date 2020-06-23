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
			pid: {
				label: "PID",
				readOnly: true,
				mongoose: {
					type: Number,
				},
			},
			creationDate: {
				label: "Date created",
				readOnly: true,
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
				format: "textarea",
				mongoose: {
					type: String,
				},
			},
			userid: {
				label: "User",
				readOnly: true,
				valueFunction: this.makeModelValueFunctionObjectId(UserModel),
				mongoose: {
					type: mongoose.Schema.ObjectId,
				},
			},
			ip: {
				label: "IP",
				readOnly: true,
				mongoose: {
					type: String,
				},
			},
			url: {
				label: "URL",
				readOnly: true,
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
		const model = super.createModel(inobj);
		model.creationDate = new Date();
		model.pid = process.pid;
		return model;
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	/**
	 * Should we log database actions on instances of this model? NO
	 *
	 * @static
	 * @returns true or false
	 * @memberof ModelBaseMongoose
	 */
	static getShouldLogDbActions() {
		return false;
	}
	//---------------------------------------------------------------------------














	//---------------------------------------------------------------------------
	// create a new log model object (suitable for saving) from standard log data
	// this could throw exception on failure to save to database, etc.
	static async createLogDbModelInstanceFromLogDataAndSave(jrContext, type, message, extraData, mergeData) {
		let logObj;

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

		// ATTN: Note that it will not return on error to save since an exception will be thrown, since no jrContext is passed to store error
		const retv = await logModel.dbSaveThrowException(jrContext);
		return retv;
	}
	//---------------------------------------------------------------------------




}

// export the class as the sole export
module.exports = LogModel;
