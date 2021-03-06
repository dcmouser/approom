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
const appdef = jrequire("appdef");

// our helper modules
const jrlog = require("../helpers/jrlog");
const jrhMisc = require("../helpers/jrh_misc");



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
				label: "Id",
				readOnly: true,
				mongoose: {
					type: mongoose.Schema.ObjectId,
					auto: true,
				},
			},

		};
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	// Override to create minimal model
	// create new obj -- used by classes which are super minimal (LogModel)
	static createModel(inobj) {
		const obj = {
			...inobj,
		};
		const model = this.newMongooseModel(obj);
		return model;
	}
	//---------------------------------------------------------------------------





	//---------------------------------------------------------------------------
	static async validateMergeAsyncBaseFields(jrContext, options, flagSave, source, saveFields, preValidatedFields, obj) {
		// nothing to do for minimal
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	// override this to default to real delete for some models
	static getDefaultDeleteDisableMode() {
		return appdef.DefMdbRealDelete;
	}
	//---------------------------------------------------------------------------


}






// export the class as the sole export
module.exports = ModelBaseMongooseMinimal;
