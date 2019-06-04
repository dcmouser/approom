// approom
// app model
// v1.0.0 on 5/1/19 by mouser@donationcoder.com
//
// All data in our system is organized at the highest level into a collection of "Apps".
// The App model represents a top-level collections.
// It may contain options for the app, permission requirements, etc.

"use strict";

// models
const ModelBaseMongoose = require("./modelBaseMongoose");



class AppModel extends ModelBaseMongoose {

	// global static version info
	static getVersion() { return 1; }

	// collection name for this model
	static getCollectionName() {
		return "apps";
	}

	// User model mongoose db schema
	static buildSchema(mongooser) {
		this.schema = new mongooser.Schema({
			...(this.getUniversalSchemaObj()),
			name: { type: String, unique: true, required: true },
			label: { type: String },
			description: { type: String },
			shortcode: { type: String },
		}, {
			collection: this.getCollectionName(),
		});
		return this.schema;
	}

}


// export the class as the sole export
module.exports = AppModel;
