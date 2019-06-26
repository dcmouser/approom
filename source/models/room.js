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
		const AppModel = require("./app");
		return {
			...(this.getBaseSchemaDefinitionExtra()),
			appid: {
				label: "App Id",
				valueFunctions: {
					view: (obj, helperData) => {
						var viewUrl = AppModel.getCrudUrlBase("view", obj.appid);
						var appLabel = helperData.appLabel;
						var rethtml = `${appLabel} (<a href="${viewUrl}">#${obj.appid}</a>)`;
						return rethtml;
					},
					edit: (obj, helperData) => {
						var appid = obj ? obj.appid : null;
						var rethtml = jrhmisc.jrHtmlFormOptionListSelect("appid", helperData.applist, appid);
						return rethtml;
					},
					list: (obj, helperData) => {
						var viewUrl = AppModel.getCrudUrlBase("view", obj.appid);
						var rethtml = `<a href="${viewUrl}">${obj.appid}</a>`;
						return rethtml;
					},
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
			},
		};
	}
	//---------------------------------------------------------------------------






	//---------------------------------------------------------------------------
	// crud add/edit
	static async doAddEditFromFormReturnObj(jrResult, req, res, formTypeStr, obj) {
		// parse form and extrace validated object properies; return if error
		// obj will either be a loaded object if we are editing, or a new as-yet-unsaved model object if adding

		// get logged in user
		const arserver = require("../controllers/server");
		var user = await arserver.getLoggedInUser(req);

		// set fields from form and validate
		// obj.appid = this.validateModelFieldNotEmpty(jrResult, "appid", req.body.appid);
		obj.appid = await this.validateModelFieldAppId(jrResult, "appid", req.body.appid, user);
		obj.shortcode = await this.validateModelFieldUnique(jrResult, "shortcode", req.body.shortcode, obj);
		obj.label = this.validateModelFieldNotEmpty(jrResult, "label", req.body.label);
		obj.description = this.validateModelFieldNotEmpty(jrResult, "description", req.body.description);
		obj.disabled = this.validateModelFielDisbled(jrResult, "disabled", req.body.disabled);

		// ATTN: TODO appid is not yet validated

		// any validation errors?
		if (jrResult.isError()) {
			return null;
		}

		// validated successfully
		// save it (success message will be pushed onto jrResult)
		var objdoc = await obj.dbSave(jrResult);

		// return the saved object
		return objdoc;
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	// crud add/edit form helper data
	// in case of rooms, this should be the list of APPS that the USER has access to
	static async calcCrudAddEditHelperData(user, id) {
		// build app list, pairs of id -> nicename
		const AppModel = require("./app");
		const applist = await AppModel.buildSimpleAppListUserTargetable(user);

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
