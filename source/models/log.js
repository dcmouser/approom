// approom
// log model
// v1.0.0 on 5/15/19 by mouser@donationcoder.com
//
// The Log model stores a db table of system logs

"use strict";

// models
const ModelBaseMongoose = require("./modelBaseMongoose");



class LogModel extends ModelBaseMongoose {

	// global static version info
	static getVersion() { return 1; }

	// collection name for this model
	static getCollectionName() {
		return "logs";
	}

	static getNiceName() {
		return "LogEntry";
	}

	// User model mongoose db schema
	static buildSchema(mongooser) {
		this.schema = new mongooser.Schema(this.calcSchemaDefinition(), {
			collection: this.getCollectionName(),
		});
		return this.schema;
	}

	static calcSchemaDefinition() {
		return {
			...(this.getUniversalSchemaObjMinimal()),
			type: { type: String },
			message: { type: String },
			severity: { type: Number },
		};
	}


	// create new obj
	static createModel(inobj) {
		var obj = {
			creationDate: new Date(),
			...inobj,
		};
		var model = new this.mongooseModel(obj);
		return model;
	}


}

// export the class as the sole export
module.exports = LogModel;
