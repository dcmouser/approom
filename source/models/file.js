/**
 * @module models/file
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 5/1/19
 * @description
 * The File model helps us track data files that are created by users/apps within the system, and references real file system files.
 */

"use strict";


// modules
const mongoose = require("mongoose");


// requirement service locator
const jrequire = require("../helpers/jrequire");

// models
const ModelBaseMongoose = jrequire("models/model_base_mongoose");
const RoomdataModel = jrequire("models/roomdata");

// our helper modules
const jrhMisc = require("../helpers/jrh_misc");
const jrhValidate = require("../helpers/jrh_validate");



/**
 * The File model helps us track data files that are created by users/apps within the system, and references real file system files.
 *
 * @class FileModel
 * @extends {RoomdataModel}
 */
class FileModel extends ModelBaseMongoose {

	//---------------------------------------------------------------------------
	getModelClass() {
		// subclass overriding function that returns class instance (each subclass MUST implement this)
		return FileModel;
	}
	//---------------------------------------------------------------------------

	//---------------------------------------------------------------------------
	// global static version info
	static getVersion() { return 1; }

	// collection name for this model
	static getCollectionName() {
		return "files";
	}

	static getNiceName() {
		return "File";
	}

	// name for acl lookup
	static getAclName() {
		return "file";
	}

	// name for logging
	static getLoggingString() {
		return "File";
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	// ATTN: If we wanted to dervice from another model we would want to return ...super.calcSchemaDefinition(), our custom fields

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
			path: {
				label: "Path",
				mongoose: {
					type: String,
					required: true,
				},
			},
			label: {
				label: "Label",
				mongoose: {
					type: String,
				},
			},
			sizeInBytes: {
				label: "Size in bytes",
				mongoose: {
					type: Number,
				},
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
			reta = ["roomid", "path", "label", "sizeInBytes", "description", "disabled", "notes", "extraData"];
		}

		// ATTN: If we wanted to dervice from another model we would want to return jrhMisc.mergeArraysDedupe(super.getSaveFields(operationType), reta);

		return reta;
	}




	// crud add/edit
	static async doValidateAndSave(jrContext, options, flagSave, user, source, saveFields, preValidatedFields, ignoreFields, obj) {
		// parse form and extrace validated object properies; return if error
		// obj will either be a loaded object if we are editing, or a new as-yet-unsaved model object if adding
		let objdoc;

		// ATTN: If we wanted to dervice from another model we would do super.doValidateAndSave(jrContext, options, FALSE,...) so it would validate and not save
		// and then NOT call validateMergeAsyncBaseFields() here since it would already be called by super, or validateComplain() for same reason

		// set fields from form and validate
		await this.validateMergeAsync(jrContext, "roomid", "", source, saveFields, preValidatedFields, obj, true, async (jrr, keyname, inVal, flagRequired) => this.validateModelFieldRoomId(jrr, keyname, inVal, user));
		await this.validateMergeAsync(jrContext, "label", "", source, saveFields, preValidatedFields, obj, false, (jrr, keyname, inVal, flagRequired) => jrhValidate.validateString(jrr, keyname, inVal, flagRequired));
		await this.validateMergeAsync(jrContext, "description", "", source, saveFields, preValidatedFields, obj, false, (jrr, keyname, inVal, flagRequired) => jrhValidate.validateString(jrr, keyname, inVal, flagRequired));
		//
		await this.validateMergeAsync(jrContext, "path", "", source, saveFields, preValidatedFields, obj, true, (jrr, keyname, inVal, flagRequired) => jrhValidate.validateString(jrr, keyname, inVal, flagRequired));
		await this.validateMergeAsync(jrContext, "sizeInBytes", "", source, saveFields, preValidatedFields, obj, true, (jrr, keyname, inVal, flagRequired) => jrhValidate.validateInteger(jrr, keyname, inVal, flagRequired));

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
module.exports = FileModel;
