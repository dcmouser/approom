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

// helpers
const jrdebug = require("../helpers/jrdebug");
const jrhMisc = require("../helpers/jrh_misc");
const JrResult = require("../helpers/jrresult");

// constants
const appconst = jrequire("appconst");















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
	async createDefaultAclCrudGrantsForAllModelResources() {
		// loop all models and call this.createAclEditViewGrantsForResource on them
		const arserver = jrequire("arserver");
		var aclObjName;

		await jrhMisc.asyncAwaitForEachObjectKeyFunctionCall(arserver.getModels(), async (key, val) => {
			aclObjName = val.getAclName();
			if (aclObjName) {
				await this.createDefaultAclCrudGrantsForResource(aclObjName);
			}
		});
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	async setupAclPermissions() {
		const arserver = jrequire("arserver");

		// create role-acl module system
		this.roleAcl = new roleAcl();

		// create some grant classes
		this.roleAcl.grant(appconst.DefAclRoleSiteAdmin);
		this.roleAcl.grant(appconst.DefAclRoleGlobalMod);
		this.roleAcl.grant(appconst.DefAclRoleModerator);
		this.roleAcl.grant(appconst.DefAclRoleOwner);
		this.roleAcl.grant(appconst.DefAclRoleVisitor);
		this.roleAcl.grant(appconst.DefAclRoleNone);
		this.roleAcl.grant(appconst.DefAclRoleFriend);

		// create crud permissions for all models
		await this.createDefaultAclCrudGrantsForAllModelResources();

		// files can be viewed by friends of the ROOM (note we dont have to say the role is only for rooms, the func checking it will know how to interpret)
		this.roleAcl.grant(appconst.DefAclRoleFriend).execute(appconst.DefAclActionView).on(arserver.getModelClassAclName("FileModel"));

		// roomdata can be viewed by friends of the ROOM
		this.roleAcl.grant(appconst.DefAclRoleFriend).execute(appconst.DefAclActionView).on(arserver.getModelClassAclName("RoomdataModel"));

		// global site admin can admin the site
		this.roleAcl.grant(appconst.DefAclRoleSiteAdmin).execute(appconst.DefAclActionAdminister).on(appconst.DefAclObjectTypeSite);

		// admin also inherits the permissions of globalModerator
		this.roleAcl.extendRole(appconst.DefAclRoleSiteAdmin, appconst.DefAclRoleGlobalMod);


		// TEST - we wanted to see if this showed up on App view when we listed users who had role on the object; but it does not
		// this.roleAcl.grant(appconst.DefAclRoleSiteAdmin).execute(appconst.DefAclActionAnalytics).on(arserver.getModelClassAclName("RoomModel"));


		// stats and analytics
		this.roleAcl.grant(appconst.DefAclRoleGlobalMod).execute(appconst.DefAclActionAnalytics).on(appconst.DefAclObjectTypeSite);

		return true;
	}


	createDefaultAclCrudGrantsForResource(resourceName) {
		// permission groups
		const permAll = [appconst.DefAclActionAdd, appconst.DefAclActionEdit, appconst.DefAclActionView, appconst.DefAclActionViewData, appconst.DefAclActionAddData, appconst.DefAclActionList, appconst.DefAclActionDelete, appconst.DefAclActionPermDelete];
		const permReadOnly = [appconst.DefAclActionView, appconst.DefAclActionViewData, appconst.DefAclActionList];
		const permExtraAdminMods = [appconst.DefAclActionUnDelete, appconst.DefAclActionSeeVdeletes];
		const permManageUsers = [appconst.DefAclActionAddOwner, appconst.DefAclActionDeleteOwner, appconst.DefAclActionAddModerator, appconst.DefAclActionDeleteModerator];

		// moderator permissions
		this.roleAcl.grant(appconst.DefAclRoleGlobalMod).execute(permAll).on(resourceName);
		this.roleAcl.grant(appconst.DefAclRoleModerator).execute(permAll).on(resourceName);

		// give global mods (site admin) ability to see deleted items and undelete them
		this.roleAcl.grant(appconst.DefAclRoleGlobalMod).execute(permExtraAdminMods).on(resourceName);
		this.roleAcl.grant(appconst.DefAclRoleModerator).execute(permExtraAdminMods).on(resourceName);

		// now owner
		this.roleAcl.grant(appconst.DefAclRoleOwner).execute(permAll).on(resourceName);

		// an owner can add/delete other owners and moderators
		this.roleAcl.grant(appconst.DefAclRoleOwner).execute(permManageUsers).on(resourceName);

		// friend
		this.roleAcl.grant(appconst.DefAclRoleFriend).execute(permReadOnly).on(resourceName);
		this.roleAcl.grant(appconst.DefAclRoleMember).execute(permReadOnly).on(resourceName);

		// untested; the idea here is that we want users to be able to access models that have the public:true property
		this.roleAcl.grant(appconst.DefAclRoleNone).execute(permReadOnly).when({ Fn: "EQUALS", args: { public: true } }).on(resourceName);
	}
	//---------------------------------------------------------------------------





	//---------------------------------------------------------------------------
	async anyRolesImplyPermission(roles, action, target) {
		// return true if any of the specified roles (array) have permission
		// jrdebug.cdebug("In anyRolesImplyPermission with action = " + action + ", target = " + target);
		// jrdebug.cdebugObj(roles, "roles");
		for (var key in roles) {
			if (await this.roleImpliesPermission(roles[key], action, target) === true) {
				// yes!
				// jrdebug.cdebug("anyRolesImplyPermission, role check returning: YES, has permission [due to role " + roles[key] + "].");
				return true;
			}
		}

		// nope, none do
		jrdebug.cdebug("anyRolesImplyPermission, role check returning: NO, does not have permission.");
		return false;
	}


	async roleImpliesPermission(role, action, target) {
		// return true if the role implies the action
		jrdebug.cdebug("In roleImpliesPermission with action = " + action + ", target = " + target + ", role = " + role);

		try {
			var permission = await this.roleAcl.can(role).execute(action).on(target);
			var granted = (permission.granted === true);
			jrdebug.cdebug("RoleImpliesPermission, role check returning: " + granted);
			return granted;
		} catch (err) {
			// this error can be thrown if a role is not registered any longer
			// log it (critical error should trigger emergency alert email to admin)
			const arserver = jrequire("arserver");
			const errmsg = "Acl permission check threw error while asking about roleAcl.can(" + role + ").execute(" + action + ").on(" + target + "): " + err.message;
			jrdebug.cdebug("RoleImpliesPermission, role check threw exception: " + errmsg);
			await arserver.logm(appconst.DefLogTypeErrorCriticalAcl, errmsg, err);
			// return permission denied
			return false;
		}
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	calcAclStructure() {
		// return an object with all acl info for debugging
		var aclStructure = {};
		aclStructure.grants = this.roleAcl.getGrants();
		return aclStructure;
	}
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	buildHtmlOfFullRoleArray(roles) {
		if (!roles) {
			return "";
		}

		// build a nice table list of roles
		var userhtml, rolehtml, objecthtml;
		var rethtml = "<ul>\n";

		roles.forEach((role) => {
			userhtml = role.uname;
			rolehtml = role.r;
			if (role.i === appconst.DefAclObjectIdAll) {
				objecthtml = "all " + role.t + "s";
			} else {
				objecthtml = role.t + " #" + role.i;
			}
			//
			rethtml += "<li>" + userhtml + " has role [" + rolehtml + "] on [" + objecthtml + "]</li>";
		});

		rethtml += "</ul>";
		return rethtml;
	}
	//---------------------------------------------------------------------------











	//---------------------------------------------------------------------------
	/**
	 * Perform an ACL role change and return jrResult
	 * This function must check the permission of the petitioner to make sure they have the permission to perform this action
	 * @param {object} roleChange
	 * @returns JrResult object
	 * @memberof AclAid
	// example roleChange object:
	var roleChange = {
		operation: "add", // can be "add" or "delete"
		role: req.body.role,
		object: {
			type: RoomModel.getAclName(),
			id: req.body.roomId,
		},
		petitioner: {
			user,
		},
		recipient: {
			usernameEmail: req.body.usernameEmail,
			userId: req.body.userId,
		},
	};
	 */
	async performRoleChange(roleChange) {
		var jrResult = JrResult.makeNew();

		// first step is lookup key roleChange fields, and throw any errors
		var rcobj = this.roleChangeParse(roleChange, jrResult);
		var petitioner = rcobj.petitioner;
		var recipient = rcobj.recipient;

		// next step is to see if petitioner is ALLOWED to make this role change (has sufficient permission to do so)
		// perhaps for Any given role R, we can ask if the petitioner has role "operation.R"..
		// we need to be careful about missing object ids, which can mean permission for all objects
		if (!jrResult.isError()) {
			// requiredAction will be something like "add.moderator"
			var petitionerAclAction = rcobj.operation + "." + rcobj.role;
			// now ask if petitioner has permission to perform petitionerAclAction on object
			var hasPermission;
			if (rcobj.object) {
				hasPermission = await petitioner.aclHasPermission(petitionerAclAction, rcobj.object.getAclName(), rcobj.object.getId());
				if (!hasPermission) {
					jrResult.pushError("petitioner (" + petitioner.getId() + ") does not have permission to grant " + petitionerAclAction + " to recipient " + recipient.getId() + " on " + rcobj.object.getAclName() + " #" + rcobj.object.getId());
				}
			} else {
				hasPermission = await petitioner.aclHasPermission(petitionerAclAction);
				if (!hasPermission) {
					jrResult.pushError("petitioner (" + petitioner.getId() + ") does not have permission to grant " + petitionerAclAction + " to recipient " + recipient.getId());
				}
			}
		}

		// next step is to perform the role change (add or delete)
		if (!jrResult.isError()) {
			recipient.makeRoleAclChange(rcobj.operation, rcobj.role, rcobj.object, jrResult);
		}

		// save any changes
		if (!jrResult.isError()) {
			await recipient.dbSave(jrResult);
			// log what we just did?
			// ATTN: TO DO log change
		}


		return jrResult;
	}
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	/**
	 * Parse the roleChange object and create a new one with objects, petitioner, recipient all resolved to objects
	 *
	 * @param {object} roleChange
	 * @memberof AclAid
	 * @returns object
	 */
	roleChangeParse(roleChange, jrResult) {
		var roleChangeParsed = {};

		// first operation, which must be add or delete
		// role object, which cannot be blank
		roleChangeParsed.operation = this.roleChangeParseOperation(roleChange.operation, jrResult);

		// role object, which cannot be blank
		roleChangeParsed.role = this.roleChangeParseRole(roleChange.role, jrResult);

		// now object, which can be blank
		roleChangeParsed.object = this.flexibleParseObjectIdentity(roleChange.object, "object", jrResult);

		// now petitioner
		roleChangeParsed.petitioner = this.flexibleParseUser(roleChange.petitioner, "petitioner", jrResult);

		// now recipient
		roleChangeParsed.recipient = this.flexibleParseUser(roleChange.recipient, "recipient", jrResult);

		return roleChangeParsed;
	}



	roleChangeParseOperation(operation, jrResult) {
		if (operation !== "add" && operation !== "delete") {
			jrResult.pushFieldError("operation", "Operation must be one of 'add' or 'delete'");
			return null;
		}
		return operation;
	}

	roleChangeParseRole(role, jrResult) {
		// now role, which should be a non-empty string
		if (!this.isValidRole(role)) {
			jrResult.pushFieldError("role", "Role must be a valid role string");
			return null;
		}
		return role;
	}

	isValidRole(role) {
		// ATTN: for now we just check that it's a string
		if (typeof role !== "string") {
			return false;
		}
		return true;
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	flexibleParseObjectIdentity(objDef, fieldLabel, jrResult) {
		if (!objDef) {
			// no object specified -- this is allowed
			return undefined;
		}
		if (objDef.object) {
			// specified as object
			return objDef.object;
		}
		// parse it from type and id
		// ATTN: unfinished
		jrResult.pushFieldError(fieldLabel, "Not a valid object");
		return null;
	}

	flexibleParseUser(objDef, fieldLabel, jrResult) {
		if (!objDef) {
			// no user specified -- this is an error
			jrResult.pushFieldError(fieldLabel, "A valid " + fieldLabel + " user must be specified");
			return undefined;
		}
		if (objDef.user) {
			// specified as object
			return objDef.user;
		}
		// parse it from username / id
		// ATTN: unfinished
		jrResult.pushFieldError(fieldLabel, "Not a valid " + fieldLabel + " user");
		return null;
	}
	//---------------------------------------------------------------------------








}


// export the class as the sole export
module.exports = new AclAid();
