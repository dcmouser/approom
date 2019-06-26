// approom
// app model
// v1.0.0 on 5/1/19 by mouser@donationcoder.com
//
// All data in our system is organized at the highest level into a collection of "Apps".
// The App model represents a top-level collections.
// It may contain options for the app, permission requirements, etc.

"use strict";

// our helper modules
const jrhelpers = require("../helpers/jrhelpers");

// models
const ModelBaseMongoose = require("./modelBaseMongoose");





class AppModel extends ModelBaseMongoose {

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
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	static getSchemaDefinition() {
		return {
			...(this.getBaseSchemaDefinition()),
			shortcode: {
				type: String,
				unique: true,
				required: true,
			},
			name: {
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
			shortcode: {
				label: "Shortcode",
			},
			name: {
				label: "Name",
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
		obj.shortcode = await this.validateModelFieldUnique(jrResult, "shortcode", req.body.shortcode, obj);
		obj.name = this.validateModelFieldNotEmpty(jrResult, "name", req.body.name);
		obj.label = this.validateModelFieldNotEmpty(jrResult, "label", req.body.label);
		obj.description = this.validateModelFieldNotEmpty(jrResult, "description", req.body.description);
		obj.disabled = this.validateModelFielDisbled(jrResult, "disabled", req.body.disabled);

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
	static async buildSimpleAppListUserTargetable(user) {
		// build app list, pairs of id -> nicename, that are targetable (ie user can add rooms to) to current logged in user
		var applist = await this.buildSimpleAppList(user);
		return applist;
	}

	// see http://thecodebarbarian.com/whats-new-in-mongoose-53-async-iterators.html
	static async buildSimpleAppList(user) {
		const docs = await this.mongooseModel.find().select("_id name label");
		var applist = [];
		for (const doc of docs) {
			applist[doc._id] = doc.name + " - " + doc.label;
		}
		return applist;
	}

	static async buildSimpleAppIdListUserTargetable(user) {
		const docs = await this.buildSimpleAppListUserTargetable();
		var ids = Object.keys(docs);
		return ids;
	}
	//---------------------------------------------------------------------------


}


// export the class as the sole export
module.exports = AppModel;
