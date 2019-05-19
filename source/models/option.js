// approom
// option model
// v1.0.0 on 5/15/19 by mouser@donationcoder.com
//
// Handles system options that we want to store in db

"use strict";

// modules
const ModelBaseMongoose = require("./modelBaseMongoose");



class OptionModel extends ModelBaseMongoose {

	// global static version info
	static getVersion() { return 1; }

	// collection name for this model
	static getCollectionName() {
		return "options";
	}

	// User model mongoose db schema
	static buildSchema(mongooser) {
		this.schema = new mongooser.Schema({
			...(this.getUniversalSchemaObj()),
			key: {type: String},
			val: {type: String},

		}, {collection: this.getCollectionName()});
		return this.schema;
	};

}


// export the class as the sole export
module.exports = OptionModel;
