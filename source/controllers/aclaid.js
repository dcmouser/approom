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
const appdef = jrequire("appdef");















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




	/**
	 * The main top level function that sets up acl permissions on objects
	 *
	 * @returns true on success
	 * @memberof AclAid
	 */
	async setupAclPermissions() {
		const arserver = jrequire("arserver");

		// create role-acl module system
		this.roleAcl = new roleAcl();

		// create some grant classes
		this.roleAcl.grant(appdef.DefAclRoleSiteAdmin);
		this.roleAcl.grant(appdef.DefAclRoleGlobalMod);
		this.roleAcl.grant(appdef.DefAclRoleModerator);
		this.roleAcl.grant(appdef.DefAclRoleOwner);
		this.roleAcl.grant(appdef.DefAclRoleVisitor);
		this.roleAcl.grant(appdef.DefAclRoleNone);
		this.roleAcl.grant(appdef.DefAclRoleFriend);

		// create crud permissions for all models
		await this.createDefaultAclCrudGrantsForAllModelResources();

		// files can be viewed by friends of the ROOM (note we dont have to say the role is only for rooms, the func checking it will know how to interpret)
		this.roleAcl.grant(appdef.DefAclRoleFriend).execute(appdef.DefAclActionView).on(arserver.getModelClassAclName("FileModel"));

		// roomdata can be viewed by friends of the ROOM
		this.roleAcl.grant(appdef.DefAclRoleFriend).execute(appdef.DefAclActionView).on(arserver.getModelClassAclName("RoomdataModel"));

		// global site admin can admin the site
		this.roleAcl.grant(appdef.DefAclRoleSiteAdmin).execute(appdef.DefAclActionAdminister).on(appdef.DefAclObjectTypeSite);

		// admin also inherits the permissions of globalModerator
		this.roleAcl.extendRole(appdef.DefAclRoleSiteAdmin, appdef.DefAclRoleGlobalMod);

		// owner inherits permissions of moderator
		this.roleAcl.extendRole(appdef.DefAclRoleOwner, appdef.DefAclRoleModerator);

		// TEST - we wanted to see if this showed up on App view when we listed users who had role on the object; but it does not
		// this.roleAcl.grant(appdef.DefAclRoleSiteAdmin).execute(appdef.DefAclActionAnalytics).on(arserver.getModelClassAclName("RoomModel"));

		// stats and analytics
		this.roleAcl.grant(appdef.DefAclRoleGlobalMod).execute(appdef.DefAclActionAnalytics).on(appdef.DefAclObjectTypeSite);

		return true;
	}



	/**
	 * Loops all the registered model classes and adds crud acl permissions for them
	 *
	 * @memberof AclAid
	 */
	async createDefaultAclCrudGrantsForAllModelResources() {
		// loop all models and call this.createAclEditViewGrantsForResource on them
		const arserver = jrequire("arserver");
		let aclObjName;

		await jrhMisc.asyncAwaitForEachObjectKeyFunctionCall(arserver.getModels(), async (key, val) => {
			aclObjName = val.getAclName();
			if (aclObjName) {
				await this.createDefaultAclCrudGrantsForResource(aclObjName);
			}
		});
	}


	/**
	 * Helper function called on each model class, to set up acl permissions for it
	 *
	 * @param {*} resourceName
	 * @memberof AclAid
	 */
	createDefaultAclCrudGrantsForResource(resourceName) {
		// permission groups
		const permAll = [appdef.DefAclActionAdd, appdef.DefAclActionEdit, appdef.DefAclActionView, appdef.DefAclActionViewData, appdef.DefAclActionAddData, appdef.DefAclActionList, appdef.DefAclActionDelete, appdef.DefAclActionPermDelete];
		const permReadOnly = [appdef.DefAclActionView, appdef.DefAclActionViewData, appdef.DefAclActionList];
		const permExtraAdminMods = [appdef.DefAclActionUnDelete, appdef.DefAclActionSeeVdeletes];
		const permManageOwners = [appdef.DefAclActionAddOwner, appdef.DefAclActionRemoveOwner];
		const permManageModerators = [appdef.DefAclActionAddModerator, appdef.DefAclActionRemoveModerator];
		const permManageMembers = [appdef.DefAclActionAddMember, appdef.DefAclActionRemoveMember];

		// moderator permissions
		this.roleAcl.grant(appdef.DefAclRoleGlobalMod).execute(permAll).on(resourceName);
		this.roleAcl.grant(appdef.DefAclRoleModerator).execute(permAll).on(resourceName);

		// give global mods (site admin) ability to see deleted items and undelete them
		this.roleAcl.grant(appdef.DefAclRoleGlobalMod).execute(permExtraAdminMods).on(resourceName);
		this.roleAcl.grant(appdef.DefAclRoleModerator).execute(permExtraAdminMods).on(resourceName);

		// now owner
		this.roleAcl.grant(appdef.DefAclRoleOwner).execute(permAll).on(resourceName);

		// owner management
		this.roleAcl.grant(appdef.DefAclRoleOwner).execute(permManageOwners).on(resourceName);
		this.roleAcl.grant(appdef.DefAclRoleOwner).execute(permManageModerators).on(resourceName);

		// inherited by default?
		// this.roleAcl.grant(appdef.DefAclRoleOwner).execute(permManageMembers).on(resourceName);

		// moderator management
		this.roleAcl.grant(appdef.DefAclRoleModerator).execute(permManageMembers).on(resourceName);

		// friend
		this.roleAcl.grant(appdef.DefAclRoleFriend).execute(permReadOnly).on(resourceName);
		this.roleAcl.grant(appdef.DefAclRoleMember).execute(permReadOnly).on(resourceName);

		// untested; the idea here is that we want users to be able to access models that have the public:true property
		this.roleAcl.grant(appdef.DefAclRoleNone).execute(permReadOnly).when({ Fn: "EQUALS", args: { public: true } }).on(resourceName);
	}
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	/**
	 * Test whether any of the passed roles imply a permission to perform an action (on an optional target)
	 *
	 * @param {*} roles
	 * @param {*} action
	 * @param {*} target - null or a model class aclname
	 * @returns true if action permission is implied by any of the roles
	 * @memberof AclAid
	 */
	async anyRolesImplyPermission(roles, action, target) {
		// return true if any of the specified roles (array) have permission
		// jrdebug.cdebug("In anyRolesImplyPermission with action = " + action + ", target = " + target);
		// jrdebug.cdebugObj(roles, "roles");
		for (let i = 0; i < roles.length; i++) {
			if (await this.roleImpliesPermission(roles[i], action, target) === true) {
				// yes!
				// jrdebug.cdebug("anyRolesImplyPermission, role check returning: YES, has permission [due to role " + roles[key] + "].");
				return true;
			}
		}

		// nope, none do
		jrdebug.cdebug("anyRolesImplyPermission, role check returning: NO, does not have permission.");
		return false;
	}



	/**
	 * Check whether a single role implies a permission to perform an action (on an optional target)
	 *
	 * @param {*} role
	 * @param {*} action
	 * @param {*} target - null or a model class aclname
	 * @returns true if action permission is implied by the role
	 * @memberof AclAid
	 */
	async roleImpliesPermission(role, action, target) {
		// return true if the role implies the action
		jrdebug.cdebug("In roleImpliesPermission with action = " + action + ", target = " + target + ", role = " + role);

		try {
			const permission = await this.roleAcl.can(role).execute(action).on(target);
			const granted = (permission.granted === true);
			jrdebug.cdebug("RoleImpliesPermission, role check returning: " + granted);
			return granted;
		} catch (err) {
			// this error can be thrown if a role is not registered any longer
			// log it (critical error should trigger emergency alert email to admin)
			const arserver = jrequire("arserver");
			const errmsg = "Acl permission check threw error while asking about roleAcl.can(" + role + ").execute(" + action + ").on(" + target + "): " + err.message;
			jrdebug.cdebug("RoleImpliesPermission, role check threw exception: " + errmsg);
			await arserver.logm(appdef.DefLogTypeErrorCriticalAcl, errmsg, err);
			// return permission denied
			return false;
		}
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	/**
	 * Just returns a large object with all acl configuration structure for debugging
	 *
	 * @returns object
	 * @memberof AclAid
	 */
	calcAclStructure() {
		// return an object with all acl info for debugging
		const aclStructure = {};
		aclStructure.grants = this.roleAcl.getGrants();
		return aclStructure;
	}
	//---------------------------------------------------------------------------






































































	//---------------------------------------------------------------------------
	/**
	 * Perform an ACL role change and return jrResult
	 * This function must check the permission of the petitioner to make sure they have the permission to perform this action
	 * @param {object} roleChange -- see below for structure of roleChange object
	 * @returns JrResult object
	 * @memberof AclAid
	// example roleChange object:
	let roleChange = {
		operation: "add", // can be "add" or "remove"
		role: req.body.role,
		object: {
			model: RoomModel,
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
		const jrResult = JrResult.makeNew();

		// first step is lookup key roleChange fields, and throw any errors
		const rcobj = await this.roleChangeParse(roleChange, jrResult);
		const petitioner = rcobj.petitioner;
		const recipient = rcobj.recipient;

		// next step is to see if petitioner is ALLOWED to make this role change (has sufficient permission to do so)
		// perhaps for Any given role R, we can ask if the petitioner has role "operation.R"..
		// we need to be careful about missing object ids, which can mean permission for all objects
		if (!jrResult.isError()) {
			// requiredAction will be something like "add.moderator"
			const petitionerAclAction = rcobj.operation + "." + rcobj.role;
			// jrdebug.debugObj(rcobj, "RCOBJ");
			// now ask if petitioner has permission to perform petitionerAclAction on object
			let hasPermission;
			if (rcobj.object) {
				const rcobjModelClass = rcobj.object.getModelClass();
				hasPermission = await petitioner.aclHasPermission(petitionerAclAction, rcobjModelClass.getAclName(), rcobj.object.getIdAsString());
				if (!hasPermission) {
					jrResult.pushError("petitioner (" + petitioner.getIdAsString() + ") does not have permission to grant [" + petitionerAclAction + "] to recipient " + recipient.getIdAsString() + " on " + rcobjModelClass.getNiceName() + " #" + rcobj.object.getIdAsString());
				}
			} else {
				hasPermission = await petitioner.aclHasPermission(petitionerAclAction);
				if (!hasPermission) {
					jrResult.pushError("petitioner (" + petitioner.getIdAsString() + ") does not have permission to grant [" + petitionerAclAction + "] to recipient " + recipient.getIdAsString());
				}
			}
		}

		// next step is to perform the role change (add or delete)
		if (!jrResult.isError()) {
			await recipient.makeRoleAclChange(rcobj.operation, rcobj.role, rcobj.object, jrResult);
		}

		// save any changes
		if (!jrResult.isError()) {
			await recipient.dbSave(jrResult);
			// log what we just did?
			// ATTN: TODO log change
			// ATTN: TODO improve this message with details
			jrResult.pushSuccess("Role change successful.");
		}


		return jrResult;
	}
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	/**
	 * Parse the roleChange object and create a new one with objects, petitioner, recipient all resolved to objects
	 *
	 * @param {object} roleChange -- see performRoleChange() function above for description of roleChange object
	 * @memberof AclAid
	 * @returns object
	 */
	async roleChangeParse(roleChange, jrResult) {
		const roleChangeParsed = {};

		// first operation, which must be add or delete
		// role object, which cannot be blank
		roleChangeParsed.operation = this.roleChangeParseOperation(roleChange.operation, jrResult);

		// role object, which cannot be blank
		roleChangeParsed.role = this.roleChangeParseRole(roleChange.role, jrResult);

		// now object, which can be blank
		roleChangeParsed.object = await this.flexibleParseObjectIdentity(roleChange.object, "object", jrResult);

		// now petitioner
		roleChangeParsed.petitioner = await this.flexibleParseUser(roleChange.petitioner, "petitioner", jrResult);

		// now recipient
		roleChangeParsed.recipient = await this.flexibleParseUser(roleChange.recipient, "recipient", jrResult);

		return roleChangeParsed;
	}



	/**
	 * Validate the roleChange operation; pushing any error into jrResult
	 *
	 * @param {string} operation
	 * @param {*} jrResult
	 * @returns validated operation or null on error
	 * @memberof AclAid
	 */
	roleChangeParseOperation(operation, jrResult) {
		if (operation !== "add" && operation !== "remove") {
			jrResult.pushFieldError("operation", "Operation must be one of 'add' or 'remove'");
			return null;
		}
		return operation;
	}

	/**
	 * 	 * Validate the roleChange role; pushing any error into jrResult
	 *
	 * @param {string} role
	 * @param {*} jrResult
	 * @returns validated role or null on error
	 * @memberof AclAid
	 */
	roleChangeParseRole(role, jrResult) {
		// now role, which should be a non-empty string
		if (!this.isValidRole(role)) {
			jrResult.pushFieldError("role", "Role must be a valid role string");
			return null;
		}
		return role;
	}

	/**
	 * 	Validate the roleChange role; pushing any error into jrResult
	 *
	 * @param {string} role
	 * @returns true if its a valid role
	 * @memberof AclAid
	 */
	isValidRole(role) {
		// ATTN: for now we just check that it's a string
		// ATTN: complain if its an unknown role; not so important since an unknown role will always just return false for permission lookup
		if (typeof role !== "string") {
			return false;
		}
		return true;
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	/**
	 * Parse an sub-object in a roleChange object referring to a target object, which may be specified by id# string, or by passing a raw object; pushing any error into jrResult
	 *
	 * @param {object} objDef
	 * @param {string} fieldLabel - for error text
	 * @param {*} jrResult
	 * @returns the model object or null if not specified or found
	 * @memberof AclAid
	 */
	async flexibleParseObjectIdentity(objDef, fieldLabel, jrResult) {
		if (!objDef) {
			// no object specified -- this is allowed
			return undefined;
		}
		if (objDef.object) {
			// specified as object
			return objDef.object;
		}
		// parse it from model and id
		const modelClass = objDef.model;
		const doc = await modelClass.findOneById(objDef.id);
		if (doc) {
			return doc;
		}
		// ATTN: unfinished
		jrResult.pushFieldError(fieldLabel, "Not a valid object (" + fieldLabel + ")");
		return null;
	}


	/**
	 * Parse a user sub-object in a roleChange object referring to a user, which may be specified by id# string, or by email or username, or by passing a raw user model object; pushing any error into jrResult
	 * Error if none found.
	 *
	 * @param {object} objDef
	 * @param {string} fieldLabel - for error text
	 * @param {*} jrResult
	 * @returns user indicated
	 * @memberof AclAid
	 */
	async flexibleParseUser(objDef, fieldLabel, jrResult) {
		const UserModel = jrequire("models/user");

		if (!objDef) {
			// no user specified -- this is an error
			jrResult.pushFieldError(fieldLabel, "A valid " + fieldLabel + " user must be specified");
			return undefined;
		}
		if (objDef.user) {
			// specified as object
			return objDef.user;
		}
		if (objDef.usernameEmailId) {
			// parse it from username / id
			const user = await UserModel.findUserByUsernameEmailOrId(objDef.usernameEmailId);
			if (user) {
				return user;
			}
		}

		// ATTN: unfinished
		jrResult.pushFieldError(fieldLabel, "Not a valid " + fieldLabel + " user");
		return null;
	}
	//---------------------------------------------------------------------------








}


// export the class as the sole export
module.exports = new AclAid();
