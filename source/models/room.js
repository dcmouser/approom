// approom
// room model
// v1.0.0 on 5/1/19 by mouser@donationcoder.com
//
// All data in our system is organized at the highest level into a collection of "Apps",
// and then for each App we have "Rooms", which allow a number of users to communicate / share data with each other.
// The Room model manages the data for each virtual room.

"use strict";

// models
const ModelBaseMongoose = require("./modelBaseMongoose");

// our helper modules
const jrhelpers = require("../helpers/jrhelpers");



class RoomModel extends ModelBaseMongoose {

	// global static version info
	static getVersion() { return 1; }

	// collection name for this model
	static getCollectionName() {
		return "rooms";
	}

	static getNiceName() {
		return "Room";
	}

	// User model mongoose db schema
	static buildSchema(mongooser) {
		this.schema = new mongooser.Schema(this.calcSchemaDefinition(), {
			collection: this.getCollectionName(),
		});
		return this.schema;
	}

	static calcSchemaDefinition() {
		return {
			...(this.getUniversalSchemaObj()),
			appid: { type: String, required: true },
			shortcode: { type: String, unique: true, required: true },
			label: { type: String },
			description: { type: String },
		};
	}




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
	static async calcCrudEditHelperData(req, res, id) {
		// build app list, pairs of id -> nicename
		const AppModel = require("./app");
		const applist = await AppModel.buildSimpleAppListUserTargetable(req);

		// return it
		return {
			applist,
		};
	}

	// crud helper for view
	static async calcCrudViewHelperData(req, res, id, obj) {
		// get nice label of the app it's attached to
		var applabel;
		const appid = obj.appid;
		if (appid) {
			const AppModel = require("./app");
			const app = await AppModel.findOneById(appid);
			if (app) {
				applabel = app.name + " - " + app.label;
			}
		}
		return {
			applabel,
		};
	}
	//---------------------------------------------------------------------------



}


// export the class as the sole export
module.exports = RoomModel;
