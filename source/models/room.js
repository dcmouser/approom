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
const appconst = jrequire("appconst");


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
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	static getSchemaDefinition() {
		return {
			...(this.getBaseSchemaDefinition()),
			appid: {
				type: mongoose.Schema.ObjectId,
				required: true,
			},
			shortcode: {
				type: String,
				unique: true,
				required: true,
			},
			label: {
				type: String,
			},
			description: {
				type: String,
			},
			passwordHashed: {
				type: String,
			},
		};
	}

	static getSchemaDefinitionExtra() {
		const AppModel = jrequire("models/app");
		return {
			...(this.getBaseSchemaDefinitionExtra()),
			appid: {
				label: "App Id",
				valueFunction: (viewType, fieldName, req, obj, helperData) => {
					var viewUrl, appLabel, rethtml, appid;
					if (viewType === "view" && obj !== undefined) {
						viewUrl = AppModel.getCrudUrlBase("view", obj.appid);
						appLabel = helperData.appLabel;
						rethtml = `${appLabel} (<a href="${viewUrl}">#${obj.appid}</a>)`;
						return rethtml;
					}
					if (viewType === "edit") {
						appid = obj ? obj.appid : null;
						rethtml = jrhText.jrHtmlFormOptionListSelect("appid", helperData.applist, appid, true);
						return rethtml;
					}
					if (viewType === "list" && obj !== undefined) {
						viewUrl = AppModel.getCrudUrlBase("view", obj.appid);
						rethtml = `<a href="${viewUrl}">${obj.appid}</a>`;
						return rethtml;
					}
					return undefined;
				},
				// alternative generic way to have crud pages link to this val
				// crudLink: AppModel.getCrudUrlBase(),
			},
			shortcode: {
				label: "Shortcode",
			},
			label: {
				label: "Label",
			},
			description: {
				label: "Description",
				format: "textarea",
			},
			passwordHashed: {
				label: "Password",
				format: "password",
				valueFunction: this.makeModelValueFunctionPasswordAdminEyesOnly(false),
				filterSize: 0,
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
		var reta = [];
		if (operationType === "crudAdd" || operationType === "crudEdit" || operationType === "add") {
			reta = ["extraData", "appid", "shortcode", "label", "description", "password", "passwordHashed", "disabled", "notes"];
		}
		return reta;
	}




	// crud add/edit
	static async validateAndSave(jrResult, options, flagSave, loggedInUser, source, saveFields, preValidatedFields, ignoreFields, obj) {
		// parse form and extrace validated object properies; return if error
		// obj will either be a loaded object if we are editing, or a new as-yet-unsaved model object if adding
		var objdoc;
		const UserModel = jrequire("models/user");

		// set fields from form and validate
		await this.validateMergeAsync(jrResult, "appid", "", source, saveFields, preValidatedFields, obj, true, async (jrr, keyname, inVal, flagRequired) => this.validateModelFieldAppId(jrr, keyname, inVal, loggedInUser));
		await this.validateMergeAsync(jrResult, "shortcode", "", source, saveFields, preValidatedFields, obj, true, async (jrr, keyname, inVal, flagRequired) => await this.validateRoomShortcodeUnique(jrr, keyname, inVal, obj, source.appid));
		await this.validateMergeAsync(jrResult, "label", "", source, saveFields, preValidatedFields, obj, true, (jrr, keyname, inVal, flagRequired) => jrhValidate.validateString(jrr, keyname, inVal, flagRequired));
		await this.validateMergeAsync(jrResult, "description", "", source, saveFields, preValidatedFields, obj, false, (jrr, keyname, inVal, flagRequired) => jrhValidate.validateString(jrr, keyname, inVal, flagRequired));
		// note that password is not required
		await this.validateMergeAsync(jrResult, "password", "passwordHashed", source, saveFields, preValidatedFields, obj, false, async (jrr, keyname, inVal, flagRequired) => await UserModel.validatePlaintextPasswordConvertToHash(jrr, inVal, flagRequired, true));

		// base fields shared between all? (notes, etc.)
		await this.validateMergeAsyncBaseFields(jrResult, options, flagSave, source, saveFields, preValidatedFields, obj);

		// complain about fields in source that we aren't allowed to save
		await this.validateComplainExtraFields(jrResult, options, source, saveFields, preValidatedFields, ignoreFields);

		// any validation errors?
		if (jrResult.isError()) {
			return null;
		}

		// validated successfully

		if (flagSave) {
			// save it (success message will be pushed onto jrResult)
			objdoc = await obj.dbSave(jrResult);
		}

		// return the saved object
		return objdoc;
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	// crud add/edit form helper data
	// in case of rooms, this should be the list of APPS that the USER has access to
	static async calcCrudEditHelperData(user, id) {
		// build app list, pairs of id -> nicename
		const AppModel = jrequire("models/app");
		const applist = await AppModel.buildSimpleAppListUserTargetable(user);

		// return it
		return {
			applist,
		};
	}

	// crud helper for view
	static async calcCrudViewHelperData(req, res, id, obj) {
	// get nice label of the app it's attached to
		var appLabel;
		const appid = obj.appid;
		if (appid) {
			const AppModel = jrequire("models/app");
			const app = await AppModel.findOneById(appid);
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
		var roomlist = await this.buildSimpleRoomList(user);
		return roomlist;
	}

	// see http://thecodebarbarian.com/whats-new-in-mongoose-53-async-iterators.html
	static async buildSimpleRoomList(user) {
		const docs = await this.findAllAndSelect("_id shortcode label");
		var roomlist = [];
		for (const doc of docs) {
			roomlist[doc._id] = doc.shortcode + " - " + doc.label;
		}

		return roomlist;
	}

	static async buildSimpleRoomIdListUserTargetable(user) {
		const docs = await this.buildSimpleRoomListUserTargetable(user);
		var ids = Object.keys(docs);
		return ids;
	}
	//---------------------------------------------------------------------------







	//---------------------------------------------------------------------------
	static async findOneByAppIdAndRoomShortcode(appId, roomShortcode) {
		// first we need to find the app id from the appShortcode
		// now find the room by its appid and shortcode
		var args = {
			appid: appId,
			shortcode: roomShortcode,
		};
		var retv = await this.findOneExec(args);
		return retv;
	}
	//---------------------------------------------------------------------------





	//---------------------------------------------------------------------------
	// delete any ancillary deletions AFTER the normal delete
	static async auxChangeModeById(id, mode, jrResult) {
		// call super callss
		super.auxChangeModeById(id, mode, jrResult);

		// if we are enabling or disabling, then we don't touch rooms
		if (mode === appconst.DefMdbEnable || mode === appconst.DefMdbDisable) {
			// nothing to do
			return;
		}

		// this is a virtual delete or real delete

		// for app model, this means deleting associated rooms
		const roomDataIdList = await this.getAssociatedRoomDatasByRoomId(id, jrResult);
		if (jrResult.isError()) {
			return;
		}

		if (roomDataIdList.length === 0) {
			return;
		}

		// delete them
		const RoomDataModel = jrequire("models/roomdata");
		await RoomDataModel.doChangeModeByIdList(roomDataIdList, mode, jrResult, true);
		if (!jrResult.isError()) {
			const modeLabel = jrhText.capitalizeFirstLetter(appconst.DefStateModeLabels[mode]);
			jrResult.pushSuccess(modeLabel + " " + RoomDataModel.getNiceNamePluralized(roomDataIdList.length) + " attached to " + this.getNiceName() + " #" + id + ".");
		}
	}



	static async getAssociatedRoomDatasByRoomId(roomid, jrResult) {
		// get a list (array) of all room ids that are attached to this app

		const RoomDataModel = jrequire("models/roomdata");
		var roomDataObjs = await RoomDataModel.findAllExec({ roomid }, "_id");

		// convert array of objects with _id fields to simple id array
		var roomDataIds = jrhMongo.convertArrayOfObjectIdsToIdArray(roomDataObjs);

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
