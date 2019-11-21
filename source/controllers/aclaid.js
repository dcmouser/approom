/**
 * @module controllers/aclaid
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 9/6/19

 * @description
 * Philosophy:\
 * We use a RBAC (role-based access control) approach.\
 * RBAC (Role based access control) is based on defining a list of business roles, and adding each user in the system to one or more roles.\
 * Permissions and privileges are then granted to each role, and users receive them via their membership in the role (pretty much equivalent to a group).\
 * Applications will typically test the user for membership in a specific role, and grant or deny access based on that.\
 * Users are assigned to roles that govern their basic allowed operations\
 * Often we will be answering questions such as, can User U perform some action A on a particular Object O\
 * Where the answer to that question will depend on the users's relation to object O.\
 * That is, are they the OWNER/MODERATOR of the object or not.\
 * One way we could handle this would be to have the caller be ignorant of the details, and simply ask the ACL system whether User U can perform action A on object O.\
 * Then rely on the ACL system to determin the user's relation to object O in order to resolve it.\
 * This query would look something like "Can user U perform action EditProfile on object User U", or "Can user U perform action EditProfile on object User U2"\
 * But another way is for the caller to determine the least onerous contextual relationship between user U and object O and simply ask the ACL system whether user U can perform action [A,C].\
 * This query looks something like: "Can user U perform action [Edit,OwnProfile]" if the user tries to edit their own profile, or "Can user U perform action [Edit,AnyProfile]" if the user tries to edit someone else's profile.\
 * We choose to use the second approach.
 * ##### Notes
 *  * @see <a href="https://security.stackexchange.com/questions/346/what-is-the-difference-between-rbac-and-dac-acl"> rbac vs acl</a>
 *  * @see <a href=" https://dinolai.com/notes/others/authorization-models-acl-dac-mac-rbac-abac.html">comparing authorization approaches</a>
 */

"use strict";


// role-acl
const roleAcl = require("role-acl");

// requirement service locator
const jrequire = require("../helpers/jrequire");








/**
 * Helps manage access control functions and data
 *
 * @class AclAid
 */
class AclAid {

	//---------------------------------------------------------------------------
	constructor() {
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	async setupAclPermissions() {

		// create role-acl module system
		this.roleAcl = new roleAcl();

		// ATTN: 9/3/19 - below are working thought experiments rbac stuff, i am still experimenting

		// create permissions for the different resources
		this.createAclEditViewGrantsForResource("app");
		this.createAclEditViewGrantsForResource("room");

		//
		this.createAclEditViewGrantsForResource("file");
		// files can be viewed by friends of the ROOM
		this.roleAcl.grant("roomFriend").execute("view").on("file");
		//
		this.createAclEditViewGrantsForResource("roomdata");
		// files can be viewed by friends of the ROOM
		this.roleAcl.grant("roomFriend").execute("view").on("roomdata");

		// crud model access
		this.createAclEditViewGrantsForResource("log");
		this.createAclEditViewGrantsForResource("option");
		this.createAclEditViewGrantsForResource("connection");
		this.createAclEditViewGrantsForResource("verification");
		this.createAclEditViewGrantsForResource("login");
		this.createAclEditViewGrantsForResource("session");
		this.createAclEditViewGrantsForResource("user");

		// global site admin
		this.roleAcl.grant("siteAdmin").execute("admin").on("site");
		this.roleAcl.grant("siteAdmin").execute("analytics").on("site");

		// admin inherits the permissions of globalModerator
		// this.roleAcl.grant("siteAdmin").extend(["globalModerator"]);
		this.roleAcl.extendRole("siteAdmin", "globalModerator");

		// visitor role is for people not logged in
		this.roleAcl.grant("visitor");

		return true;
	}


	createAclEditViewGrantsForResource(resourceName) {
		// give global moderator permission
		this.roleAcl.grant("globalModerator").execute(["add", "edit", "view", "list", "delete"]).on(resourceName);
		// now owner, friend, none
		this.roleAcl.grant(resourceName + "Owner").execute(["add", "edit", "view", "list"]).on(resourceName);
		this.roleAcl.grant(resourceName + "Moderator").execute(["add", "edit", "view", "list"]).on(resourceName);
		this.roleAcl.grant(resourceName + "Friend").execute("view").on(resourceName);
		//
		this.roleAcl.grant("none").execute(["view", "list"]).when({ Fn: "EQUALS", args: { public: true } }).on(resourceName);
	}
	//---------------------------------------------------------------------------





	//---------------------------------------------------------------------------
	async anyRolesImplyPermission(roles, action, target) {
		// return true if any of the specified roles (array) have permission
		for (var key in roles) {
			if (await this.roleImpliesPermission(roles[key], action, target) === true) {
				// yes!
				return true;
			}
		}

		// nope, none do
		return false;
	}


	async roleImpliesPermission(role, action, target) {
		// return true if the role implies the action

		var permission = await this.roleAcl.can(role).execute(action).on(target);
		var granted = (permission.granted === true);
		return granted;
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	calcAclInfo() {
		// return an object with all acl info for debugging
		var aclInfo = {};
		aclInfo.grants = this.roleAcl.getGrants();
		return aclInfo;
	}
	//---------------------------------------------------------------------------

}


// export the class as the sole export
module.exports = new AclAid();
