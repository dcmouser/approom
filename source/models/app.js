/**
 * @module models/app
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 5/1/19
 * @description
 * All data in our system is organized at the highest level into a collection of "Apps".
 * The App model represents a top-level collections.
 * It is the central object in the project.
 * It may contain options for the app, permission requirements, etc.
 */

"use strict";


// requirement service locator
const jrequire = require("../helpers/jrequire");

// our helper modules
const jrhValidate = require("../helpers/jrh_validate");
const jrdebug = require("../helpers/jrdebug");
const jrhMongo = require("../helpers/jrh_mongo");
const jrhText = require("../helpers/jrh_text");
const arserver = require("../controllers/arserver");

// models
const ModelBaseMongoose = jrequire("models/model_base_mongoose");

// controllers
const appdef = jrequire("appdef");




/**
 * Mongoose database model representing Apps in the system, the top level objects.
 *
 * @class AppModel
 * @extends {ModelBaseMongoose}
 */
class AppModel extends ModelBaseMongoose {

	//---------------------------------------------------------------------------
	getModelClass() {
		// subclass overriding function that returns class instance (each subclass MUST implement this)
		return AppModel;
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	// global static version info
	static getVersion() { return 1; }

	// db collection name for this model
	static getCollectionName() {
		return "apps";
	}

	// nice name for display
	static getNiceName() {
		return "App";
	}

	// name for acl lookup
	static getAclName() {
		return "app";
	}

	// name for logging
	static getLoggingString() {
		return "App";
	}

	// should some user ACL own each instance?
	static getShouldBeOwned() {
		return true;
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	static calcSchemaDefinition() {
		return {
			...(this.getBaseSchemaDefinition()),
			//
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
			framework: {
				label: "Framework",
				mongoose: {
					type: String,
				},
				valueFunction: this.valueFunctionAppFramework,
			},
			isPublic: {
				label: "Is public?",
				format: "checkbox",
				mongoose: {
					type: Boolean,
				},
			},
			supportsFiles: {
				label: "Supports user files?",
				format: "checkbox",
				mongoose: {
					type: Boolean,
				},
			},
			roles: {
				label: "Roles",
				readOnly: true,
				filterSize: 0,
				valueFunction: this.makeModelValueFunctionRoleOnObjectList(AppModel),
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
			reta = ["shortcode", "label", "description", "notes", "isPublic", "supportsFiles", "disabled", "extraData", "framework"];
		}
		return reta;
	}


	// crud add/edit
	static async doValidateAndSave(jrContext, options, flagSave, user, source, saveFields, preValidatedFields, ignoreFields, obj) {
		// parse form and extrace validated object properies; return if error
		// obj will either be a loaded object if we are editing, or a new as-yet-unsaved model object if adding
		let objdoc;

		// set fields from form and validate
		await this.validateMergeAsync(jrContext, "shortcode", "", source, saveFields, preValidatedFields, obj, true, async (jrr, keyname, inVal, flagRequired) => await this.validateShortcodeUnique(jrr, keyname, inVal, obj));
		// await this.validateMergeAsync(jrContext, "name", "", source, saveFields, preValidatedFields, obj, true, (jrr, keyname, inVal, flagRequired) => jrhValidate.validateString(jrr, keyname, inVal, flagRequired));
		await this.validateMergeAsync(jrContext, "label", "", source, saveFields, preValidatedFields, obj, true, (jrr, keyname, inVal, flagRequired) => jrhValidate.validateString(jrr, keyname, inVal, flagRequired));
		await this.validateMergeAsync(jrContext, "description", "", source, saveFields, preValidatedFields, obj, true, (jrr, keyname, inVal, flagRequired) => jrhValidate.validateString(jrr, keyname, inVal, flagRequired));
		//
		await this.validateMergeAsync(jrContext, "framework", "", source, saveFields, preValidatedFields, obj, true, (jrr, keyname, inVal, flagRequired) => this.validateAppFrameworkName(jrr, keyname, inVal, flagRequired));
		//
		await this.validateMergeAsync(jrContext, "isPublic", "", source, saveFields, preValidatedFields, obj, true, (jrr, keyname, inVal, flagRequired) => jrhValidate.validateTrueFalse(jrr, keyname, inVal, flagRequired));
		await this.validateMergeAsync(jrContext, "supportsFiles", "", source, saveFields, preValidatedFields, obj, true, (jrr, keyname, inVal, flagRequired) => jrhValidate.validateTrueFalse(jrr, keyname, inVal, flagRequired));

		// base fields shared between all? (notes, etc.)
		await this.validateMergeAsyncBaseFields(jrContext, options, flagSave, source, saveFields, preValidatedFields, obj);

		// complain about fields in source that we aren't allowed to save
		await this.validateComplainExtraFields(jrContext, options, source, saveFields, preValidatedFields, ignoreFields);

		// any validation errors?
		if (jrContext.isError()) {
			return null;
		}

		if (flagSave) {
			// validated successfully; save it
			objdoc = await obj.dbSave(jrContext);
		}

		// return the saved object
		return objdoc;
	}
	//---------------------------------------------------------------------------

	//---------------------------------------------------------------------------
	static async buildSimpleAppListUserTargetable(user) {
		// build app list, pairs of id -> nicename, that are targetable (ie user can add rooms to) to current logged in user
		const applist = await this.buildSimpleAppList(user);
		return applist;
	}

	// see http://thecodebarbarian.com/whats-new-in-mongoose-53-async-iterators.html
	static async buildSimpleAppList(user) {
		const docs = await this.mFindAllAndSelect(null, "_id shortcode label");
		const applist = [];
		for (const doc of docs) {
			applist[doc._id] = doc.shortcode + " - " + doc.label;
		}

		return applist;
	}

	static async buildSimpleAppIdListUserTargetable(user) {
		const docs = await this.buildSimpleAppListUserTargetable(user);
		const ids = Object.keys(docs);
		return ids;
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
		const roomIdList = await this.getAssociatedRoomsByAppId(jrContext, id);
		if (jrContext.isError()) {
			return;
		}

		if (roomIdList.length === 0) {
			return;
		}

		// delete them
		const RoomModel = jrequire("models/room");
		await RoomModel.doChangeModeByIdList(jrContext, roomIdList, mode, true);
		if (!jrContext.isError()) {
			const modeLabel = jrhText.capitalizeFirstLetter(appdef.DefStateModeLabels[mode]);
			jrContext.pushSuccess(modeLabel + " " + RoomModel.getNiceNamePluralized(roomIdList.length) + " attached to " + this.getNiceName() + " #" + id + ".");
		}
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	static async getAssociatedRoomsByAppId(jrContext, appid) {
		// get a list (array) of all room ids that are attached to this app

		const RoomModel = jrequire("models/room");
		const roomObjs = await RoomModel.mFindAllAndSelect({ appid }, "_id");

		// convert array of objects with _id fields to simple id array
		const roomIds = jrhMongo.convertArrayOfObjectIdsToIdArray(roomObjs);

		return roomIds;
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	static async valueFunctionAppFramework(jrContext, viewType, fieldName, obj, editData, helperData) {
		let val, valHtml;
		// for editing, we want a drop down list of allowed app frameworks
		// for viewing, just show it
		if (editData && editData[fieldName]) {
			val = editData[fieldName];
		} else if (obj) {
			val = obj[fieldName];
		}
		//
		if (viewType !== "edit") {
			// too cpu expensive?
			if (true) {
				const choices = arserver.getAppFrameworkChoices();
				valHtml = jrhText.jrHtmlNiceOptionFromList(choices, val);
			} else {
				valHtml = val;
			}
		} else {
			// edit mode gets a drop down
			const choices = arserver.getAppFrameworkChoices();
			const flagShowBlank = true;
			valHtml = jrhText.jrHtmlFormOptionListSelect(fieldName, choices, val, flagShowBlank);
		}
		return valHtml;
	}



	static validateAppFrameworkName(jrResult, keyname, val, flagRequired) {
		if (!val && flagRequired) {
			jrResult.pushFieldError(keyname, keyname + " cannot be left blank");
			return undefined;
		}
		const choices = arserver.getAppFrameworkChoices();
		if (choices[val]) {
			// ok
			return val;
		}
		// no good
		jrResult.pushFieldError(keyname, keyname + " is not a valid App Framework");
		return undefined;
	}
	//---------------------------------------------------------------------------














}


// export the class as the sole export
module.exports = AppModel;
