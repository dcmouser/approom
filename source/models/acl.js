// approom
// acl model
// v1.0.0 on 5/1/19 by mouser@donationcoder.com
//
// The Acl model acts as our interfact for access-control-list permission system for users
// It helps track who can do what.

"use strict";

// modules
// acl module - https://www.npmjs.com/package/acl
const acl = require("acl");

// models
const ModelBaseMongoose = require("./modelBaseMongoose");




class AclModel extends ModelBaseMongoose {

	//---------------------------------------------------------------------------
	// global static version info
	static getVersion() { return 1; }

	// collection name for this model
	static getCollectionName() {
		return "acl";
	}

	static getNiceName() {
		return "ACL";
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	static getSchemaDefinition() {
		return {
			...(this.getBaseSchemaDefinition()),
			permission: {
				type: String,
			},
		};
	}

	static getSchemaDefinitionExtra() {
		return {
			...(this.getBaseSchemaDefinitionExtra()),
			permission: {
				label: "Permission",
			},
		};
	}
	//---------------------------------------------------------------------------

}

// export the class as the sole export
module.exports = AclModel;

