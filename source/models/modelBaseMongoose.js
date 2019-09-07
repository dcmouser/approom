// approom
// modelBaseMongoose
// v1.0.0 on 5/1/19 by mouser@donationcoder.com
//
// Base class for mongoose derived classes

"use strict";

// modules
const mongoose = require("mongoose");

// our helper modules
const jrlog = require("../helpers/jrlog");
const jrhelpers = require("../helpers/jrhelpers");
const JrResult = require("../helpers/jrresult");




class ModelBaseMongoose {

	//---------------------------------------------------------------------------
	static getBaseSchemaDefinition() {
		// some base schema properties for ALL models
		// this helps us keep track of some basic stuff for everything
		return {
			_id: {
				type: mongoose.Schema.ObjectId,
				auto: true,
			},
			version: {
				type: Number,
			},
			creationDate: {
				type: Date,
			},
			modificationDate: {
				type: Date,
			},
			disabled: {
				type: Number,
			},
			extraData: {
				type: Map,
			},
		};
	}

	static getBaseSchemaDefinitionExtra() {
		// extra info for schema field to aid display in our code
		return {
			_id: {
				label: "Id",
				readOnly: ["edit"],
				filterSize: 25,
			},
			version: {
				label: "Ver.",
				readOnly: ["edit"],
				filterSize: 2,
			},
			creationDate: {
				label: "Date created",
				hide: ["edit"],
			},
			modificationDate: {
				label: "Date modified",
				readOnly: ["edit"],
			},
			disabled: {
				label: "Disabled?",
				choices: {
					0: "Enabled",
					1: "Disabled",
					2: "Deleted",
				},
				filterSize: 3,
			},
			extraData: {
				label: "Extra data",
				valueFunction: async (viewType, req, obj, helperData) => {
					if (obj) {
						return JSON.stringify(obj.extraData, null, " ");
					}
					return "";
				},
				filterSize: 0,
				readOnly: ["edit"],
			},
		};
	}
	//---------------------------------------------------------------------------





	//---------------------------------------------------------------------------
	// User model mongoose db schema
	static buildSchema(mongooser) {
		this.schema = new mongooser.Schema(this.getSchemaDefinition(), {
			collection: this.getCollectionName(),
		});
		return this.schema;
	}


	// subbclasses implement this
	static getSchemaDefinition() {
		return {};
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	// ATTN: TODO -- cache the schema definition and extras
	static getSchemaExtraFieldVal(fieldName, key, defaultVal) {
		var modelSchemaExtra = this.getSchemaDefinitionExtra();
		if (modelSchemaExtra[fieldName] && modelSchemaExtra[fieldName][key] !== undefined) {
			return modelSchemaExtra[fieldName][key];
		}
		return defaultVal;
	}

	static async getSchemaExtraKeysMatchingViewType(viewType, req) {
		var retKeys = [];
		var modelSchemaExtra = this.getSchemaDefinitionExtra();
		var keys = Object.keys(modelSchemaExtra);
		var keyHideArray;
		var visfunc, isVisible;

		await jrhelpers.asyncForEach(keys, async (key) => {
			keyHideArray = modelSchemaExtra[key].hide;
			if (jrhelpers.isInAnyArray(viewType, keyHideArray)) {
				retKeys.push(key);
			} else {
				visfunc = modelSchemaExtra[key].visibleFunction;
				if (visfunc) {
					isVisible = await visfunc(viewType, req, null, null);
					if (!isVisible) {
						retKeys.push(key);
					}
				}
			}
		});

		return retKeys;
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	static setCrudBaseUrl(urlPath) {
		this.crudBaseUrl = urlPath;
	}

	static getCrudUrlBase(suburl, id) {
		// return url for crud access, adding suburl and id
		var url = this.crudBaseUrl;
		if (suburl) {
			url += "/" + suburl;
		}
		if (id) {
			url += "/" + id.toString();
		}
		return url;
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	// create new obj
	static createModel(inobj) {
		var obj = {
			version: this.getVersion(),
			creationDate: new Date(),
			modificationDate: null,
			disabled: 0,
			...inobj,
		};
		var model = new this.mongooseModel(obj);
		return model;
	}

	// cacheable list of schema keys
	// ATTN: TODO - this is messy and confusing, fix it
	getModelObjPropertyList() {
		// cached value
		if (this.constructor.modelPropertyList) {
			return this.constructor.modelPropertyList;
		}
		var propkeys = Object.keys(this.constructor.getSchemaDefinition());
		return propkeys;
	}
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
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
		this.modelPropertyList = Object.keys(this.getSchemaDefinition());

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


	async dbSave(jrResult) {
		// simple wrapper (for now) around mongoose model save
		// this should always be used instead of superclass save() function

		// update modification date
		this.updateModificationDate();

		// first we check if jrResult is passed to us; IF SO, it means *WE* should catch the error and set it in jrResult
		// if not, we drop down and just do a save and let exceptions get caught

		if (jrResult === undefined) {
			// ok just save it and let exceptions throw and percolate
			return await this.save();
		}

		// save and we catch any exceptions and convert to jrResults
		var retv;
		try {
			retv = await this.save();
		} catch (err) {
			jrResult.pushError("Failed to save " + this.getmodelClass().getNiceName() + ". " + err.toString());
			return null;
		}
		// success
		// we don't push a success result here because we would see it in operations we dont want messages on
		// jrResult.pushSuccess(this.getmodelClass().getNiceName() + " saved on " + jrhelpers.getNiceNowString() + ".");
		return retv;
	}
	//---------------------------------------------------------------------------








	//---------------------------------------------------------------------------
	// subclasses implement this
	static async validateAndSave(jrResult, options, flagSave, req, source, saveFields, preValidatedFields, obj) {
		jrResult.pushError("Internal error: No subclassed proecure to handle validateAndSave() for " + this.getCollectionName() + " model");
		return null;
	}

	static async validateAndSaveNew(jrResult, options, flagSave, req, source, saveFields, preValidatedFields) {
		var newObj = this.createModel({});
		await this.validateAndSave(jrResult, options, flagSave, req, source, saveFields, preValidatedFields, newObj);
		return newObj;
	}

	static getSaveFields(req, operationType) {
		// operationType is commonly "crudAdd", "crudEdit"
		// return an array of field names that the user can modify when saving an object
		// this is a safety check to allow us to handle form data submitted flexibly and still keep tight control over what data submitted is used
		// subclasses implement; by default we return empty array
		// NOTE: this list can be generated dynamically based on logged in user
		return [];
	}

	// ATTN: this function typically does not have to run async so its cpu inefficient to make it async but rather than have 2 copies of this function to maintain, we use just async one
	// ATTN: TODO in future make a version of this that is sync; or find some better way to handle it
	static async validateMergeAsync(jrResult, fieldNameSource, fieldNameTarget, source, saveFields, preValidatedFields, obj, flagRequired, valFunc) {
		//
		// source and target field names might be different (for example, password is plaintext hashed into a different target fieldname)
		if (fieldNameTarget === "") {
			fieldNameTarget = fieldNameSource;
		}

		// first see if value was pre-validated
		var validatedVal, unvalidatedVal;
		var fieldNameUsed;
		if (preValidatedFields && (preValidatedFields === "*" || (preValidatedFields.includes(fieldNameTarget)))) {
			// field is pre-validated, so just grab its prevalidated value
			fieldNameUsed = fieldNameTarget;
			unvalidatedVal = source[fieldNameSource];
			validatedVal = source[fieldNameTarget];
		} else {
			fieldNameUsed = fieldNameSource;
			unvalidatedVal = source[fieldNameSource];
		}

		//
		// check if the value is even set (!== undefined).  this is either an error, or a case where we return doing nothing
		if (validatedVal === undefined && unvalidatedVal === undefined) {
			// no value found, so do nothing; but throw error if required and it's not ALREADY in the object we are merging into
			if (flagRequired && obj[fieldNameTarget] === undefined) {
				// it's an error that its not provided and not set in obj already
				// ATTN: note that this test does *NOT* require that the field be set in source, just that it already be set in obj if not
				jrResult.pushError("Required value not provided for: " + fieldNameSource);
			}
			return undefined;
		}

		// ok its set. if we aren't allowed to save this field, its an error
		if (saveFields !== "*" && !(saveFields.includes(fieldNameUsed))) {
			jrResult.pushError("Permission denied to save value for: " + fieldNameUsed);
			return undefined;
		}

		// now resolve it if its not yet resolved
		if (validatedVal === undefined) {
			validatedVal = await valFunc(jrResult, fieldNameSource, unvalidatedVal);
			// if its an error, for example during validation, we are done
			if (jrResult.isError()) {
				return undefined;
			}
		}

		// secondary check for missing value
		if (validatedVal === undefined) {
			// if undefined is returned, we do NOT save the value
			if (flagRequired && obj[fieldNameTarget] === undefined) {
				// it's an error that its not provided and not set in obj already
				// ATTN: note that this test does *NOT* require that the field be set in source, just that it already be set in obj if not
				jrResult.pushError("Required value not provided for: " + fieldNameUsed);
			}
			// should we return undefined, OR should we return obj[fieldNameTarget] if its already in there
			return undefined;
		}

		// success, set it
		obj[fieldNameTarget] = validatedVal;
		return validatedVal;
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
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


	static async validateGetObjByIdDoAcl(jrResult, user, req, res, val, aclTestName) {
		// validate id
		var obj;
		var id = this.validateModelFieldId(jrResult, val);

		// models
		const arserver = require("../controllers/server");

		if (!jrResult.isError()) {
			// acl test
			if (!await arserver.aclRequireModelAccess(user, req, res, this, aclTestName, id)) {
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
	// validate.  push error to jrResult on error, return good value on success

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
			// doesnt matter what we return?
			return null;
		}

		return val;
	}


	static async validateShortcode(jrResult, key, val, existingModel) {
		if (!val) {
			jrResult.pushFieldError(key, "Shortcode value for " + key + " cannot be blank.");
		}

		// uppercase it
		val = val.toUpperCase();

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
			// doesnt matter what we return?
			return null;
		}

		return val;
	}


	static validateModelFieldNotEmpty(jrResult, key, val) {
		if (!val) {
			jrResult.pushFieldError(key, "Value for " + key + " cannot be blank.");
			return null;
		}
		return val;
	}

	static validateModelFielDisbled(jrResult, key, val) {
		if (!Number.isNaN(val)) {
			val = parseInt(val, 10);
		}
		if (Number.isNaN(val) || val < 0) {
			jrResult.pushFieldError(key, "Value for " + key + " is mandatory and must be an integer great or equal to  0");
			return null;
		}
		return val;
	}

	static validateModelFieldId(jrResult, val) {
		if (!jrhelpers.isValidMongooseObjectId(val)) {
			jrResult.pushError("No valid id specified.");
			return null;
		}
		return val;
	}

	static async validateModelFieldAppId(jrResult, key, val, user) {
		const AppModel = require("./app");
		const appIds = await AppModel.buildSimpleAppIdListUserTargetable(user);
		if (!appIds || appIds.indexOf(val) === -1) {
			jrResult.pushError("The specified App ID is inaccessible.");
			return null;
		}
		// valid
		return val;
	}
	//---------------------------------------------------------------------------






	//---------------------------------------------------------------------------
	// accessors
	getId() {
		return this._id;
	}

	getIdAsString() {
		if (true) {
			// ATTN: does this work?
			return this.id;
		}
		// old
		if (!this._id) {
			return "";
		}
		return this._id.toString();
	}

	getmodelClass() {
		return this.constructor;
	}

	getExtraData(key, defaultVal) {
		var val = this.extraData.get(key);
		if (val === undefined) {
			return defaultVal;
		}
		return val;
	}

	setExtraData(key, val) {
		this.extraData.set(key, val);
	}

	getIsNew() {
		// return TRUE if it is new and not yet saved
		return this.isNew;
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	updateModificationDate() {
		this.modificationDate = new Date();
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
	static async calcCrudListHelperData(req, res, baseUrl, protectedFields, hiddenFields, jrResult) {
		// perform a find filter and create table grid

		// schema for obj
		var gridSchema = this.getSchemaDefinition();
		var schemaExtra = this.getSchemaDefinitionExtra();

		// force add the invisible id field to schema for display
		// we shouldn't have to do this anymore, we found out had to add it to the model schema
		if (false) {
			gridSchema._id = { type: "id" };
		}

		// headers for list grid
		var gridHeaders = [];

		// options for filter construction
		var filterOptions = {
			defaultPageSize: 10,
			minPageSize: 1,
			maxPageSize: 1000,
			defaultSortField: "_id",
			defaultSortDir: "asc",
			alwaysFilter: [],
			protectedFields,
			hiddenFields,
		};

		const jrFindFilter = require("../helpers/jrfindfilter");
		var { query, queryOptions, queryUrlData } = jrFindFilter.buildMongooseQueryFromReq(filterOptions, gridSchema, req, jrResult);

		var queryProjection = "";

		// fetch the array of items to be displayed in grid
		// see https://thecodebarbarian.com/how-find-works-in-mongoose
		var gridItems;

		try {
			// Set the lean option to speed up retrieving of results, since we only need for read-only display here; see https://mongoosejs.com/docs/tutorials/lean.html
			// Note that if we wanted to call methods on the model class we couldn't do this, as it returns results as plain generic objects
			queryOptions.lean = true;
			//
			gridItems = await this.mongooseModel.find(query, queryProjection, queryOptions).exec();
			// ATTN: TODO is there a more efficient way to get total count of results for pager?
			var isQueryEmpty = ((Object.keys(query)).length === 0);
			if (isQueryEmpty) {
				queryUrlData.resultCount = await this.mongooseModel.countDocuments();
			} else {
				queryUrlData.resultCount = await this.mongooseModel.countDocuments(query).exec();
			}
		} catch (err) {
			jrResult.pushError("Error executing find filter: " + JSON.stringify(query, null, " "));
			gridItems = [];
			queryUrlData.resultCount = 0;
		}
		// store other stuff in queryUrl data to aid in making urls for pager and grid links, etc.
		queryUrlData.baseUrl = baseUrl;
		queryUrlData.tableId = this.getCollectionName();

		// return constructed object -- this is listHelperData in template
		return {
			modelClass: this,
			gridSchema,
			schemaExtra,
			gridHeaders,
			query,
			queryOptions,
			queryUrlData,
			gridItems,
			filterOptions,
		};
	}


	static async calcCrudStatsHelperData(req, res) {
		return undefined;
	}
	//---------------------------------------------------------------------------


}






// export the class as the sole export
module.exports = ModelBaseMongoose;
