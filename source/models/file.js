// approom
// file model
// v1.0.0 on 5/1/19 by mouser@donationcoder.com
//
// The File model helps us track data files that are created by users/apps within the system
//  a File model object represents meta information for an actual filesystem file

"use strict";

// models
const ModelBaseMongoose = require("./modelBaseMongoose");



class FileModel extends ModelBaseMongoose {

	// global static version info
	static getVersion() { return 1; }

	// collection name for this model
	static getCollectionName() {
		return "files";
	}

	// User model mongoose db schema
	static buildSchema(mongooser) {
		this.schema = new mongooser.Schema({
			...(this.getUniversalSchemaObj()),
			path: { type: String, required: true },
			label: { type: String },
			sizebytes: { type: Number },
		}, {
			collection: this.getCollectionName(),
		});
		return this.schema;
	}

}


// export the class as the sole export
module.exports = FileModel;
