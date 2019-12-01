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

// our helper modules
const jrhText = require("../helpers/jrh_text");
const jrhValidate = require("../helpers/jrh_validate");



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
					if (viewType === "view") {
						viewUrl = AppModel.getCrudUrlBase("view", obj.appid);
						appLabel = helperData.appLabel;
						rethtml = `${appLabel} (<a href="${viewUrl}">#${obj.appid}</a>)`;
						return rethtml;
					}
					if (viewType === "edit") {
						appid = obj ? obj.appid : null;
						rethtml = jrhText.jrHtmlFormOptionListSelect("appid", helperData.applist, appid);
						return rethtml;
					}
					if (viewType === "list") {
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
	static getSaveFields(req, operationType) {
		// operationType is commonly "crudAdd", "crudEdit"
		// return an array of field names that the user can modify when saving an object
		// this is a safety check to allow us to handle form data submitted flexibly and still keep tight control over what data submitted is used
		// subclasses implement; by default we return empty array
		// NOTE: this list can be generated dynamically based on logged in user
		var reta;
		if (operationType === "crudAdd" || operationType === "crudEdit") {
			reta = ["appid", "shortcode", "label", "description", "password", "passwordHashed", "disabled", "notes"];
		}
		return reta;
	}




	// crud add/edit
	static async validateAndSave(jrResult, options, flagSave, req, source, saveFields, preValidatedFields, obj) {
		// parse form and extrace validated object properies; return if error
		// obj will either be a loaded object if we are editing, or a new as-yet-unsaved model object if adding
		var objdoc;
		const UserModel = jrequire("models/user");

		// get logged in user
		var user = await arserver.getLoggedInUser(req);

		// set fields from form and validate
		await this.validateMergeAsync(jrResult, "appid", "", source, saveFields, preValidatedFields, obj, true, async (jrr, keyname, inVal, flagRequired) => this.validateModelFieldAppId(jrr, keyname, inVal, user));
		await this.validateMergeAsync(jrResult, "shortcode", "", source, saveFields, preValidatedFields, obj, true, async (jrr, keyname, inVal, flagRequired) => await this.validateShortcodeUnique(jrr, keyname, inVal, obj));
		await this.validateMergeAsync(jrResult, "label", "", source, saveFields, preValidatedFields, obj, true, (jrr, keyname, inVal, flagRequired) => jrhValidate.validateString(jrr, keyname, inVal, flagRequired));
		await this.validateMergeAsync(jrResult, "description", "", source, saveFields, preValidatedFields, obj, true, (jrr, keyname, inVal, flagRequired) => jrhValidate.validateString(jrr, keyname, inVal, flagRequired));
		// note that password is not required
		await this.validateMergeAsync(jrResult, "password", "passwordHashed", source, saveFields, preValidatedFields, obj, false, async (jrr, keyname, inVal, flagRequired) => await UserModel.validatePlaintextPasswordConvertToHash(jrr, inVal, flagRequired, true));

		// base fields shared between all? (notes, etc.)
		await this.validateMergeAsyncBaseFields(jrResult, options, flagSave, req, source, saveFields, preValidatedFields, obj);


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
		const docs = await this.findAllSelect("_id shortcode label");
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



}


// export the class as the sole export
module.exports = RoomModel;
