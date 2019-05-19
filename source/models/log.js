// approom
// log model
// v1.0.0 on 5/15/19 by mouser@donationcoder.com
//
// The Log model stores a db table of system logs

"use strict";

// modules
const ModelBaseMongoose = require("./modelBaseMongoose");



class LogModel extends ModelBaseMongoose {

	// global static version info
	static getVersion() { return 1; }

	// collection name for this model
	static getCollectionName() {
		return "logs";
	}


	// User model mongoose db schema
	static buildSchema(mongooser) {
		this.schema = new mongooser.Schema({
			...(this.getUniversalSchemaObj()),
			type: {type: String },
			message: {type: String },
			severity: {type: Number},
		}, {collection: this.getCollectionName()});
		return this.schema;
	};


	// we override this base schema because logs need to be MINIMAL
	static getUniversalSchemaObj() {
		var obj = {
			creationDate: {type: Date},
		};
		return obj;
	}



	// create new obj
	static createModel(inobj) {
		var obj = {
			creationDate: new Date,
			...inobj
		};
		var model = new this.mongooseModel(obj);
		return model;
	}


}

// export the class as the sole export
module.exports = LogModel;

