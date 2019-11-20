/**
 * @module controllers/crudaid
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 6/5/19
 * @description
 * This module defines CrudAid class, which provides support functions for crud (Create, Update, Delete, List) actions on model data in the database
 */

"use strict";


// modules
const fs = require("fs");
const path = require("path");

// modules
const hbs = require("hbs");


// requirement service locator
const jrequire = require("../helpers/jrequire");

// helpers
const JrResult = require("../helpers/jrresult");
const jrhText = require("../helpers/jrh_text");
const jrhMisc = require("../helpers/jrh_misc");
const jrhGrid = require("../helpers/jrh_grid");

// models
const arserver = jrequire("arserver");




/**
 * Povides support functions for crud (Create, Update, Delete, List) actions on model data in the database
 *
 * @class CrudAid
 */
class CrudAid {

	//---------------------------------------------------------------------------
	// constructor
	constructor() {
	}
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	setupRouter(router, modelClass, baseCrudUrl) {
		// this is called during server setup, for each route that we want to provide crud route support on
		// note that we use const variables with different names here so that we can precalc the view files ONCE
		// and use that calc'd path each time the request is made without having to recompute it


		const extraViewData = {};

		//---------------------------------------------------------------------------
		// list
		const viewFilePathList = this.calcViewFile("list", modelClass);
		router.get("/", async (req, res, next) => await this.handleListGet(req, res, next, modelClass, baseCrudUrl, viewFilePathList, extraViewData));
		//---------------------------------------------------------------------------

		//---------------------------------------------------------------------------
		// add (get)
		const viewFilePathAdd = this.calcViewFile("addedit", modelClass);
		router.get("/add/:id?", async (req, res, next) => await this.handleAddGet(req, res, next, modelClass, baseCrudUrl, viewFilePathAdd, extraViewData));
		// add (post submit)
		router.post("/add/:ignoredid?", async (req, res, next) => await this.handleAddPost(req, res, next, modelClass, baseCrudUrl, viewFilePathAdd, extraViewData));
		//---------------------------------------------------------------------------

		//---------------------------------------------------------------------------
		// edit (get)
		const viewFilePathEdit = this.calcViewFile("addedit", modelClass);
		router.get("/edit/:id", async (req, res, next) => await this.handleEditGet(req, res, next, modelClass, baseCrudUrl, viewFilePathEdit));
		// edit (post submit)
		router.post("/edit/:ignoredid?", async (req, res, next) => await this.handleEditPost(req, res, next, modelClass, baseCrudUrl, viewFilePathEdit, extraViewData));
		//---------------------------------------------------------------------------

		//---------------------------------------------------------------------------
		// view (get)
		const viewFilePathView = this.calcViewFile("viewdelete", modelClass);
		router.get("/view/:id", async (req, res, next) => await this.handleViewGet(req, res, next, modelClass, baseCrudUrl, viewFilePathView, extraViewData));
		//---------------------------------------------------------------------------

		//---------------------------------------------------------------------------
		// delete (get)
		const viewFilePathDelete = this.calcViewFile("viewdelete", modelClass);
		router.get("/delete/:id", async (req, res, next) => await this.handleDeleteGet(req, res, next, modelClass, baseCrudUrl, viewFilePathDelete, extraViewData));
		// delete (post submit)
		router.post("/delete/:ignoredid?", async (req, res, next) => await this.handleDeletePost(req, res, next, modelClass, baseCrudUrl, viewFilePathDelete, extraViewData));
		//---------------------------------------------------------------------------

		//---------------------------------------------------------------------------
		// stats
		const viewFilePathStats = this.calcViewFile("stats", modelClass);
		router.get("/stats", async (req, res, next) => await this.handleStatsGet(req, res, next, modelClass, baseCrudUrl, viewFilePathStats, extraViewData));
		//---------------------------------------------------------------------------
	}
	//---------------------------------------------------------------------------








	//---------------------------------------------------------------------------
	// These functions do the actual work of crud routes

	async handleListGet(req, res, next, modelClass, baseCrudUrl, viewFileSet, extraViewData) {
		// get logged in user
		var user = await arserver.getLoggedInUser(req);

		// acl test
		if (!await arserver.aclRequireModelAccessRenderErrorPageOrRedirect(user, req, res, modelClass, "list")) {
			return true;
		}

		var jrResult = JrResult.makeNew();

		// ATTN: We might set these differently based on who is logged in and looking at the list
		// and it should be a per-modelClass thing..
		// ATTN: testing here some manual items:
		var protectedFields = ["passwordHashed"];
		var hiddenFields = [];

		// parse view file set
		var { viewFile, isGeneric } = viewFileSet;

		// hidden fields for list view
		var hiddenFiledsExtraSchema = await modelClass.getSchemaExtraKeysMatchingViewType("list", req);
		hiddenFields = jrhMisc.mergeArraysDedupe(hiddenFields, hiddenFiledsExtraSchema);

		// make helper data
		const helperData = await modelClass.calcCrudListHelperData(req, res, baseCrudUrl, protectedFields, hiddenFields, jrResult);

		// generic main html for page (add form)
		var genericMainHtml;
		if (isGeneric) {
			genericMainHtml = await this.buildGenericMainHtml(modelClass, req, req.body, jrResult, "list", helperData);
		}

		// render
		res.render(viewFile, {
			headline: "List " + modelClass.getNiceName() + "s",
			jrResult: JrResult.getMergeSessionResultAndClear(req, res, jrResult),
			csrfToken: arserver.makeCsrf(req, res),
			helperData,
			genericMainHtml,
			baseCrudUrl,
			extraViewData,
		});

		return true;
	}


	async handleAddGet(req, res, next, modelClass, baseCrudUrl, viewFileSet, extraViewData) {
		// get logged in user
		var user = await arserver.getLoggedInUser(req);

		var jrResult = JrResult.makeNew();
		var id = req.params.id;
		var reqbody;

		// get id from get param; if they specify an id, grab that object from db and let them start a new one with those values (like a clone
		if (id) {
			// validate id
			modelClass.validateId(jrResult, id);
			if (!jrResult.isError()) {
				// acl test to VIEW the item we are CLONING
				if (!await arserver.aclRequireModelAccessRenderErrorPageOrRedirect(user, req, res, modelClass, "view", id)) {
					return true;
				}
				// get object being edited
				var obj = await modelClass.findOneById(id);
				if (!obj) {
					jrResult.pushError("Could not find " + modelClass.getNiceName() + " with that Id.");
				} else {
					// found one, copy data into reqbody var for view form
					reqbody = obj.modelObjPropertyCopy(false);
				}
			}
		}

		// acl test to add
		if (!await arserver.aclRequireModelAccessRenderErrorPageOrRedirect(user, req, res, modelClass, "add")) {
			return true;
		}

		// any helper data
		const helperData = await modelClass.calcCrudEditHelperData(user);

		// parse view file set
		var { viewFile, isGeneric } = viewFileSet;

		// generic main html for page (add form)
		var genericMainHtml;
		if (isGeneric) {
			genericMainHtml = await this.buildGenericMainHtml(modelClass, req, reqbody, jrResult, "add", helperData);
		}

		// render
		res.render(viewFile, {
			headline: "Add " + modelClass.getNiceName(),
			jrResult: JrResult.getMergeSessionResultAndClear(req, res, jrResult),
			csrfToken: arserver.makeCsrf(req, res),
			reqbody,
			helperData,
			genericMainHtml,
			baseCrudUrl,
			crudAdd: true,
			extraViewData,
		});

		return true;
	}


	async handleAddPost(req, res, next, modelClass, baseCrudUrl, viewFileSet, extraViewData) {
		// user posts form for adding submission

		// get logged in user
		var user = await arserver.getLoggedInUser(req);

		var jrResult = JrResult.makeNew();
		var formTypeStr = "add";
		var flagRepresentAfterSuccess = false;

		// check required csrf token
		if (arserver.testCsrfThrowError(req, res, next) instanceof Error) {
			return true;
		}
		// acl test
		if (!await arserver.aclRequireModelAccessRenderErrorPageOrRedirect(user, req, res, modelClass, "add")) {
			return true;
		}

		// process
		var reqbody = req.body;

		// load existing object by id if provided, throw errors if id missing (or provided to add formtype)
		// in the ADD case, this should just return a new blank object or complain if user specified an id
		var obj = await modelClass.validateAddEditFormIdMakeObj(jrResult, req, res, formTypeStr);

		if (!jrResult.isError()) {
			// now save add changes
			var saveFields = modelClass.getSaveFields(req, "crudAdd");
			var savedobj = await modelClass.validateAndSave(jrResult, {}, true, req, req.body, saveFields, null, obj);
			if (!jrResult.isError()) {
				// success! drop down with new blank form, or alternatively, we could redirect to a VIEW obj._id page
				jrResult.pushSuccess(modelClass.getNiceName() + " added on " + jrhMisc.getNiceNowString() + ".");

				// log the action
				arserver.logr(req, "crud.create", "created " + savedobj.getLogIdString());

				if (!baseCrudUrl) {
					// just return to caller saying they should take over
					return false;
				}

				if (flagRepresentAfterSuccess) {
					// success, so clear reqbody and drop down so they can add another
					reqbody = {};
				} else {
					jrResult.addToSession(req);
					res.redirect(baseCrudUrl + "/view/" + savedobj.getIdAsString());
					return true;
				}
			}
		}

		// any helper data
		const helperData = await modelClass.calcCrudEditHelperData(user);

		// parse view file set
		var { viewFile, isGeneric } = viewFileSet;

		// generic main html for page (add form)
		var genericMainHtml;
		if (isGeneric) {
			genericMainHtml = await this.buildGenericMainHtml(modelClass, req, reqbody, jrResult, "add", helperData);
		}

		// re-present form for another add?
		res.render(viewFile, {
			headline: "Add " + modelClass.getNiceName(),
			jrResult: JrResult.getMergeSessionResultAndClear(req, res, jrResult),
			csrfToken: arserver.makeCsrf(req, res),
			reqbody,
			helperData,
			genericMainHtml,
			baseCrudUrl,
			crudAdd: true,
			extraViewData,
		});

		return true;
	}


	async handleEditGet(req, res, next, modelClass, baseCrudUrl, viewFileSet, extraViewData) {
		// get logged in user
		var user = await arserver.getLoggedInUser(req);

		var jrResult = JrResult.makeNew();

		// get id from get param
		var id = req.params.id;

		// validate and get id, this will also do an ACL test
		var obj = await modelClass.validateGetObjByIdDoAclRenderErrorPageOrRedirect(jrResult, user, req, res, id, "edit");
		if (jrResult.isError()) {
			return false;
		}

		// put object fields in body, for view form
		var reqbody = obj.modelObjPropertyCopy(true);

		// any helper data
		const helperData = await modelClass.calcCrudEditHelperData(user, id);

		// parse view file set
		var { viewFile, isGeneric } = viewFileSet;

		// generic main html for page (edit form)
		var genericMainHtml;
		if (isGeneric) {
			genericMainHtml = await this.buildGenericMainHtml(modelClass, req, reqbody, jrResult, "edit", helperData);
		}

		// render
		res.render(viewFile, {
			headline: "Edit " + modelClass.getNiceName() + " #" + id,
			jrResult: JrResult.getMergeSessionResultAndClear(req, res, jrResult),
			csrfToken: arserver.makeCsrf(req, res),
			reqbody,
			helperData,
			genericMainHtml,
			baseCrudUrl,
			extraViewData,
		});

		return true;
	}


	async handleEditPost(req, res, next, modelClass, baseCrudUrl, viewFileSet, extraViewData) {
		// user posts form for adding submission

		// get logged in user
		var user = await arserver.getLoggedInUser(req);

		// ATTN: in post of edit, we ignore the id passed in param and get it from post body
		var formTypeStr = "edit";
		var jrResult = JrResult.makeNew();
		var flagRepresentAfterSuccess = false;

		// get id from post, ignore url param
		var id = req.body._id;

		// check required csrf token
		if (arserver.testCsrfThrowError(req, res, next) instanceof Error) {
			return false;
		}
		// acl test
		if (!await arserver.aclRequireModelAccessRenderErrorPageOrRedirect(user, req, res, modelClass, "edit", id)) {
			return false;
		}

		// process
		var reqbody = req.body;

		// load existing object by id if provided, throw errors if id missing (or provided to add formtype)
		var obj = await modelClass.validateAddEditFormIdMakeObj(jrResult, req, res, formTypeStr);

		if (!jrResult.isError()) {
			// now save edit changes
			var saveFields = modelClass.getSaveFields(req, "crudEdit");
			var savedobj = await modelClass.validateAndSave(jrResult, {}, true, req, req.body, saveFields, null, obj);
			if (!jrResult.isError()) {
				// success! drop down with new blank form, or alternatively, we could redirect to a VIEW obj._id page

				// log the action
				arserver.logr(req, "crud.edit", "edited " + savedobj.getLogIdString());

				jrResult.pushSuccess(modelClass.getNiceName() + " saved on " + jrhMisc.getNiceNowString() + ".");
				if (!baseCrudUrl) {
					// just return to caller saying they should take over
					jrResult.addToSession(req);
					return false;
				}
				if (flagRepresentAfterSuccess) {
					// fill form data with object properties and drop down to let user re-edit
					reqbody = savedobj.modelObjPropertyCopy(true);
				} else {
					jrResult.addToSession(req);
					res.redirect(baseCrudUrl + "/view/" + savedobj.getIdAsString());
					return true;
				}

			}
		}

		// any helper data
		const helperData = await modelClass.calcCrudEditHelperData(user, id);

		// parse view file set
		var { viewFile, isGeneric } = viewFileSet;

		// generic main html for page (edit form)
		var genericMainHtml;
		if (isGeneric) {
			genericMainHtml = await this.buildGenericMainHtml(modelClass, req, reqbody, jrResult, "edit", helperData);
		}

		// render -- just like original edit
		res.render(viewFile, {
			headline: "Edit " + modelClass.getNiceName() + " #" + id,
			jrResult: JrResult.getMergeSessionResultAndClear(req, res, jrResult),
			csrfToken: arserver.makeCsrf(req, res),
			reqbody,
			helperData,
			genericMainHtml,
			baseCrudUrl,
			extraViewData,
		});

		return true;
	}


	async handleViewGet(req, res, next, modelClass, baseCrudUrl, viewFileSet, extraViewData) {
		// get logged in user
		var user = await arserver.getLoggedInUser(req);

		// get id from get param
		var jrResult = JrResult.makeNew();
		var id = req.params.id;

		// get obj AND perform acl test
		var obj = await modelClass.validateGetObjByIdDoAclRenderErrorPageOrRedirect(jrResult, user, req, res, id, "view");
		if (jrResult.isError()) {
			return true;
		}

		// any helper data
		const helperData = await modelClass.calcCrudViewHelperData(req, res, id, obj);

		// parse view file set
		var { viewFile, isGeneric } = viewFileSet;

		// generic main html for page (view form)
		var genericMainHtml;
		if (isGeneric) {
			genericMainHtml = await this.buildGenericMainHtml(modelClass, req, obj, jrResult, "view", helperData);
		}

		// render
		res.render(viewFile, {
			headline: "View " + modelClass.getNiceName() + " #" + id,
			jrResult: JrResult.getMergeSessionResultAndClear(req, res, jrResult),
			obj,
			helperData,
			genericMainHtml,
			crudDelete: false,
			baseCrudUrl,
			extraViewData,
		});

		return true;
	}


	async handleDeleteGet(req, res, next, modelClass, baseCrudUrl, viewFileSet, extraViewData) {
		// get logged in user
		var user = await arserver.getLoggedInUser(req);

		var jrResult = JrResult.makeNew();
		// get id from get param
		var id = req.params.id;

		// get object AND perform ACL test
		var obj = await modelClass.validateGetObjByIdDoAclRenderErrorPageOrRedirect(jrResult, user, req, res, id, "delete");
		if (jrResult.isError()) {
			return true;
		}

		// any helper data
		const helperData = await modelClass.calcCrudViewHelperData(req, res, id, obj);

		// parse view file set
		var { viewFile, isGeneric } = viewFileSet;

		// generic main html for page (delete form)
		var genericMainHtml;
		if (isGeneric) {
			genericMainHtml = await this.buildGenericMainHtml(modelClass, req, obj, jrResult, "delete", helperData);
		}

		// render
		res.render(viewFile, {
			headline: "Delete " + modelClass.getNiceName() + " #" + id,
			jrResult: JrResult.getMergeSessionResultAndClear(req, res, jrResult),
			csrfToken: arserver.makeCsrf(req, res),
			obj,
			helperData,
			genericMainHtml,
			crudDelete: true,
			baseCrudUrl,
			extraViewData,
		});

		return true;
	}


	async handleDeletePost(req, res, next, modelClass, baseCrudUrl, viewFileSet, extraViewData) {
		// get logged in user
		var user = await arserver.getLoggedInUser(req);

		var jrResult = JrResult.makeNew();
		// get id from post, ignore url param
		var id = req.body._id;

		// check required csrf token
		if (arserver.testCsrfThrowError(req, res, next) instanceof Error) {
			return true;
		}
		// get object AND perform ACL test
		var obj = await modelClass.validateGetObjByIdDoAclRenderErrorPageOrRedirect(jrResult, user, req, res, id, "delete");
		if (jrResult.isError()) {
			return true;
		}

		// object id for display.
		const objIdString = obj.getIdAsString();
		const logIdString = obj.getLogIdString();

		// process delete
		obj.doDelete(jrResult);

		// on success redirect to listview
		if (!jrResult.isError()) {
			// success
			jrResult.pushSuccess(modelClass.getNiceName() + " #" + objIdString + " has been deleted.");

			// log the action
			arserver.logr(req, "crud.delete", "deleted " + logIdString);

			// redirect
			jrResult.addToSession(req);
			res.redirect(baseCrudUrl);
			return true;
		}

		// any helper data
		const helperData = await modelClass.calcCrudViewHelperData(req, res, id, obj);

		// parse view file set
		var { viewFile, isGeneric } = viewFileSet;

		// generic main html for page (delete form)
		var genericMainHtml;
		if (isGeneric) {
			genericMainHtml = await this.buildGenericMainHtml(modelClass, req, obj, jrResult, "delete", helperData);
		}

		// failed, present them with delete page like view?
		res.render(viewFile, {
			headline: "Delete " + modelClass.getNiceName() + " #" + id,
			jrResult: JrResult.getMergeSessionResultAndClear(req, res, jrResult),
			obj,
			genericMainHtml,
			crudDelete: true,
			baseCrudUrl,
			extraViewData,
		});

		return true;
	}


	async handleStatsGet(req, res, next, modelClass, baseCrudUrl, viewFileSet, extraViewData) {
		// get logged in user
		var user = await arserver.getLoggedInUser(req);

		// acl test
		if (!await arserver.aclRequireModelAccessRenderErrorPageOrRedirect(user, req, res, modelClass, "stats")) {
			return true;
		}

		// any helper data
		const helperData = await modelClass.calcCrudStatsHelperData(req, res);

		var { viewFile, isGeneric } = viewFileSet;

		// generic main html for page (delete form)
		var genericMainHtml;
		if (isGeneric) {
			genericMainHtml = await this.buildGenericMainHtml(modelClass, req, null, null, "stats", helperData);
		}

		// render
		res.render(viewFile, {
			headline: modelClass.getNiceName() + " Stats",
			jrResult: JrResult.getMergeSessionResultAndClear(req, res),
			csrfToken: arserver.makeCsrf(req, res),
			helperData,
			genericMainHtml,
			baseCrudUrl,
			extraViewData,
		});

		return true;
	}
	//---------------------------------------------------------------------------















	//---------------------------------------------------------------------------
	// helper to determine which view file to show
	// checks first for model specific view, then defaults to crud generic if the specific one not found
	calcViewFile(subview, modelClass) {
		var fname = path.join("crud", subview);
		var fnameModelSpecific = path.join("crud", modelClass.getCollectionName() + "_" + subview);
		var fnameModelGeneric = path.join("crud", "generic_" + subview);
		// try to find model specific version
		var fpath = path.join(arserver.getViewPath(), fnameModelSpecific + arserver.getViewExt());
		if (fs.existsSync(fpath)) {
			return {
				viewFile: fnameModelSpecific,
				isGeneric: false,
			};
		}
		return {
			viewFile: fnameModelGeneric,
			isGeneric: true,
		};
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	async buildGenericMainHtml(modelClass, req, obj, jrResult, crudSubType, helperData) {
		var rethtml;

		if (crudSubType === "add" || crudSubType === "edit") {
			// build form html for adding or editing
			rethtml = await this.buildGenericMainHtmlAddEdit(modelClass, req, obj, helperData, jrResult);
		} else if (crudSubType === "delete" || crudSubType === "view") {
			// build form html for viewing
			rethtml = await this.buildGenericMainHtmlView(modelClass, req, obj, helperData, jrResult);
		} else if (crudSubType === "stats") {
			// show stats
			rethtml = await this.buildGenericMainHtmlStats(modelClass, req, obj, helperData, jrResult);
		} else if (crudSubType === "list") {
			// show stats
			rethtml = await this.buildGenericMainHtmlList(modelClass, req, obj, helperData, jrResult);
		} else {
			throw (new Error("Illegal subtype (" + crudSubType + ") in buildGenericMainHtml."));
		}

		// we need to wrap return as hbs.SafeString in order to include raw html
		return new hbs.SafeString(rethtml);
	}


	async buildGenericMainHtmlAddEdit(modelClass, req, obj, helperData, jrResult) {
		var rethtml = "";

		// start table
		rethtml += `
		<div class="table-responsive">
		<table class="table table-striped w-auto table-bordered">
		`;

		// schema for obj
		var modelSchemaExtra = modelClass.getSchemaDefinitionExtra();
		var schemaKeys = Object.keys(modelSchemaExtra);
		var schemaType;
		var val, valHtml, label, valfunc, hideList, readOnlyList, choices;
		var visfunc, isVisible, isReadOnly;
		var extra;
		var err;
		await jrhMisc.asyncAwaitForEachFunctionCall(schemaKeys, async (fieldName) => {

			// type of this field
			schemaType = modelClass.getBaseSchemaType(fieldName);

			// hidden?
			hideList = modelClass.getSchemaExtraFieldVal(fieldName, "hide", undefined);
			if (jrhMisc.isInAnyArray("edit", hideList)) {
				return;
			}

			// read only?
			readOnlyList = modelClass.getSchemaExtraFieldVal(fieldName, "readOnly", undefined);
			isReadOnly = jrhMisc.isInAnyArray("edit", readOnlyList);

			// label
			label = modelClass.getSchemaExtraFieldVal(fieldName, "label", fieldName);
			// error
			if (jrResult && jrResult.fields && jrResult.fields[fieldName]) {
				err = jrResult.fields[fieldName];
			} else {
				err = "";
			}

			// now value
			valHtml = undefined;
			valfunc = modelClass.getSchemaExtraFieldVal(fieldName, "valueFunction");
			if (obj && valfunc) {
				// ok we have a custom function to call to get html to show for value
				valHtml = await valfunc("edit", fieldName, req, obj, helperData);
			}
			var format = modelClass.getSchemaExtraFieldVal(fieldName, "format", undefined);

			// dynamic visibility function
			visfunc = modelClass.getSchemaExtraFieldVal(fieldName, "visibleFunction");
			if (obj && visfunc) {
				// ok we have a custom function to call
				isVisible = await visfunc("edit", req, obj, helperData);
				if (!isVisible) {
					return;
				}
			}

			// if we havent yet set a value using valueFunctions (or if that returns undefined) then use default value
			if (valHtml === undefined) {
				if (!obj) {
					val = "";
				} else if (obj[fieldName] === null || obj[fieldName] === undefined) {
					val = "";
				} else {
					val = obj[fieldName];
				}

				// is it multiple choice type?
				choices = modelClass.getSchemaExtraFieldVal(fieldName, "choices", null);

				if (isReadOnly) {
					// read only value
					if (choices) {
						valHtml = this.buildChoiceHtmlForView(choices, val);
					} else {
						if (format === "checkbox") {
							// checkbox
							if (val) {
								valHtml = "true";
							} else {
								valHtml = "false";
							}
						} else {
							valHtml = val.toString();
						}
					}
				} else if (choices) {
					valHtml = this.buildChoiceHtmlForAddEdit(fieldName, choices, val);
				} else if (format === "textarea") {
					// textview block
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
				} else {
					// default is simple text input
					valHtml = `<input type="text" name="${fieldName}" value="${val}" size="80"/>`;
				}
			}

			rethtml += `
			<tr>
        		<td><strong>${label}</strong></td>
   	   			<td>${valHtml} <span class="jrErrorInline">${err}</span> </td>
			</tr>
			`;
		});

		// end table
		rethtml += `
		</table>
		</div>
		`;

		return rethtml;
	}


	async buildGenericMainHtmlView(modelClass, req, obj, helperData, jrResult) {
		var rethtml = "";

		// start table
		rethtml += `
		<div class="table-responsive">
		<table class="table table-striped w-auto table-bordered">
		`;

		// schema for obj
		var modelSchemaExtra = modelClass.getSchemaDefinitionExtra();
		var schemaType;
		var schemaKeys = Object.keys(modelSchemaExtra);
		var val, valHtml, label, valfunc, hideList, choices;
		var visfunc, isVisible;
		var crudLink;

		await jrhMisc.asyncAwaitForEachFunctionCall(schemaKeys, async (fieldName) => {

			// type of this field
			schemaType = modelClass.getBaseSchemaType(fieldName);

			// hidden?
			hideList = modelClass.getSchemaExtraFieldVal(fieldName, "hide", undefined);
			if (jrhMisc.isInAnyArray("view", hideList)) {
				return;
			}

			// label
			label = modelClass.getSchemaExtraFieldVal(fieldName, "label", fieldName);

			// now value
			valHtml = undefined;
			valfunc = modelClass.getSchemaExtraFieldVal(fieldName, "valueFunction");
			if (valfunc) {
				// ok we have a custom function to call to get html to show for value
				valHtml = await valfunc("view", fieldName, req, obj, helperData);
			}
			var format = modelClass.getSchemaExtraFieldVal(fieldName, "format", undefined);

			// dynamic visibility function
			visfunc = modelClass.getSchemaExtraFieldVal(fieldName, "visibleFunction");
			if (visfunc) {
				// ok we have a custom function to call to get html to show for value
				isVisible = await visfunc("view", req, obj, helperData);
				if (!isVisible) {
					return;
				}
			}

			// if we havent yet set a value using valueFunctions (or if that returns undefined) then use default value
			if (valHtml === undefined) {
				if (!obj) {
					val = "";
				} else {
					if (obj[fieldName] === null || obj[fieldName] === undefined) {
						val = "";
					} else {
						val = obj[fieldName];
					}
				}
				//
				// is it a crud link?
				crudLink = modelClass.getSchemaExtraFieldVal(fieldName, "crudLink");
				if (crudLink) {
					// is it crud link?
					valHtml = `<a href="${crudLink}/view/${val}">${val}</a>`;
				}
				if (valHtml === undefined) {
					// is it multiple choice type?
					choices = modelClass.getSchemaExtraFieldVal(fieldName, "choices", null);
					if (choices) {
						valHtml = this.buildChoiceHtmlForView(choices, val);
					} else if (format === "checkbox") {
						// checkbox
						if (val) {
							valHtml = "true";
						} else {
							valHtml = "false";
						}
					}
				}
				if (valHtml === undefined) {
					// default is just the value
					valHtml = val.toString();
				}
			}

			rethtml += `
			<tr>
        		<td><strong>${label}</strong></td>
   	   			<td>${valHtml}</td>
     			</tr>
			`;
		});

		// end table
		rethtml += `
		</table>
		</div>
		`;

		return rethtml;
	}


	async buildGenericMainHtmlStats(modelClass, req, obj, helperData, jrResult) {
		var rethtml;
		rethtml = "<div>stats</div>";
		return rethtml;
	}


	async buildGenericMainHtmlList(modelClass, req, obj, helperData, jrResult) {
		var rehtml = await jrhGrid.jrGridList(req, helperData);
		return rehtml;
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	buildChoiceHtmlForAddEdit(fieldName, choices, val) {
		var rethtml = jrhText.jrHtmlFormOptionListSelect(fieldName, choices, val);
		return rethtml;
	}


	buildChoiceHtmlForView(choices, val) {
		var rethtml = jrhText.jrHtmlNiceOptionFromList(choices, val, "[NOT SET]");
		return rethtml;
	}
	//---------------------------------------------------------------------------


}





// export the class as the sole export
module.exports = new CrudAid();
