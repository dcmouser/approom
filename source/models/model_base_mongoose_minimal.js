/**
 * @module models/model_base_mongoose_minimal
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 5/1/19
 * @description
 * Alternative super base model for when objects are lighter weight than normal ModelBaseMongoose
 */

"use strict";


// modules
const mongoose = require("mongoose");


// requirement service locator
const jrequire = require("../helpers/jrequire");

// models
const ModelBaseMongoose = jrequire("models/model_base_mongoose");

// controllers
const appconst = jrequire("appconst");

// our helper modules
const jrlog = require("../helpers/jrlog");
const jrhMisc = require("../helpers/jrh_misc");
const JrResult = require("../helpers/jrresult");



/**
 * Alternative super base model for when objects are lighter weight than normal ModelBaseMongoose
 *
 * @class ModelBaseMongooseMinimal
 * @extends {ModelBaseMongoose}
 */
class ModelBaseMongooseMinimal extends ModelBaseMongoose {

	//---------------------------------------------------------------------------
	getModelClass() {
		// subclass overriding function that returns class instance (each subclass MUST implement this)
		return ModelBaseMongooseMinimal;
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	// Overrides for more minimal core fields

	static getBaseSchemaDefinition() {
		// used by log and other minimal models?
		return {
			_id: {
				type: mongoose.Schema.ObjectId,
				auto: true,
			},

		};
	}

	static getBaseSchemaDefinitionExtra() {
		// extra info for schema field to aid display in our code
		return {
			_id: {
				label: "Id",
				readOnly: ["edit"],
			},

		};
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	// Override to create minimal model
	// create new obj -- used by classes which are super minimal (LogModel)
	static createModel(inobj) {
		var obj = {
			...inobj,
		};
		var model = this.newMongooseModel(obj);
		return model;
	}
	//---------------------------------------------------------------------------





	//---------------------------------------------------------------------------
	static async validateMergeAsyncBaseFields(jrResult, options, flagSave, source, saveFields, preValidatedFields, obj) {
		// nothing to do for minimal
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	// override this to default to real delete for some models
	static getDefaultDeleteDisableMode() {
		return appconst.DefMdbRealDelete;
	}
	//---------------------------------------------------------------------------


}






// export the class as the sole export
module.exports = ModelBaseMongooseMinimal;
