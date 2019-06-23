// approom
// crud aid class
// v1.0.0 on 6/5/19 by mouser@donationcoder.com
//
// Helps out with CRUD processing in routes

"use strict";

// modules
const fs = require("fs");
const path = require("path");

// helpers
const JrResult = require("../helpers/jrresult");
const jrLog = require("../helpers/jrlog");

// models
const arserver = require("../models/server");



class CrudAid {

	static setupRouter(router, modelClass, baseCrudUrl) {
		// note that we use const variables with different names here so that we can precalc the view files ONCE
		// and use that calc'd path each time the request is made without having to recompute it


		//---------------------------------------------------------------------------
		// list
		const viewFilePathIndex = this.calcViewFile("list", modelClass);
		router.get("/", async (req, res, next) => {
			// acl test
			if (!await arserver.aclRequireModelAccess(req, res, modelClass, "list")) {
				return;
			}

			var jrResult = JrResult.makeNew();

			// any helper data
			const listHelperData = await modelClass.calcCrudListHelperData(req, res, baseCrudUrl, jrResult);

			// render
			res.render(viewFilePathIndex, {
				headline: "List " + modelClass.getNiceName() + "s",
				jrResult: JrResult.sessionRenderResult(req, res, jrResult),
				crudClassNiceName: modelClass.getNiceName(),
				csrfToken: arserver.makeCsrf(req, res),
				listHelperData,
			});
		});
		//---------------------------------------------------------------------------


		//---------------------------------------------------------------------------
		// add (get)
		const viewFilePathAdd = this.calcViewFile("addedit", modelClass);
		router.get("/add/:id?", async (req, res, next) => {
			var jrResult = JrResult.makeNew();
			var id = req.params.id;
			var reqbody;

			// get id from get param; if they specify an id, grab that object from db and let them start a new one with those values (like a clone
			if (id) {
				// validate id
				modelClass.validateId(jrResult, id);
				if (!jrResult.isError()) {
					// acl test to VIEW the item we are CLONING
					if (!await arserver.aclRequireModelAccess(req, res, modelClass, "view", id)) {
						return;
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
			if (!await arserver.aclRequireModelAccess(req, res, modelClass, "add")) {
				return;
			}

			// any helper data
			const editHelperData = await modelClass.calcCrudEditHelperData(req, res);

			// render
			res.render(viewFilePathAdd, {
				headline: "Add " + modelClass.getNiceName(),
				jrResult: JrResult.sessionRenderResult(req, res, jrResult),
				crudClassNiceName: modelClass.getNiceName(),
				csrfToken: arserver.makeCsrf(req, res),
				reqbody,
				editHelperData,
			});
		});


		// add (post submit)
		router.post("/add/:ignoredid?", async (req, res, next) => {
			// user posts form for adding submission
			var jrResult = JrResult.makeNew();
			var formTypeStr = "add";
			var flagRepresentAfterSuccess = false;

			// check required csrf token
			if (arserver.testCsrfThrowError(req, res, next) instanceof Error) {
				return;
			}
			// acl test
			if (!await arserver.aclRequireModelAccess(req, res, this, "add")) {
				return;
			}

			// process
			var reqbody = req.body;

			// load existing object by id if provided, throw errors if id missing (or provided to add formtype)
			// in the ADD case, this should just return a new blank object or complain if user specified an id
			var obj = await modelClass.validateAddEditFormIdMakeObj(jrResult, req, res, formTypeStr);

			if (!jrResult.isError()) {
				// now save changes
				var savedobj = await modelClass.doAddEditFromFormReturnObj(jrResult, req, res, formTypeStr, obj);
				if (!jrResult.isError()) {
					// success! drop down with new blank form, or alternatively, we could redirect to a VIEW obj._id page
					if (flagRepresentAfterSuccess) {
						// success, so clear reqbody and drop down so they can add another
						reqbody = {};
					} else {
						jrResult.addToSession(req);
						res.redirect(baseCrudUrl + "/view/" + savedobj.getIdAsString());
						return;
					}
				}
			}

			// any helper data
			const editHelperData = await modelClass.calcCrudEditHelperData(req, res);

			// re-present form for another add?
			res.render(viewFilePathAdd, {
				headline: "Add " + modelClass.getNiceName(),
				jrResult: JrResult.sessionRenderResult(req, res, jrResult),
				crudClassNiceName: modelClass.getNiceName(),
				csrfToken: arserver.makeCsrf(req, res),
				reqbody,
				editHelperData,
			});
		});
		//---------------------------------------------------------------------------


		//---------------------------------------------------------------------------
		// edit (get)
		const viewFilePathEdit = this.calcViewFile("addedit", modelClass);
		router.get("/edit/:id", async (req, res, next) => {
			var jrResult = JrResult.makeNew();

			// get id from get param
			var id = req.params.id;

			// validate and get id, this will also do an ACL test
			var obj = await modelClass.validateGetObjByIdDoAcl(jrResult, req, res, id, "edit");
			if (jrResult.isError()) {
				return;
			}

			// put object fields in body, for view form
			var reqbody = obj.modelObjPropertyCopy(true);

			// any helper data
			const editHelperData = await modelClass.calcCrudEditHelperData(req, res, id);

			// render
			res.render(viewFilePathEdit, {
				headline: "Edit " + modelClass.getNiceName() + " #" + id,
				jrResult: JrResult.sessionRenderResult(req, res),
				crudClassNiceName: modelClass.getNiceName(),
				csrfToken: arserver.makeCsrf(req, res),
				reqbody,
				editHelperData,
			});
		});


		// edit (post submit)
		router.post("/edit/:ignoredid?", async (req, res, next) => {
			// user posts form for adding submission
			// ATTN: in post of edit, we ignore the id passed in param and get it from post body
			var formTypeStr = "edit";
			var jrResult = JrResult.makeNew();
			var flagRepresentAfterSuccess = false;

			// get id from post, ignore url param
			var id = req.body._id;

			// check required csrf token
			if (arserver.testCsrfThrowError(req, res, next) instanceof Error) {
				return;
			}
			// acl test
			if (!await arserver.aclRequireModelAccess(req, res, this, "edit", id)) {
				return;
			}

			// process
			var reqbody = req.body;

			// load existing object by id if provided, throw errors if id missing (or provided to add formtype)
			var obj = await modelClass.validateAddEditFormIdMakeObj(jrResult, req, res, formTypeStr);

			if (!jrResult.isError()) {
				// now save changes
				var savedobj = await modelClass.doAddEditFromFormReturnObj(jrResult, req, res, formTypeStr, obj);
				if (!jrResult.isError()) {
					// success
					// ATTN: so the question is, what do we show now.. do we want to redirect?
					// if we want to re-present the edit form, we should display the actual saved data object, to make sure it is up to date, rather than
					// alternatively, we could redirect to a VIEW obj._id page
					if (flagRepresentAfterSuccess) {
						// fill form data with object properties and drop down to let user re-edit
						reqbody = savedobj.modelObjPropertyCopy(true);
					} else {
						jrResult.addToSession(req);
						res.redirect(baseCrudUrl + "/view/" + savedobj.getIdAsString());
						return;
					}

				}
			}

			// any helper data
			const editHelperData = await modelClass.calcCrudEditHelperData(req, res, id);

			// render -- just like original edit
			res.render(viewFilePathEdit, {
				headline: "Edit " + modelClass.getNiceName() + " #" + id,
				jrResult: JrResult.sessionRenderResult(req, res, jrResult),
				crudClassNiceName: modelClass.getNiceName(),
				csrfToken: arserver.makeCsrf(req, res),
				reqbody,
				editHelperData,
			});
		});
		//---------------------------------------------------------------------------



		//---------------------------------------------------------------------------
		// view (get)
		const viewFilePathView = this.calcViewFile("view", modelClass);
		router.get("/view/:id", async (req, res, next) => {
			// get id from get param
			var jrResult = JrResult.makeNew();
			var id = req.params.id;

			// get obj AND perform acl test
			var obj = await modelClass.validateGetObjByIdDoAcl(jrResult, req, res, id, "view");
			if (jrResult.isError()) {
				return;
			}

			// any helper data
			const viewHelperData = await modelClass.calcCrudViewHelperData(req, res, id, obj);

			// render
			res.render(viewFilePathView, {
				headline: "View " + modelClass.getNiceName() + " #" + id,
				jrResult: JrResult.sessionRenderResult(req, res),
				crudClassNiceName: modelClass.getNiceName(),
				obj,
				viewHelperData,
			});
		});
		//---------------------------------------------------------------------------



		//---------------------------------------------------------------------------
		// delete (get)
		const viewFilePathDelete = this.calcViewFile("delete", modelClass);
		router.get("/delete/:id", async (req, res, next) => {
			var jrResult = JrResult.makeNew();
			// get id from get param
			var id = req.params.id;

			// get object AND perform ACL test
			var obj = await modelClass.validateGetObjByIdDoAcl(jrResult, req, res, id, "delete");
			if (jrResult.isError()) {
				return;
			}

			// render
			res.render(viewFilePathDelete, {
				headline: "Delete " + modelClass.getNiceName() + " #" + id,
				jrResult: JrResult.sessionRenderResult(req, res),
				crudClassNiceName: modelClass.getNiceName(),
				csrfToken: arserver.makeCsrf(req, res),
				obj,
			});
		});


		// delete (post submit)
		router.post("/delete/:ignoredid?", async (req, res, next) => {
			// user posts form for deleting submission
			var jrResult = JrResult.makeNew();
			// get id from post, ignore url param
			var id = req.body._id;

			// check required csrf token
			if (arserver.testCsrfThrowError(req, res, next) instanceof Error) {
				return;
			}
			// get object AND perform ACL test
			var obj = await modelClass.validateGetObjByIdDoAcl(jrResult, req, res, id, "delete");
			if (jrResult.isError()) {
				return;
			}

			// process delete
			obj.doDelete(jrResult);
			if (!jrResult.isError()) {
				// success, redirect
				jrResult.addToSession(req);
				res.redirect(baseCrudUrl);
				return;
			}

			// failed, present them with delete page like view?
			res.render(viewFilePathDelete, {
				headline: "Delete " + modelClass.getNiceName() + " #" + id,
				jrResult: JrResult.sessionRenderResult(req, res),
				crudClassNiceName: modelClass.getNiceName(),
				obj,
			});
		});
		//---------------------------------------------------------------------------



		//---------------------------------------------------------------------------
		// stats
		const viewFilePathStats = this.calcViewFile("stats", modelClass);
		router.get("/stats", async (req, res, next) => {
			// acl test
			if (!await arserver.aclRequireModelAccess(req, res, modelClass, "stats")) {
				return;
			}

			// render
			res.render(viewFilePathStats, {
				jrResult: JrResult.sessionRenderResult(req, res),
				crudClassNiceName: modelClass.getNiceName(),
				csrfToken: arserver.makeCsrf(req, res),
			});
		});
		//---------------------------------------------------------------------------


	}
	//---------------------------------------------------------------------------





	//---------------------------------------------------------------------------
	// helper to determine which view file to show
	// checks first for model specific view, then defaults to crud generic if the specific one not found
	static calcViewFile(subview, modelClass) {
		var fname = path.join("crud", subview);
		var fnameModelSpecific = path.join("crud", modelClass.getCollectionName() + "_" + subview);
		// try to find model specific version
		var fpath = path.join(arserver.getViewPath(), fnameModelSpecific + arserver.getViewExt());
		// jrLog.debug("ATTN: looking for " + fpath);
		if (fs.existsSync(fpath)) {
			return fnameModelSpecific;
		}
		return fname;
	}
	//---------------------------------------------------------------------------


}




// export the class as the sole export
module.exports = CrudAid;
