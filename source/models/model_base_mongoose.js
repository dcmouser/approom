/**
 * @module models/modelBaseMongoose
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 5/1/19
 * @description
 * The main base class we use to derive all database model objects
 * NOTE: Always be on the lookout for find queries that use the "lean" option to not instantiate full objects when querying database
 */

"use strict";


// modules
const mongoose = require("mongoose");


// requirement service locator
const jrequire = require("../helpers/jrequire");

// controllers
const arserver = jrequire("arserver");
const appdef = jrequire("appdef");

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
				readOnly: true,
				filterSize: 25,
				mongoose: {
					type: mongoose.Schema.ObjectId,
					auto: true,
				},
			},
			version: {
				label: "Ver.",
				readOnly: true,
				filterSize: 5,
				mongoose: {
					type: Number,
				},
			},
			creator: {
				label: "Creator",
				hide: true,
				valueFunction: this.makeModelValueFunctionObjectId(UserModel),
				mongoose: {
					type: mongoose.Schema.ObjectId,
				},
			},
			creationDate: {
				label: "Date created",
				// hide: true,
				readOnly: true,
				format: "date",
				mongoose: {
					type: Date,
				},
			},
			modificationDate: {
				label: "Date modified",
				readOnly: true,
				format: "date",
				mongoose: {
					type: Date,
				},
			},
			disabled: {
				label: "Disabled?",
				format: "choices",
				choices: appdef.DefStateModeLabels,
				choicesEdit: appdef.DefStateModeLabelsEdit,
				filterSize: 8,
				defaultValue: appdef.DefMdbEnable,
				mongoose: {
					type: Number,
				},
			},
			extraData: {
				label: "Extra data",
				valueFunction: this.makeModelValueFunctionExtraData(),
				filterSize: 0,
				mongoose: {
					type: mongoose.Mixed,
				},
			},
			notes: {
				label: "Notes",
				format: "textarea",
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
		return appdef.DefMdbVirtDelete;
	}

	static getDefaultDeleteDisableModeIsVirtual() {
		return (this.getDefaultDeleteDisableMode() === appdef.DefMdbVirtDelete);
	}

	static supportsVirtualDelete() {
		return (this.getBaseSchemaDefinition().disabled !== undefined);
	}

	static getDefaultDeleteDisableModeAsAclAction() {
		const deleteDisableMode = this.getDefaultDeleteDisableMode();
		if (deleteDisableMode === appdef.DefMdbVirtDelete) {
			return appdef.DefAclActionDelete;
		}
		return appdef.DefAclActionPermDelete;
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


	/**
	 * Should we log database actions on instances of this model?
	 * Subclasses can override this (logModel) to say that we shouldnt create log entries when they are deleted etc.
	 *
	 * @static
	 * @returns true or false
	 * @memberof ModelBaseMongoose
	 */
	static getShouldLogDbActions() {
		return true;
	}
	//---------------------------------------------------------------------------





























	//---------------------------------------------------------------------------
	static extractMongooseDbSchemaDefintion() {
		// get the full schema definition
		const schemaDefinition = this.getSchemaDefinition();
		// now build a new object with only the key mongoose values
		const mongooseDbSchemaDefinition = {};
		for (const key in schemaDefinition) {
			if (schemaDefinition[key].mongoose) {
				mongooseDbSchemaDefinition[key] = schemaDefinition[key].mongoose;
			}
		}
		// return it
		return mongooseDbSchemaDefinition;
	}


	// User model mongoose db schema
	static buildMongooseDbSchema(mongooser) {
		const mongooseDbSchemaDefinition = this.extractMongooseDbSchemaDefintion();
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
		const baseSchemaDefinition = this.getBaseSchemaDefinition();
		if (baseSchemaDefinition[fieldname]) {
			return baseSchemaDefinition[fieldname].type;
		}
		return null;
	}


	// ATTN: TODO -- cache the schema definition and extras
	static getSchemaFieldVal(fieldName, key, defaultVal) {
		const modelSchemaDefinition = this.getSchemaDefinition();
		if (modelSchemaDefinition[fieldName] && modelSchemaDefinition[fieldName][key] !== undefined) {
			return modelSchemaDefinition[fieldName][key];
		}
		return defaultVal;
	}

	static async calcHiddenSchemaKeysForView(viewType, req) {
		const retKeys = [];
		const modelSchemaDefinition = this.getSchemaDefinition();
		const keys = Object.keys(modelSchemaDefinition);
		let keyHideArray;
		let visfunc, isVisible;

		await jrhMisc.asyncAwaitForEachFunctionCall(keys, async (key) => {
			keyHideArray = modelSchemaDefinition[key].hide;
			if ((keyHideArray === true) || (jrhMisc.isInAnyArray(viewType, keyHideArray))) {
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

		if (id && !jrhMongo.isValidMongooseObjectId(id)) {
			// invalid id
			return "";
		}

		let url = this.crudBaseUrl;
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
		const obj = {
			version: this.getVersion(),
			creator: null,
			creationDate: new Date(),
			modificationDate: null,
			disabled: 0,
			notes: "",
			...inobj,
		};
		const model = this.newMongooseModel(obj);
		return model;
	}

	// cacheable list of schema keys
	// ATTN: TODO - this is messy and confusing, fix it
	getModelObjPropertyList() {
		// cached value
		if (this.getModelClass().modelObjPropertyList) {
			return this.getModelClass().modelObjPropertyList;
		}
		const propkeys = Object.keys(this.getModelClass().getSchemaDefinition());
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
		// We can pass lean option in queries to bypass this on a case-by-case-basis
		await this.modelSchema.loadClass(this);

		// create the mongoose model
		const collectionName = this.getCollectionName();
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
		const list = await mongooser.connection.db.listCollections({ name: collectionName }).toArray();
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

		// save and we catch any exceptions and convert to jrResults
		let retv;
		let serr;
		try {
			retv = await await this.save();
			/*
			retv = await await this.save((err) => {
				// ATTN: had a hard time catching exceptions on mongoose save, lets see if error callback works better
				if (err) {
					serr = err;
					console.log("ATTN: Unexpected error 1 while trying to mongoose save object:");
					console.log(err);
				} else {
					// success, drop down
				}
			});
			*/
		} catch (err) {
			// just set serr and drop down
			serr = err;
		}

		if (serr !== undefined) {
			if (jrResult === undefined) {
				// just let exceptions percolate up
				console.log("ATTN: Unexpected error 2 while trying to mongoose save object:");
				console.log(serr);
				throw serr;
			}
			jrResult.pushError("Failed to save " + this.getModelClass().getNiceName() + ". " + serr.toString());
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
		const flagIsNew = obj.isNew;
		// call validate and save
		const savedObj = await this.doValidateAndSave(jrResult, options, flagSave, user, source, saveFields, preValidatedFields, ignoreFields, obj);
		// success?
		if (flagUpdateUserRolesForNewObject && flagIsNew && !jrResult.isError() && user) {
			// successful save and it was a new object, and caller wants us to set roles of owner
			await user.addOwnerCreatorRolesForNewObject(obj, true, jrResult);
			if (jrResult.isError()) {
				// error setting roles, which means we would like to DESTROY the object and reset it..
				// ATTN: unfinished
				const emsg = "ATTN: Failed to set ownership roles on " + obj.getLogIdString();
				arserver.logr(null, "error.imp", emsg);
				jrdebug.debug(emsg);
			}
		}
		return savedObj;
	}


	static async validateAndSaveNewWrapper(jrResult, options, flagSave, user, source, saveFields, preValidatedFields, ignoreFields, flagUpdateUserRolesForNewObject) {
		const newObj = this.createModel({});
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
		const newObj = this.createModel({});
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
	static async validateMergeAsync(jrResult, fieldNameSource, fieldNameTarget, source, saveFields, preValidatedFields, obj, flagRequired, valueFunction) {
		//
		// source and target field names might be different (for example, password is plaintext hashed into a different target fieldname)
		if (fieldNameTarget === "") {
			fieldNameTarget = fieldNameSource;
		}

		// first see if value was pre-validated
		let validatedVal, unvalidatedVal;
		let fieldNameUsed;
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
			validatedVal = await valueFunction(jrResult, fieldNameSource, unvalidatedVal, flagRequired);
			// if its an error, for example during validation, we are done
			if (jrResult.isError()) {
				return undefined;
			}
		}

		// secondary check for missing value, after we run the valueFunction function
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
		for (const prop in source) {
			if (Object.prototype.hasOwnProperty.call(source, prop)) {
				if ((saveFields && saveFields.includes(prop)) || (preValidatedFields && preValidatedFields.includes(prop)) || (ignoreFields && ignoreFields.includes(prop))) {
					// good
					continue;
				} else {
					// not found, first check if its a _checkbox version of an allowed field
					if (prop.endsWith("_checkbox")) {
						const preprop = prop.substr(0, prop.length - 9);
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
		const id = req.body._editId;

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
		const existingModel = await this.mFindOneById(id);
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
		const { id, existingModel } = await this.validateAddEditFormId(jrResult, req, res, formTypeStr);
		if (jrResult.isError()) {
			return null;
		}

		if (!existingModel) {
			// create new one (doesn't save it yet)
			return this.createModel();
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
		let criteria;
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

		const clashObj = await this.mFindOne(criteria);
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
				const sstr = (key === "shortcode") ? "shortcode" : "shortcode (" + key + ")";
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
				const sstr2 = (key === "shortcode") ? "shortcode" : "shortcode (" + key + ")";
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
		let criteria;
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
		const clashObj = await this.mFindOne(criteria);
		if (clashObj) {
			return true;
		}
		return false;
	}


	static async makeRandomShortcode(key) {
		// try to make an unused random shortcode
		const maxTrycount = 100;
		const shortcodeLen = 9;
		let shortcode;
		const criteria = {};
		const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

		for (let trycount = 0; trycount < maxTrycount; trycount += 1) {
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
			jrResult.pushFieldError(key, "app id may not be blank.");
			return null;
		}
		if (!appIds || appIds.indexOf(val) === -1) {
			jrResult.pushFieldError(key, "specified app id is inaccessible.");
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
			jrResult.pushFieldError(key, "room id may not be blank.");
			return null;
		}
		if (!roomIds || roomIds.indexOf(val) === -1) {
			jrResult.pushFieldError(key, "specified room id is inaccessible.");
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
		let val = this.extraData.get(key);
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
		const retv = new this.mongooseModel(obj);
		return retv;
	}
	//---------------------------------------------------------------------------




















	//---------------------------------------------------------------------------
	// rather than letting different models call mongoose directly, we try to put a thin wrapper of our own


	static async mFindOne(...args) {
		// actually call mongooseModel mFindOne
		const retv = await this.mongooseModel.findOne(...args).exec();
		return retv;
	}


	static async mFindOneAndUpdate(criteria, setObject) {
		const retv = await this.mongooseModel.findOneAndUpdate(criteria, setObject).exec();
		return retv;
	}


	static async mFindAll(criteria) {
		const retv = await this.mongooseModel.find(criteria).exec();
		return retv;
	}


	static async mFindAllAndSelect(criteria, projection) {
		// pass null as criteria to get full set
		// ATTN: we dont exec when we select?
		const retv = await this.mongooseModel.find(criteria).select(projection);
		return retv;
	}


	static async mFindMongoose(...args) {
		// just pass through to mongoose find
		const retv = await this.mongooseModel.find(...args).exec();
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

	static async mFindAllByQuery(query, queryOptions, flagDoLeanRequestNotFullClasses, jrResult) {
		// fetch the array of items to be displayed in grid
		// see https://thecodebarbarian.com/how-find-works-in-mongoose

		// ATTN: IMPORTANT -- when this is set, we don't instantiate full model classes when retrieving
		// we force caller to specify this explicitly instead of embedding it in queryOptions so that it sticks out more like a sore thumb since it can have important ramifications
		if (flagDoLeanRequestNotFullClasses) {
			queryOptions.lean = true;
		}

		const queryProjection = null;
		try {
			const items = await this.mongooseModel.find(query, queryProjection, queryOptions).exec();

			let resultCount;
			const isQueryEmpty = ((Object.keys(query)).length === 0);
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
	static async mFindAndDeleteMany(criteria) {
		await this.getMongooseModel().deleteMany(criteria).exec();
	}
	//---------------------------------------------------------------------------


























	//---------------------------------------------------------------------------
	// shortcuts that call above

	static async mFindOneByShortcode(shortcodeval) {
		// return null if not found
		if (!shortcodeval) {
			return null;
		}
		return await this.mFindOne({ shortcode: shortcodeval });
	}


	// lookup user by their id
	static async mFindOneById(id) {
		// return null if not found
		if (!id) {
			return null;
		}
		return await this.mFindOne({ _id: id });
	}


	static async mFindOneByKeyValue(key, val) {
		return await this.mFindOne({ [key]: val });
	}
	//---------------------------------------------------------------------------






























	//---------------------------------------------------------------------------
	modelObjPropertyCopy(flagIncludeId) {
		// copy the properties in schema
		const obj = {};
		const keylist = this.getModelObjPropertyList();

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
		const gridSchema = this.getSchemaDefinition();

		// force add the invisible id field to schema for display
		// we shouldn't have to do this anymore, we found out had to add it to the model schema
		if (false) {
			gridSchema._id = { type: "id" };
		}

		// headers for list grid
		const gridHeaders = [];

		// default sorting?
		const crudDefaults = this.getCrudDefaults();

		// options for filter construction
		const filterOptions = {
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
		const { query, queryOptions, queryUrlData } = jrhMongoFilter.buildMongooseQueryFromReq(filterOptions, gridSchema, req, jrResult);



		// ATTN: IMPORTANT! 5/20/20
		// Force the lean option to speed up retrieving of results, since we only need for read-only display here; see https://mongoosejs.com/docs/tutorials/lean.html
		// Note that if we wanted to call methods on the model class we couldn't do this, as it returns results as plain generic objects
		const flagDoLeanRequestNotFullClasses = false;




		// add filter to not show vdeletes if appropriate
		await this.addUserDisabledVisibilityToQuery(user, query);



		// get the items using query
		const [gridItems, resultcount] = await this.mFindAllByQuery(query, queryOptions, flagDoLeanRequestNotFullClasses, jrResult);
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
			const oldDisabled = query.disabled;
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

		let obj;
		const id = this.validateModelFieldId(jrResult, val);

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
			obj = await this.mFindOneById(id);
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
		return async (viewType, fieldName, req, obj, editData, helperData) => {
			let retv;
			const flagExistingIsNonBlank = (obj && (obj.passwordHashed !== undefined && obj.passwordHashed !== null && obj.password !== ""));

			if (editData && fieldName in editData) {
				// they are editing this field on a crud form, return the current editing value (not any previous val of object)
				retv = jrhText.jrHtmlFormInputPassword("password", editData, flagRequired, flagExistingIsNonBlank);
				return retv;
			}

			const isLoggedInUserSiteAdmin = await arserver.isLoggedInUserSiteAdmin(req);
			if (viewType === "view" && obj !== undefined) {
				if (isLoggedInUserSiteAdmin) {
					// for debuging
					retv = obj.passwordHashed;
				} else {
					// safe
					retv = this.safeDisplayPasswordInfoFromPasswordHashed(obj.passwordHashed);
				}
			} else if (viewType === "add" || viewType === "edit") {
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
		return async (viewType, fieldName, req, obj, editData, helperData) => {
			let str;

			if (editData && fieldName in editData) {
				// they are editing this field on a crud form, return the current editing value (not any previous val of object)
				str = editData[fieldName];
			} else if (obj && obj.extraData) {
				if (typeof obj.extraData === "string") {
					// already a string -- this is used when form error being reshown..
					str = obj.extraData;
				} else {
					str = JSON.stringify(obj.extraData, null, " ");
				}
			} else {
				// str will be undefined, which is handled in sanitizeUnsafeText
			}

			// let them edit the json string
			if (viewType === "add" || viewType === "edit") {
				// sanitize html
				str = jrhText.sanitizeUnsafeText(str, false, false);
				// wrap in input textarea
				str = `<textarea name="${fieldName}" rows="4" cols="80">${str}</textarea>`;
			} else {
				// just for display sanitize html
				str = jrhText.sanitizeUnsafeText(str, true, true);
			}

			// return it
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
		return async (viewType, fieldName, req, obj, editData, helperData) => {
			if (editData && fieldName in editData) {
				// no way to edit this
			}

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
		return async (viewType, fieldName, req, obj, editData, helperData) => {
			let viewUrl, oLabel, rethtml, oid;

			if (editData && editData[fieldId]) {
				// they are editing this field on a crud form, return the current editing value (not any previous val of object)
				oid = editData[fieldId];
				rethtml = jrhText.jrHtmlFormOptionListSelect(fieldId, helperData[fieldList], oid, true);
				return rethtml;
			}

			if (viewType === "view" && obj !== undefined) {
				viewUrl = modelClass.getCrudUrlBase("view", obj[fieldId]);
				oLabel = helperData[fieldLabel];
				rethtml = `${oLabel} (<a href="${viewUrl}">#${obj[fieldId]}</a>)`;
				return rethtml;
			}
			if (viewType === "add" || viewType === "edit") {
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
		const RoleModel = jrequire("models/role");
		return async (viewType, fieldName, req, obj, editData, helperData) => {
			if (editData && fieldName in editData) {
				// no way to edit this
			}

			// can't get roles?
			if (!obj || (!obj.getAllRolesOnThisObject && !obj._id)) {
				return "n/a";
			}

			if (false && viewType === "list") {
				// too heavy to retrieve in this mode
				return "...";
			}

			//
			if (obj.getAllRolesOnThisObject) {
				// it's a full object so we can resolve it
				// ATTN: 5/13/20 -- because this needs a valid object, it doesnt work in crud edit mode only crud view mode
				const roles = await obj.getAllRolesOnThisObject();
				return RoleModel.stringifyRoles(roles, true, false);
			}

			// a thin json object, but we still know how to do this
			if (obj._id) {
				const roles = await this.getAllRolesOnObjectById(obj._id);
				return RoleModel.stringifyRoles(roles, true, false);
			}

			// should never be able to get here
			return "n/a";
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

		if (mode === appdef.DefMdbRealDelete) {
			// direct database delete
			await this.getMongooseModel().deleteOne({ _id: id }, (err) => {
				if (err) {
					const msg = "Error while tryign to delete " + this.getNiceNameWithId(id) + ": " + err.message;
					jrResult.pushError(msg);
				} else {
					// log the action
					if (this.getShouldLogDbActions()) {
						arserver.logr(null, "db.delete", "Deleted " + this.getNiceNameWithId(id));
					}
				}
			});
		} else {
			// change mode (enable, disable, vdelete, etc.)
			// just sets the field "disabled" to mode value
			// see https://mongoosejs.com/docs/documents.html#updating
			const nowDate = new Date();
			await this.getMongooseModel().updateOne({ _id: id }, { $set: { disabled: mode, modificationDate: nowDate } }, (err) => {
				if (err) {
					const msg = "Error while changing to " + appdef.DefStateModeLabels[mode] + "  " + this.getNiceNameWithId(id) + ": " + err.message;
					jrResult.pushError(msg);
				} else {
					if (this.getShouldLogDbActions()) {
						// log the action
						arserver.logr(null, "db.modify", "Changing to " + appdef.DefStateModeLabels[mode] + "  " + this.getNiceNameWithId(id));
					}
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
		let successCount = 0;

		// walk the list and do a deep delete of each
		let id;
		for (let i = 0; i < idList.length; ++i) {
			id = idList[i];
			await this.doChangeModeById(id, mode, jrResult);
			if (jrResult.isError()) {
				break;
			}
			++successCount;
		}

		const modeLabel = jrhText.capitalizeFirstLetter(appdef.DefStateModeLabels[mode]);
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
	async getAllRolesOnThisObject() {
		// get all roles held by all users on this object
		return await this.getModelClass().getAllRolesOnObjectById(this.getIdAsString());
	}


	static async getAllRolesOnObjectById(objectIdString) {
		const cond = {
			objectType: this.getAclName(),
			objectId: objectIdString,
		};
		const RoleModel = jrequire("models/role");
		const roles = await RoleModel.mFindRolesByCondition(cond);
		return roles;
	}
	//---------------------------------------------------------------------------






	//---------------------------------------------------------------------------
	// ATTN: first stab at extracting a function to do what crudaid does
	static async renderFieldValueHtml(req, obj, editData, fieldName, crudSubType, helperData) {
		let isReadOnly = false;
		let val, valHtml;

		// editing or read only?
		if (crudSubType === "view" || crudSubType === "list") {
			isReadOnly = true;
		} else {
			// might be editable
			const readOnlyList = this.getSchemaFieldVal(fieldName, "readOnly", undefined);
			isReadOnly = ((readOnlyList === true) || jrhMisc.isInAnyArray(crudSubType, readOnlyList));
		}

		// now compute value

		// is there a custom value function? if so use that to grab value
		const valueFunction = this.getSchemaFieldVal(fieldName, "valueFunction");
		if (valueFunction) {
			// ok we have a custom function to call to get html to show for value (only pass in potential editData if not readOnly)
			valHtml = await valueFunction(crudSubType, fieldName, req, obj, isReadOnly ? null : editData, helperData);
		}

		// if we havent yet set a value using valueFunctions (or if that returns undefined) then use default value
		if (valHtml === undefined) {
			let choices;
			let extra;
			let url;

			const format = this.getSchemaFieldVal(fieldName, "format", undefined);
			// compact view mode?
			const isCompact = (crudSubType === "list");

			// get the raw value we are going to use
			if (isReadOnly) {
				// read only just use obj value (ignore editData)
				if (obj && fieldName in obj) {
					val = obj[fieldName];
				}
			} else {
				// it's editable, check for value in reqbody
				if (editData && fieldName in editData) {
					// value set in editData
					val = editData[fieldName];
				} else if (obj && fieldName in obj) {
					// value not set in editData, fall back on obj value if available
					val = obj[fieldName];
				} else {
					// not found in obj or editData (perhaps new object so obj is null)
					val = this.getSchemaFieldVal(fieldName, "defaultValue", undefined);
				}
			}

			// we have the raw value, now we need to format it nicely depending on format, etc.

			// is it multiple choice type?
			if (!isReadOnly) {
				// try to get editing choices
				choices = this.getSchemaFieldVal(fieldName, "choicesEdit", null);
				// if not found, drop down and fall back on choices
			}
			if (!choices) {
				choices = this.getSchemaFieldVal(fieldName, "choices", null);
			}

			// how we format will depend on whether its read only or editable input
			if (isReadOnly) {
				// read only value
				if (choices) {
					if (isCompact) {
						valHtml = jrhText.jrHtmlDisplayOptionListChoice(val, choices);
					} else {
						valHtml = jrhText.jrHtmlNiceOptionFromList(choices, val);
					}
				} else if (format === "textarea") {
					valHtml = jrhText.sanitizeUnsafeText(val, true, true);
				} else if (format === "checkbox") {
					// checkbox (note that we display null and undefined as false here)
					if (val) {
						valHtml = "true";
					} else {
						valHtml = "false";
					}
				} else if (format === "date") {
					// format as compact date?
					valHtml = jrhText.formatDateNicely(val, isCompact);
				}

				// fallback default
				if (valHtml === undefined) {
					// just coerce to a string for display
					valHtml = jrhText.sanitizeUnsafeText(jrhText.coerceToString(val, true), true, false);
				}

				// can we link to another object crud page for this field?
				if (!url && val) {
					// this field refers to another model so we can link to it
					const refModelClass = this.getSchemaFieldVal(fieldName, "refModelClass");
					if (refModelClass) {
						url = refModelClass.getCrudUrlBase("view", val);
					}
				}
				// wrap in url?
				if (url) {
					valHtml = `<a href="${url}">${valHtml}</a>`;
				}
			} else {
				// not read only, editable
				if (choices) {
					const flagShowBlank = true;
					valHtml = jrhText.jrHtmlFormOptionListSelect(fieldName, choices, val, flagShowBlank);
				} else if (format === "textarea") {
					// textview block (note in this case we pass false, false to sanitize, so that we edit "" if its undefined)
					val = jrhText.sanitizeUnsafeText(val, false, false);
					valHtml = `<textarea name="${fieldName}" rows="4" cols="80">${val}</textarea>`;
				} else if (format === "checkbox") {
					// checkbox
					if (val) {
						extra = "checked";
					} else {
						extra = "";
					}
					valHtml = `<input type="checkbox" name="${fieldName}" ${extra}>`;
					// add a hidden var to handle the cases where unchecked checkbox is not sent, stupid html form processing of checkboxes
					valHtml += `<input type="hidden" name="${fieldName}_checkbox" value="true">`;
				}
				// fallback default - simple text input
				if (valHtml === undefined) {
					// just show text in input (note in this case we pass false, false to sanitize, so that we edit "" if its undefined)
					val = jrhText.sanitizeUnsafeText(jrhText.coerceToString(val, true), false, false);
					valHtml = `<input type="text" name="${fieldName}" value="${val}" size="80"/>`;
				}
			}
		}

		return valHtml;
	}
	//---------------------------------------------------------------------------














}






// export the class as the sole export
module.exports = ModelBaseMongoose;
