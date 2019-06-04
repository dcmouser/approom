// approom
// connection model
// v1.0.0 on 5/1/19 by mouser@donationcoder.com
//
// A Connection model represents someone who is connected into the system, whethther they are a logged-in "User" or just an anonymous guest

"use strict";

// models
const ModelBaseMongoose = require("./modelBaseMongoose");



class ConnectionModel extends ModelBaseMongoose {

	// global static version info
	static getVersion() { return 1; }

	// collection name for this model
	static getCollectionName() {
		return "connections";
	}


	// User model mongoose db schema
	static buildSchema(mongooser) {
		this.schema = new mongooser.Schema({
			...(this.getUniversalSchemaObj()),
			ip: { type: String },
		}, {
			collection: this.getCollectionName(),
		});
		return this.schema;
	}

}


// export the class as the sole export
module.exports = ConnectionModel;
