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
const jrlog = require("../helpers/jrlog");
const jrvalidators = require("../helpers/jrvalidators");

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

	// name for acl lookup
	static getAclName() {
		return "app";
	}

	// name for logging
	static getLoggingString() {
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
			label: {
				type: String,
			},
			description: {
				type: String,
			},
			isPublic: {
				type: Boolean,
			},
			supportsFiles: {
				type: Boolean,
			},
		};
	}

	static getSchemaDefinitionExtra() {
		return {
			...(this.getBaseSchemaDefinitionExtra()),
			shortcode: {
				label: "Shortcode",
			},
			label: {
				label: "Label",
			},
			description: {
				label: "Description",
				format: "textarea",
			},
			isPublic: {
				label: "Is public?",
				format: "checkbox",
			},
			supportsFiles: {
				label: "Supports user files?",
				format: "checkbox",
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
			reta = ["shortcode", "label", "description", "notes", "isPublic", "supportsFiles", "disabled"];
		}
		return reta;
	}


	// crud add/edit
	static async validateAndSave(jrResult, options, flagSave, req, source, saveFields, preValidatedFields, obj) {
		// parse form and extrace validated object properies; return if error
		// obj will either be a loaded object if we are editing, or a new as-yet-unsaved model object if adding
		var objdoc;

		// set fields from form and validate
		await this.validateMergeAsync(jrResult, "shortcode", "", source, saveFields, preValidatedFields, obj, true, async (jrr, keyname, inVal) => await this.validateShortcodeUnique(jrr, keyname, inVal, obj));
		// await this.validateMergeAsync(jrResult, "name", "", source, saveFields, preValidatedFields, obj, true, (jrr, keyname, inVal) => this.validateModelFieldNotEmpty(jrr, keyname, inVal));
		await this.validateMergeAsync(jrResult, "label", "", source, saveFields, preValidatedFields, obj, true, (jrr, keyname, inVal) => this.validateModelFieldNotEmpty(jrr, keyname, inVal));
		await this.validateMergeAsync(jrResult, "description", "", source, saveFields, preValidatedFields, obj, true, (jrr, keyname, inVal) => this.validateModelFieldNotEmpty(jrr, keyname, inVal));
		//
		await this.validateMergeAsync(jrResult, "isPublic", "", source, saveFields, preValidatedFields, obj, true, (jrr, keyname, inVal) => jrvalidators.validateCheckbox(jrResult, keyname, inVal, false));
		await this.validateMergeAsync(jrResult, "supportsFiles", "", source, saveFields, preValidatedFields, obj, true, (jrr, keyname, inVal) => jrvalidators.validateCheckbox(jrResult, keyname, inVal, false));

		// base fields shared between all? (notes, etc.)
		await this.validateMergeAsyncBaseFields(jrResult, options, flagSave, req, source, saveFields, preValidatedFields, obj);


		// any validation errors?
		if (jrResult.isError()) {
			return null;
		}

		if (flagSave) {
			// validated successfully
			// save it (success message will be pushed onto jrResult)
			objdoc = await obj.dbSave(jrResult);
		}

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
		const docs = await this.mongooseModel.find().select("_id shortcode label");
		var applist = [];
		for (const doc of docs) {
			applist[doc._id] = doc.shortcode + " - " + doc.label;
		}

		return applist;
	}

	static async buildSimpleAppIdListUserTargetable(user) {
		const docs = await this.buildSimpleAppListUserTargetable(user);
		var ids = Object.keys(docs);
		return ids;
	}
	//---------------------------------------------------------------------------


}


// export the class as the sole export
module.exports = AppModel;
