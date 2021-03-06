/**
 * @module models/roomdata
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 5/1/19
 * @description
 * Stores arbitrary data objects associated with a room
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
 * Stores arbitrary data objects associated with a room
 *
 * @class RoomdataModel
 * @extends {ModelBaseMongoose}
 */
class RoomdataModel extends ModelBaseMongoose {

	//---------------------------------------------------------------------------
	getModelClass() {
		// subclass overriding function that returns class instance (each subclass MUST implement this)
		return RoomdataModel;
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	// global static version info
	static getVersion() { return 1; }

	// collection name for this model
	static getCollectionName() {
		return "roomdata";
	}

	static getNiceName() {
		return "RoomData";
	}

	// name for acl lookup
	static getAclName() {
		return "roomdata";
	}

	// name for logging
	static getLoggingString() {
		return "Roomdata";
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	static calcSchemaDefinition() {
		const RoomModel = jrequire("models/room");
		return {
			...(this.getBaseSchemaDefinition()),
			//
			roomid: {
				label: "Room Id",
				valueFunction: this.makeModelValueFunctionCrudObjectIdFromList(RoomModel, "roomid", "roomLabel", "roomlist"),
				mongoose: {
					type: mongoose.Schema.ObjectId,
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
		};
	}
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	// crud add/edit form helper data
	// in case of rooms, this should be the list of APPS that the USER has access to
	static async calcCrudEditHelperData(jrContext, user, id) {
		// build app list, pairs of id -> nicename
		const RoomModel = jrequire("models/room");
		const roomlist = await RoomModel.buildSimpleRoomListUserTargetable(user);
		// return it
		return {
			roomlist,
		};
	}

	// crud helper for view
	static async calcCrudViewHelperData(jrContext, id, obj) {
	// get nice label of the app it's attached to
		let roomLabel;
		const roomid = obj.roomid;
		if (roomid) {
			const RoomModel = jrequire("models/room");
			const room = await RoomModel.mFindOneById(roomid);
			if (room) {
				roomLabel = room.shortcode + " - " + room.label;
			}
		}
		return {
			roomLabel,
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
			reta = ["roomid", "label", "description", "disabled", "notes", "extraData"];
		}
		return reta;
	}




	// crud add/edit
	static async doValidateAndSave(jrContext, options, flagSave, user, source, saveFields, preValidatedFields, ignoreFields, obj) {
		// parse form and extrace validated object properies; return if error
		// obj will either be a loaded object if we are editing, or a new as-yet-unsaved model object if adding
		let objdoc;

		// set fields from form and validate
		await this.validateMergeAsync(jrContext, "roomid", "", source, saveFields, preValidatedFields, obj, true, async (jrr, keyname, inVal, flagRequired) => this.validateModelFieldRoomId(jrr, keyname, inVal, user));
		//
		await this.validateMergeAsync(jrContext, "label", "", source, saveFields, preValidatedFields, obj, false, (jrr, keyname, inVal, flagRequired) => jrhValidate.validateString(jrr, keyname, inVal, flagRequired));
		await this.validateMergeAsync(jrContext, "description", "", source, saveFields, preValidatedFields, obj, false, (jrr, keyname, inVal, flagRequired) => jrhValidate.validateString(jrr, keyname, inVal, flagRequired));

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





}


// export the class as the sole export
module.exports = RoomdataModel;
