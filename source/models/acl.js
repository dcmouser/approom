// approom
// acl model
// v1.0.0 on 5/1/19 by mouser@donationcoder.com
//
// The Acl model acts as our interfact for access-control-list permission system for users
// It helps track who can do what.
//
//
// Philosophy:
// See https://security.stackexchange.com/questions/346/what-is-the-difference-between-rbac-and-dac-acl
// RBAC (Role based access control) is based on defining a list of business roles, and adding each user in the system to one or more roles.
// Permissions and privileges are then granted to each role, and users receive them via their membership in the role (pretty much equivalent to a group).
// Applications will typically test the user for membership in a specific role, and grant or deny access based on that.
// See https://dinolai.com/notes/others/authorization-models-acl-dac-mac-rbac-abac.html
//
// We use a RBAC (role-based access control)
//
// Users are assigned to roles that govern their basic allowed operations
// Often we will be answering questions such as, can User U perform some action A on a particular Object O
// where the answer to that question will depend on the users's relation to object O.
// That is, are they the OWNER/MODERATOR of the object or not.
//
// One way we could handle this would be to have the caller be ignorant of the details, and simply ask the ACL system whether User U can perform action A on object O.
//  Then rely on the ACL system to determin the user's relation to object O in order to resolve it.
//  This query would look something like "Can user U perform action EditProfile on object User U", or "Can user U perform action EditProfile on object User U2"
// But another way is for the caller to determine the least onerous contextual relationship between user U and object O and simply ask the ACL system whether user U can perform action [A,C].
//  This query looks something like: "Can user U perform action [Edit,OwnProfile]" if the user tries to edit their own profile,
//  or "Can user U perform action [Edit,AnyProfile]" if the user tries to edit someone else's profile.
// We choose to use the second approach.


"use strict";

// modules

// acl module? - https://www.npmjs.com/package/acl
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





	//---------------------------------------------------------------------------
	static async setupAcl(dbInstance, prefix) {
		// return false;

		this.acl = new acl(new acl.mongodbBackend(dbInstance, prefix));
		// test
		// await this.acl.allow("administrator", "/", "*");
		return true;
	}
	//---------------------------------------------------------------------------





	//---------------------------------------------------------------------------
	static userHasPermission(user, permissionStr) {
		return false;
	}
	//---------------------------------------------------------------------------



}

// export the class as the sole export
module.exports = AclModel;

