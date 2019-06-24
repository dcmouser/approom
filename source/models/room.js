// approom
// room model
// v1.0.0 on 5/1/19 by mouser@donationcoder.com
//
// All data in our system is organized at the highest level into a collection of "Apps",
// and then for each App we have "Rooms", which allow a number of users to communicate / share data with each other.
// The Room model manages the data for each virtual room.

"use strict";

// modules
const mongoose = require("mongoose");

// models
const ModelBaseMongoose = require("./modelBaseMongoose");

// our helper modules
const jrhelpers = require("../helpers/jrhelpers");
const jrhmisc = require("../helpers/jrhmisc");



class RoomModel extends ModelBaseMongoose {

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
		};
	}

	static getSchemaDefinitionExtra() {
		return {
			...(this.getBaseSchemaDefinitionExtra()),
			appid: {
				label: "App Id",
				valueFunctions: {
					viewDelete: (obj, helperData) => {
						var appLabel = helperData.appLabel;
						var rethtml = `${appLabel} (#${obj.appid})`;
						return rethtml;
					},
					addEdit: (obj, helperData) => {
						var appid = obj ? obj.appid : null;
						var rethtml = jrhmisc.jrHtmlFormOptionListSelect("appid", helperData.applist, appid);
						return rethtml;
					},
				},
			},
			shortcode: {
				label: "Shortcode",
			},
			label: {
				label: "Label",
			},
			description: {
				label: "Description",
			},
		};
	}
	//---------------------------------------------------------------------------






	//---------------------------------------------------------------------------
	// crud add/edit
	static async doAddEditFromFormReturnObj(jrResult, req, res, formTypeStr, obj) {
		// parse form and extrace validated object properies; return if error
		// obj will either be a loaded object if we are editing, or a new as-yet-unsaved model object if adding

		// set fields from form and validate
		obj.appid = req.body.appid;
		obj.shortcode = req.body.shortcode;
		obj.label = req.body.label;
		obj.description = req.body.description;

		// validate fields
		await this.validateModelFieldUnique(jrResult, "shortcode", obj.shortcode, obj);
		this.validateModelFieldNotEmpty(jrResult, "label", obj.label);
		this.validateModelFieldNotEmpty(jrResult, "description", obj.description);
		// ATTN: TODO appid is not yet validated
		//
		// any errors?
		if (jrResult.isError()) {
			return null;
		}

		// validated successfully

		// save it
		var objdoc = await obj.dbSave();

		// success
		jrResult.pushSuccess(this.getNiceName() + " " + jrhelpers.getFormTypeStrToPastTenseVerb(formTypeStr) + " on " + jrhelpers.getNiceNowString() + ".");

		// return the saved object
		return objdoc;
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	// crud add/edit form helper data
	// in case of rooms, this should be the list of APPS that the USER has access to
	static async calcCrudAddEditHelperData(req, res, id) {
		// build app list, pairs of id -> nicename
		const AppModel = require("./app");
		const applist = await AppModel.buildSimpleAppListUserTargetable(req);

		// return it
		return {
			applist,
		};
	}

	// crud helper for view
	static async calcCrudViewDeleteHelperData(req, res, id, obj) {
		// get nice label of the app it's attached to
		var appLabel;
		const appid = obj.appid;
		if (appid) {
			const AppModel = require("./app");
			const app = await AppModel.findOneById(appid);
			if (app) {
				appLabel = app.name + " - " + app.label;
			}
		}
		return {
			appLabel,
		};
	}
	//---------------------------------------------------------------------------



}


// export the class as the sole export
module.exports = RoomModel;
