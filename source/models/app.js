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
	static getSaveFields(req, operationType) {
		// operationType is commonly "crudAdd", "crudEdit"
		// return an array of field names that the user can modify when saving an object
		// this is a safety check to allow us to handle form data submitted flexibly and still keep tight control over what data submitted is used
		// subclasses implement; by default we return empty array
		// NOTE: this list can be generated dynamically based on logged in user
		var reta;
		if (operationType === "crudAdd" || operationType === "crudEdit") {
			reta = ["shortcode", "name", "label", "description", "disabled"];
		}
		return reta;
	}


	// crud add/edit
	static async doObjSave(jrResult, req, source, saveFields, obj) {
		// parse form and extrace validated object properies; return if error
		// obj will either be a loaded object if we are editing, or a new as-yet-unsaved model object if adding
		var key, val;

		// set fields from form and validate
		await this.doObjSaveSetAsync(jrResult, "shortcode", source, saveFields, obj, true, async (jrr, keyname, inVal) => await this.validateModelFieldUnique(jrr, keyname, inVal, obj));
		this.doObjSaveSet(jrResult, "name", source, saveFields, obj, true, (jrr, keyname, inVal) => this.validateModelFieldNotEmpty(jrr, keyname, inVal));
		this.doObjSaveSet(jrResult, "label", source, saveFields, obj, true, (jrr, keyname, inVal) => this.validateModelFieldNotEmpty(jrr, keyname, inVal));
		this.doObjSaveSet(jrResult, "description", source, saveFields, obj, true, (jrr, keyname, inVal) => this.validateModelFieldNotEmpty(jrr, keyname, inVal));
		this.doObjSaveSet(jrResult, "disabled", source, saveFields, obj, true, (jrr, keyname, inVal) => this.validateModelFielDisbled(jrr, keyname, inVal));

		/*
		OLD version
		obj.shortcode = await this.validateModelFieldUnique(jrResult, "shortcode", source.shortcode, obj);
		obj.name = this.validateModelFieldNotEmpty(jrResult, "name", source.name);
		obj.label = this.validateModelFieldNotEmpty(jrResult, "label", source.label);
		obj.description = this.validateModelFieldNotEmpty(jrResult, "description", source.description);
		obj.disabled = this.validateModelFielDisbled(jrResult, "disabled", source.disabled);
		*/

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
