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
const JrContext = require("../helpers/jrcontext");
const jrhText = require("../helpers/jrh_text");
const jrhMisc = require("../helpers/jrh_misc");
const jrhGrid = require("../helpers/jrh_grid");
const jrdebug = require("../helpers/jrdebug");
const jrhExpress = require("../helpers/jrh_express");

// controllers
const arserver = jrequire("arserver");
// const aclAid = jrequire("aclaid");

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
		router.get("/", async (req, res, next) => await this.handleListGet(JrContext.makeNew(req, res, next), modelClass, baseCrudUrl, viewFilePathList, extraViewData));
		// post for bulk operations
		router.post("/", async (req, res, next) => await this.handleListPost(JrContext.makeNew(req, res, next), modelClass, baseCrudUrl, viewFilePathList, extraViewData));
		//---------------------------------------------------------------------------

		//---------------------------------------------------------------------------
		// add (get)
		const viewFilePathAdd = this.calcViewFile("addedit", modelClass);
		router.get("/add/:id?", async (req, res, next) => await this.handleAddGet(JrContext.makeNew(req, res, next), modelClass, baseCrudUrl, viewFilePathAdd, extraViewData));
		// add (post submit)
		router.post("/add/:ignoredid?", async (req, res, next) => await this.handleAddPost(JrContext.makeNew(req, res, next), modelClass, baseCrudUrl, viewFilePathAdd, extraViewData));
		//---------------------------------------------------------------------------

		//---------------------------------------------------------------------------
		// edit (get)
		const viewFilePathEdit = this.calcViewFile("addedit", modelClass);
		router.get("/edit/:id", async (req, res, next) => await this.handleEditGet(JrContext.makeNew(req, res, next), modelClass, baseCrudUrl, viewFilePathEdit));
		// edit (post submit)
		router.post("/edit/:ignoredid?", async (req, res, next) => await this.handleEditPost(JrContext.makeNew(req, res, next), modelClass, baseCrudUrl, viewFilePathEdit, extraViewData));
		//---------------------------------------------------------------------------

		//---------------------------------------------------------------------------
		// view (get)
		const viewFilePathView = this.calcViewFile("viewdelete", modelClass);
		router.get("/view/:id", async (req, res, next) => await this.handleViewGet(JrContext.makeNew(req, res, next), modelClass, baseCrudUrl, viewFilePathView, extraViewData));
		//---------------------------------------------------------------------------

		//---------------------------------------------------------------------------
		// delete (get)
		const viewFilePathDelete = this.calcViewFile("viewdelete", modelClass);
		router.get("/delete/:id", async (req, res, next) => await this.handleChangeModeGet(JrContext.makeNew(req, res, next), modelClass, baseCrudUrl, viewFilePathDelete, extraViewData, "delete"));
		// delete (post submit)
		router.post("/delete/:ignoredid?", async (req, res, next) => await this.handleChangeModePost(JrContext.makeNew(req, res, next), modelClass, baseCrudUrl, viewFilePathDelete, extraViewData, "delete"));
		//---------------------------------------------------------------------------

		//---------------------------------------------------------------------------
		// PermDelete (get)
		const viewFilePathPermDelete = this.calcViewFile("viewdelete", modelClass);
		router.get("/permdelete/:id", async (req, res, next) => await this.handleChangeModeGet(JrContext.makeNew(req, res, next), modelClass, baseCrudUrl, viewFilePathPermDelete, extraViewData, "permdelete"));
		// PermDelete (post submit)
		router.post("/permdelete/:ignoredid?", async (req, res, next) => await this.handleChangeModePost(JrContext.makeNew(req, res, next), modelClass, baseCrudUrl, viewFilePathPermDelete, extraViewData, "permdelete"));
		//---------------------------------------------------------------------------

		//---------------------------------------------------------------------------
		// UNdelete (get)
		const viewFilePathUnDelete = this.calcViewFile("viewdelete", modelClass);
		router.get("/undelete/:id", async (req, res, next) => await this.handleChangeModeGet(JrContext.makeNew(req, res, next), modelClass, baseCrudUrl, viewFilePathUnDelete, extraViewData, "undelete"));
		// UNdelete (post submit)
		router.post("/undelete/:ignoredid?", async (req, res, next) => await this.handleChangeModePost(JrContext.makeNew(req, res, next), modelClass, baseCrudUrl, viewFilePathUnDelete, extraViewData, "undelete"));
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
	async handleListGet(jrContext, modelClass, baseCrudUrl, viewFileSet, extraViewData) {
		// get logged in user
		const user = await arserver.lookupLoggedInUser(jrContext);

		// acl test
		if (!await arserver.aclRequireModelAccessRenderErrorPageOrRedirect(jrContext, user, modelClass, appdef.DefAclActionList)) {
			return true;
		}

		// present the list
		return await this.doPresentListForm(jrContext, user, modelClass, baseCrudUrl, viewFileSet, extraViewData);
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
	async handleListPost(jrContext, modelClass, baseCrudUrl, viewFileSet, extraViewData) {
		// this is called for bulk action

		// get logged in user
		const user = await arserver.lookupLoggedInUser(jrContext);

		// acl test
		if (!await arserver.aclRequireModelAccessRenderErrorPageOrRedirect(jrContext, user, modelClass, appdef.DefAclActionList)) {
			return true;
		}
		// check required csrf token
		arserver.testCsrf(jrContext);
		if (!jrContext.isError()) {
			// get bulk action options
			const formbody = jrContext.req.body;
			const bulkAction = formbody.bulkaction;
			// get all checked checkboxes
			const checkboxIdList = jrhExpress.reqPrefixedCheckboxItemIds(formbody, "checkboxid_");

			// do the bulk action and add result to session
			await this.doBulkAction(jrContext, user, modelClass, bulkAction, checkboxIdList);
		}

		// add result (error or result of bulk action) to session? NO because we include when we present the form, and this addToSession is only for when we redirect, etc.
		// jrContext.addToThisSession();

		// present the list
		return await this.doPresentListForm(jrContext, user, modelClass, baseCrudUrl, viewFileSet, extraViewData);
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
	async doPresentListForm(jrContext, user, modelClass, baseCrudUrl, viewFileSet, extraViewData) {

		// ATTN: We might set these differently based on who is logged in and looking at the list
		// and it should be a per-modelClass thing..
		// ATTN: testing here some manual items:
		const protectedFields = ["passwordHashed"];
		let hiddenFields = [];

		// parse view file set
		const { viewFile, isGeneric } = viewFileSet;

		// hidden fields for list view
		const hiddenFiledsSchema = await modelClass.calcHiddenSchemaKeysForView(jrContext, "list");
		hiddenFields = jrhMisc.mergeArraysDedupe(hiddenFields, hiddenFiledsSchema);

		// make helper data
		const helperData = await modelClass.calcCrudListHelperData(jrContext, user, baseCrudUrl, protectedFields, hiddenFields);

		// generic main html for page (add form)
		let genericMainHtml;
		if (isGeneric) {
			genericMainHtml = await this.buildGenericMainHtmlList(jrContext, helperData);
			genericMainHtml = new hbs.SafeString(genericMainHtml);
		}

		// render
		const jrResult = jrContext.mergeSessionMessages();
		jrContext.res.render(viewFile, {
			headline: modelClass.getNiceName() + " List",
			jrResult,
			csrfToken: arserver.makeCsrf(jrContext),
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
	async handleAddGet(jrContext, modelClass, baseCrudUrl, viewFileSet, extraViewData) {
		// get logged in user
		const user = await arserver.lookupLoggedInUser(jrContext);
		let reqbody;

		// acl test to add
		if (!await arserver.aclRequireModelAccessRenderErrorPageOrRedirect(jrContext, user, modelClass, appdef.DefAclActionAdd)) {
			return true;
		}

		// present form
		await this.doPresentAddForm(jrContext, reqbody, user, modelClass, baseCrudUrl, viewFileSet, extraViewData);
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
	async handleAddPost(jrContext, modelClass, baseCrudUrl, viewFileSet, extraViewData) {
		// user posts form for adding submission

		// get logged in user
		const user = await arserver.lookupLoggedInUser(jrContext);

		const formTypeStr = "add";
		const flagRepresentAfterSuccess = false;
		let reqbody = jrContext.req.body;

		// acl test
		if (!await arserver.aclRequireModelAccessRenderErrorPageOrRedirect(jrContext, user, modelClass, appdef.DefAclActionAdd)) {
			return true;
		}


		// load existing object by id if provided, throw errors if id missing (or provided to add formtype)
		// in the ADD case, this should just return a new blank object or complain if user specified an id
		const obj = await modelClass.validateAddEditFormIdMakeObj(jrContext, formTypeStr);
		// add creator
		obj.creator = user.getIdAsString();


		if (!jrContext.isError()) {
			// check required csrf token
			arserver.testCsrf(jrContext);
		}

		if (!jrContext.isError()) {
			// now save add changes
			// form fields that we dont complain about finding even though they arent for the form object
			const ignoreFields = this.getCrudEditFormIgnoreFields();

			// process

			const saveFields = modelClass.getSaveFields("crudAdd");
			let savedobj = await modelClass.validateSave(jrContext, {}, true, user, jrContext.req.body, saveFields, null, ignoreFields, obj, modelClass.getShouldBeOwned());
			if (!jrContext.isError()) {
				// success! drop down with new blank form, or alternatively, we could redirect to a VIEW obj._id page
				jrContext.pushSuccess(modelClass.getNiceName() + " added on " + jrhMisc.getNiceNowString() + ".");

				// log the action
				arserver.logr(jrContext, appdef.DefLogTypeCrudCreate, "created " + savedobj.getLogIdString());

				if (jrContext.isError()) {
					// we had an error saving user; this is serious because it leaves an orphaned object
					let errmsg = "There was an error saving the new owner role for " + user.getLogIdString() + " after creation of new object " + savedobj.getLogIdString() + ": " + jrContext.getErrorsAsString() + ".";
					// so first things first lets delete the object
					// we do a REAL delete here (as opposed to a virtual one) since the object was just added in failure
					// NOTE: we create a new context with no errors in it for this, so we can better check if this operations errors
					const jrContextFollowup = JrContext.makeNew(jrContext.req, jrContext.res, jrContext.next);
					await savedobj.doChangeMode(jrContextFollowup, appdef.DefMdbRealDelete);
					if (jrContextFollowup.isError()) {
						// yikes we couldn't even delete the object
						errmsg += "  In addition, the newly created object could not be rolled back and deleted: " + jrContextFollowup.getErrorsAsString();
					} else {
						// at least we rolled back the object
						errmsg += "  But the newly created object was successfully rolled back and deleted.";
					}
					// now log error
					arserver.logr(jrContext, appdef.DefLogTypeErrorCriticalDb, errmsg);

					// clear object
					savedobj = null;
				}


				if (!jrContext.isError()) {
					if (!baseCrudUrl) {
						// just return to caller saying they should take over
						return false;
					}

					if (flagRepresentAfterSuccess) {
						// success, so clear reqbody and drop down so they can add another
						reqbody = {};
					} else {
						jrContext.addToThisSession();
						jrContext.res.redirect(baseCrudUrl + "/view/" + savedobj.getIdAsString());
						return true;
					}
				}
			}
		}

		if (jrContext.isError()) {
			// error, so we need to fetch object for edit refinement..
		}

		// re-present form
		await this.doPresentAddForm(jrContext, reqbody, user, modelClass, baseCrudUrl, viewFileSet, extraViewData);
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
	async doPresentAddForm(jrContext, reqbody, user, modelClass, baseCrudUrl, viewFileSet, extraViewData) {
		// any helper data
		const helperData = await modelClass.calcCrudEditHelperData(user);

		// parse view file set
		const { viewFile, isGeneric } = viewFileSet;

		// generic main html for page (add form)
		let genericMainHtml;
		if (isGeneric) {
			const obj = null;
			genericMainHtml = await this.buildGenericMainHtmlAddEditView(jrContext, null, "add", modelClass, obj, reqbody, helperData);
			genericMainHtml = new hbs.SafeString(genericMainHtml);
		}

		// cancel button goes where?
		const cancelUrl = baseCrudUrl;

		// re-present form for another add?
		jrContext.res.render(viewFile, {
			headline: "Add " + modelClass.getNiceName(),
			jrResult: jrContext.mergeSessionMessages(),
			csrfToken: arserver.makeCsrf(jrContext),
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
	async handleEditGet(jrContext, modelClass, baseCrudUrl, viewFileSet, extraViewData) {
		// get logged in user
		const user = await arserver.lookupLoggedInUser(jrContext);

		// get id from get param
		const id = jrContext.req.params.id;

		// validate and get id, this will also do an ACL test
		const obj = await modelClass.validateGetObjByIdDoAclRenderErrorPageOrRedirect(jrContext, user, id, appdef.DefAclActionEdit);
		if (jrContext.isError()) {
			return false;
		}

		// present form
		return await this.doPresentEditForm(jrContext, null, obj, id, user, modelClass, baseCrudUrl, viewFileSet, extraViewData);
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
	async handleEditPost(jrContext, modelClass, baseCrudUrl, viewFileSet, extraViewData) {
		// user posts form for adding submission

		// get logged in user
		const user = await arserver.lookupLoggedInUser(jrContext);

		// ATTN: in post of edit, we ignore the id passed in param and get it from post body
		const formTypeStr = "edit";
		const flagRepresentAfterSuccess = false;
		let reqbody = jrContext.req.body;

		// get id from post, ignore url param
		const id = jrContext.req.body._editId;
		const ignoreFields = this.getCrudEditFormIgnoreFields();

		// acl test
		if (!await arserver.aclRequireModelAccessRenderErrorPageOrRedirect(jrContext, user, modelClass, appdef.DefAclActionEdit, id)) {
			return false;
		}
		// form fields that we dont complain about finding even though they arent for the form object

		// load existing object by id if provided, throw errors if id missing (or provided to add formtype)
		const obj = await modelClass.validateAddEditFormIdMakeObj(jrContext, formTypeStr);

		if (!jrContext.isError()) {
			// check required csrf token
			arserver.testCsrf(jrContext);
		}

		if (!jrContext.isError()) {
			// now save edit changes
			const saveFields = modelClass.getSaveFields("crudEdit");
			const savedobj = await modelClass.validateSave(jrContext, {}, true, user, jrContext.req.body, saveFields, null, ignoreFields, obj, modelClass.getShouldBeOwned());

			if (!jrContext.isError()) {
				// success! drop down with new blank form, or alternatively, we could redirect to a VIEW obj._id page

				// log the action
				const idLabel = savedobj.getLogIdString();
				arserver.logr(jrContext, appdef.DefLogTypeCrudEdit, "edited " + idLabel);

				// success message
				jrContext.pushSuccess(modelClass.getNiceName() + " saved on " + jrhMisc.getNiceNowString() + ".");
				if (!baseCrudUrl) {
					// just return to caller saying they should take over
					jrContext.addToThisSession();
					return false;
				}

				if (flagRepresentAfterSuccess) {
					reqbody = null;
				} else {
					jrContext.addToThisSession();
					jrContext.res.redirect(baseCrudUrl + "/view/" + savedobj.getIdAsString());
					return true;
				}
			}
		}

		// re-present form
		return await this.doPresentEditForm(jrContext, reqbody, obj, id, user, modelClass, baseCrudUrl, viewFileSet, extraViewData);
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
	async doPresentEditForm(jrContext, reqbody, obj, id, user, modelClass, baseCrudUrl, viewFileSet, extraViewData) {
		// any helper data
		const helperData = await modelClass.calcCrudEditHelperData(user, id);

		// parse view file set
		const { viewFile, isGeneric } = viewFileSet;

		// generic main html for page (edit form)
		let genericMainHtml;
		if (isGeneric) {
			genericMainHtml = await this.buildGenericMainHtmlAddEditView(jrContext, id, "edit", modelClass, obj, reqbody, helperData);
			genericMainHtml = new hbs.SafeString(genericMainHtml);
		}

		//
		const flagOfferDelete = modelClass.getDefaultDeleteDisableModeIsVirtual() && (obj.disabled === 0 || (obj.disabled !== appdef.DefMdbVirtDelete));
		const flagOfferUnDelete = obj.disabled === appdef.DefMdbVirtDelete;
		const flagOfferPermDelete = true;

		// cancel button goes where?
		const cancelUrl = baseCrudUrl + "/view/" + id;


		// render
		jrContext.res.render(viewFile, {
			headline: "Edit " + modelClass.getNiceName() + " #" + id,
			jrResult: jrContext.mergeSessionMessages(),
			csrfToken: arserver.makeCsrf(jrContext),
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
	async handleViewGet(jrContext, modelClass, baseCrudUrl, viewFileSet, extraViewData) {
		// get logged in user
		const user = await arserver.lookupLoggedInUser(jrContext);

		// get id from get param
		const id = jrContext.req.params.id;

		// get obj AND perform acl test
		const obj = await modelClass.validateGetObjByIdDoAclRenderErrorPageOrRedirect(jrContext, user, id, appdef.DefAclActionView);
		if (jrContext.isError()) {
			return true;
		}

		// any helper data
		const helperData = await modelClass.calcCrudViewHelperData(jrContext, id, obj);

		// parse view file set
		const { viewFile, isGeneric } = viewFileSet;

		// generic main html for page (view form)
		let genericMainHtml;
		if (isGeneric) {
			const reqbody = null;
			genericMainHtml = await this.buildGenericMainHtmlAddEditView(jrContext, id, "view", modelClass, obj, reqbody, helperData);
			genericMainHtml = new hbs.SafeString(genericMainHtml);
		}

		const flagOfferDelete = modelClass.getDefaultDeleteDisableModeIsVirtual() && (obj.disabled === 0 || (obj.disabled !== appdef.DefMdbVirtDelete));
		const flagOfferUnDelete = obj.disabled === appdef.DefMdbVirtDelete;
		const flagOfferPermDelete = true;

		// render
		jrContext.res.render(viewFile, {
			headline: "View " + modelClass.getNiceName() + " #" + id,
			jrResult: jrContext.mergeSessionMessages(),
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
	getAclActionForChangeReqMode(jrContext, modelClass, reqmode) {
		if (reqmode === "virtdelete") {
			if (modelClass.supportsVirtualDelete()) {
				return appdef.DefAclActionDelete;
			}
			jrContext.pushError("Virtual delete not supported for model class " + modelClass.getNiceName());
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
		jrContext.pushError("Unknown reqmode in getAclActionForChangeReqMode: " + reqmode);
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
	convertAclChangeModeActionToDeleteDatabaseStateValue(jrContext, aclAction) {
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
		jrContext.pushError("Unknown aclAction in convertAclChangeModeActionToDeleteDatabaseStateValue: " + aclAction);
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
	async handleChangeModeGet(jrContext, modelClass, baseCrudUrl, viewFileSet, extraViewData, reqmode) {
		// get logged in user
		const user = await arserver.lookupLoggedInUser(jrContext);

		// get id from get param
		const id = jrContext.req.params.id;
		let obj;

		// which acl permission to check for
		const aclAction = this.getAclActionForChangeReqMode(jrContext, modelClass, reqmode);

		// get object AND perform ACL test
		if (!jrContext.isError()) {
			obj = await modelClass.validateGetObjByIdDoAclRenderErrorPageOrRedirect(jrContext, user, id, aclAction);
		}

		return await this.doPresentChangeModeForm(jrContext, id, obj, modelClass, baseCrudUrl, viewFileSet, extraViewData, reqmode);
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
	async handleChangeModePost(jrContext, modelClass, baseCrudUrl, viewFileSet, extraViewData, reqmode) {

		// get logged in user
		const user = await arserver.lookupLoggedInUser(jrContext);

		// get id from post, ignore url param
		const id = jrContext.req.body._editId;
		let obj, newmode;

		// ATTN: change this to drop down re-present rather than error
		// check required csrf token
		arserver.testCsrf(jrContext);

		if (!jrContext.isError()) {
			// which acl permission to check for
			const aclAction = this.getAclActionForChangeReqMode(jrContext, modelClass, reqmode);

			if (!jrContext.isError()) {
				// get object AND perform ACL test
				obj = await modelClass.validateGetObjByIdDoAclRenderErrorPageOrRedirect(jrContext, user, id, aclAction);
			}

			if (!jrContext.isError()) {
				// process delete
				newmode = this.convertAclChangeModeActionToDeleteDatabaseStateValue(jrContext, aclAction);
			}

			if (!jrContext.isError()) {
				// do the actual mode change (delete / virtual or real)
				await obj.doChangeMode(jrContext, newmode);
			}
		}


		// on success redirect to listview
		if (!jrContext.isError()) {
			// success (push message to top since helper deleted may have been pushed on earlier)
			const objIdString = obj.getIdAsString();
			jrContext.pushSuccess(modelClass.getNiceName() + " #" + objIdString + " has been " + appdef.DefStateModeLabels[newmode] + ".", true);

			// log the action
			const logIdString = obj.getLogIdString();
			arserver.logr(jrContext, appdef.DefLogTypeCrudPefix + reqmode, appdef.DefStateModeLabels[newmode] + " " + logIdString);

			// redirect
			jrContext.addToThisSession();
			jrContext.res.redirect(baseCrudUrl);
			return true;
		}

		// error, re-present form
		return await this.doPresentChangeModeForm(jrContext, id, obj, modelClass, baseCrudUrl, viewFileSet, extraViewData, reqmode);
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
	async doPresentChangeModeForm(jrContext, id, obj, modelClass, baseCrudUrl, viewFileSet, extraViewData, reqmode) {

		// any helper data
		const helperData = await modelClass.calcCrudViewHelperData(jrContext, id, obj);

		// parse view file set
		const { viewFile, isGeneric } = viewFileSet;

		// generic main html for page (delete form)
		let genericMainHtml;
		if (isGeneric) {
			const reqbody = null;
			genericMainHtml = await this.buildGenericMainHtmlAddEditView(jrContext, id, "view", modelClass, obj, reqbody, helperData);
			genericMainHtml = new hbs.SafeString(genericMainHtml);
		}

		// cancel button goes where?
		const cancelUrl = baseCrudUrl + "/view/" + id;

		//
		const flagConfirmDelete = (reqmode === "delete");
		const flagConfirmPermDelete = (reqmode === "permdelete");
		const flagConfirmUnDelete = (reqmode === "undelete");

		// render
		jrContext.res.render(viewFile, {
			headline: "Confirmation required.\n" + jrhText.capitalizeFirstLetter(reqmode) + " " + modelClass.getNiceName() + " #" + id + "?",
			jrResult: jrContext.mergeSessionMessages(),
			csrfToken: arserver.makeCsrf(jrContext),
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
	async buildGenericMainHtmlAddEditView(jrContext, id, crudSubType, modelClass, obj, editData, helperData) {
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
		let visibleFunction, isVisible, isReadOnly;
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
			visibleFunction = modelClass.getSchemaFieldVal(fieldName, "visibleFunction");
			if (visibleFunction) {
				// ok we have a custom function to call
				isVisible = await visibleFunction(jrContext, crudSubType, fieldName, obj, editData, helperData);
				if (!isVisible) {
					return;
				}
			}

			// label
			label = modelClass.getSchemaFieldVal(fieldName, "label", fieldName);

			// html value to display (may be an input element if in edit crudSubType)
			valHtml = await modelClass.renderFieldValueHtml(jrContext, obj, editData, fieldName, crudSubType, helperData);

			// add any error
			err = jrContext.getFieldError(fieldName, "");

			// render it
			rethtml += `
			<tr>
        		<td><strong>${label}</strong></td>
					  <td>${valHtml}`;

			if (err) {
				rethtml += ` <span class="jrErrorInline">${err}</span> `;
			}

			rethtml += ` </td>
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
	async buildGenericMainHtmlList(jrContext, helperData) {
		const csrfToken = arserver.makeCsrf(jrContext);
		const rehtml = await jrhGrid.jrGridList(jrContext, helperData, csrfToken);
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
	async doBulkAction(jrContext, user, modelClass, bulkAction, idList) {

		if (bulkAction === "disable") {
			// do they have permission to delete all in the list
			const permission = appdef.DefAclActionDisable;
			const objectType = modelClass.getAclName();
			if (!await user.aclHasPermissionOnAll(jrContext, permission, objectType, idList)) {
				jrContext.pushError("Permission denied; you do not have permission to " + bulkAction + " these items.");
				return;
			}

			// they have permission!

			// what kind of delete should we do? real or virtual?
			const mode = appdef.DefMdbDisable;
			await modelClass.doChangeModeByIdList(jrContext, idList, mode, false);
			return;
		}

		if (bulkAction === "enable") {
			// do they have permission to delete all in the list
			const permission = appdef.DefAclActionEnable;
			const objectType = modelClass.getAclName();
			if (!await user.aclHasPermissionOnAll(jrContext, permission, objectType, idList)) {
				jrContext.pushError("Permission denied; you do not have permission to " + bulkAction + " these items.");
				return;
			}

			// they have permission!

			// what kind of delete should we do? real or virtual?
			const mode = appdef.DefMdbEnable;
			await modelClass.doChangeModeByIdList(jrContext, idList, mode, false);
			return;
		}


		if (bulkAction === "delete") {
			// do they have permission to delete all in the list
			const permission = appdef.DefAclActionDelete;
			const objectType = modelClass.getAclName();
			if (!await user.aclHasPermissionOnAll(jrContext, permission, objectType, idList)) {
				jrContext.pushError("Permission denied; you do not have permission to " + bulkAction + " these items.");
				return;
			}

			// they have permission!

			// what kind of delete should we do? real or virtual?
			const mode = modelClass.getDefaultDeleteDisableMode();

			await modelClass.doChangeModeByIdList(jrContext, idList, mode, false);
			return;
		}

		if (bulkAction === "permdelete") {
			// do they have permission to delete all in the list
			const permission = appdef.DefAclActionPermDelete;
			const objectType = modelClass.getAclName();
			if (!await user.aclHasPermissionOnAll(jrContext, permission, objectType, idList)) {
				jrContext.pushError("Permission denied; you do not have permission to " + bulkAction + " these items.");
				return;
			}

			// they have permission!

			// real permanent delete
			const mode = appdef.DefMdbRealDelete;

			await modelClass.doChangeModeByIdList(jrContext, idList, mode, false);
			return;
		}

		if (bulkAction === "undelete") {
			// do they have permission to undelete all in the list
			const permission = appdef.DefAclActionUnDelete;
			const objectType = modelClass.getAclName();
			if (!await user.aclHasPermissionOnAll(jrContext, permission, objectType, idList)) {
				jrContext.pushError("Permission denied; you do not have permission to " + bulkAction + " these items.");
				return;
			}

			// they have permission!

			// undelete means make enabled
			const mode = appdef.DefMdbEnable;

			await modelClass.doChangeModeByIdList(jrContext, idList, mode, false);
			return;
		}


		// dont know this bulk action
		jrContext.pushError("Internal error - unknown bulk operation [" + bulkAction + "]");
	}
	//---------------------------------------------------------------------------










}





// export the class as the sole export
module.exports = new CrudAid();
