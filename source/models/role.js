/**
 * @module models/option
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 5/15/19
 * @description
 * The database object handles rold assignments
 */

"use strict";


// modules
const mongoose = require("mongoose");

// requirement service locator
const jrequire = require("../helpers/jrequire");

// helpers
const jrhMisc = require("../helpers/jrh_misc");

// models
const ModelBaseMongoose = jrequire("models/model_base_mongoose");
const ModelBaseMongooseMinimal = jrequire("models/model_base_mongoose_minimal");

// controllers
const arserver = jrequire("arserver");
const aclAid = jrequire("aclaid");

// constants
const appdef = jrequire("appdef");





/**
 * The database object managing acl role assignments
 *
 * @class RoleModel
 * @extends {ModelBaseMongoose}
 */
class RoleModel extends ModelBaseMongooseMinimal {

	//---------------------------------------------------------------------------
	getModelClass() {
		// subclass overriding function that returns class instance (each subclass MUST implement this)
		return RoleModel;
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	// global static version info
	static getVersion() { return 1; }

	// collection name for this model
	static getCollectionName() {
		return "roles";
	}

	static getNiceName() {
		return "Role";
	}

	// name for acl lookup
	static getAclName() {
		return "role";
	}

	// name for logging
	static getLoggingString() {
		return "Role";
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	static calcSchemaDefinition() {
		const UserModel = jrequire("models/user");

		return {
			...(this.getBaseSchemaDefinition()),
			//
			userId: {
				label: "UserId",
				valueFunction: this.makeModelValueFunctionObjectId(UserModel),
				mongoose: {
					type: mongoose.Schema.ObjectId,
				},
			},
			role: {
				label: "Role",
				mongoose: {
					type: String,
				},
			},
			objectType: {
				label: "ObjType",
				mongoose: {
					type: String,
				},
			},
			objectId: {
				label: "ObjId",
				mongoose: {
					type: mongoose.Schema.ObjectId,
				},
			},
		};
	}
	//---------------------------------------------------------------------------











	//---------------------------------------------------------------------------
	static stringifyRoles(roles, flagShowUserId, flagShowObjectInfo) {
		// nice stringify of user roles
		if (!roles || roles.length === 0) {
			return "none";
		}

		let userId, objectType, objectId;
		let rolestring = "";
		for (let i = 0; i < roles.length; i++) {
			if (rolestring !== "") {
				rolestring += " | ";
			}
			//
			if (flagShowUserId) {
				userId = roles[i].userId;
				rolestring += arserver.makeAlinkHtmlToAclModel("user", userId) + " is ";
			}
			//
			rolestring += roles[i].role;

			if (flagShowObjectInfo) {
				objectType = roles[i].objectType;
				if (objectType != null) {
					objectId = roles[i].objectId;
					if (objectId === appdef.DefAclObjectIdAll) {
						rolestring += " of [" + objectType + "(s)]";
					} else if (objectId === null) {
						rolestring += " of [" + objectType + "(s)]";
					} else {
						const objectLink = arserver.makeAlinkHtmlToAclModel(objectType, objectId);
						rolestring += " of [" + objectLink + "]";
					}
				}
			}
		}

		return rolestring;
	}
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	// return an array of all roles held by a user
	static async loadRolesForUserById(userIdM) {
		if (!userIdM) {
			// ATTN: should we log this as a problem?
			return [];
		}
		const roleList = await this.mFindRolesByCondition({ userId: userIdM });
		return roleList;
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	static async deleteRolesForUserByCondition(jrContext, user, cond) {
		await this.mFindAndDeleteMany(cond);
		await this.logChangedAcl(jrContext, user, "deteleUserRoles", cond);
	}


	static async deleteRolesByCondition(jrContext, cond) {
		await this.mFindAndDeleteMany(cond);
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	static async mFindRolesByCondition(cond) {
		return await this.mFindAll(cond);
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	// add a role to a user
	static async addRole(jrContext, user, role, objectType, objectId) {
		const roleAs = RoleModel.createModel({
			userId: user.getIdAsM(),
			role,
			objectType,
			objectId,
		});

		// ATTN: Note that it will not return on error to save since an exception will be thrown, since no jrContext is passed to store error
		await roleAs.dbSaveThrowException(jrContext);

		// log the acl change
		await this.logChangedAcl(jrContext, user, "addRole", roleAs);
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	static async logChangedAcl(jrContext, user, label, roleData) {
		const roleStr = jrhMisc.objToString(roleData, true);
		if (user) {
			await arserver.logr(jrContext, appdef.DefLogTypeAclPrefix + label, user.getLogIdString() + " " + label + ": " + roleStr);
		} else {
			await arserver.logr(jrContext, appdef.DefLogTypeAclPrefix + label, roleStr);
		}
	}
	//---------------------------------------------------------------------------


}


// export the class as the sole export
module.exports = RoleModel;
