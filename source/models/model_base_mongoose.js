/**
 * @module models/modelBaseMongoose
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 5/1/19
 * @description
 * The main base class we use to derive all database model objects
 */

"use strict";


// modules
const mongoose = require("mongoose");


// requirement service locator
const jrequire = require("../helpers/jrequire");

// controllers
const arserver = jrequire("arserver");
const appconst = jrequire("appconst");

// our helper modules
const jrdebug = require("../helpers/jrdebug");
const jrhMisc = require("../helpers/jrh_misc");
const jrhMongo = require("../helpers/jrh_mongo");
const jrhText = require("../helpers/jrh_text");
const jrhValidate = require("../helpers/jrh_validate");
const jrhCrypto = require("../helpers/jrh_crypto");
const JrResult = require("../helpers/jrresult");






/**
 *The main base class we use to derive all database model objects
 *
 * @class ModelBaseMongoose
 */
class ModelBaseMongoose {


	// CLASS data, which can be prolematic when we try to access from an instance (via getModelClass())
	// this.mongooseclass <-- this is the one we get caught on as being undefined
	// this.crudBaseUrl
	// this.schema
	// this.modelSchema
	// this.modelObjPropertyList

	//---------------------------------------------------------------------------
	// subclasses implement these

	/*
	// global static version info
	static getVersion() { return 1; }

	// collection name for this model
	static getCollectionName() {
		return "basemodel";
	}

	// nice name for display
	static getNiceName() {
		return "BaseModel";
	}

	// name for acl lookup
	static getAclName() {
		return "basemodel";
	}

	// name for logging
	static getLoggingString() {
		return "Basemodel";
	}
	*/
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	getModelClass() {
		// subclass overriding function that returns class instance (each subclass MUST implement this)
		// useful when we want to invoke a static function from instance.
		return ModelBaseMongoose;

		// old automatic method which is recommended online doesn't work if you need to access "this" from the static function
		// FUCKED JS &%(*#(*&(*&^()*&^()*&))))
		// return this.constructor;
	}
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	static getBaseSchemaDefinition() {
		// some base schema properties for ALL models
		// this helps us keep track of some basic stuff for everything
		const UserModel = jrequire("models/user");
		return {
			_id: {
				label: "Id",
				readOnly: ["edit"],
				filterSize: 25,
				mongoose: {
					type: mongoose.Schema.ObjectId,
					auto: true,
				},
			},
			version: {
				label: "Ver.",
				readOnly: ["edit"],
				filterSize: 5,
				mongoose: {
					type: Number,
				},
			},
			creator: {
				label: "Creator",
				hide: ["edit"],
				valueFunction: this.makeModelValueFunctionObjectId(UserModel),
				mongoose: {
					type: mongoose.Schema.ObjectId,
				},
			},
			creationDate: {
				label: "Date created",
				hide: ["edit"],
				format: "date",
				mongoose: {
					type: Date,
				},
			},
			modificationDate: {
				label: "Date modified",
				readOnly: ["edit"],
				format: "date",
				mongoose: {
					type: Date,
				},
			},
			disabled: {
				label: "Disabled?",
				format: "choices",
				choices: appconst.DefStateModeLabels,
				choicesEdit: appconst.DefStateModeLabelsEdit,
				filterSize: 8,
				defaultValue: appconst.DefMdbEnable,
				mongoose: {
					type: Number,
				},
			},
			extraData: {
				label: "Extra data",
				valueFunction: this.makeModelValueFunctionExtraData(),
				filterSize: 0,
				// readOnly: ["edit"],
				mongoose: {
					type: mongoose.Mixed,
				},
			},
			notes: {
				label: "Notes",
				mongoose: {
					type: String,
				},
			},
		};
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	// defaults for crud list
	static getCrudDefaults() {
		return {
			sortField: "_id",
			sortDir: "asc",
		};
	}

	// override this to default to real delete for some models
	static getDefaultDeleteDisableMode() {
		return appconst.DefMdbVirtDelete;
	}

	static getDefaultDeleteDisableModeIsVirtual() {
		return (this.getDefaultDeleteDisableMode() === appconst.DefMdbVirtDelete);
	}

	static supportsVirtualDelete() {
		return (this.getBaseSchemaDefinition().disabled !== undefined);
	}

	static getDefaultDeleteDisableModeAsAclAction() {
		var deleteDisableMode = this.getDefaultDeleteDisableMode();
		if (deleteDisableMode === appconst.DefMdbVirtDelete) {
			return appconst.DefAclActionDelete;
		}
		return appconst.DefAclActionPermDelete;
	}


	/**
	 * Should some user ACL own each instance?
	 * Subclasses can override this (rooms, apps) to say that there should be someone who OWNS this resource
	 *
	 * @static
	 * @returns true or false
	 * @memberof ModelBaseMongoose
	 */
	static getShouldBeOwned() {
		return false;
	}
	//---------------------------------------------------------------------------





























	//---------------------------------------------------------------------------
	static extractMongooseDbSchemaDefintion() {
		// get the full schema definition
		var schemaDefinition = this.getSchemaDefinition();
		// now build a new object with only the key mongoose values
		var mongooseDbSchemaDefinition = {};
		for (var key in schemaDefinition) {
			if (schemaDefinition[key].mongoose) {
				mongooseDbSchemaDefinition[key] = schemaDefinition[key].mongoose;
			}
		}
		// return it
		return mongooseDbSchemaDefinition;
	}


	// User model mongoose db schema
	static buildMongooseDbSchema(mongooser) {
		var mongooseDbSchemaDefinition = this.extractMongooseDbSchemaDefintion();
		this.schema = new mongooser.Schema(mongooseDbSchemaDefinition, {
			collection: this.getCollectionName(),
		});
		return this.schema;
	}


	// subbclasses implement this
	static calcSchemaDefinition() {
		return {};
	}


	static getSchemaDefinition() {
		// this is the one that should be called
		// returns cached value
		if (!this.cachedSchemaDefinition) {
			this.cachedSchemaDefinition = this.calcSchemaDefinition();
		}
		return this.cachedSchemaDefinition;
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	static getBaseSchemaType(fieldname) {
		var baseSchemaDefinition = this.getBaseSchemaDefinition();
		if (baseSchemaDefinition[fieldname]) {
			return baseSchemaDefinition[fieldname].type;
		}
		return null;
	}


	// ATTN: TODO -- cache the schema definition and extras
	static getSchemaFieldVal(fieldName, key, defaultVal) {
		var modelSchemaDefinition = this.getSchemaDefinition();
		if (modelSchemaDefinition[fieldName] && modelSchemaDefinition[fieldName][key] !== undefined) {
			return modelSchemaDefinition[fieldName][key];
		}
		return defaultVal;
	}

	static async getSchemaKeysMatchingViewType(viewType, req) {
		var retKeys = [];
		var modelSchemaDefinition = this.getSchemaDefinition();
		var keys = Object.keys(modelSchemaDefinition);
		var keyHideArray;
		var visfunc, isVisible;

		await jrhMisc.asyncAwaitForEachFunctionCall(keys, async (key) => {
			keyHideArray = modelSchemaDefinition[key].hide;
			if (jrhMisc.isInAnyArray(viewType, keyHideArray)) {
				retKeys.push(key);
			} else {
				visfunc = modelSchemaDefinition[key].visibleFunction;
				if (visfunc) {
					isVisible = await visfunc(viewType, key, req, null, null);
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
	getExtraDataField(key, defaultValue) {
		if (this.extraData === undefined || this.extraData[key] === undefined) {
			return defaultValue;
		}
		return this.extraData[key];
	}
	//---------------------------------------------------------------------------







	//---------------------------------------------------------------------------
	// create new obj
	static createModel(inobj) {
		var obj = {
			version: this.getVersion(),
			creator: null,
			creationDate: new Date(),
			modificationDate: null,
			disabled: 0,
			notes: "",
			...inobj,
		};
		var model = this.newMongooseModel(obj);
		return model;
	}

	// cacheable list of schema keys
	// ATTN: TODO - this is messy and confusing, fix it
	getModelObjPropertyList() {
		// cached value
		if (this.getModelClass().modelObjPropertyList) {
			return this.getModelClass().modelObjPropertyList;
		}
		var propkeys = Object.keys(this.getModelClass().getSchemaDefinition());
		return propkeys;
	}
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	static async setupModelSchema(mongooser) {

		// we only do this IF it"s not yet been done
		if (this.modelSchema) {
			jrdebug.cdebug("Skipping model rebuild for " + this.getCollectionName());
			return;
		}

		// jrdebug.debug("Setting up model schema for " + this.getCollectionName());

		// compile the model scheme
		this.modelSchema = this.buildMongooseDbSchema(mongooser);

		// this is an attempt to cache this information but it doesn't seem to work
		this.modelObjPropertyList = Object.keys(this.getSchemaDefinition());

		// 5/8/19 trying to tie our model class to the mongoose model
		// see https://mongoosejs.com/docs/advanced_schemas.html
		// this idea is that this transfers the functions and properties from the model class to the schema
		// This lets us do things like load a user document, and then call methods on the document returned (see user password checking)
		await this.modelSchema.loadClass(this);

		// create the mongoose model
		var collectionName = this.getCollectionName();
		this.setMongooseModel(await mongooser.model(collectionName, this.modelSchema));


		// ensure the collection is created now even though it's blank
		// ATTN: 5/11/19 - mongoose/mongodb is having a weird fit here, where it is throwing an error
		//  about connection already exists if while making schema it is creating indexes, even if strict = false
		// so we are going to try to check for collection manually before creating it.
		// note that even with this check, we must use the default strict:false, otherwise we still get a complaint
		if (!await this.collectionExists(mongooser, collectionName)) {
			await this.getMongooseModel().createCollection({ strict: false });
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
			jrResult.pushError("Failed to save " + this.getModelClass().getNiceName() + ". " + err.toString());
			return null;
		}
		// success
		// we don't push a success result here because we would see it in operations we dont want messages on
		// jrResult.pushSuccess(this.getModelClass().getNiceName() + " saved on " + jrhMisc.getNiceNowString() + ".");
		return retv;
	}
	//---------------------------------------------------------------------------





	/**
	 * A wrapper around doValidateAndSave that can set ownership of the object when appropriate
	 *
	 * @static
	 * @param {*} jrResult
	 * @param {*} options
	 * @param {*} flagSave
	 * @param {*} user
	 * @param {*} source
	 * @param {*} saveFields
	 * @param {*} preValidatedFields
	 * @param {*} ignoreFields
	 * @param {*} obj
	 * @param {*} flagUpdateUserRolesForNewObject
	 * @memberof ModelBaseMongoose
	 */
	static async validateSave(jrResult, options, flagSave, user, source, saveFields, preValidatedFields, ignoreFields, obj, flagUpdateUserRolesForNewObject) {
		// is this a new object?
		var savedObj;
		var flagIsNew = obj.isNew;
		// call validate and save
		savedObj = await this.doValidateAndSave(jrResult, options, flagSave, user, source, saveFields, preValidatedFields, ignoreFields, obj);
		// success?
		if (flagUpdateUserRolesForNewObject && flagIsNew && !jrResult.isError() && user) {
			// successful save and it was a new object, and caller wants us to set roles of owner
			await user.addOwnerCreatorRolesForNewObject(obj, true, jrResult);
			if (jrResult.isError()) {
				// error setting roles, which means we would like to DESTROY the object and reset it..
				// ATTN: unfinished
				var emsg = "ATTN: Failed to set ownership roles on " + obj.getLogIdString();
				arserver.logr(null, "error.imp", emsg);
				jrdebug.debug(emsg);
			}
		}
		return savedObj;
	}


	static async validateAndSaveNewWrapper(jrResult, options, flagSave, user, source, saveFields, preValidatedFields, ignoreFields, flagUpdateUserRolesForNewObject) {
		var newObj = this.createModel({});
		await this.validateSave(jrResult, options, flagSave, user, source, saveFields, preValidatedFields, ignoreFields, newObj, flagUpdateUserRolesForNewObject);
		return newObj;
	}
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	// subclasses implement this
	static async doValidateAndSave(jrResult, options, flagSave, user, source, saveFields, preValidatedFields, ignoreFields, obj) {
		jrResult.pushError("Internal error: No subclassed proecure to handle doValidateAndSave() for " + this.getCollectionName() + " model");
		return null;
	}

	static async validateAndSaveNew(jrResult, options, flagSave, user, source, saveFields, preValidatedFields, ignoreFields) {
		var newObj = this.createModel({});
		await this.doValidateAndSave(jrResult, options, flagSave, user, source, saveFields, preValidatedFields, ignoreFields, newObj);
		return newObj;
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	static getSaveFields(operationType) {
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


		// if value isnt set, but a fieldname_checkbox value is, then we know this is a case of html form processing not parsing the checkbox unchecked
		if (validatedVal === undefined && unvalidatedVal === undefined) {
			// no value found
			if (source[fieldNameSource + "_checkbox"]) {
				// found checkbox, so unvalidated value should be considered set to false
				unvalidatedVal = false;
			}
		}


		// check if the value is even set (!== undefined).  this is either an error, or a case where we return doing nothing
		if (validatedVal === undefined && unvalidatedVal === undefined) {
			// no value found
			// throw error if required and it's not ALREADY in the object we are merging into
			if (flagRequired && obj[fieldNameTarget] === undefined) {
				// it's an error that its not provided and not set in obj already
				// ATTN: note that this test does *NOT* require that the field be set in source, just that it already be set in obj if not
				jrResult.pushError("Required value not provided for: " + fieldNameSource);
			}
			// ATTN: do not let validator have a chance to run??
			return undefined;
		}

		// ok its set. if we aren't allowed to save this field, its an error
		if (saveFields !== "*" && !(saveFields.includes(fieldNameUsed))) {
			jrResult.pushError("Permission denied to save value for: " + fieldNameUsed);
			return undefined;
		}

		// now resolve it if its not yet resolved
		if (validatedVal === undefined) {
			validatedVal = await valFunc(jrResult, fieldNameSource, unvalidatedVal, flagRequired);
			// if its an error, for example during validation, we are done
			if (jrResult.isError()) {
				return undefined;
			}
		}

		// secondary check for missing value, after we run the valFunc function
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

		// null value will also cause error if we're not allowed to be blank
		if (flagRequired && validatedVal === null) {
			// error if they are trying to save a NULL value and we've been told that the field is required
			// above we check for undefined, which means DONT CHANGE the value; null means CHANGE The value to null
			jrResult.pushError("Required value not provided for: " + fieldNameUsed);
		}

		// success, set it
		obj[fieldNameTarget] = validatedVal;
		// tell object we have set it
		obj.notifyValueModified(fieldNameTarget, validatedVal);
		return validatedVal;
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	notifyValueModified(key, val) {
		// ATTN: 4/18/20 -- despite documentation, this doesnt ACTUALLY seem to be needed even for mixed schematype..
		if (false) {
			// some mongoose models need this to be called, like those with Mixed schema, like extraData
			// doesn't seem to be any harm in calling for all vars
			// this.markModified(key);
		}
	}
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	/**
	 * Complain about fields we found that we are refusing to save
	 *
	 * @static
	 * @param {*} jrResult
	 * @param {*} options
	 * @param {*} source
	 * @param {*} saveFields
	 * @param {*} preValidatedFields
	 * @memberof ModelBaseMongoose
	 */
	static async validateComplainExtraFields(jrResult, options, source, saveFields, preValidatedFields, ignoreFields) {
		// walk the properties in source, and complain if not found in saveFields, preValidatedFields, and ignoreFields
		for (var prop in source) {
			if (Object.prototype.hasOwnProperty.call(source, prop)) {
				if ((saveFields && saveFields.includes(prop)) || (preValidatedFields && preValidatedFields.includes(prop)) || (ignoreFields && ignoreFields.includes(prop))) {
					// good
					continue;
				} else {
					// not found, first check if its a _checkbox version of an allowed field
					if (prop.endsWith("_checkbox")) {
						var preprop = prop.substr(0, prop.length - 9);
						if ((saveFields && saveFields.includes(preprop)) || (preValidatedFields && preValidatedFields.includes(preprop)) || (ignoreFields && ignoreFields.includes(preprop))) {
							// good
							continue;
						}
					}
					// error
					jrResult.pushFieldError(prop, "Not allowed to save this field (" + prop + ").");
				}
			}
		}
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
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	// validate.  push error to jrResult on error, return good value on success

	static async validateModelFieldUnique(jrResult, key, val, existingModel) {
		if (!val) {
			jrResult.pushFieldError(key, "Value for " + key + " cannot be blank (must be unique).");
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

		var clashObj = await this.findOneExec(criteria);
		if (clashObj) {
			// error
			jrResult.pushFieldError(key, "Duplicate " + key + " entry found for another " + this.getNiceName());
			// doesnt matter what we return?
			return null;
		}

		return val;
	}
	//---------------------------------------------------------------------------






	//---------------------------------------------------------------------------
	static validateShortcodeSyntax(jrResult, key, val) {
		if (!val) {
			if (jrResult) {
				var sstr = (key === "shortcode") ? "shortcode" : "shortcode (" + key + ")";
				jrResult.pushFieldError(key, sstr + " cannot be left blank");
			}
			return null;
		}

		// uppercase it
		val = val.toUpperCase();

		// simple regex test it should only contain letters and numbers and a few basic syboles
		const regexPat = /^[A-Z0-9_\-.]*$/;
		if (!regexPat.test(val)) {
			if (jrResult) {
				var sstr2 = (key === "shortcode") ? "shortcode" : "shortcode (" + key + ")";
				jrResult.pushFieldError(key, "Syntax error in " + sstr2 + " value; it should be uppercase, and shouold contain only the characters A-Z 0-9 _-. (no spaces).");
			}
			return null;
		}

		return val;
	}


	static async validateShortcodeUnique(jrResult, key, val, existingModel) {

		// first basic validation (and fixing) of shortcode syntax
		val = this.validateShortcodeSyntax(jrResult, key, val);
		if (!val) {
			return val;
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

		if (await this.isShortcodeInUse(criteria)) {
			jrResult.pushFieldError(key, "Duplicate " + key + " entry found for another " + this.getNiceName());
			// doesnt matter what we return?
			return null;
		}

		return val;
	}


	static async isShortcodeInUse(criteria) {
		var clashObj = await this.findOneExec(criteria);
		if (clashObj) {
			return true;
		}
		return false;
	}


	static async makeRandomShortcode(key) {
		// try to make an unused random shortcode
		const maxTrycount = 100;
		const shortcodeLen = 9;
		var shortcode;
		var criteria = {};
		var charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

		for (var trycount = 0; trycount < maxTrycount; trycount += 1) {
			// random shortcode
			shortcode = "RND" + jrhCrypto.genRandomStringFromCharSet(charset, shortcodeLen);
			criteria[key] = shortcode;
			// see if it's in use
			if (!(await this.isShortcodeInUse(criteria))) {
				// found one not in use
				return shortcode;
			}
		}
		// not found
		return null;
	}
	//---------------------------------------------------------------------------










	//---------------------------------------------------------------------------
	static validateModelFielDisbled(jrResult, key, val, flagRequired) {
		// the disabled field for resource models must be a postitive integer (0 meaning not disabled, higher than 0 various flavors of being a disabled resource)
		return jrhValidate.validateIntegerRange(jrResult, key, val, 0, 999999, flagRequired);
	}

	static validateModelFieldId(jrResult, val) {
		if (!jrhMongo.isValidMongooseObjectId(val)) {
			jrResult.pushError("No valid id specified.");
			return null;
		}
		return val;
	}

	static async validateModelFieldAppId(jrResult, key, val, user) {
		const AppModel = jrequire("models/app");
		const appIds = await AppModel.buildSimpleAppIdListUserTargetable(user);
		if (val === "") {
			jrResult.pushFieldError(key, "The App ID may not be blank.");
			return null;
		}
		if (!appIds || appIds.indexOf(val) === -1) {
			jrResult.pushFieldError(key, "The specified App ID is inaccessible.");
			console.log("ATTN:DEBUG APPIDS");
			console.log(appIds);
			return null;
		}
		// valid
		return val;
	}

	static async validateModelFieldRoomId(jrResult, key, val, user) {
		const RoomModel = jrequire("models/room");
		const roomIds = await RoomModel.buildSimpleRoomIdListUserTargetable(user);
		if (val === "") {
			jrResult.pushFieldError(key, "The Room ID may not be blank.");
			return null;
		}
		if (!roomIds || roomIds.indexOf(val) === -1) {
			jrResult.pushFieldError(key, "The specified Room ID is inaccessible.");
			return null;
		}
		// valid
		return val;
	}
	//---------------------------------------------------------------------------









	//---------------------------------------------------------------------------
	// accessors
	getIdAsM() {
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

	getLogIdString() {
		// human readable id string for use in log messages that we could parse to get a link
		// ATTN: note we use the "this.constructor.staticfunc" syntax to access static class function from member
		return this.getModelClass().getLoggingString() + "#" + this.getIdAsString();
	}


	/*
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
	*/


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
	// isolate use of this.mongooseModel
	static getMongooseModel() {
		return this.mongooseModel;
	}

	static setMongooseModel(val) {
		this.mongooseModel = val;
	}

	static newMongooseModel(obj) {
		// const mmodel = this.mongooseModel;
		// jrdebug.debugObj(mmodel, "MongooseModelm");
		return new this.mongooseModel(obj);
	}
	//---------------------------------------------------------------------------










	//---------------------------------------------------------------------------
	// rather than letting different models call mongoose directly, we try to put a thin wrapper of our own


	static async findOneExec(...args) {
		// actually call mongooseModel findOne
		var retv = await this.mongooseModel.findOne(...args).exec();
		return retv;
	}


	static async findOneAndUpdateExec(criteria, setObject) {
		// actually call mongooseModel findOneAndUpdateExec
		var retv = await this.mongooseModel.findOneAndUpdate(criteria, setObject).exec();
		return retv;
	}


	static async findAllAndSelect(...args) {
		var retv = await this.mongooseModel.find().select(...args);
		return retv;
	}


	static async findAllExec(...args) {
		// actually call mongooseModel findOneAndUpdateExec
		var retv = await this.mongooseModel.find(...args).exec();
		return retv;
	}
	//---------------------------------------------------------------------------





	//---------------------------------------------------------------------------
	// more elaborate helpers

	/**
	 * Find some items (possibly paginated)
	 * This is used in our crud system
	 *
	 * @static
	 * @param {object} query
	 * @param {object} queryOptions
	 * @param {object} jrResult
	 * @returns a tuble [items, fullQueryResultCount] - where fullQueryResultCount may be larger than items.length if pagination is only bringing us some of the reulst
	 * @memberof ModelBaseMongoose
	 */
	static async findSomeByQuery(query, queryOptions, jrResult) {
		// fetch the array of items to be displayed in grid
		// see https://thecodebarbarian.com/how-find-works-in-mongoose
		var queryProjection = "";
		try {
			var items = await this.mongooseModel.find(query, queryProjection, queryOptions).exec();

			var resultCount;
			var isQueryEmpty = ((Object.keys(query)).length === 0);
			if (isQueryEmpty) {
				resultCount = await this.mongooseModel.countDocuments();
			} else {
				resultCount = await this.mongooseModel.countDocuments(query).exec();
			}

			return [items, resultCount];
		} catch (err) {
			jrResult.pushError("Error executing find filter: " + JSON.stringify(query, null, " ") + ":" + err.message);
			return [[], 0];
		}
	}
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	static async findAndDeleteMany(criteria) {
		await this.getMongooseModel().deleteMany(criteria).exec();
	}
	//---------------------------------------------------------------------------














	//---------------------------------------------------------------------------
	// shortcuts that call above

	static async findOneByShortcode(shortcodeval) {
		// return null if not found
		if (!shortcodeval) {
			return null;
		}
		return await this.findOneExec({ shortcode: shortcodeval });
	}


	// lookup user by their id
	static async findOneById(id) {
		// return null if not found
		if (!id) {
			return null;
		}
		return await this.findOneExec({ _id: id });
	}


	static async findOneByKeyValue(key, val) {
		return await this.findOneExec({ [key]: val });
	}
	//---------------------------------------------------------------------------






























	//---------------------------------------------------------------------------
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
	static async calcCrudListHelperData(req, res, user, baseUrl, protectedFields, hiddenFields, jrResult) {
		// perform a find filter and create table grid

		// schema for obj
		var gridSchema = this.getSchemaDefinition();

		// force add the invisible id field to schema for display
		// we shouldn't have to do this anymore, we found out had to add it to the model schema
		if (false) {
			gridSchema._id = { type: "id" };
		}

		// headers for list grid
		var gridHeaders = [];

		// default sorting?
		var crudDefaults = this.getCrudDefaults();

		// options for filter construction
		var filterOptions = {
			defaultPageSize: 10,
			minPageSize: 1,
			maxPageSize: 1000,
			defaultSortField: jrhMisc.getNonNullValueOrDefault(crudDefaults.sortField, "_id"),
			defaultSortDir: jrhMisc.getNonNullValueOrDefault(crudDefaults.sortDir, "desc"),
			alwaysFilter: [],
			protectedFields,
			hiddenFields,
		};

		// convert filter into query and options
		const jrhMongoFilter = require("../helpers/jrh_mongo_filter");
		var { query, queryOptions, queryUrlData } = jrhMongoFilter.buildMongooseQueryFromReq(filterOptions, gridSchema, req, jrResult);

		// Force the lean option to speed up retrieving of results, since we only need for read-only display here; see https://mongoosejs.com/docs/tutorials/lean.html
		// Note that if we wanted to call methods on the model class we couldn't do this, as it returns results as plain generic objects
		queryOptions.lean = true;

		// test
		// jrdebug.debugObj(query, "111 Test query in calcCrudListHelperData.");

		// add filter to not show vdeletes if appropriate
		await this.addUserDisabledVisibilityToQuery(user, query);

		// test
		// jrdebug.debugObj(query, "222 Test query in calcCrudListHelperData.");

		// get the items using query
		var [gridItems, resultcount] = await this.findSomeByQuery(query, queryOptions, jrResult);
		queryUrlData.resultCount = resultcount;

		// store other stuff in queryUrl data to aid in making urls for pager and grid links, etc.
		queryUrlData.baseUrl = baseUrl;
		queryUrlData.tableId = this.getCollectionName();

		// return constructed object -- this is listHelperData in template
		return {
			modelClass: this,
			gridSchema,
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






	//---------------------------------------------------------------------------
	/**
	 * This adds to a query a filter that makes virtually deleted objects inaccessible if the user doesn't have permission.
	 * Modifies the passed query.
	 *
	 * @static
	 * @param {object} user
	 * @param {object} query
	 * @memberof ModelBaseMongoose
	 */
	static async addUserDisabledVisibilityToQuery(user, query) {

		if (await user.aclHasPermissionSeeVDeletes(this)) {
			// they are allowed to see the virtually deleted, so just return
			return;
		}

		// we need to filter out virtual deletes
		const addFilter = {
			$ne: 2,
		};
		if (!query.disabled) {
			// just add the filter
			query.disabled = addFilter;
		} else {
			// more complicated, we have to inject it
			var oldDisabled = query.disabled;
			delete query.disabled;
			if (query.$and) {
				// there is an and we need to add it to
				query.$and.push(oldDisabled);
				query.$and.push(addFilter);
			} else {
				// there is no and, so create one
				query.$and = [
					{ disabled: oldDisabled },
					{ disabled: addFilter },
				];
			}
		}
	}
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	static async validateGetObjByIdDoAclRenderErrorPageOrRedirect(jrResult, user, req, res, val, aclTestName) {
		// get a model object, performing acl access check first
		// if not, render an error and return null

		var obj;
		var id = this.validateModelFieldId(jrResult, val);

		if (!jrResult.isError()) {
			// acl test
			if (!await arserver.aclRequireModelAccessRenderErrorPageOrRedirect(user, req, res, this, aclTestName, id)) {
				// ATTN: note that in thie case, callee will have ALREADY rendered an error to the user about permissions, which is why we need to not drop down and re-render acl access error
				// but we DO need to push an error onto jrresult for our return check; note that text of error message is irrelevant
				jrResult.pushError("model access denied");
				return null;
			}
			// permission was granted
			// get object being edited
			obj = await this.findOneById(id);
			if (!obj) {
				jrResult.pushError("Could not find " + this.getNiceName() + " with that Id.");
			}
		}
		//
		if (jrResult.isError()) {
			// render error
			arserver.renderAclAccessErrorResult(req, res, this, jrResult);
			return null;
		}
		return obj;
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	static async validateMergeAsyncBaseFields(jrResult, options, flagSave, source, saveFields, preValidatedFields, obj) {
		// base fields shared among most models
		await this.validateMergeAsync(jrResult, "disabled", "", source, saveFields, preValidatedFields, obj, true, (jrr, keyname, inVal, flagRequired) => this.validateModelFielDisbled(jrr, keyname, inVal, flagRequired));
		await this.validateMergeAsync(jrResult, "notes", "", source, saveFields, preValidatedFields, obj, false, (jrr, keyname, inVal, flagRequired) => jrhValidate.validateString(jrr, keyname, inVal, flagRequired));
		// extraData json
		await this.validateMergeAsync(jrResult, "extraData", "", source, saveFields, preValidatedFields, obj, false, (jrr, keyname, inVal, flagRequired) => jrhValidate.validateJsonObjOrStringToObj(jrr, keyname, inVal, flagRequired));
	}
	//---------------------------------------------------------------------------







	//---------------------------------------------------------------------------
	// value function helpers

	/**
	 * Helper function that makes a value function where only admin can see
	 *
	 * @static
	 * @param {*} flagRequired
	 * @returns async value function
	 * @memberof ModelBaseMongoose
	 */
	static makeModelValueFunctionPasswordAdminEyesOnly(flagRequired) {
		// a value function usable by model definitions
		return async (viewType, fieldName, req, obj, helperData) => {
			var retv;
			var isLoggedInUserSiteAdmin = await arserver.isLoggedInUserSiteAdmin(req);
			if (viewType === "view" && obj !== undefined) {
				if (isLoggedInUserSiteAdmin) {
					// for debuging
					retv = obj.passwordhashed;
				} else {
					// safe
					retv = this.safeDisplayPasswordInfoFromPasswordHashed(obj.passwordHashed);
				}
			} else if (viewType === "edit") {
				var flagExistingIsNonBlank = (obj && (obj.passwordHashed !== undefined && obj.passwordHashed !== null && obj.password !== ""));
				retv = jrhText.jrHtmlFormInputPassword("password", obj, flagRequired, flagExistingIsNonBlank);
			} else if (viewType === "list" && obj !== undefined) {
				if (isLoggedInUserSiteAdmin) {
					retv = obj.passwordHashed;
				} else if (!obj.passwordHashed) {
					retv = "";
				} else {
					retv = "[HIDDEN]";
				}
			}
			//
			if (retv === undefined) {
				return "";
			}
			return retv;
		};
	}


	/**
	 * Helper function to make a value function for the extraData field
	 *
	 * @static
	 * @returns async value function
	 * @memberof ModelBaseMongoose
	 */
	static makeModelValueFunctionExtraData() {
		// a value function usable by model definitions
		return async (viewType, fieldName, req, obj, helperData) => {
			var str;
			if (obj !== undefined && obj.extraData) {
				if (typeof obj.extraData === "string") {
					// already a string -- this is used when form error being reshown..
					str = obj.extraData;
				} else {
					str = JSON.stringify(obj.extraData, null, " ");
				}
			} else {
				str = "";
			}
			// let them edit the json string
			if (viewType === "edit") {
				str = `<textarea name="${fieldName}" rows="4" cols="80">${str}</textarea>`;
			}
			return str;
		};
	}



	/**
	 * Helper function to make a value function for an object's id crud field
	 *
	 * @static
	 * @param {*} modelClass
	 * @param {*} fieldId
	 * @param {*} fieldLabel
	 * @param {*} fieldList
	 * @returns an async value function
	 * @memberof ModelBaseMongoose
	 */
	static makeModelValueFunctionObjectId(modelClass) {
		return async (viewType, fieldName, req, obj, helperData) => {
			if (obj !== undefined) {
				const objid = obj[fieldName];
				if (objid) {
					// jrdebug.debugObj(obj, "Obj test");
					const alink = modelClass.getCrudUrlBase("view", objid);
					return `<a href="${alink}">${objid}</a>`;
				}
			}
			return "";
		};
	}


	/**
	 * Helper function to make a value function for an object's id crud field, where there are a list of choices from helperdata
	 *
	 * @static
	 * @param {*} modelClass
	 * @param {*} fieldId
	 * @param {*} fieldLabel
	 * @param {*} fieldList
	 * @returns an async value function
	 * @memberof ModelBaseMongoose
	 */
	static makeModelValueFunctionCrudObjectIdFromList(modelClass, fieldId, fieldLabel, fieldList) {
		return async (viewType, fieldName, req, obj, helperData) => {
			var viewUrl, oLabel, rethtml, oid;
			if (viewType === "view" && obj !== undefined) {
				viewUrl = modelClass.getCrudUrlBase("view", obj[fieldId]);
				oLabel = helperData[fieldLabel];
				rethtml = `${oLabel} (<a href="${viewUrl}">#${obj[fieldId]}</a>)`;
				return rethtml;
			}
			if (viewType === "edit") {
				oid = obj ? obj[fieldId] : null;
				rethtml = jrhText.jrHtmlFormOptionListSelect(fieldId, helperData[fieldList], oid, true);
				return rethtml;
			}
			if (viewType === "list" && obj !== undefined) {
				viewUrl = modelClass.getCrudUrlBase("view", obj[fieldId]);
				rethtml = `<a href="${viewUrl}">${obj[fieldId]}</a>`;
				return rethtml;
			}
			return undefined;
		};
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	/**
	 * Return a value function for showing the roles held by all users on a specific object
	 *
	 * @static
	 * @param {*} modelClass
	 * @returns async value function
	 * @memberof ModelBaseMongoose
	 */
	static makeModelValueFunctionRoleOnObjectList(modelClass) {
		//
		return async (viewType, fieldName, req, obj, helperData) => {
			if (viewType === "list") {
				// too heavy to retrieve in this mode
				return "...";
			}
			if (obj !== undefined && obj.getAllUsersRolesOnThisObject) {
				const aclAid = jrequire("aclaid");
				const flagIncludeNullObjectIds = true;
				var roles = await obj.getAllUsersRolesOnThisObject(flagIncludeNullObjectIds);
				var rethtml = aclAid.buildHtmlOfFullUserRoleArray(roles);
				return rethtml;
			}
			return "";
		};

	}
	//---------------------------------------------------------------------------







	//---------------------------------------------------------------------------
	static getNiceNamePluralized(num) {
		if (num === 1) {
			return num.toString() + " " + this.getNiceName();
		}
		return num.toString() + " " + this.getNiceName() + "s";
	}


	static getNiceNameWithId(id) {
		return this.getNiceName() + " #" + id;
	}
	//---------------------------------------------------------------------------































	//---------------------------------------------------------------------------
	/**
	 * Delete the object AND do any cleanup, like deleteing accessory objects, removing references, etc.
	 * Just hand off to static class method
	 *
	 * @param {string} mode
	 * @param {object} jrResult
	 */
	async doChangeMode(mode, jrResult) {
		// just hand off to static class version
		await this.getModelClass().doChangeModeById(this.getIdAsM(), mode, jrResult);
	}



	/**
	 * change mode (delete) the object AND do any cleanup, like deleteing accessory objects, removing references, etc.
	 *
	 * @static
	 * @param {string} id
	 * @param {string} mode
	 * @param {object} jrResult
	 */
	static async doChangeModeById(id, mode, jrResult) {

		if (mode === appconst.DefMdbRealDelete) {
			// direct database delete
			await this.getMongooseModel().deleteOne({ _id: id }, (err) => {
				if (err) {
					jrResult.pushError("Error while tryign to delete " + this.getNiceNameWithId(id) + ": " + err.message);
				}
			});
		} else {
			// change mode (enable, disable, vdelete, etc.)
			// just sets the field "disabled" to mode value
			// see https://mongoosejs.com/docs/documents.html#updating
			const nowDate = new Date();
			await this.getMongooseModel().updateOne({ _id: id }, { $set: { disabled: mode, modificationDate: nowDate } }, (err) => {
				if (err) {
					jrResult.pushError("Error while changing to " + appconst.DefStateModeLabels[mode] + "  " + this.getNiceNameWithId(id) + ": " + err.message);
				}
			});
		}

		if (jrResult.isError()) {
			return;
		}

		// success, now handle any post change operations (like deleting accessory objects, etc.)
		await this.auxChangeModeById(id, mode, jrResult);
	}




	static async doChangeModeByIdList(idList, mode, jrResult, flagSupressSuccessMessage) {
		// delete/disable a bunch of items
		var successCount = 0;

		// walk the list and do a deep delete of each
		var id;
		for (let i = 0; i < idList.length; ++i) {
			id = idList[i];
			await this.doChangeModeById(id, mode, jrResult);
			if (jrResult.isError()) {
				break;
			}
			++successCount;
		}

		const modeLabel = jrhText.capitalizeFirstLetter(appconst.DefStateModeLabels[mode]);
		if (!jrResult.isError()) {
			if (!flagSupressSuccessMessage) {
				jrResult.pushSuccess(modeLabel + " " + this.getNiceNamePluralized(successCount) + ".");
			}
		} else {
			if (successCount > 0) {
				jrResult.pushError(modeLabel + " " + this.getNiceNamePluralized(successCount) + " before error occurred.");
			}
		}
	}



	// delete any ancillary deletions AFTER the normal delete
	// this would normally be subclassed by specific model
	static async auxChangeModeById(id, mode, jrResult) {
		// by default, nothing to do; subclasses can replace this
	}
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	async getAllUsersRolesOnThisObject(flagIncludeNullObjectIds) {
		// get all roles held by all users on this object
		const UserModel = jrequire("models/user");
		var allUserRoles = await UserModel.getRolesForAllUsersOnObject(this.getModelClass(), this.getIdAsString(), flagIncludeNullObjectIds);
		jrdebug.cdebugObj(allUserRoles, "User roles on object");
		return allUserRoles;
	}
	//---------------------------------------------------------------------------













}






// export the class as the sole export
module.exports = ModelBaseMongoose;
