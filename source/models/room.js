// approom
// room model
// v1.0.0 on 5/1/19 by mouser@donationcoder.com
//
// All data in our system is organized at the highest level into a collection of "Apps",
// and then for each App we have "Rooms", which allow a number of users to communicate / share data with each other.
// The Room model manages the data for each virtual room.

"use strict";

// modules
const ModelBaseMongoose = require("./modelBaseMongoose");



class RoomModel extends ModelBaseMongoose {

	// global static version info
	static getVersion() { return 1; }

	// collection name for this model
	static getCollectionName() {
		return "rooms";
	}

	// User model mongoose db schema
	static buildSchema(mongooser) {
		this.schema = new mongooser.Schema({
			...(this.getUniversalSchemaObj()),
			label: {type: String},
			description: {type: String},
			shortcode: {type: String, unique: true, required: true},
		}, {collection: this.getCollectionName()});
		return this.schema;
	};

}


// export the class as the sole export
module.exports = RoomModel;
