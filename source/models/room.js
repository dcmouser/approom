/**
 * @module models/room
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 5/15/19
 * @description
 * All data in our system is organized at the highest level into a collection of "Apps", and then for each App we have "Rooms", which allow a number of users to communicate / share data with each other.
 * The Room model manages the data for each virtual room.
 */

"use strict";


// modules
const mongoose = require("mongoose");


// requirement service locator
const jrequire = require("../helpers/jrequire");

// models
const ModelBaseMongoose = jrequire("models/model_base_mongoose");

// controllers
const arserver = jrequire("arserver");
const appdef = jrequire("appdef");


// our helper modules
const jrhText = require("../helpers/jrh_text");
const jrhValidate = require("../helpers/jrh_validate");
const jrhMongo = require("../helpers/jrh_mongo");



/**
 * The Room model manages the data for each virtual room.
 *
 * @class RoomModel
 * @extends {ModelBaseMongoose}
 */
class RoomModel extends ModelBaseMongoose {

	//---------------------------------------------------------------------------
	getModelClass() {
		// subclass overriding function that returns class instance (each subclass MUST implement this)
		return RoomModel;
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	// global static version info
	static getVersion() { return 1; }

	// collection name for this model
	static getCollectionName() {
		return "rooms";
	}

	static getNiceName() {
		return "Room";
	}

	// name for acl lookup
	static getAclName() {
		return "room";
	}

	// name for logging
	static getLoggingString() {
		return "Room";
	}

	// should some user ACL own each instance?
	static getShouldBeOwned() {
		return true;
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	static calcSchemaDefinition() {
		const AppModel = jrequire("models/app");
		return {
			...(this.getBaseSchemaDefinition()),
			//
			appid: {
				label: "App Id",
				valueFunction: this.makeModelValueFunctionCrudObjectIdFromList(AppModel, "appid", "appLabel", "applist"),
				// alternative generic way to have crud pages link to this val
				// refModelClass: AppModel,
				mongoose: {
					type: mongoose.Schema.ObjectId,
					required: true,
				},
			},
			shortcode: {
				label: "Shortcode",
				mongoose: {
					type: String,
					unique: true,
					required: true,
				},
			},
			label: {
				label: "Label",
				mongoose: {
					type: String,
				},
			},
			description: {
				label: "Description",
				format: "textarea",
				mongoose: {
					type: String,
				},
			},
			passwordHashed: {
				label: "Password",
				format: "password",
				valueFunction: this.makeModelValueFunctionPasswordAdminEyesOnly(false),
				filterSize: 0,
				mongoose: {
					type: String,
				},
			},
			roles: {
				label: "Roles",
				readOnly: true,
				filterSize: 0,
				valueFunction: this.makeModelValueFunctionRoleOnObjectList(RoomModel),
			},
		};
	}
	//---------------------------------------------------------------------------






	//---------------------------------------------------------------------------
	static getSaveFields(operationType) {
		// operationType is commonly "crudAdd", "crudEdit"
		// return an array of field names that the user can modify when saving an object
		// this is a safety check to allow us to handle form data submitted flexibly and still keep tight control over what data submitted is used
		// subclasses implement; by default we return empty array
		// NOTE: this list can be generated dynamically based on logged in user
		let reta = [];
		if (operationType === "crudAdd" || operationType === "crudEdit" || operationType === "add") {
			reta = ["appid", "shortcode", "label", "description", "password", "passwordHashed", "disabled", "notes", "extraData"];
		}
		return reta;
	}




	// crud add/edit
	static async doValidateAndSave(jrContext, options, flagSave, user, source, saveFields, preValidatedFields, ignoreFields, obj) {
		// parse form and extrace validated object properies; return if error
		// obj will either be a loaded object if we are editing, or a new as-yet-unsaved model object if adding
		let objdoc;
		const UserModel = jrequire("models/user");

		// set fields from form and validate
		await this.validateMergeAsync(jrContext, "appid", "", source, saveFields, preValidatedFields, obj, true, async (jrr, keyname, inVal, flagRequired) => this.validateModelFieldAppId(jrr, keyname, inVal, user));
		await this.validateMergeAsync(jrContext, "shortcode", "", source, saveFields, preValidatedFields, obj, true, async (jrr, keyname, inVal, flagRequired) => await this.validateRoomShortcodeUnique(jrr, keyname, inVal, obj, source.appid));
		await this.validateMergeAsync(jrContext, "label", "", source, saveFields, preValidatedFields, obj, true, (jrr, keyname, inVal, flagRequired) => jrhValidate.validateString(jrr, keyname, inVal, flagRequired));
		await this.validateMergeAsync(jrContext, "description", "", source, saveFields, preValidatedFields, obj, false, (jrr, keyname, inVal, flagRequired) => jrhValidate.validateString(jrr, keyname, inVal, flagRequired));
		// note that password is not required
		await this.validateMergeAsync(jrContext, "password", "passwordHashed", source, saveFields, preValidatedFields, obj, false, async (jrr, keyname, inVal, flagRequired) => await UserModel.validatePlaintextPasswordConvertToHash(jrr, inVal, flagRequired, true));

		// base fields shared between all? (notes, etc.)
		await this.validateMergeAsyncBaseFields(jrContext, options, flagSave, source, saveFields, preValidatedFields, obj);

		// complain about fields in source that we aren't allowed to save
		await this.validateComplainExtraFields(jrContext, options, source, saveFields, preValidatedFields, ignoreFields);

		// any validation errors?
		if (jrContext.isError()) {
			return null;
		}

		// validated successfully

		if (flagSave) {
			// save it
			objdoc = await obj.dbSaveAddError(jrContext);
		}

		// return the saved object
		return objdoc;
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	// crud add/edit form helper data
	// in case of rooms, this should be the list of APPS that the USER has access to
	static async calcCrudEditHelperData(jrContext, user, id) {
		// build app list, pairs of id -> nicename
		const AppModel = jrequire("models/app");
		const applist = await AppModel.buildSimpleAppListUserTargetable(user);
		// return it
		return {
			applist,
		};
	}

	// crud helper for view
	static async calcCrudViewHelperData(jrContext, id, obj) {
	// get nice label of the app it's attached to
		let appLabel;
		const appid = obj.appid;
		if (appid) {
			const AppModel = jrequire("models/app");
			const app = await AppModel.mFindOneById(appid);
			if (app) {
				appLabel = app.shortcode + " - " + app.label;
			}
		}
		return {
			appLabel,
		};
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	static async buildSimpleRoomListUserTargetable(user) {
		// build room list, pairs of id -> nicename, that are targetable to current logged in user
		const roomlist = await this.buildSimpleRoomList(user);
		return roomlist;
	}

	// see http://thecodebarbarian.com/whats-new-in-mongoose-53-async-iterators.html
	static async buildSimpleRoomList(user) {
		const docs = await this.mFindAllAndSelect(null, "_id shortcode label");
		const roomlist = [];
		for (const doc of docs) {
			roomlist[doc._id] = doc.shortcode + " - " + doc.label;
		}

		return roomlist;
	}

	static async buildSimpleRoomIdListUserTargetable(user) {
		const docs = await this.buildSimpleRoomListUserTargetable(user);
		const ids = Object.keys(docs);
		return ids;
	}
	//---------------------------------------------------------------------------







	//---------------------------------------------------------------------------
	static async mFindOneByAppIdAndRoomShortcode(appId, roomShortcode) {
		// first we need to find the app id from the appShortcode
		// now find the room by its appid and shortcode
		const args = {
			appid: appId,
			shortcode: roomShortcode,
		};
		const retv = await this.mFindOne(args);
		return retv;
	}
	//---------------------------------------------------------------------------





	//---------------------------------------------------------------------------
	// delete any ancillary deletions AFTER the normal delete
	static async auxChangeModeById(jrContext, id, mode) {
		// call super callss
		super.auxChangeModeById(jrContext, id, mode);

		// if we are enabling or disabling, then we don't touch rooms
		if (mode === appdef.DefMdbEnable || mode === appdef.DefMdbDisable) {
			// nothing to do
			return;
		}

		// this is a virtual delete or real delete

		// for app model, this means deleting associated rooms
		const roomDataIdList = await this.getAssociatedRoomDatasByRoomId(jrContext, id);
		if (jrContext.isError()) {
			return;
		}

		if (roomDataIdList.length === 0) {
			return;
		}

		// delete them
		const RoomDataModel = jrequire("models/roomdata");
		await RoomDataModel.doChangeModeByIdList(jrContext, roomDataIdList, mode, true);
		if (!jrContext.isError()) {
			const modeLabel = jrhText.capitalizeFirstLetter(appdef.DefStateModeLabels[mode]);
			jrContext.pushSuccess(modeLabel + " " + RoomDataModel.getNiceNamePluralized(roomDataIdList.length) + " attached to " + this.getNiceName() + " #" + id + ".");
		}
	}



	static async getAssociatedRoomDatasByRoomId(jrContext, roomid) {
		// get a list (array) of all room ids that are attached to this app

		const RoomDataModel = jrequire("models/roomdata");
		const roomDataObjs = await RoomDataModel.mFindAllAndSelect({ roomid }, "_id");

		// convert array of objects with _id fields to simple id array
		const roomDataIds = jrhMongo.convertArrayOfObjectIdsToIdArray(roomDataObjs);

		return roomDataIds;
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	static async validateRoomShortcodeUnique(jrResult, key, val, existingModel, appid) {
		// generic validate of shortcode
		if (val === "$RND") {
			// make a random room shortcode!
			val = await this.makeRandomRoomShortcode(appid);
		}
		return await this.validateShortcodeUnique(jrResult, key, val, existingModel);
	}


	static async makeRandomRoomShortcode(appid) {
		return await this.makeRandomShortcode("shortcode");
	}
	//---------------------------------------------------------------------------








}


// export the class as the sole export
module.exports = RoomModel;
