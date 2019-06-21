// approom
// app model
// v1.0.0 on 5/1/19 by mouser@donationcoder.com
//
// All data in our system is organized at the highest level into a collection of "Apps".
// The App model represents a top-level collections.
// It may contain options for the app, permission requirements, etc.

"use strict";

// models
const ModelBaseMongoose = require("./modelBaseMongoose");

// our helper modules
const jrlog = require("../helpers/jrlog");
const JrResult = require("../helpers/jrresult");
const jrhelpers = require("../helpers/jrhelpers");


class AppModel extends ModelBaseMongoose {

	// global static version info
	static getVersion() { return 1; }

	// db collection name for this model
	static getCollectionName() {
		return "apps";
	}

	static getNiceName() {
		return "App";
	}


	static calcSchemaDefinition() {
		return {
			...(this.getUniversalSchemaObj()),
			shortcode: { type: String, unique: true, required: true },
			name: { type: String, unique: true, required: true },
			label: { type: String },
			description: { type: String },
		};
	}

	static getCrudListHeaders() {
		// function to help admin of db crud listing
		var headers = [
			super.getCrudListHeaders(),
		];
		return headers;
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	// User model mongoose db schema
	static buildSchema(mongooser) {
		this.schema = new mongooser.Schema(this.calcSchemaDefinition(), {
			collection: this.getCollectionName(),
		});
		return this.schema;
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	// crud add/edit
	static async doAddEditFromFormReturnObj(jrResult, req, res, formTypeStr, obj) {
		// parse form and extrace validated object properies; return if error
		// obj will either be a loaded object if we are editing, or a new as-yet-unsaved model object if adding

		// set fields from form and validate
		obj.shortcode = req.body.shortcode;
		obj.name = req.body.name;
		obj.label = req.body.label;
		obj.description = req.body.description;

		// validate fields
		await this.validateModelFieldUnique(jrResult, "shortcode", obj.shortcode, obj);
		await this.validateModelFieldUnique(jrResult, "name", obj.name, obj);
		this.validateModelFieldNotEmpty(jrResult, "label", obj.label);
		this.validateModelFieldNotEmpty(jrResult, "description", obj.description);
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
	static async buildSimpleAppListUserTargetable(req) {
		// build app list, pairs of id -> nicename, that are targetable (ie user can add rooms to) to current logged in user
		const arserver = require("../models/server");
		const userid = arserver.getLoggedInLocalLoginIdFromSession(req);
		var applist = await this.buildSimpleAppList();
		return applist;
	}

	// see http://thecodebarbarian.com/whats-new-in-mongoose-53-async-iterators.html
	static async buildSimpleAppList() {
		var applist = [];
		const docs = await this.mongooseModel.find().select("_id name label");
		for (const doc of docs) {
			applist[doc._id] = doc.name + " - " + doc.label;
		}
		return applist;
	}
	//---------------------------------------------------------------------------


}


// export the class as the sole export
module.exports = AppModel;
