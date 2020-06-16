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
class FileModel extends RoomdataModel {

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
	static calcSchemaDefinition() {
		return {
			...(this.getBaseSchemaDefinition()),
			//
			roomid: {
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
	// ATTN: TODO - duplicate code in file model, consolidate!

	// crud add/edit form helper data
	// in case of rooms, this should be the list of APPS that the USER has access to
	static async calcCrudEditHelperData(user, id) {
		const reta = super.calcCrudEditHelperData(user, id);
		return reta;
	}

	// crud helper for view
	static async calcCrudViewHelperData(jrContext, id, obj) {
		const reta = super.calcCrudViewHelperData(jrContext, id, obj);
		return reta;
	}
	//---------------------------------------------------------------------------








	//---------------------------------------------------------------------------
	static getSaveFields(operationType) {
		// operationType is commonly "crudAdd", "crudEdit"
		// return an array of field names that the user can modify when saving an object
		// this is a safety check to allow us to handle form data submitted flexibly and still keep tight control over what data submitted is used
		// subclasses implement; by default we return empty array
		// NOTE: this list can be generated dynamically based on logged in user
		let reta = super.getSaveFields(operationType);

		if (operationType === "crudAdd" || operationType === "crudEdit" || operationType === "add") {
			reta = jrhMisc.mergeArraysKeepDupes(reta, ["path", "label", "sizeInBytes"]);
		}

		return reta;
	}




	// crud add/edit
	static async doValidateAndSave(jrContext, options, flagSave, user, source, saveFields, preValidatedFields, ignoreFields, obj) {
		// parse form and extrace validated object properies; return if error
		// obj will either be a loaded object if we are editing, or a new as-yet-unsaved model object if adding

		// first base class work (but make sure to tell it NOT to save)
		let objdoc;

		// ATTN: why do our other model classes not do this...
		// await super.doValidateAndSave(jrContext, options, false, loggedInUser, source, saveFields, preValidatedFields, ignoreFields, obj);

		// now our specific derived class fields
		if (!jrContext.isError()) {
			await this.validateMergeAsync(jrContext, "path", "", source, saveFields, preValidatedFields, obj, true, (jrr, keyname, inVal, flagRequired) => jrhValidate.validateString(jrr, keyname, inVal, flagRequired));
			await this.validateMergeAsync(jrContext, "label", "", source, saveFields, preValidatedFields, obj, true, (jrr, keyname, inVal, flagRequired) => jrhValidate.validateString(jrr, keyname, inVal, flagRequired));
			await this.validateMergeAsync(jrContext, "sizeInBytes", "", source, saveFields, preValidatedFields, obj, true, (jrr, keyname, inVal, flagRequired) => jrhValidate.validateInteger(jrr, keyname, inVal, flagRequired));
		}

		// complain about fields in source that we aren't allowed to save
		await this.validateComplainExtraFields(jrContext, options, source, saveFields, preValidatedFields, ignoreFields);

		// any validation errors?
		if (jrContext.isError()) {
			return null;
		}

		// validated successfully

		if (flagSave) {
			// save it
			objdoc = await obj.dbSave(jrContext);
		}

		// return the saved object
		return objdoc;
	}
	//---------------------------------------------------------------------------













}


// export the class as the sole export
module.exports = FileModel;
