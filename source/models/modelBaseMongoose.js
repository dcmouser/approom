// approom
// modelBaseMongoose
// v1.0.0 on 5/1/19 by mouser@donationcoder.com
//
// Base class for mongoose derived classes

"use strict";

// modules
const jrhelpers = require("../helpers/jrhelpers");


class ModelBaseMongoose {

	// static class properties
	// this.mongooseModel

	static async setupModelSchema(mongooser) {

		// we only do this IF it"s not yet been done
		if (this.modelSchema !== undefined) {
			console.log("Skipping model rebuild for " + this.getCollectionName());
			return;
		}

		console.log("Setting up model schema for " + this.getCollectionName());

		// compile the model scheme
		this.modelSchema = this.buildSchema(mongooser);

		// 5/8/19 trying to tie our model class to the mongoose model
		// see https://mongoosejs.com/docs/advanced_schemas.html
		// this idea is that this transfers the functions and properties from the model class to the schema
		// This lets us do things like load a user document, and then call methods on the document returned (see user password checking)
		this.modelSchema.loadClass(this);

		// create the mongoose model
		this.mongooseModel = await mongooser.model(this.getCollectionName(), this.modelSchema);
		// ensure the collection is created now even though it"s blank
		await this.mongooseModel.createCollection();

		// debug
		//jrhelpers.consoleLogObj(this.mongooseModel, "mongoose model");

		// any database initialization to be done (e.g. create initial objects/documents, etc.)
		await this.dbInit();
	}


	static async dbInit() {
		// nothing to do in base class
	}


	// create new user
	static createNewObj() {
		var obj = {
			version: this.getVersion(),
			creationDate: new Date,
			modificationDate: new Date,
			enabled: 1
		};
		return obj;
	}


	static getUniversalSchemaObj() {
		// some base schema properties for ALL models
		// this helps us keep track of some basic stuff for everything
		var obj = {
			version: {type: Number},
			creationDate: {type: Date},
			modificationDate: {type: Date},
			enabled: {type: Number}
		};
		return obj;
	}

}


// export the class as the sole export
module.exports = ModelBaseMongoose