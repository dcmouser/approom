// approom
// file model
// v1.0.0 on 5/1/19 by mouser@donationcoder.com
//
// The File model helps us track data files that are created by users/apps within the system
//  a File model object represents meta information for an actual filesystem file

"use strict";

// modules
const mongoose = require("mongoose");

// models
const RoomdataModel = require("./roomdata");

// our helper modules
const jrhelpers = require("../helpers/jrhelpers");
const jrlog = require("../helpers/jrlog");

class FileModel extends RoomdataModel {

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
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	static getSchemaDefinition() {
		return {
			...(this.getBaseSchemaDefinition()),
			roomid: {
				type: mongoose.Schema.ObjectId,
				required: true,
			},
			path: {
				type: String,
				required: true,
			},
			label: {
				type: String,
			},
			sizeInBytes: {
				type: Number,
			},
		};
	}

	static getSchemaDefinitionExtra() {
		return {
			// ...(this.getBaseSchemaDefinitionExtra()),
			...super.getSchemaDefinitionExtra(),
			/*
			roomid: {
				label: "Room Id",
				valueFunction: (viewType, req, obj, helperData) => {
					var viewUrl, roomLabel, rethtml, roomid;
					if (viewType === "view") {
						viewUrl = RoomModel.getCrudUrlBase("view", obj.roomid);
						roomLabel = helperData.roomLabel;
						rethtml = `${roomLabel} (<a href="${viewUrl}">#${obj.roomid}</a>)`;
						return rethtml;
					}
					if (viewType === "edit") {
						roomid = obj ? obj.roomid : null;
						rethtml = jrhmisc.jrHtmlFormOptionListSelect("roomid", helperData.roomlist, roomid);
						return rethtml;
					}
					if (viewType === "list") {
						viewUrl = RoomModel.getCrudUrlBase("view", obj.roomid);
						rethtml = `<a href="${viewUrl}">${obj.roomid}</a>`;
						return rethtml;
					}
					return undefined;
				},
				// alternative generic way to have crud pages link to this val
				// crudLink: AppModel.getCrudUrlBase(),
			},
			*/
			path: {
				label: "Path",
			},
			label: {
				label: "Label",
			},
			sizeInBytes: {
				label: "Size in bytes",
			},
		};
	}
	//---------------------------------------------------------------------------







	//---------------------------------------------------------------------------
	// ATTN: TODO - duplicate code in file model, consolidate!

	// crud add/edit form helper data
	// in case of rooms, this should be the list of APPS that the USER has access to
	static async calcCrudEditHelperData(user, id) {
		var reta = super.calcCrudEditHelperData(user, id);
		return reta;
	}

	// crud helper for view
	static async calcCrudViewHelperData(req, res, id, obj) {
		var reta = super.calcCrudViewHelperData(req, res, id, obj);
		return reta;
	}
	//---------------------------------------------------------------------------








	//---------------------------------------------------------------------------
	static getSaveFields(req, operationType) {
		// operationType is commonly "crudAdd", "crudEdit"
		// return an array of field names that the user can modify when saving an object
		// this is a safety check to allow us to handle form data submitted flexibly and still keep tight control over what data submitted is used
		// subclasses implement; by default we return empty array
		// NOTE: this list can be generated dynamically based on logged in user
		var reta = super.getSaveFields(req, operationType);

		if (operationType === "crudAdd" || operationType === "crudEdit") {
			reta = jrhelpers.mergeArraysKeepDupes(reta, ["path", "label", "sizeInBytes"]);
		}

		return reta;
	}




	// crud add/edit
	static async validateAndSave(jrResult, options, flagSave, req, source, saveFields, preValidatedFields, obj) {
		// parse form and extrace validated object properies; return if error
		// obj will either be a loaded object if we are editing, or a new as-yet-unsaved model object if adding

		// first base class work (but make sure to tell it NOT to save)
		var objdoc;

		await super.validateAndSave(jrResult, options, false, req, source, saveFields, preValidatedFields, obj);

		// now our specific derived class fields
		if (!jrResult.isError()) {
			await this.validateMergeAsync(jrResult, "path", "", source, saveFields, preValidatedFields, obj, true, async (jrr, keyname, inVal) => await this.validateModelFieldString(jrr, keyname, inVal, obj));
			await this.validateMergeAsync(jrResult, "label", "", source, saveFields, preValidatedFields, obj, true, (jrr, keyname, inVal) => this.validateModelFieldString(jrr, keyname, inVal));
			await this.validateMergeAsync(jrResult, "sizeInBytes", "", source, saveFields, preValidatedFields, obj, true, (jrr, keyname, inVal) => this.validateModelFieldInteger(jrr, keyname, inVal));
		}

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













}


// export the class as the sole export
module.exports = FileModel;
