// approom
// modelBaseMongooseMinimal
// v1.0.0 on 6/24/19 by mouser@donationcoder.com
//
// Base minimal class for mongoose derived classes

"use strict";

// modules
const mongoose = require("mongoose");

// models
const ModelBaseMongoose = require("./modelBaseMongoose");

// our helper modules
const jrlog = require("../helpers/jrlog");
const jrhelpers = require("../helpers/jrhelpers");
const JrResult = require("../helpers/jrresult");




class ModelBaseMongooseMinimal extends ModelBaseMongoose {

	//---------------------------------------------------------------------------
	// Overrides for more minimal core fields

	static getBaseSchemaDefinition() {
		// used by log and other minimal models?
		return {
			_id: {
				type: mongoose.Schema.ObjectId,
				auto: true,
			},
			creationDate: {
				type: Date,
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
			creationDate: {
				label: "Date created",
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
			creationDate: new Date(),
			...inobj,
		};
		var model = new this.mongooseModel(obj);
		return model;
	}
	//---------------------------------------------------------------------------

}






// export the class as the sole export
module.exports = ModelBaseMongooseMinimal;
