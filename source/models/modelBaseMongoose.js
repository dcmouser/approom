// approom
// modelBaseMongoose
// v1.0.0 on 5/1/19 by mouser@donationcoder.com
//
// Base class for mongoose derived classes

"use strict";

// our helper modules
const jrlog = require("../helpers/jrlog");
const jrhelpers = require("../helpers/jrhelpers");
const JrResult = require("../helpers/jrresult");



class ModelBaseMongoose {

	// static class properties
	// this.mongooseModel


	static getUniversalSchemaObj() {
		// some base schema properties for ALL models
		// this helps us keep track of some basic stuff for everything
		var obj = {
			version: { type: Number },
			creationDate: { type: Date },
			modificationDate: { type: Date },
			enabled: { type: Number },
		};
		return obj;
	}


	static getCrudListHeaders() {
		// function to help admin of db crud listing
		var headers = [
		];
		return headers;
	}


	static async setupModelSchema(mongooser) {

		// we only do this IF it"s not yet been done
		if (this.modelSchema) {
			jrlog.cdebug("Skipping model rebuild for " + this.getCollectionName());
			return;
		}

		jrlog.cdebug("Setting up model schema for " + this.getCollectionName());

		// compile the model scheme
		this.modelSchema = this.buildSchema(mongooser);

		// this is an attempt to cache this information but it doesn't seem to work
		this.modelPropertyList = Object.keys(this.calcSchemaDefinition());

		// 5/8/19 trying to tie our model class to the mongoose model
		// see https://mongoosejs.com/docs/advanced_schemas.html
		// this idea is that this transfers the functions and properties from the model class to the schema
		// This lets us do things like load a user document, and then call methods on the document returned (see user password checking)
		await this.modelSchema.loadClass(this);

		// create the mongoose model
		var collectionName = this.getCollectionName();
		this.mongooseModel = await mongooser.model(collectionName, this.modelSchema);

		// ensure the collection is created now even though it's blank
		// ATTN: 5/11/19 - mongoose/mongodb is having a weird fit here, where it is throwing an error
		//  about connection already exists if while making schema it is creating indexes, even if strict = false
		// so we are going to try to check for collection manually before creating it.
		// note that even with this check, we must use the default strict:false, otherwise we still get a complaint
		if (!await this.collectionExists(mongooser, collectionName)) {
			await this.mongooseModel.createCollection({ strict: false });
		}

		// any database initialization to be done (e.g. create initial objects/documents, etc.)
		await this.dbInit();
	}


	static async collectionExists(mongooser, collectionName) {
		// return true if collection already exists
		var list = await mongooser.connection.db.listCollections({ name: collectionName }).toArray();
		if (list.length > 0) {
			return true;
		}
		// not found
		return false;
	}


	static async dbInit() {
		// nothing to do in base class
	}


	async dbSave() {
		// simple wrapper (for now) around mongoose model save
		// this should always be used instead of superclass save() function
		return await this.save();
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	// create new obj
	static createModel(inobj) {
		var obj = {
			version: this.getVersion(),
			creationDate: new Date(),
			modificationDate: null,
			enabled: 1,
			...inobj,
		};
		var model = new this.mongooseModel(obj);
		return model;
	}


	static calcSchemaDefinition() {
		return {};
	}



	getModelObjPropertyList() {
		// cached value
		if (this.constructor.modelPropertyList) {
			return this.constructor.modelPropertyList;
		}
		var propkeys = Object.keys(this.constructor.calcSchemaDefinition());
		return propkeys;
	}

	//---------------------------------------------------------------------------
	// subclasses implement this
	static async doAddEditFromFormReturnObj(jrResult, req, res, formTypeStr) {
		jrResult.pushError("Internal error: No subclassed proecure to handle doAddEditFromForm for " + this.getCollectionName() + " model");
		return null;
	}

	// subclasses implement this
	static async validateAddEditFormMakeObj(req, res, formTypeStr) {
		var jrResult = JrResult.makeError("ModelCrud", "Internal error: No subclassed proecure to handle validateAddEditFormMakeObj for " + this.getCollectionName() + " model");
		return jrResult;
	}




	static async validateAddEditFormId(jrResult, req, res, formTypeStr) {
		// push error into jrResult on error
		// return {id, existingModel}

		// get id from form
		var id = req.body._id;

		// add form should not have shortcode specified
		if (formTypeStr === "add") {
			// id should be blank in this case
			if (id) {
				jrResult.pushError("Unexpected Id specified in " + this.getNiceName() + " ADD submission.");
				return {};
			}
			// fine
			return {
				id: null,
				existingModel: null,
			};
		}

		// non-add form MUST have shortcode specified
		if (!id) {
			jrResult.pushError("Id for " + this.getNiceName() + " missing from NON-ADD submission.");
			return {};
		}

		// now try to look it up
		var existingModel = await this.findOneById(id);
		if (!existingModel) {
			jrResult.pushError("Lookup of " + this.getNiceName() + " not found for id specified.");
			return {};
		}

		// success
		return {
			id,
			existingModel,
		};
	}


	static async validateAddEditFormIdMakeObj(jrResult, req, res, formTypeStr) {
		// return an object with validated properties
		// OR an instance of jrResult if error

		// get any existing model
		var { id, existingModel } = await this.validateAddEditFormId(jrResult, req, res, formTypeStr);
		if (jrResult.isError()) {
			return null;
		}

		if (!existingModel) {
			// create new one (doesn't save it yet)
			existingModel = this.createModel();
		}

		return existingModel;
	}


	static async validateModelFieldUnique(jrResult, key, val, existingModel) {
		if (!val) {
			jrResult.pushFieldError(key, "Value for " + key + " cannot be blank.");
		}
		// must be unique so we search for collissions
		var criteria;
		if (existingModel._id) {
			// there is an id for the object we are working on, so DONT include that one when searching for a colission
			criteria = {
				[key]: val,
				_id: { $ne: existingModel._id },
			};
		} else {
			criteria = {
				[key]: val,
			};
		}

		var clashObj = await this.mongooseModel.findOne(criteria).exec();
		if (clashObj) {
			// error
			jrResult.pushFieldError(key, "Duplicate " + key + " entry found for another " + this.getNiceName());
			return clashObj;
		}

		return null;
	}

	static validateModelFieldNotEmpty(jrResult, key, val) {
		if (!val) {
			jrResult.pushFieldError(key, "Value for " + key + " cannot be blank.");
		}
	}

	static validateId(jrResult, id) {
		if (!jrhelpers.isValidMongooseObjectId(id)) {
			jrResult.pushError("No valid id specified.");
		}
	}


	static async validateGetObjByIdDoAcl(jrResult, req, res, id, aclTestName) {
		// validate id
		var obj;
		this.validateId(jrResult, id);

		// models
		const arserver = require("../models/server");

		if (!jrResult.isError()) {
			// acl test
			if (!await arserver.aclRequireModelAccess(req, res, this, aclTestName, id)) {
				return null;
			}
			// get object being edited
			obj = await this.findOneById(id);
			if (!obj) {
				jrResult.pushError("Could not find " + this.getNiceName() + " with that Id.");
			}
		}
		//
		if (jrResult.isError()) {
			arserver.renderAclAccessErrorResult(req, res, this, jrResult);
			return null;
		}
		return obj;
	}
	//---------------------------------------------------------------------------






	//---------------------------------------------------------------------------
	// accessor for all derived models
	getIdAsString() {
		if (!this._id) {
			return "";
		}
		return this._id.toString();
	}
	//---------------------------------------------------------------------------





	//---------------------------------------------------------------------------
	static async findOneByShortcode(shortcode) {
		// return null if not found
		if (!shortcode) {
			return null;
		}
		return await this.mongooseModel.findOne({ shortcode }).exec();
	}

	// lookup user by their id
	static async findOneById(id) {
		// return null if not found
		if (!id) {
			return null;
		}
		return await this.mongooseModel.findOne({ _id: id }).exec();
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	static modelPropertyCopy(sourceObj, flagIncludeId) {
		// copy the properties in schema
		var obj = {};
		var keylist = this.getModelPropertyList();

		keylist.forEach((key) => {
			if (key in sourceObj) {
				obj[key] = sourceObj[key];
			}
		});

		if (flagIncludeId) {
			obj._id = sourceObj._id;
		}

		return obj;
	}

	modelObjPropertyCopy(flagIncludeId) {
		// copy the properties in schema
		var obj = {};
		var keylist = this.getModelObjPropertyList();

		keylist.forEach((key) => {
			if (key in this) {
				obj[key] = this[key];
			}
		});

		if (flagIncludeId) {
			obj._id = this._id;
		}

		return obj;
	}


	doDelete(jrResult) {
		this.remove();
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	// subclasses can subclass this for crud add/edit
	static async calcCrudEditHelperData(req, res, id) {
		return undefined;
	}

	// subclasses can subclass this for crud view
	static async calcCrudViewHelperData(req, res, id, obj) {
		return undefined;
	}

	// subclasses can subclass this list grid helper
	static async calcCrudListHelperData(req, res, baseUrl) {
		// schema for obj
		var gridSchema = this.calcSchemaDefinition();
		gridSchema._id = { type: "id" };
		//
		// headers for list grid
		var gridHeaders = [];

		// options for filter construction
		var filterOptions = {
			defaultPageSize: 10,
			minPageSize: 1,
			maxPageSize: 1000,
			defaultSortField: "_id",
			defaultSortDir: "asc",
			protectedFields: [],
			alwaysFilter: [],
		};

		const jrFindFilter = require("../helpers/jrfindfilter");
		var { query, queryOptions, queryUrlData } = jrFindFilter.buildMongooseQueryFromReq(filterOptions, gridSchema, req);

		var queryProjection = "";

		// fetch the array of items to be displayed in grid
		// see https://thecodebarbarian.com/how-find-works-in-mongoose
		var gridItems = await this.mongooseModel.find(query, queryProjection, queryOptions).exec();
		// ATTN: TODO is there a more efficient way to get total count of results for pager?
		var isQueryEmpty = ((Object.keys(query)).length === 0);
		if (isQueryEmpty) {
			queryUrlData.resultCount = await this.mongooseModel.countDocuments();
		} else {
			queryUrlData.resultCount = await this.mongooseModel.countDocuments(query).exec();
		}
		// store other stuff in queryUrl data to aid in making urls for pager and grid links, etc.
		queryUrlData.baseUrl = baseUrl;
		queryUrlData.tableId = this.getCollectionName();

		// return constructed object
		return {
			gridSchema,
			gridHeaders,
			query,
			queryOptions,
			queryUrlData,
			gridItems,
		};
	}
	//---------------------------------------------------------------------------


}






// export the class as the sole export
module.exports = ModelBaseMongoose;
