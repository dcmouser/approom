// approom
// modelBaseMongoose
// v1.0.0 on 5/1/19 by mouser@donationcoder.com
//
// Base class for mongoose derived classes

"use strict";

// our helper modules
const jrhelpers = require("../helpers/jrhelpers");
const jrlog = require("../helpers/jrlog");


class ModelBaseMongoose {

	// static class properties
	// this.mongooseModel

	static async setupModelSchema(mongooser) {

		// we only do this IF it"s not yet been done
		if (this.modelSchema !== undefined) {
			jrlog.cdebug("Skipping model rebuild for " + this.getCollectionName());
			return;
		}

		jrlog.cdebug("Setting up model schema for " + this.getCollectionName());

		// compile the model scheme
		this.modelSchema = this.buildSchema(mongooser);

		// 5/8/19 trying to tie our model class to the mongoose model
		// see https://mongoosejs.com/docs/advanced_schemas.html
		// this idea is that this transfers the functions and properties from the model class to the schema
		// This lets us do things like load a user document, and then call methods on the document returned (see user password checking)
		await this.modelSchema.loadClass(this);

		// create the mongoose model
		var collectionName = this.getCollectionName();
		this.mongooseModel = await mongooser.model(collectionName, this.modelSchema);

		// ensure the collection is created now even though it's blank
		// ATTN: 5/11/19 - mongoose/mongodb is having a weird fit here, where it is throwing an error about connection already exists if while making schema it is creating indexes, even if strict = false
		// so we are going to try to check for collection manually before creating it.
		// note that even with this check, we must use the default strict:false, otherwise we still get a complaint
		if (!await this.collectionExists(mongooser, collectionName)) {
			await this.mongooseModel.createCollection({strict:false});				
		}

		// debug
		//jrlog.cinfoObj(this.mongooseModel, "mongoose model");
		//jrlog.cdebugObj(this.mongooseModel,"mongoose model");

		// any database initialization to be done (e.g. create initial objects/documents, etc.)
		await this.dbInit();
	}


	static async collectionExists(mongooser, collectionName) {
		// return true if collection already exists
		var list = await mongooser.connection.db.listCollections({name: collectionName}).toArray();
		//jrlog.cdebugObj(list,"collectionList");
		if (list.length>0) {
			return true;
		}
		// not found
		return false;
	}


	static async dbInit() {
		// nothing to do in base class
	}



	// create new obj
	static createModel(inobj) {
		var obj = {
			version: this.getVersion(),
			creationDate: new Date,
			modificationDate: new Date,
			enabled: 1,
			...inobj
		};
		var model = new this.mongooseModel(obj);
		return model;
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