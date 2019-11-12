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
const ModelBaseMongoose = require("./modelBaseMongoose");
const arserver = require("../controllers/server");

// our helper modules
const jrhelpers = require("../helpers/jrhelpers");
const jrhmisc = require("../helpers/jrhmisc");


class RoomdataModel extends ModelBaseMongoose {

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
	static getSchemaDefinition() {
		return {
			...(this.getBaseSchemaDefinition()),
			roomid: {
				type: mongoose.Schema.ObjectId,
				required: true,
			},
		};
	}

	static getSchemaDefinitionExtra() {
		const RoomModel = require("./room");

		return {
			...(this.getBaseSchemaDefinitionExtra()),
			roomid: {
				label: "Room Id",
				valueFunction: (viewType, fieldName, req, obj, helperData) => {
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
		};
	}
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	// ATTN: TODO - duplicate code in file model, consolidate!

	// crud add/edit form helper data
	// in case of rooms, this should be the list of APPS that the USER has access to
	static async calcCrudEditHelperData(user, id) {
		// build app list, pairs of id -> nicename
		const RoomModel = require("./room");
		const roomlist = await RoomModel.buildSimpleRoomListUserTargetable(user);
		// return it
		return {
			roomlist,
		};
	}

	// crud helper for view
	static async calcCrudViewHelperData(req, res, id, obj) {
	// get nice label of the app it's attached to
		var roomLabel;
		const roomid = obj.roomid;
		if (roomid) {
			const RoomModel = require("./room");
			const room = await RoomModel.findOneById(roomid);
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
	static getSaveFields(req, operationType) {
		// operationType is commonly "crudAdd", "crudEdit"
		// return an array of field names that the user can modify when saving an object
		// this is a safety check to allow us to handle form data submitted flexibly and still keep tight control over what data submitted is used
		// subclasses implement; by default we return empty array
		// NOTE: this list can be generated dynamically based on logged in user
		var reta;
		if (operationType === "crudAdd" || operationType === "crudEdit") {
			reta = ["roomid", "disabled", "notes"];
		}
		return reta;
	}




	// crud add/edit
	static async validateAndSave(jrResult, options, flagSave, req, source, saveFields, preValidatedFields, obj) {
		// parse form and extrace validated object properies; return if error
		// obj will either be a loaded object if we are editing, or a new as-yet-unsaved model object if adding
		var objdoc;

		// get logged in user
		var user = await arserver.getLoggedInUser(req);

		// ATTN: not all of these file fields are currently validated correctly, because they should not be user-editable

		// set fields from form and validate
		await this.validateMergeAsync(jrResult, "roomid", "", source, saveFields, preValidatedFields, obj, true, async (jrr, keyname, inVal, flagRequired) => this.validateModelFieldRoomId(jrr, keyname, inVal, user));

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





}


// export the class as the sole export
module.exports = RoomdataModel;
