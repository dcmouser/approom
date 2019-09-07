// approom
// acl aid class
// v1.0.0 on 9/6/19 by mouser@donationcoder.com
//
// Helps out with access control processing
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

// misc node core modules
const assert = require("assert");

// role-acl
const roleAcl = require("role-acl");

// our helper modules
const jrlog = require("../helpers/jrlog");


class AclAid {



	//---------------------------------------------------------------------------
	static async setupAclPermissions() {

		// create role-acl module system
		this.roleAcl = new roleAcl();

		// ATTN: 9/3/19 - below are working thought experiments rbac stuff, i am still experimenting

		this.roleAcl.grant("admin").execute("admin").on("site");
		// this.roleAcl.grant("admin").execute("*");
		//
		this.roleAcl.grant("globalModerator").execute("edit").on("app");
		this.roleAcl.grant("appOwner").execute("edit").on("app");
		this.roleAcl.grant("appModerator").execute("edit").on("app");
		this.roleAcl.grant("appFriend").execute("view").on("app");
		this.roleAcl.grant("none").execute("view").when({ Fn: "EQUALS", args: { public: true } }).on("app");
		//
		this.roleAcl.grant("globalModerator").execute("edit").on("room");
		this.roleAcl.grant("roomOwner").execute("edit").on("room");
		this.roleAcl.grant("roomModerator").execute("edit").on("room");
		this.roleAcl.grant("roomFriend").execute("view").on("room");
		this.roleAcl.grant("none").execute("view").when({ Fn: "EQUALS", args: { public: true } }).on("room");
		//
		this.roleAcl.grant("globalModerator").execute("edit").on("file");
		this.roleAcl.grant("fileOwner").execute("edit").on("file");
		this.roleAcl.grant("fileRoomFriend").execute("view").on("file");
		this.roleAcl.grant("none").execute("view").when({ Fn: "EQUALS", args: { public: true } }).on("file");
		//
		this.roleAcl.grant("globalModerator").execute("edit").on("user");
		this.roleAcl.grant("userOwner").execute("edit").on("user");
		this.roleAcl.grant("userFriend").execute("view").on("user");
		this.roleAcl.grant("none").execute("view").when({ Fn: "EQUALS", args: { public: true } }).on("user");
		//

		// test
		// jrlog.debugObj(this.roleAcl.getGrants(), "TEST of ACL permission grants");

		return true;
	}
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	static async anyRolesImplyPermission(roles, action, target) {
		// return true if any of the specified roles (array) have permission
		for (var key in roles) {
			if (this.roleImpliesPermission(roles[key], action, target)) {
				// yes!
				return true;
			}
		}

		// nope, none do
		return false;
	}


	static async roleImpliesPermission(role, action, target) {
		// return true if the role implies the action

		var permission = this.roleAcl.can(role).execute(action).on(target);
		var granted = (permission.granted === true);
		return granted;
	}
	//---------------------------------------------------------------------------


}


// export the class as the sole export
module.exports = AclAid;
