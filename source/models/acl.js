// approom
// acl model
// v1.0.0 on 5/1/19 by mouser@donationcoder.com
//
// The Acl model acts as our interfact for access-control-list permission system for users
// It helps track who can do what.

"use strict";

// modules
const ModelBaseMongoose = require("./modelBaseMongoose");

// acl module - https://www.npmjs.com/package/acl
const acl = require("acl");



class AclModel extends ModelBaseMongoose {

	// global static version info
	static getVersion() { return 1; }

	// collection name for this model
	static getCollectionName() {
		return "acl";
	}


	// User model mongoose db schema
	static buildSchema(mongooser) {
		this.schema = new mongooser.Schema({
			...(this.getUniversalSchemaObj()),
			permission: {type: String }
		}, {collection: this.getCollectionName()});
		return this.schema;
	};

}

// export the class as the sole export
module.exports = AclModel;

