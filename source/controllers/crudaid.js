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
const appconst = jrequire("appconst");




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


		//---------------------------------------------------------------------------
		// stats
		const viewFilePathStats = this.calcViewFile("stats", modelClass);
		router.get("/stats", async (req, res, next) => await this.handleStatsGet(req, res, next, modelClass, baseCrudUrl, viewFilePathStats, extraViewData));
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
		var user = await arserver.getLoggedInUser(req);

		// acl test
		if (!await arserver.aclRequireModelAccessRenderErrorPageOrRedirect(user, req, res, modelClass, appconst.DefAclActionList)) {
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
		var user = await arserver.getLoggedInUser(req);

		// acl test
		if (!await arserver.aclRequireModelAccessRenderErrorPageOrRedirect(user, req, res, modelClass, appconst.DefAclActionList)) {
			return true;
		}

		// get bulk action options
		const formbody = req.body;
		const bulkAction = formbody.bulkaction;
		// get all checked checkboxes
		const checkboxIdList = jrhExpress.reqPrefixedCheckboxItemIds(formbody, "checkboxid_");
		// jrdebug.debugObj(checkboxIdList, "Bulk action " + bulkAction);

		// do the bulk action and add result to session
		var jrResult = await this.doBulkAction(user, modelClass, bulkAction, checkboxIdList);
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
		var jrResult = JrResult.makeNew();

		// ATTN: We might set these differently based on who is logged in and looking at the list
		// and it should be a per-modelClass thing..
		// ATTN: testing here some manual items:
		var protectedFields = ["passwordHashed"];
		var hiddenFields = [];

		// parse view file set
		var { viewFile, isGeneric } = viewFileSet;

		// hidden fields for list view
		var hiddenFiledsSchema = await modelClass.getSchemaKeysMatchingViewType("list", req);
		hiddenFields = jrhMisc.mergeArraysDedupe(hiddenFields, hiddenFiledsSchema);

		// make helper data
		const helperData = await modelClass.calcCrudListHelperData(req, res, user, baseCrudUrl, protectedFields, hiddenFields, jrResult);

		// generic main html for page (add form)
		var genericMainHtml;
		if (isGeneric) {
			genericMainHtml = await this.buildGenericMainHtml(modelClass, req, req.body, jrResult, "list", helperData);
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
				if (!await arserver.aclRequireModelAccessRenderErrorPageOrRedirect(user, req, res, modelClass, appconst.DefAclActionView, id)) {
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
		if (!await arserver.aclRequireModelAccessRenderErrorPageOrRedirect(user, req, res, modelClass, appconst.DefAclActionAdd)) {
			return true;
		}

		// present form
		return await this.doPresentAddForm(req, reqbody, jrResult, res, user, modelClass, baseCrudUrl, viewFileSet, extraViewData);
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
		var user = await arserver.getLoggedInUser(req);
		var obj;

		var formTypeStr = "add";
		var flagRepresentAfterSuccess = false;
		var reqbody = req.body;

		// acl test
		if (!await arserver.aclRequireModelAccessRenderErrorPageOrRedirect(user, req, res, modelClass, appconst.DefAclActionAdd)) {
			return true;
		}


		var jrResult = JrResult.makeNew();
		// load existing object by id if provided, throw errors if id missing (or provided to add formtype)
		// in the ADD case, this should just return a new blank object or complain if user specified an id
		obj = await modelClass.validateAddEditFormIdMakeObj(jrResult, req, res, formTypeStr);
		// add creator
		obj.creator = user.getIdAsString();


		if (!jrResult.isError()) {
			// check required csrf token
			jrResult = arserver.testCsrfReturnJrResult(req, res);
		}

		if (!jrResult.isError()) {
			// now save add changes
			// form fields that we dont complain about finding even though they arent for the form object
			var ignoreFields = this.getCrudEditFormIgnoreFields();

			// process

			var saveFields = modelClass.getSaveFields("crudAdd");
			var savedobj = await modelClass.validateSave(jrResult, {}, true, user, req.body, saveFields, null, ignoreFields, obj, modelClass.getShouldBeOwned());
			if (!jrResult.isError()) {
				// success! drop down with new blank form, or alternatively, we could redirect to a VIEW obj._id page
				jrResult.pushSuccess(modelClass.getNiceName() + " added on " + jrhMisc.getNiceNowString() + ".");

				// log the action
				arserver.logr(req, "crud.create", "created " + savedobj.getLogIdString());

				if (jrResult.isError()) {
					// we had an error saving user; this is serious because it leaves an orphaned object
					var errmsg = "There was an error saving the new owner role for " + user.getLogIdString() + " after creation of new object " + savedobj.getLogIdString() + ": " + jrResult.getErrorsAsString() + ".";
					// so first things first lets delete the object
					var jrResultFollowup = JrResult.makeNew();
					// we do a REAL delete here (as opposed to a virtual one) since the object was just added in failure
					await savedobj.doChangeMode(appconst.DefMdbRealDelete, jrResultFollowup);
					if (jrResultFollowup.isError()) {
						// yikes we couldn't even delete the object
						errmsg += "  In addition, the newly created object could not be rolled back and deleted.";
					} else {
						// at least we rolled back the object
						errmsg += "  The newly created object was successfully rolled back and deleted: " + jrResultFollowup.getErrorsAsString();
					}
					// now log error
					arserver.logr(req, appconst.DefLogTypeErrorCriticalDb, errmsg);

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

		// re-present form
		return await this.doPresentAddForm(req, reqbody, jrResult, res, user, modelClass, baseCrudUrl, viewFileSet, extraViewData);
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
	 * @returns
	 * @memberof CrudAid
	 */
	async doPresentAddForm(req, reqbody, jrResult, res, user, modelClass, baseCrudUrl, viewFileSet, extraViewData) {
		// any helper data
		const helperData = await modelClass.calcCrudEditHelperData(user);

		// parse view file set
		var { viewFile, isGeneric } = viewFileSet;

		// generic main html for page (add form)
		var genericMainHtml;
		if (isGeneric) {
			genericMainHtml = await this.buildGenericMainHtml(modelClass, req, reqbody, jrResult, "add", helperData);
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
		});

		return true;
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
		var user = await arserver.getLoggedInUser(req);

		var jrResult = JrResult.makeNew();

		// get id from get param
		var id = req.params.id;

		// validate and get id, this will also do an ACL test
		var obj = await modelClass.validateGetObjByIdDoAclRenderErrorPageOrRedirect(jrResult, user, req, res, id, appconst.DefAclActionEdit);
		if (jrResult.isError()) {
			return false;
		}

		// put object fields in body, for view form
		var reqbody = obj.modelObjPropertyCopy(true);


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

		// get logged in user
		var user = await arserver.getLoggedInUser(req);

		// ATTN: in post of edit, we ignore the id passed in param and get it from post body
		var formTypeStr = "edit";
		var flagRepresentAfterSuccess = false;
		var reqbody = req.body;
		var obj;

		// get id from post, ignore url param
		var id = req.body._id;
		var ignoreFields = this.getCrudEditFormIgnoreFields();

		// acl test
		if (!await arserver.aclRequireModelAccessRenderErrorPageOrRedirect(user, req, res, modelClass, appconst.DefAclActionEdit, id)) {
			return false;
		}
		// form fields that we dont complain about finding even though they arent for the form object

		// load existing object by id if provided, throw errors if id missing (or provided to add formtype)
		var jrResult = JrResult.makeNew();
		obj = await modelClass.validateAddEditFormIdMakeObj(jrResult, req, res, formTypeStr);

		if (!jrResult.isError()) {
			// check required csrf token
			jrResult = arserver.testCsrfReturnJrResult(req, res);
		}


		if (!jrResult.isError()) {
			// now save edit changes
			var saveFields = modelClass.getSaveFields("crudEdit");
			var savedobj = await modelClass.validateSave(jrResult, {}, true, user, req.body, saveFields, null, ignoreFields, obj, modelClass.getShouldBeOwned());

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
					reqbody = savedobj.modelObjPropertyCopy(true);
				} else {
					jrResult.addToSession(req);
					res.redirect(baseCrudUrl + "/view/" + savedobj.getIdAsString());
					return true;
				}

			}
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
		var { viewFile, isGeneric } = viewFileSet;

		// generic main html for page (edit form)
		var genericMainHtml;
		if (isGeneric) {
			genericMainHtml = await this.buildGenericMainHtml(modelClass, req, reqbody, jrResult, "edit", helperData);
		}

		//
		const flagOfferDelete = modelClass.getDefaultDeleteDisableModeIsVirtual() && (obj.disabled === 0 || (obj.disabled !== appconst.DefMdbVirtDelete));
		const flagOfferUnDelete = obj.disabled === appconst.DefMdbVirtDelete;
		const flagOfferPermDelete = true;

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
			flagOfferDelete,
			flagOfferPermDelete,
			flagOfferUnDelete,
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
		var user = await arserver.getLoggedInUser(req);

		// get id from get param
		var jrResult = JrResult.makeNew();
		var id = req.params.id;

		// get obj AND perform acl test
		var obj = await modelClass.validateGetObjByIdDoAclRenderErrorPageOrRedirect(jrResult, user, req, res, id, appconst.DefAclActionView);
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

		const flagOfferDelete = modelClass.getDefaultDeleteDisableModeIsVirtual() && (obj.disabled === 0 || (obj.disabled !== appconst.DefMdbVirtDelete));
		const flagOfferUnDelete = obj.disabled === appconst.DefMdbVirtDelete;
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
				return appconst.DefAclActionDelete;
			}
			jrResult.pushError("Virtual delete not supported for model class " + modelClass.getNiceName());
			return null;
		}
		if (reqmode === "delete") {
			// this will either be a virtual delete or a permanent delete
			// return appconst.DefAclActionDelete;
			return modelClass.getDefaultDeleteDisableModeAsAclAction();
		}
		if (reqmode === "permdelete") {
			return appconst.DefAclActionPermDelete;
		}
		if (reqmode === "undelete") {
			return appconst.DefAclActionUnDelete;
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
	 * @returns appconst.DefMdbVirtDelete or appconst.DefMdbRealDelete or appconst.DefMdbEnable
	 * @memberof CrudAid
	 */
	convertAclChangeModeActionToDeleteDatabaseStateValue(aclAction, jrResult) {
		// what kind of delete do we want, virtual or real?
		if (aclAction === appconst.DefAclActionDelete) {
			return appconst.DefMdbVirtDelete;
		}
		if (aclAction === appconst.DefAclActionPermDelete) {
			return appconst.DefMdbRealDelete;
		}
		if (aclAction === appconst.DefAclActionUnDelete) {
			return appconst.DefMdbEnable;
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
		var jrResult = JrResult.makeNew();

		// get logged in user
		var user = await arserver.getLoggedInUser(req);

		// get id from get param
		var id = req.params.id;
		var obj;

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
		var jrResult = JrResult.makeNew();

		// get logged in user
		var user = await arserver.getLoggedInUser(req);

		// get id from post, ignore url param
		var id = req.body._id;
		var obj;

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
		var newmode = this.convertAclChangeModeActionToDeleteDatabaseStateValue(aclAction, jrResult);

		if (!jrResult.isError()) {
			// do the actual mode change (delete / virtual or real)
			await obj.doChangeMode(newmode, jrResult);
		}

		// on success redirect to listview
		if (!jrResult.isError()) {
			// success (push message to top since helper deleted may have been pushed on earlier)
			const objIdString = obj.getIdAsString();
			jrResult.pushSuccess(modelClass.getNiceName() + " #" + objIdString + " has been " + appconst.DefStateModeLabels[newmode] + ".", true);

			// log the action
			const logIdString = obj.getLogIdString();
			arserver.logr(req, "crud." + reqmode, appconst.DefStateModeLabels[newmode] + " " + logIdString);

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
		var jrResult = JrResult.makeNew();

		// any helper data
		const helperData = await modelClass.calcCrudViewHelperData(req, res, id, obj);

		// parse view file set
		var { viewFile, isGeneric } = viewFileSet;

		// generic main html for page (delete form)
		var genericMainHtml;
		if (isGeneric) {
			genericMainHtml = await this.buildGenericMainHtml(modelClass, req, obj, jrResult, reqmode, helperData);
		}

		// cancel button goes where?
		const cancelUrl = baseCrudUrl + "/view/" + id;

		//
		var flagConfirmDelete = (reqmode === "delete");
		var flagConfirmPermDelete = (reqmode === "permdelete");
		var flagConfirmUnDelete = (reqmode === "undelete");

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
	 * Simple stats view for a model class
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
	async handleStatsGet(req, res, next, modelClass, baseCrudUrl, viewFileSet, extraViewData) {
		// get logged in user
		var user = await arserver.getLoggedInUser(req);

		// acl test
		if (!await arserver.aclRequireModelAccessRenderErrorPageOrRedirect(user, req, res, modelClass, appconst.DefAclActionStats)) {
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
	/**
	 * Helper for parsing crud forms
	 *
	 * @returns	array list of fields that we dont need to complain about and just ignore when they are found in an edit form submission
	 * @memberof CrudAid
	 */
	getCrudEditFormIgnoreFields() {

		return ["_csrf", "_id"];
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
	/**
	 * Generate the main html for different crudSubType views
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
	async buildGenericMainHtml(modelClass, req, obj, jrResult, crudSubType, helperData) {
		var rethtml;

		if (crudSubType === "add" || crudSubType === "edit") {
			// build form html for adding or editing
			rethtml = await this.buildGenericMainHtmlAddEdit(modelClass, req, obj, helperData, jrResult);
		} else if (crudSubType === "delete" || crudSubType === "permdelete" || crudSubType === "undelete" || crudSubType === "view") {
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


	/**
	 * Generate the main html for add/edit crudSubType view
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
	async buildGenericMainHtmlAddEdit(modelClass, req, obj, helperData, jrResult) {
		var rethtml = "";

		// start table
		rethtml += `
		<div class="table-responsive">
		<table class="table table-striped w-auto table-bordered">
		`;

		// schema for obj
		var modelSchema = modelClass.getSchemaDefinition();
		var schemaKeys = Object.keys(modelSchema);
		var schemaType;
		var val, valHtml, label, valfunc, hideList, readOnlyList, choices;
		var visfunc, isVisible, isReadOnly;
		var extra;
		var err;
		await jrhMisc.asyncAwaitForEachFunctionCall(schemaKeys, async (fieldName) => {

			// type of this field
			schemaType = modelClass.getBaseSchemaType(fieldName);

			// hidden?
			hideList = modelClass.getSchemaFieldVal(fieldName, "hide", undefined);
			if (jrhMisc.isInAnyArray("edit", hideList)) {
				return;
			}

			// read only?
			readOnlyList = modelClass.getSchemaFieldVal(fieldName, "readOnly", undefined);
			isReadOnly = jrhMisc.isInAnyArray("edit", readOnlyList);

			// label
			label = modelClass.getSchemaFieldVal(fieldName, "label", fieldName);
			// error
			if (jrResult && jrResult.errorFields && jrResult.errorFields[fieldName]) {
				err = jrResult.errorFields[fieldName];
			} else {
				err = "";
			}

			// now value
			valHtml = undefined;
			valfunc = modelClass.getSchemaFieldVal(fieldName, "valueFunction");
			if (valfunc) {
				// ok we have a custom function to call to get html to show for value
				valHtml = await valfunc("edit", fieldName, req, obj, helperData);
			}
			var format = modelClass.getSchemaFieldVal(fieldName, "format", undefined);

			// dynamic visibility function
			visfunc = modelClass.getSchemaFieldVal(fieldName, "visibleFunction");
			if (obj && visfunc) {
				// ok we have a custom function to call
				isVisible = await visfunc("edit", req, obj, helperData);
				if (!isVisible) {
					return;
				}
			}

			// if we havent yet set a value using valueFunctions (or if that returns undefined) then use default value
			if (valHtml === undefined) {
				if (!obj || obj[fieldName] === null || obj[fieldName] === undefined) {
					// default value
					val = modelClass.getSchemaFieldVal(fieldName, "defaultValue", "");
				} else {
					val = obj[fieldName];
				}

				// is it multiple choice type?
				choices = modelClass.getSchemaFieldVal(fieldName, "choicesEdit", null);
				if (!choices) {
					choices = modelClass.getSchemaFieldVal(fieldName, "choices", null);
				}

				if (isReadOnly) {
					// read only value
					if (choices) {
						valHtml = jrhText.jrHtmlNiceOptionFromList(choices, val, "[NOT SET]");
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
					var flagShowBlank = true;
					valHtml = jrhText.jrHtmlFormOptionListSelect(fieldName, choices, val, flagShowBlank);
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


	/**
	 * Generate the main html for main view crudSubType view
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
	async buildGenericMainHtmlView(modelClass, req, obj, helperData, jrResult) {
		var rethtml = "";

		// start table
		rethtml += `
		<div class="table-responsive">
		<table class="table table-striped w-auto table-bordered">
		`;

		// schema for obj
		var modelSchema = modelClass.getSchemaDefinition();
		var schemaType;
		var schemaKeys = Object.keys(modelSchema);
		var val, valHtml, label, valfunc, hideList, choices;
		var visfunc, isVisible;
		var crudLink;

		await jrhMisc.asyncAwaitForEachFunctionCall(schemaKeys, async (fieldName) => {

			// type of this field
			schemaType = modelClass.getBaseSchemaType(fieldName);

			// hidden?
			hideList = modelClass.getSchemaFieldVal(fieldName, "hide", undefined);
			if (jrhMisc.isInAnyArray("view", hideList)) {
				return;
			}

			// label
			label = modelClass.getSchemaFieldVal(fieldName, "label", fieldName);

			// now value
			valHtml = undefined;
			valfunc = modelClass.getSchemaFieldVal(fieldName, "valueFunction");
			if (valfunc) {
				// ok we have a custom function to call to get html to show for value
				valHtml = await valfunc("view", fieldName, req, obj, helperData);
			}
			var format = modelClass.getSchemaFieldVal(fieldName, "format", undefined);

			// dynamic visibility function
			visfunc = modelClass.getSchemaFieldVal(fieldName, "visibleFunction");
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
				crudLink = modelClass.getSchemaFieldVal(fieldName, "crudLink");
				if (crudLink) {
					// is it crud link?
					valHtml = `<a href="${crudLink}/view/${val}">${val}</a>`;
				}
				if (valHtml === undefined) {
					// is it multiple choice type?
					choices = modelClass.getSchemaFieldVal(fieldName, "choices", null);
					if (choices) {
						valHtml = jrhText.jrHtmlNiceOptionFromList(choices, val, "[NOT SET]");
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


	/**
	 * Generate the main html for main stats crudSubType view
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
	async buildGenericMainHtmlStats(modelClass, req, obj, helperData, jrResult) {
		var rethtml;
		rethtml = "<div>stats</div>";
		return rethtml;
	}


	/**
	 * Generate the main html for stats view crudSubType view
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
	async buildGenericMainHtmlList(modelClass, req, obj, helperData, jrResult) {
		var rehtml = await jrhGrid.jrGridList(req, helperData);
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
		var jrResult = JrResult.makeNew();

		if (bulkAction === "delete") {
			// do they have permission to delete all in the list
			const permission = appconst.DefAclActionDelete;
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
			const permission = appconst.DefAclActionPermDelete;
			const objectType = modelClass.getAclName();
			if (!await user.aclHasPermissionOnAll(permission, objectType, idList)) {
				return JrResult.makeError("Permission denied; you do not have permission to " + bulkAction + " these items.");
			}

			// they have permission!

			// real permanent delete
			const mode = appconst.DefMdbRealDelete;

			await modelClass.doChangeModeByIdList(idList, mode, jrResult, false);
			return jrResult;
		}

		if (bulkAction === "undelete") {
			// do they have permission to undelete all in the list
			const permission = appconst.DefAclActionUnDelete;
			const objectType = modelClass.getAclName();
			if (!await user.aclHasPermissionOnAll(permission, objectType, idList)) {
				return JrResult.makeError("Permission denied; you do not have permission to " + bulkAction + " these items.");
			}

			// they have permission!

			// undelete means make enabled
			const mode = appconst.DefMdbEnable;

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
