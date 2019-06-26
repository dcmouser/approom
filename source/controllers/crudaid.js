// approom
// crud aid class
// v1.0.0 on 6/5/19 by mouser@donationcoder.com
//
// Helps out with CRUD processing in routes

"use strict";

// modules
const fs = require("fs");
const path = require("path");

// modules
const hbs = require("hbs");

// helpers
const JrResult = require("../helpers/jrresult");
const jrLog = require("../helpers/jrlog");
const jrhmisc = require("../helpers/jrhmisc");

// models
const arserver = require("./server");



class CrudAid {

	static setupRouter(router, modelClass, baseCrudUrl) {
		// note that we use const variables with different names here so that we can precalc the view files ONCE
		// and use that calc'd path each time the request is made without having to recompute it


		//---------------------------------------------------------------------------
		// list
		const viewFilePathList = this.calcViewFile("list", modelClass);
		router.get("/", async (req, res, next) => {
			// get logged in user
			var user = await arserver.getLoggedInUser(req);

			// acl test
			if (!await arserver.aclRequireModelAccess(user, req, res, modelClass, "list")) {
				return;
			}

			var jrResult = JrResult.makeNew();

			// any helper data
			const helperData = await modelClass.calcCrudListHelperData(req, res, baseCrudUrl, jrResult);

			// render
			res.render(viewFilePathList, {
				headline: "List " + modelClass.getNiceName() + "s",
				jrResult: JrResult.sessionRenderResult(req, res, jrResult),
				crudClassNiceName: modelClass.getNiceName(),
				csrfToken: arserver.makeCsrf(req, res),
				helperData,
				baseCrudUrl,
			});
		});
		//---------------------------------------------------------------------------


		//---------------------------------------------------------------------------
		// add (get)
		const viewFilePathAdd = this.calcViewFile("addedit", modelClass);
		router.get("/add/:id?", async (req, res, next) => {
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
					if (!await arserver.aclRequireModelAccess(user, req, res, modelClass, "view", id)) {
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
			if (!await arserver.aclRequireModelAccess(user, req, res, modelClass, "add")) {
				return;
			}

			// any helper data
			const helperData = await modelClass.calcCrudAddEditHelperData(user);

			// generic main html for page (add form)
			var genericMainHtml;
			if (this.isViewPathGeneric(viewFilePathAdd)) {
				genericMainHtml = this.buildGenericMainHtml(modelClass, null, jrResult, "add", helperData);
			}

			// render
			res.render(viewFilePathAdd, {
				headline: "Add " + modelClass.getNiceName(),
				jrResult: JrResult.sessionRenderResult(req, res, jrResult),
				crudClassNiceName: modelClass.getNiceName(),
				csrfToken: arserver.makeCsrf(req, res),
				reqbody,
				helperData,
				genericMainHtml,
				baseCrudUrl,
				crudAdd: true,
			});
		});


		// add (post submit)
		router.post("/add/:ignoredid?", async (req, res, next) => {
			// user posts form for adding submission

			// get logged in user
			var user = await arserver.getLoggedInUser(req);

			var jrResult = JrResult.makeNew();
			var formTypeStr = "add";
			var flagRepresentAfterSuccess = false;

			// check required csrf token
			if (arserver.testCsrfThrowError(req, res, next) instanceof Error) {
				return;
			}
			// acl test
			if (!await arserver.aclRequireModelAccess(user, req, res, this, "add")) {
				return;
			}

			// process
			var reqbody = req.body;

			// load existing object by id if provided, throw errors if id missing (or provided to add formtype)
			// in the ADD case, this should just return a new blank object or complain if user specified an id
			var obj = await modelClass.validateAddEditFormIdMakeObj(jrResult, req, res, formTypeStr);

			if (!jrResult.isError()) {
				// now save add changes
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
			const helperData = await modelClass.calcCrudAddEditHelperData(user);

			// generic main html for page (add form)
			var genericMainHtml;
			if (this.isViewPathGeneric(viewFilePathAdd)) {
				genericMainHtml = this.buildGenericMainHtml(modelClass, null, jrResult, "add", helperData);
			}

			// re-present form for another add?
			res.render(viewFilePathAdd, {
				headline: "Add " + modelClass.getNiceName(),
				jrResult: JrResult.sessionRenderResult(req, res, jrResult),
				crudClassNiceName: modelClass.getNiceName(),
				csrfToken: arserver.makeCsrf(req, res),
				reqbody,
				helperData,
				genericMainHtml,
				baseCrudUrl,
				crudAdd: true,
			});
		});
		//---------------------------------------------------------------------------


		//---------------------------------------------------------------------------
		// edit (get)
		const viewFilePathEdit = this.calcViewFile("addedit", modelClass);
		router.get("/edit/:id", async (req, res, next) => {
			// get logged in user
			var user = await arserver.getLoggedInUser(req);

			var jrResult = JrResult.makeNew();

			// get id from get param
			var id = req.params.id;

			// validate and get id, this will also do an ACL test
			var obj = await modelClass.validateGetObjByIdDoAcl(user, jrResult, req, res, id, "edit");
			if (jrResult.isError()) {
				return;
			}

			// put object fields in body, for view form
			var reqbody = obj.modelObjPropertyCopy(true);

			// any helper data
			const helperData = await modelClass.calcCrudAddEditHelperData(user, id);

			// generic main html for page (edit form)
			var genericMainHtml;
			if (this.isViewPathGeneric(viewFilePathEdit)) {
				genericMainHtml = this.buildGenericMainHtml(modelClass, reqbody, jrResult, "edit", helperData);
			}

			// render
			res.render(viewFilePathEdit, {
				headline: "Edit " + modelClass.getNiceName() + " #" + id,
				jrResult: JrResult.sessionRenderResult(req, res, jrResult),
				crudClassNiceName: modelClass.getNiceName(),
				csrfToken: arserver.makeCsrf(req, res),
				reqbody,
				helperData,
				genericMainHtml,
				baseCrudUrl,
			});
		});


		// edit (post submit)
		router.post("/edit/:ignoredid?", async (req, res, next) => {
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
				return;
			}
			// acl test
			if (!await arserver.aclRequireModelAccess(user, req, res, this, "edit", id)) {
				return;
			}

			// process
			var reqbody = req.body;

			// load existing object by id if provided, throw errors if id missing (or provided to add formtype)
			var obj = await modelClass.validateAddEditFormIdMakeObj(jrResult, req, res, formTypeStr);

			if (!jrResult.isError()) {
				// now save edit changes
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
			const helperData = await modelClass.calcCrudAddEditHelperData(user, id);

			// generic main html for page (edit form)
			var genericMainHtml;
			if (this.isViewPathGeneric(viewFilePathEdit)) {
				genericMainHtml = this.buildGenericMainHtml(modelClass, reqbody, jrResult, "edit", helperData);
			}

			// render -- just like original edit
			res.render(viewFilePathEdit, {
				headline: "Edit " + modelClass.getNiceName() + " #" + id,
				jrResult: JrResult.sessionRenderResult(req, res, jrResult),
				crudClassNiceName: modelClass.getNiceName(),
				csrfToken: arserver.makeCsrf(req, res),
				reqbody,
				helperData,
				genericMainHtml,
				baseCrudUrl,
			});
		});
		//---------------------------------------------------------------------------



		//---------------------------------------------------------------------------
		// view (get)
		const viewFilePathView = this.calcViewFile("viewdelete", modelClass);
		router.get("/view/:id", async (req, res, next) => {
			// get logged in user
			var user = await arserver.getLoggedInUser(req);

			// get id from get param
			var jrResult = JrResult.makeNew();
			var id = req.params.id;

			// get obj AND perform acl test
			var obj = await modelClass.validateGetObjByIdDoAcl(user, jrResult, req, res, id, "view");
			if (jrResult.isError()) {
				return;
			}

			// any helper data
			const helperData = await modelClass.calcCrudViewDeleteHelperData(req, res, id, obj);

			// generic main html for page (view form)
			var genericMainHtml;
			if (this.isViewPathGeneric(viewFilePathView)) {
				genericMainHtml = this.buildGenericMainHtml(modelClass, obj, jrResult, "view", helperData);
			}

			// render
			res.render(viewFilePathView, {
				headline: "View " + modelClass.getNiceName() + " #" + id,
				jrResult: JrResult.sessionRenderResult(req, res, jrResult),
				crudClassNiceName: modelClass.getNiceName(),
				obj,
				helperData,
				genericMainHtml,
				crudDelete: false,
				baseCrudUrl,
			});
		});
		//---------------------------------------------------------------------------



		//---------------------------------------------------------------------------
		// delete (get)
		const viewFilePathDelete = this.calcViewFile("viewdelete", modelClass);
		router.get("/delete/:id", async (req, res, next) => {
			// get logged in user
			var user = await arserver.getLoggedInUser(req);

			var jrResult = JrResult.makeNew();
			// get id from get param
			var id = req.params.id;

			// get object AND perform ACL test
			var obj = await modelClass.validateGetObjByIdDoAcl(user, jrResult, req, res, id, "delete");
			if (jrResult.isError()) {
				return;
			}

			// any helper data
			const helperData = await modelClass.calcCrudViewDeleteHelperData(req, res, id, obj);

			// generic main html for page (delete form)
			var genericMainHtml;
			if (this.isViewPathGeneric(viewFilePathDelete)) {
				genericMainHtml = this.buildGenericMainHtml(modelClass, obj, jrResult, "delete", helperData);
			}

			// render
			res.render(viewFilePathDelete, {
				headline: "Delete " + modelClass.getNiceName() + " #" + id,
				jrResult: JrResult.sessionRenderResult(req, res, jrResult),
				crudClassNiceName: modelClass.getNiceName(),
				csrfToken: arserver.makeCsrf(req, res),
				obj,
				helperData,
				genericMainHtml,
				crudDelete: true,
				baseCrudUrl,
			});
		});


		// delete (post submit)
		router.post("/delete/:ignoredid?", async (req, res, next) => {
			// get logged in user
			var user = await arserver.getLoggedInUser(req);

			var jrResult = JrResult.makeNew();
			// get id from post, ignore url param
			var id = req.body._id;

			// check required csrf token
			if (arserver.testCsrfThrowError(req, res, next) instanceof Error) {
				return;
			}
			// get object AND perform ACL test
			var obj = await modelClass.validateGetObjByIdDoAcl(user, jrResult, req, res, id, "delete");
			if (jrResult.isError()) {
				return;
			}

			// object id for display.
			var objid = obj.getIdAsString();

			// process delete
			obj.doDelete(jrResult);

			// on success redirect to listview
			if (!jrResult.isError()) {
				// success
				jrResult.pushSuccess(modelClass.getNiceName() + " #" + objid + " has been deleted.");
				// redirect
				jrResult.addToSession(req);
				res.redirect(baseCrudUrl);
				return;
			}

			// any helper data
			const helperData = await modelClass.calcCrudViewDeleteHelperData(req, res, id, obj);

			// generic main html for page (delete form)
			var genericMainHtml;
			if (this.isViewPathGeneric(viewFilePathDelete)) {
				genericMainHtml = this.buildGenericMainHtml(modelClass, obj, jrResult, "delete", helperData);
			}

			// failed, present them with delete page like view?
			res.render(viewFilePathDelete, {
				headline: "Delete " + modelClass.getNiceName() + " #" + id,
				jrResult: JrResult.sessionRenderResult(req, res, jrResult),
				crudClassNiceName: modelClass.getNiceName(),
				obj,
				genericMainHtml,
				crudDelete: true,
				baseCrudUrl,
			});
		});
		//---------------------------------------------------------------------------



		//---------------------------------------------------------------------------
		// stats
		const viewFilePathStats = this.calcViewFile("stats", modelClass);
		router.get("/stats", async (req, res, next) => {
			// get logged in user
			var user = await arserver.getLoggedInUser(req);

			// acl test
			if (!await arserver.aclRequireModelAccess(user, req, res, modelClass, "stats")) {
				return;
			}

			// any helper data
			const helperData = await modelClass.calcCrudStatsHelperData(req, res);

			// generic main html for page (delete form)
			var genericMainHtml;
			if (this.isViewPathGeneric(viewFilePathStats)) {
				genericMainHtml = this.buildGenericMainHtml(modelClass, null, null, "stats", helperData);
			}

			// render
			res.render(viewFilePathStats, {
				jrResult: JrResult.sessionRenderResult(req, res),
				crudClassNiceName: modelClass.getNiceName(),
				csrfToken: arserver.makeCsrf(req, res),
				helperData,
				genericMainHtml,
				baseCrudUrl,
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
		var fnameModelGeneric = path.join("crud", "generic_" + subview);
		// try to find model specific version
		var fpath = path.join(arserver.getViewPath(), fnameModelSpecific + arserver.getViewExt());
		// jrLog.debug("ATTN: looking for " + fpath);
		if (fs.existsSync(fpath)) {
			return fnameModelSpecific;
		}
		return fnameModelGeneric;
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	static isViewPathGeneric(viewPath) {
		return (viewPath.indexOf("generic_") !== -1);
	}

	static buildGenericMainHtml(modelClass, obj, jrResult, crudSubType, helperData) {
		var rethtml;

		if (crudSubType === "add" || crudSubType === "edit") {
			// build form html for adding or editing
			rethtml = this.buildGenericMainHtmlAddEdit(modelClass, obj, helperData, jrResult);
		} else if (crudSubType === "delete" || crudSubType === "view") {
			// build form html for viewing
			rethtml = this.buildGenericMainHtmlViewDelete(modelClass, obj, helperData, jrResult);
		} else if (crudSubType === "stats") {
			// show stats
			rethtml = this.buildGenericMainHtmlStats(modelClass, obj, helperData, jrResult);
		} else {
			throw ("Illegal subtype (" + crudSubType + ") in buildGenericMainHtml.");
		}

		// we need to wrap return as hbs.SafeString in order to include raw html
		return new hbs.SafeString(rethtml);
	}

	static buildGenericMainHtmlAddEdit(modelClass, obj, helperData, jrResult) {
		var rethtml = "";

		// start table
		rethtml += `
		<div class="table-responsive">
		<table class="table table-striped w-auto table-bordered">
		`;

		// schema for obj
		var modelSchemaExtra = modelClass.getSchemaDefinitionExtra();
		var schemaKeys = Object.keys(modelSchemaExtra);
		var val, valHtml, label, valfunc, hideList, choices;
		var err;
		schemaKeys.forEach((fieldName) => {
			hideList = modelClass.getSchemaExtraFieldVal(fieldName, "hide", undefined);
			if (hideList && hideList.indexOf("edit") !== -1) {
				return;
			}

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
			valfunc = modelClass.getSchemaExtraFieldValueFunction(fieldName, "edit");
			if (valfunc) {
				// ok we have a custom function to call to get html to show for value
				valHtml = valfunc(obj, helperData);
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
				if (choices) {
					valHtml = this.buildChoiceHtmlForAddEdit(fieldName, choices, val);
				} else {
					// default is simple text input
					valHtml = `<input type="text" name="${fieldName}" value="${val}" size="80"/>`;
				}
			}

			rethtml += `
			<tr>
        		<td><strong>${label}</strong></td>
   	   			<td>${valHtml}<span class="jrErrorInline">${err}</span> </td>
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




	static buildGenericMainHtmlViewDelete(modelClass, obj, helperData, jrResult) {
		var rethtml = "";

		// start table
		rethtml += `
		<div class="table-responsive">
		<table class="table table-striped w-auto table-bordered">
		`;

		// schema for obj
		var modelSchemaExtra = modelClass.getSchemaDefinitionExtra();
		var schemaKeys = Object.keys(modelSchemaExtra);
		var val, valHtml, label, valfunc, hideList, choices;
		var crudLink;
		schemaKeys.forEach((fieldName) => {
			hideList = modelClass.getSchemaExtraFieldVal(fieldName, "hide", undefined);
			if (hideList && hideList.indexOf("view") !== -1) {
				return;
			}

			// label
			label = modelClass.getSchemaExtraFieldVal(fieldName, "label", fieldName);

			// now value
			valHtml = undefined;
			valfunc = modelClass.getSchemaExtraFieldValueFunction(fieldName, "view");
			if (valfunc) {
				// ok we have a custom function to call to get html to show for value
				valHtml = valfunc(obj, helperData);
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
						valHtml = this.buildChoiceHtmlForViewDelete(choices, val);
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

	static buildGenericMainHtmlStats(modelClass, obj, helperData, jrResult) {
		var rethtml;
		rethtml = "<div>stats</div>";
		return rethtml;
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	static buildChoiceHtmlForAddEdit(fieldName, choices, val) {
		var rethtml = jrhmisc.jrHtmlFormOptionListSelect(fieldName, choices, val);
		return rethtml;
	}

	static buildChoiceHtmlForViewDelete(choices, val) {
		var rethtml = jrhmisc.jrHtmlNiceOptionFromList(choices, val, "[NOT SET]");
		return rethtml;
	}
	//---------------------------------------------------------------------------


}




// export the class as the sole export
module.exports = CrudAid;
