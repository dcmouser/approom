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
const jrdebug = require("../helpers/jrdebug");
const jrhExpress = require("../helpers/jrh_express");

// controllers
const arserver = jrequire("arserver");
const aclAid = jrequire("aclaid");

// constants
const appdef = jrequire("appdef");




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
	/**
	 * Setup a router for a model's crud access (add/edit/view/list/delete)
	 *
	 * @param {*} router
	 * @param {*} modelClass
	 * @param {*} baseCrudUrl
	 * @memberof CrudAid
	 */
	setupRouter(router, modelClass, baseCrudUrl) {
		// this is called during server setup, for each route that we want to provide crud route support on
		// note that we use const variables with different names here so that we can precalc the view files ONCE
		// and use that calc'd path each time the request is made without having to recompute it


		const extraViewData = {};

		//---------------------------------------------------------------------------
		// list
		const viewFilePathList = this.calcViewFile("list", modelClass);
		router.get("/", async (req, res, next) => await this.handleListGet(req, res, next, modelClass, baseCrudUrl, viewFilePathList, extraViewData));
		// post for bulk operations
		router.post("/", async (req, res, next) => await this.handleListPost(req, res, next, modelClass, baseCrudUrl, viewFilePathList, extraViewData));
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
		router.get("/delete/:id", async (req, res, next) => await this.handleChangeModeGet(req, res, next, modelClass, baseCrudUrl, viewFilePathDelete, extraViewData, "delete"));
		// delete (post submit)
		router.post("/delete/:ignoredid?", async (req, res, next) => await this.handleChangeModePost(req, res, next, modelClass, baseCrudUrl, viewFilePathDelete, extraViewData, "delete"));
		//---------------------------------------------------------------------------

		//---------------------------------------------------------------------------
		// PermDelete (get)
		const viewFilePathPermDelete = this.calcViewFile("viewdelete", modelClass);
		router.get("/permdelete/:id", async (req, res, next) => await this.handleChangeModeGet(req, res, next, modelClass, baseCrudUrl, viewFilePathPermDelete, extraViewData, "permdelete"));
		// PermDelete (post submit)
		router.post("/permdelete/:ignoredid?", async (req, res, next) => await this.handleChangeModePost(req, res, next, modelClass, baseCrudUrl, viewFilePathPermDelete, extraViewData, "permdelete"));
		//---------------------------------------------------------------------------

		//---------------------------------------------------------------------------
		// UNdelete (get)
		const viewFilePathUnDelete = this.calcViewFile("viewdelete", modelClass);
		router.get("/undelete/:id", async (req, res, next) => await this.handleChangeModeGet(req, res, next, modelClass, baseCrudUrl, viewFilePathUnDelete, extraViewData, "undelete"));
		// UNdelete (post submit)
		router.post("/undelete/:ignoredid?", async (req, res, next) => await this.handleChangeModePost(req, res, next, modelClass, baseCrudUrl, viewFilePathUnDelete, extraViewData, "undelete"));
		//---------------------------------------------------------------------------


	}
	//---------------------------------------------------------------------------








	//---------------------------------------------------------------------------
	// These functions do the actual work of crud routes

	/**
	 * Route invokes this on a list get route
	 *
	 * @param {*} req
	 * @param {*} res
	 * @param {*} next
	 * @param {*} modelClass
	 * @param {*} baseCrudUrl
	 * @param {*} viewFileSet
	 * @param {*} extraViewData
	 * @returns true on route handled
	 * @memberof CrudAid
	 */
	async handleListGet(req, res, next, modelClass, baseCrudUrl, viewFileSet, extraViewData) {
		// get logged in user
		const user = await arserver.getLoggedInUser(req);

		// acl test
		if (!await arserver.aclRequireModelAccessRenderErrorPageOrRedirect(user, req, res, modelClass, appdef.DefAclActionList)) {
			return true;
		}

		// present the list
		return await this.doPresentListForm(req, res, user, modelClass, baseCrudUrl, viewFileSet, extraViewData);
	}


	/**
	 * Route invokes this on a list post route, which happens when user performs bulk actions on list view
	 *
	 * @param {*} req
	 * @param {*} res
	 * @param {*} next
	 * @param {*} modelClass
	 * @param {*} baseCrudUrl
	 * @param {*} viewFileSet
	 * @param {*} extraViewData
	 * @returns true on route handled
	 * @memberof CrudAid
	 */
	async handleListPost(req, res, next, modelClass, baseCrudUrl, viewFileSet, extraViewData) {
		// this is called for bulk action

		// get logged in user
		const user = await arserver.getLoggedInUser(req);

		// acl test
		if (!await arserver.aclRequireModelAccessRenderErrorPageOrRedirect(user, req, res, modelClass, appdef.DefAclActionList)) {
			return true;
		}
		// check required csrf token
		let jrResult = arserver.testCsrfReturnJrResult(req, res);
		if (!jrResult.isError()) {
			// get bulk action options
			const formbody = req.body;
			const bulkAction = formbody.bulkaction;
			// get all checked checkboxes
			const checkboxIdList = jrhExpress.reqPrefixedCheckboxItemIds(formbody, "checkboxid_");

			// do the bulk action and add result to session
			jrResult = await this.doBulkAction(user, modelClass, bulkAction, checkboxIdList);
		}
		// add result (error or result of bulk action) to session
		jrResult.addToSession(req);

		// present the list
		return await this.doPresentListForm(req, res, user, modelClass, baseCrudUrl, viewFileSet, extraViewData);
	}




	/**
	 * Shared function for handling list route (get and post)
	 *
	 * @param {*} req
	 * @param {*} res
	 * @param {*} user
	 * @param {*} modelClass
	 * @param {*} baseCrudUrl
	 * @param {*} viewFileSet
	 * @param {*} extraViewData
	 * @returns true on handled
	 * @memberof CrudAid
	 */
	async doPresentListForm(req, res, user, modelClass, baseCrudUrl, viewFileSet, extraViewData) {
		const jrResult = JrResult.makeNew();

		// ATTN: We might set these differently based on who is logged in and looking at the list
		// and it should be a per-modelClass thing..
		// ATTN: testing here some manual items:
		const protectedFields = ["passwordHashed"];
		let hiddenFields = [];

		// parse view file set
		const { viewFile, isGeneric } = viewFileSet;

		// hidden fields for list view
		const hiddenFiledsSchema = await modelClass.calcHiddenSchemaKeysForView("list", req);
		hiddenFields = jrhMisc.mergeArraysDedupe(hiddenFields, hiddenFiledsSchema);

		// make helper data
		const helperData = await modelClass.calcCrudListHelperData(req, res, user, baseCrudUrl, protectedFields, hiddenFields, jrResult);

		// generic main html for page (add form)
		let genericMainHtml;
		if (isGeneric) {
			genericMainHtml = await this.buildGenericMainHtmlList(modelClass, req, res, helperData, jrResult);
			genericMainHtml = new hbs.SafeString(genericMainHtml);
		}

		// render
		res.render(viewFile, {
			headline: modelClass.getNiceName() + " List",
			jrResult: JrResult.getMergeSessionResultAndClear(req, res, jrResult),
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
	/**
	 * Handles get add route
	 *
	 * @param {*} req
	 * @param {*} res
	 * @param {*} next
	 * @param {*} modelClass
	 * @param {*} baseCrudUrl
	 * @param {*} viewFileSet
	 * @param {*} extraViewData
	 * @returns true on handled
	 * @memberof CrudAid
	 */
	async handleAddGet(req, res, next, modelClass, baseCrudUrl, viewFileSet, extraViewData) {
		// get logged in user
		const user = await arserver.getLoggedInUser(req);

		const jrResult = JrResult.makeNew();
		const id = req.params.id;
		let reqbody;

		// get id from get param; if they specify an id, grab that object from db and let them start a new one with those values (like a clone
		if (id) {
			// validate id
			modelClass.validateId(jrResult, id);
			if (!jrResult.isError()) {
				// acl test to VIEW the item we are CLONING
				if (!await arserver.aclRequireModelAccessRenderErrorPageOrRedirect(user, req, res, modelClass, appdef.DefAclActionView, id)) {
					return true;
				}
				// get object being edited
				const obj = await modelClass.mFindOneById(id);
				if (!obj) {
					jrResult.pushError("Could not find " + modelClass.getNiceName() + " with that Id.");
				} else {
					// found one, copy data into reqbody let for view form
					// ATTN: 5/20/20 testing commenting out
					// reqbody = obj.modelObjPropertyCopy(false);
				}
			}
		}

		// acl test to add
		if (!await arserver.aclRequireModelAccessRenderErrorPageOrRedirect(user, req, res, modelClass, appdef.DefAclActionAdd)) {
			return true;
		}

		// present form
		await this.doPresentAddForm(req, reqbody, jrResult, res, user, modelClass, baseCrudUrl, viewFileSet, extraViewData);
		return true;
	}


	/**
	 * Handles post add route
	 *
	 * @param {*} req
	 * @param {*} res
	 * @param {*} next
	 * @param {*} modelClass
	 * @param {*} baseCrudUrl
	 * @param {*} viewFileSet
	 * @param {*} extraViewData
	 * @returns true on handled
	 * @memberof CrudAid
	 */
	async handleAddPost(req, res, next, modelClass, baseCrudUrl, viewFileSet, extraViewData) {
		// user posts form for adding submission

		// get logged in user
		const user = await arserver.getLoggedInUser(req);

		const formTypeStr = "add";
		const flagRepresentAfterSuccess = false;
		let reqbody = req.body;

		// acl test
		if (!await arserver.aclRequireModelAccessRenderErrorPageOrRedirect(user, req, res, modelClass, appdef.DefAclActionAdd)) {
			return true;
		}


		let jrResult = JrResult.makeNew();
		// load existing object by id if provided, throw errors if id missing (or provided to add formtype)
		// in the ADD case, this should just return a new blank object or complain if user specified an id
		let obj = await modelClass.validateAddEditFormIdMakeObj(jrResult, req, res, formTypeStr);
		// add creator
		obj.creator = user.getIdAsString();


		if (!jrResult.isError()) {
			// check required csrf token
			jrResult = arserver.testCsrfReturnJrResult(req, res);
		}

		if (!jrResult.isError()) {
			// now save add changes
			// form fields that we dont complain about finding even though they arent for the form object
			const ignoreFields = this.getCrudEditFormIgnoreFields();

			// process

			const saveFields = modelClass.getSaveFields("crudAdd");
			let savedobj = await modelClass.validateSave(jrResult, {}, true, user, req.body, saveFields, null, ignoreFields, obj, modelClass.getShouldBeOwned());
			if (!jrResult.isError()) {
				// success! drop down with new blank form, or alternatively, we could redirect to a VIEW obj._id page
				jrResult.pushSuccess(modelClass.getNiceName() + " added on " + jrhMisc.getNiceNowString() + ".");

				// log the action
				arserver.logr(req, "crud.create", "created " + savedobj.getLogIdString());

				if (jrResult.isError()) {
					// we had an error saving user; this is serious because it leaves an orphaned object
					let errmsg = "There was an error saving the new owner role for " + user.getLogIdString() + " after creation of new object " + savedobj.getLogIdString() + ": " + jrResult.getErrorsAsString() + ".";
					// so first things first lets delete the object
					const jrResultFollowup = JrResult.makeNew();
					// we do a REAL delete here (as opposed to a virtual one) since the object was just added in failure
					await savedobj.doChangeMode(appdef.DefMdbRealDelete, jrResultFollowup);
					if (jrResultFollowup.isError()) {
						// yikes we couldn't even delete the object
						errmsg += "  In addition, the newly created object could not be rolled back and deleted.";
					} else {
						// at least we rolled back the object
						errmsg += "  The newly created object was successfully rolled back and deleted: " + jrResultFollowup.getErrorsAsString();
					}
					// now log error
					arserver.logr(req, appdef.DefLogTypeErrorCriticalDb, errmsg);

					// clear object
					savedobj = null;
				}


				if (!jrResult.isError()) {
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
		}

		if (jrResult.isError()) {
			// error, so we need to fetch object for edit refinement..
		}

		// re-present form
		await this.doPresentAddForm(req, reqbody, jrResult, res, user, modelClass, baseCrudUrl, viewFileSet, extraViewData);
		return true;
	}


	/**
	 * Shared function for handling add request (get and post)
	 *
	 * @param {*} req
	 * @param {*} reqbody
	 * @param {*} jrResult
	 * @param {*} res
	 * @param {*} user
	 * @param {*} modelClass
	 * @param {*} baseCrudUrl
	 * @param {*} viewFileSet
	 * @param {*} extraViewData
	 * @memberof CrudAid
	 */
	async doPresentAddForm(req, reqbody, jrResult, res, user, modelClass, baseCrudUrl, viewFileSet, extraViewData) {
		// any helper data
		const helperData = await modelClass.calcCrudEditHelperData(user);

		// parse view file set
		const { viewFile, isGeneric } = viewFileSet;

		// generic main html for page (add form)
		let genericMainHtml;
		if (isGeneric) {
			const obj = null;
			genericMainHtml = await this.buildGenericMainHtmlAddEditView(null, "add", modelClass, req, res, obj, reqbody, helperData, jrResult);
			genericMainHtml = new hbs.SafeString(genericMainHtml);
		}

		// cancel button goes where?
		const cancelUrl = baseCrudUrl;

		// re-present form for another add?
		res.render(viewFile, {
			headline: "Add " + modelClass.getNiceName(),
			jrResult: JrResult.getMergeSessionResultAndClear(req, res, jrResult),
			csrfToken: arserver.makeCsrf(req, res),
			reqbody,
			helperData,
			genericMainHtml,
			baseCrudUrl,
			cancelUrl,
			crudAdd: true,
			extraViewData,
			id: null,
		});

	}
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	/**
	 * 	 * Handles get edit route
	 *
	 * @param {*} req
	 * @param {*} res
	 * @param {*} next
	 * @param {*} modelClass
	 * @param {*} baseCrudUrl
	 * @param {*} viewFileSet
	 * @param {*} extraViewData
	 * @returns true on handled
	 * @memberof CrudAid
	 */
	async handleEditGet(req, res, next, modelClass, baseCrudUrl, viewFileSet, extraViewData) {
		// get logged in user
		const user = await arserver.getLoggedInUser(req);

		const jrResult = JrResult.makeNew();

		// get id from get param
		const id = req.params.id;

		// validate and get id, this will also do an ACL test
		const obj = await modelClass.validateGetObjByIdDoAclRenderErrorPageOrRedirect(jrResult, user, req, res, id, appdef.DefAclActionEdit);
		if (jrResult.isError()) {
			return false;
		}

		// put object fields in body, for view form
		// ATTN: 5/20/20 testing commenting out
		// const reqbody = obj.modelObjPropertyCopy(true);
		const reqbody = null;


		// present form
		return await this.doPresentEditForm(req, reqbody, jrResult, obj, id, res, user, modelClass, baseCrudUrl, viewFileSet, extraViewData);
	}


	/**
	 * Handles post edit route
	 *
	 * @param {*} req
	 * @param {*} res
	 * @param {*} next
	 * @param {*} modelClass
	 * @param {*} baseCrudUrl
	 * @param {*} viewFileSet
	 * @param {*} extraViewData
	 * @returns true on handle
	 * @memberof CrudAid
	 */
	async handleEditPost(req, res, next, modelClass, baseCrudUrl, viewFileSet, extraViewData) {
		// user posts form for adding submission
		let flagFilledObjPropertiesInReqData = false;

		// get logged in user
		const user = await arserver.getLoggedInUser(req);

		// ATTN: in post of edit, we ignore the id passed in param and get it from post body
		const formTypeStr = "edit";
		const flagRepresentAfterSuccess = false;
		let reqbody = req.body;


		// get id from post, ignore url param
		const id = req.body._editId;
		const ignoreFields = this.getCrudEditFormIgnoreFields();

		// acl test
		if (!await arserver.aclRequireModelAccessRenderErrorPageOrRedirect(user, req, res, modelClass, appdef.DefAclActionEdit, id)) {
			return false;
		}
		// form fields that we dont complain about finding even though they arent for the form object

		// load existing object by id if provided, throw errors if id missing (or provided to add formtype)
		let jrResult = JrResult.makeNew();
		let obj = await modelClass.validateAddEditFormIdMakeObj(jrResult, req, res, formTypeStr);

		if (!jrResult.isError()) {
			// check required csrf token
			jrResult = arserver.testCsrfReturnJrResult(req, res);
		}

		if (!jrResult.isError()) {
			// now save edit changes
			const saveFields = modelClass.getSaveFields("crudEdit");
			const savedobj = await modelClass.validateSave(jrResult, {}, true, user, req.body, saveFields, null, ignoreFields, obj, modelClass.getShouldBeOwned());

			if (!jrResult.isError()) {
				// success! drop down with new blank form, or alternatively, we could redirect to a VIEW obj._id page

				// log the action
				const idLabel = savedobj.getLogIdString();
				arserver.logr(req, "crud.edit", "edited " + idLabel);

				// success message
				jrResult.pushSuccess(modelClass.getNiceName() + " saved on " + jrhMisc.getNiceNowString() + ".");
				if (!baseCrudUrl) {
					// just return to caller saying they should take over
					jrResult.addToSession(req);
					return false;
				}

				if (flagRepresentAfterSuccess) {
					// fill form data with object properties and drop down to let user re-edit
					// ATTN: 5/20/20 testing commenting out
					// reqbody = savedobj.modelObjPropertyCopy(true);
					reqbody = null;
					flagFilledObjPropertiesInReqData = true;
				} else {
					jrResult.addToSession(req);
					res.redirect(baseCrudUrl + "/view/" + savedobj.getIdAsString());
					return true;
				}
			}
		}

		// ATTN: im not sure we need to do this any more -- i think obj = assignment above handles it..
		if (false && jrResult.isError()) {
			// error, so we need to re-fetch object for edit refinement
			var jrResult2 = JrResult.makeNew();
			obj = await modelClass.validateGetObjByIdDoAclRenderErrorPageOrRedirect(jrResult2, user, req, res, id, appdef.DefAclActionEdit);
			if (jrResult2.isError()) {
				return false;
			}
		}

		if (!flagFilledObjPropertiesInReqData) {
			// ATTN: this was added recently -- to fix a problem -- but 5/12/20 creates a new one where errors on submission are wiping out form values we want to re-present
			// what we need is for the object data to only be used to replace values that are NOT already present in req.body
			// fill form data with object properties and drop down to let user re-edit
			// ATTN: 5/20/20 testing commenting out
			//jrhMisc.copyMissingValues(reqbody, obj.modelObjPropertyCopy(true));
		}

		// re-present form
		return await this.doPresentEditForm(req, reqbody, jrResult, obj, id, res, user, modelClass, baseCrudUrl, viewFileSet, extraViewData);
	}


	/**
	 * Common presentation of edit form
	 *
	 * @param {*} req
	 * @param {*} reqbody
	 * @param {*} jrResult
	 * @param {*} obj
	 * @param {*} id
	 * @param {*} res
	 * @param {*} user
	 * @param {*} modelClass
	 * @param {*} baseCrudUrl
	 * @param {*} viewFileSet
	 * @param {*} extraViewData
	 * @returns true on handled
	 * @memberof CrudAid
	 */
	async doPresentEditForm(req, reqbody, jrResult, obj, id, res, user, modelClass, baseCrudUrl, viewFileSet, extraViewData) {
		// any helper data
		const helperData = await modelClass.calcCrudEditHelperData(user, id);

		// parse view file set
		const { viewFile, isGeneric } = viewFileSet;

		// generic main html for page (edit form)
		let genericMainHtml;
		if (isGeneric) {
			genericMainHtml = await this.buildGenericMainHtmlAddEditView(id, "edit", modelClass, req, res, obj, reqbody, helperData, jrResult);
			genericMainHtml = new hbs.SafeString(genericMainHtml);
		}

		//
		const flagOfferDelete = modelClass.getDefaultDeleteDisableModeIsVirtual() && (obj.disabled === 0 || (obj.disabled !== appdef.DefMdbVirtDelete));
		const flagOfferUnDelete = obj.disabled === appdef.DefMdbVirtDelete;
		const flagOfferPermDelete = true;

		// cancel button goes where?
		const cancelUrl = baseCrudUrl + "/view/" + id;


		// render
		res.render(viewFile, {
			headline: "Edit " + modelClass.getNiceName() + " #" + id,
			jrResult: JrResult.getMergeSessionResultAndClear(req, res, jrResult),
			csrfToken: arserver.makeCsrf(req, res),
			reqbody,
			helperData,
			genericMainHtml,
			baseCrudUrl,
			cancelUrl,
			extraViewData,
			flagOfferDelete,
			flagOfferPermDelete,
			flagOfferUnDelete,
			id,
		});

		return true;
	}
	//---------------------------------------------------------------------------









	//---------------------------------------------------------------------------
	/**
	 * Handle get view route
	 *
	 * @param {*} req
	 * @param {*} res
	 * @param {*} next
	 * @param {*} modelClass
	 * @param {*} baseCrudUrl
	 * @param {*} viewFileSet
	 * @param {*} extraViewData
	 * @returns true on handled
	 * @memberof CrudAid
	 */
	async handleViewGet(req, res, next, modelClass, baseCrudUrl, viewFileSet, extraViewData) {
		// get logged in user
		const user = await arserver.getLoggedInUser(req);

		// get id from get param
		const jrResult = JrResult.makeNew();
		const id = req.params.id;

		// get obj AND perform acl test
		const obj = await modelClass.validateGetObjByIdDoAclRenderErrorPageOrRedirect(jrResult, user, req, res, id, appdef.DefAclActionView);
		if (jrResult.isError()) {
			return true;
		}

		// any helper data
		const helperData = await modelClass.calcCrudViewHelperData(req, res, id, obj);

		// parse view file set
		const { viewFile, isGeneric } = viewFileSet;

		// generic main html for page (view form)
		let genericMainHtml;
		if (isGeneric) {
			const reqbody = null;
			genericMainHtml = await this.buildGenericMainHtmlAddEditView(id, "view", modelClass, req, res, obj, reqbody, helperData, jrResult);
			genericMainHtml = new hbs.SafeString(genericMainHtml);
		}

		const flagOfferDelete = modelClass.getDefaultDeleteDisableModeIsVirtual() && (obj.disabled === 0 || (obj.disabled !== appdef.DefMdbVirtDelete));
		const flagOfferUnDelete = obj.disabled === appdef.DefMdbVirtDelete;
		const flagOfferPermDelete = true;

		// render
		res.render(viewFile, {
			headline: "View " + modelClass.getNiceName() + " #" + id,
			jrResult: JrResult.getMergeSessionResultAndClear(req, res, jrResult),
			obj,
			helperData,
			genericMainHtml,
			reqmode: "view",
			flagOfferDelete,
			flagOfferPermDelete,
			flagOfferUnDelete,
			baseCrudUrl,
			extraViewData,
		});

		return true;
	}




	/**
	 * Helper function that validated the change mode string and returns the ACL action associated with it or throws error
	 *
	 * @param {*} reqmode
	 * @returns the acl action string or null on error; error pushed to jrResult
	 * @memberof CrudAid
	 */
	getAclActionForChangeReqMode(modelClass, reqmode, jrResult) {
		if (reqmode === "virtdelete") {
			if (modelClass.supportsVirtualDelete()) {
				return appdef.DefAclActionDelete;
			}
			jrResult.pushError("Virtual delete not supported for model class " + modelClass.getNiceName());
			return null;
		}
		if (reqmode === "delete") {
			// this will either be a virtual delete or a permanent delete
			// return appdef.DefAclActionDelete;
			return modelClass.getDefaultDeleteDisableModeAsAclAction();
		}
		if (reqmode === "permdelete") {
			return appdef.DefAclActionPermDelete;
		}
		if (reqmode === "undelete") {
			return appdef.DefAclActionUnDelete;
		}
		// error
		jrResult.pushError("Unknown reqmode in getAclActionForChangeReqMode: " + reqmode);
		return null;
	}



	/**
	 * Given a change mode acl action return the database mode change value it represents
	 *
	 * @param {*} aclAction
	 * @param {*} jrResult
	 * @returns appdef.DefMdbVirtDelete or appdef.DefMdbRealDelete or appdef.DefMdbEnable
	 * @memberof CrudAid
	 */
	convertAclChangeModeActionToDeleteDatabaseStateValue(aclAction, jrResult) {
		// what kind of delete do we want, virtual or real?
		if (aclAction === appdef.DefAclActionDelete) {
			return appdef.DefMdbVirtDelete;
		}
		if (aclAction === appdef.DefAclActionPermDelete) {
			return appdef.DefMdbRealDelete;
		}
		if (aclAction === appdef.DefAclActionUnDelete) {
			return appdef.DefMdbEnable;
		}
		jrResult.pushError("Unknown aclAction in convertAclChangeModeActionToDeleteDatabaseStateValue: " + aclAction);
		return null;
	}




	/**
	 * Handle get chagemode route
	 *
	 * @param {*} req
	 * @param {*} res
	 * @param {*} next
	 * @param {*} modelClass
	 * @param {*} baseCrudUrl
	 * @param {*} viewFileSet
	 * @param {*} extraViewData
	 * @param {*} reqmode
	 * @returns true on handled
	 * @memberof CrudAid
	 */
	async handleChangeModeGet(req, res, next, modelClass, baseCrudUrl, viewFileSet, extraViewData, reqmode) {
		const jrResult = JrResult.makeNew();

		// get logged in user
		const user = await arserver.getLoggedInUser(req);

		// get id from get param
		const id = req.params.id;
		let obj;

		// which acl permission to check for
		const aclAction = this.getAclActionForChangeReqMode(modelClass, reqmode, jrResult);

		// get object AND perform ACL test
		if (!jrResult.isError()) {
			obj = await modelClass.validateGetObjByIdDoAclRenderErrorPageOrRedirect(jrResult, user, req, res, id, aclAction);
		}
		if (jrResult.isError()) {
			return true;
		}

		return await this.doPresentChangeModeForm(id, obj, req, res, modelClass, baseCrudUrl, viewFileSet, extraViewData, reqmode);
	}



	/**
	 * 	 * Handle post chagemode route
	 *
	 * @param {*} req
	 * @param {*} res
	 * @param {*} next
	 * @param {*} modelClass
	 * @param {*} baseCrudUrl
	 * @param {*} viewFileSet
	 * @param {*} extraViewData
	 * @param {*} reqmode
	 * @returns true on handled
	 * @memberof CrudAid
	 */
	async handleChangeModePost(req, res, next, modelClass, baseCrudUrl, viewFileSet, extraViewData, reqmode) {
		let jrResult = JrResult.makeNew();

		// get logged in user
		const user = await arserver.getLoggedInUser(req);

		// get id from post, ignore url param
		const id = req.body._editId;
		let obj;

		// ATTN: change this to drop down re-present rather than error
		// check required csrf token
		jrResult = arserver.testCsrfReturnJrResult(req, res);
		if (jrResult.isError()) {
			return true;
		}

		// which acl permission to check for
		const aclAction = this.getAclActionForChangeReqMode(modelClass, reqmode, jrResult);
		if (!jrResult.isError()) {
			// get object AND perform ACL test
			obj = await modelClass.validateGetObjByIdDoAclRenderErrorPageOrRedirect(jrResult, user, req, res, id, aclAction);
		}
		if (jrResult.isError()) {
			return true;
		}

		// process delete
		const newmode = this.convertAclChangeModeActionToDeleteDatabaseStateValue(aclAction, jrResult);

		if (!jrResult.isError()) {
			// do the actual mode change (delete / virtual or real)
			await obj.doChangeMode(newmode, jrResult);
		}

		// on success redirect to listview
		if (!jrResult.isError()) {
			// success (push message to top since helper deleted may have been pushed on earlier)
			const objIdString = obj.getIdAsString();
			jrResult.pushSuccess(modelClass.getNiceName() + " #" + objIdString + " has been " + appdef.DefStateModeLabels[newmode] + ".", true);

			// log the action
			const logIdString = obj.getLogIdString();
			arserver.logr(req, "crud." + reqmode, appdef.DefStateModeLabels[newmode] + " " + logIdString);

			// redirect
			jrResult.addToSession(req);
			res.redirect(baseCrudUrl);
			return true;
		}

		// error, re-present form
		return await this.doPresentChangeModeForm(id, obj, req, res, modelClass, baseCrudUrl, viewFileSet, extraViewData, reqmode);
	}



	/**
	 * Present the form that lets user change the mode (deleted, etc.)
	 *
	 * @param {*} id
	 * @param {*} obj
	 * @param {*} req
	 * @param {*} res
	 * @param {*} modelClass
	 * @param {*} baseCrudUrl
	 * @param {*} viewFileSet
	 * @param {*} extraViewData
	 * @param {*} reqmode
	 * @returns true on handled
	 * @memberof CrudAid
	 */
	async doPresentChangeModeForm(id, obj, req, res, modelClass, baseCrudUrl, viewFileSet, extraViewData, reqmode) {
		const jrResult = JrResult.makeNew();

		// any helper data
		const helperData = await modelClass.calcCrudViewHelperData(req, res, id, obj);

		// parse view file set
		const { viewFile, isGeneric } = viewFileSet;

		// generic main html for page (delete form)
		let genericMainHtml;
		if (isGeneric) {
			const reqbody = null;
			genericMainHtml = await this.buildGenericMainHtmlAddEditView(id, "view", modelClass, req, res, obj, reqbody, helperData, jrResult);
			genericMainHtml = new hbs.SafeString(genericMainHtml);
		}

		// cancel button goes where?
		const cancelUrl = baseCrudUrl + "/view/" + id;

		//
		const flagConfirmDelete = (reqmode === "delete");
		const flagConfirmPermDelete = (reqmode === "permdelete");
		const flagConfirmUnDelete = (reqmode === "undelete");

		// render
		res.render(viewFile, {
			headline: "Confirmation required.\n" + jrhText.capitalizeFirstLetter(reqmode) + " " + modelClass.getNiceName() + " #" + id + "?",
			jrResult: JrResult.getMergeSessionResultAndClear(req, res, jrResult),
			csrfToken: arserver.makeCsrf(req, res),
			obj,
			genericMainHtml,
			flagConfirmDelete,
			flagConfirmPermDelete,
			flagConfirmUnDelete,
			baseCrudUrl,
			cancelUrl,
			extraViewData,
		});

		return true;
	}

	//---------------------------------------------------------------------------




















	//---------------------------------------------------------------------------
	/**
	 * Helper for parsing crud forms
	 *
	 * @returns	array list of fields that we dont need to complain about and just ignore when they are found in an edit form submission
	 * @memberof CrudAid
	 */
	getCrudEditFormIgnoreFields() {
		return ["_csrf", "_editId", "emailBypassVerify"];
	}
	//---------------------------------------------------------------------------







	//---------------------------------------------------------------------------
	/**
	 * Helper function that calculates the view file to be used for different routes
	 * Checks first for model specific view, then defaults to crud generic if the specific one not found.
	 *
	 * @param {*} subview
	 * @param {*} modelClass
	 * @returns object with .viewfile and .isGeneric fields
	 * @memberof CrudAid
	 */
	calcViewFile(subview, modelClass) {
		const fname = path.join("crud", subview);
		const fnameModelSpecific = path.join("crud", modelClass.getCollectionName() + "_" + subview);
		const fnameModelGeneric = path.join("crud", "generic_" + subview);
		// try to find model specific version
		const fpath = path.join(arserver.getViewPath(), fnameModelSpecific + arserver.getViewExt());
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
	/**
	 * NEW
	 * Generate the main html for add/edit/view crudSubType view
	 *
	 * @param {*} crudSubType
	 * @param {*} modelClass
	 * @param {*} req
	 * @param {*} obj
	 * @param {*} helperData
	 * @param {*} jrResult
	 * @returns html string
	 * @memberof CrudAid
	 */
	async buildGenericMainHtmlAddEditView(id, crudSubType, modelClass, req, res, obj, editData, helperData, jrResult) {
		let rethtml = "";

		// start table
		rethtml += `
		<div class="table-responsive">
		<table class="table table-striped w-auto table-bordered">
		`;

		// add id
		if (id) {
			rethtml += `<input type="hidden" id="_editId" name="_editId" value="${id}">`;
		}

		// schema for obj
		const modelSchema = modelClass.getSchemaDefinition();
		const schemaKeys = Object.keys(modelSchema);
		let schemaType;
		let val, valHtml, label, valueFunction, hideList, readOnlyList, choices;
		let visfunc, isVisible, isReadOnly;
		let extra;
		let err;

		await jrhMisc.asyncAwaitForEachFunctionCall(schemaKeys, async (fieldName) => {

			// type of this field
			schemaType = modelClass.getBaseSchemaType(fieldName);

			// hidden?
			hideList = modelClass.getSchemaFieldVal(fieldName, "hide", undefined);
			if ((hideList === true) || jrhMisc.isInAnyArray(crudSubType, hideList)) {
				return;
			}
			// dynamic visibility function
			visfunc = modelClass.getSchemaFieldVal(fieldName, "visibleFunction");
			if (visfunc) {
				// ok we have a custom function to call
				isVisible = await visfunc(crudSubType, fieldName, req, obj, helperData);
				if (!isVisible) {
					return;
				}
			}

			// label
			label = modelClass.getSchemaFieldVal(fieldName, "label", fieldName);

			// html value to display (may be an input element if in edit crudSubType)
			valHtml = await modelClass.renderFieldValueHtml(req, obj, editData, fieldName, crudSubType, helperData);

			// add any error
			if (jrResult && jrResult.errorFields && jrResult.errorFields[fieldName]) {
				err = jrResult.errorFields[fieldName];
			} else {
				err = "";
			}

			// render it
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
	//---------------------------------------------------------------------------





	//---------------------------------------------------------------------------
	/**
	 * Generate the main html for LIST view crudSubType view
	 *
	 * @param {*} modelClass
	 * @param {*} req
	 * @param {*} obj
	 * @param {*} jrResult
	 * @param {*} crudSubType
	 * @param {*} helperData
	 * @returns html string
	 * @memberof CrudAid
	 */
	async buildGenericMainHtmlList(modelClass, req, res, helperData, jrResult) {
		const csrfToken = arserver.makeCsrf(req, res);
		const rehtml = await jrhGrid.jrGridList(req, helperData, csrfToken);
		return rehtml;
	}
	//---------------------------------------------------------------------------










	//---------------------------------------------------------------------------
	/**
	 * Before a bulk action (deleting, etc).
	 *
	 * @param {*} user
	 * @param {*} modelClass
	 * @param {*} bulkAction
	 * @param {*} idList
	 * @returns jrResult
	 * @memberof CrudAid
	 */
	async doBulkAction(user, modelClass, bulkAction, idList) {
		const jrResult = JrResult.makeNew();


		if (bulkAction === "disable") {
			// do they have permission to delete all in the list
			const permission = appdef.DefAclActionDisable;
			const objectType = modelClass.getAclName();
			if (!await user.aclHasPermissionOnAll(permission, objectType, idList)) {
				return JrResult.makeError("Permission denied; you do not have permission to " + bulkAction + " these items.");
			}

			// they have permission!

			// what kind of delete should we do? real or virtual?
			const mode = appdef.DefMdbDisable;
			await modelClass.doChangeModeByIdList(idList, mode, jrResult, false);
			return jrResult;
		}

		if (bulkAction === "enable") {
			// do they have permission to delete all in the list
			const permission = appdef.DefAclActionEnable;
			const objectType = modelClass.getAclName();
			if (!await user.aclHasPermissionOnAll(permission, objectType, idList)) {
				return JrResult.makeError("Permission denied; you do not have permission to " + bulkAction + " these items.");
			}

			// they have permission!

			// what kind of delete should we do? real or virtual?
			const mode = appdef.DefMdbEnable;
			await modelClass.doChangeModeByIdList(idList, mode, jrResult, false);
			return jrResult;
		}


		if (bulkAction === "delete") {
			// do they have permission to delete all in the list
			const permission = appdef.DefAclActionDelete;
			const objectType = modelClass.getAclName();
			if (!await user.aclHasPermissionOnAll(permission, objectType, idList)) {
				return JrResult.makeError("Permission denied; you do not have permission to " + bulkAction + " these items.");
			}

			// they have permission!

			// what kind of delete should we do? real or virtual?
			const mode = modelClass.getDefaultDeleteDisableMode();

			await modelClass.doChangeModeByIdList(idList, mode, jrResult, false);
			return jrResult;
		}

		if (bulkAction === "permdelete") {
			// do they have permission to delete all in the list
			const permission = appdef.DefAclActionPermDelete;
			const objectType = modelClass.getAclName();
			if (!await user.aclHasPermissionOnAll(permission, objectType, idList)) {
				return JrResult.makeError("Permission denied; you do not have permission to " + bulkAction + " these items.");
			}

			// they have permission!

			// real permanent delete
			const mode = appdef.DefMdbRealDelete;

			await modelClass.doChangeModeByIdList(idList, mode, jrResult, false);
			return jrResult;
		}

		if (bulkAction === "undelete") {
			// do they have permission to undelete all in the list
			const permission = appdef.DefAclActionUnDelete;
			const objectType = modelClass.getAclName();
			if (!await user.aclHasPermissionOnAll(permission, objectType, idList)) {
				return JrResult.makeError("Permission denied; you do not have permission to " + bulkAction + " these items.");
			}

			// they have permission!

			// undelete means make enabled
			const mode = appdef.DefMdbEnable;

			await modelClass.doChangeModeByIdList(idList, mode, jrResult, false);
			return jrResult;
		}


		// dont know this bulk action
		return JrResult.makeError("Internal error - unknown bulk operation [" + bulkAction + "]");
	}
	//---------------------------------------------------------------------------










}





// export the class as the sole export
module.exports = new CrudAid();
