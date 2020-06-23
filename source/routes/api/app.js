/**
 * @module routes/api/app
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 4/16/20
 * @description
 * ##### Overview
 * This file handles all requests related to the programmatic API interface for accessing the system.
 * These routes are all intended to be called programmatically by other code, and so should all return json replies
*/

"use strict";


// modules
const express = require("express");


// requirement service locator
const jrequire = require("../../helpers/jrequire");

// controllers
const arserver = jrequire("arserver");

// helpers
const JrContext = require("../../helpers/jrcontext");
const JrResult = require("../../helpers/jrresult");
const jrhExpress = require("../../helpers/jrh_express");
const jrhMisc = require("../../helpers/jrh_misc");
const jrdebug = require("../../helpers/jrdebug");

// models
const RoomModel = jrequire("models/room");
const AppModel = jrequire("models/app");

// constants
const appdef = jrequire("appdef");







//---------------------------------------------------------------------------
/**
 * Add the API routes
 *
 * @param {string} urlPath - the base path of these relative paths
 * @returns router object
 */
function setupRouter(urlPath) {
	// create express router
	const router = express.Router();

	// setup routes
	router.all("/lookup", routerLookup);

	// return router
	return router;
}
//---------------------------------------------------------------------------















//---------------------------------------------------------------------------
async function routerLookup(req, res, next) {
	const jrContext = JrContext.makeNew(req, res, next);

	// new
	const user = await arserver.lookupLoggedInUser(jrContext);
	if (!user) {
		jrContext.pushError("Failed to authenticate user for request; missing access token?");
	}
	if (jrContext.isError()) {
		jrhExpress.sendJsonErrorAuthToken(jrContext);
		return;
	}


	// the api roomdata list function is for retrieving a list of (matching) roomdata items
	// for a specific appid, and roomid, with optional filters (on data)
	const query = jrhExpress.parseReqGetJsonField(jrContext, "query");
	if (jrContext.isError()) {
		jrhExpress.sendJsonResult(jrContext, 400);
		return;
	}

	// now we expect to find appid, and room shortcode; error if missing
	const appShortcode = jrhMisc.getNonNullValueFromObject(jrContext, query, "appShortcode", "application shortcode");
	if (jrContext.isError()) {
		jrhExpress.sendJsonResult(jrContext, 400);
		return;
	}

	// look up app id
	const app = await AppModel.mFindOneByShortcode(appShortcode);
	if (!app) {
		jrContext.pushError("Specified application shortcode [" + appShortcode + "] could not be found.");
		jrhExpress.sendJsonResult(jrContext, 400);
		return;
	}

	// now let's ask if user is actually ALLOWED to look at this app
	const permission = appdef.DefAclActionView;
	const permissionObjType = AppModel.getAclName();
	const permissionObjId = app.getIdAsString();
	const hasPermission = await user.aclHasPermission(jrContext, permission, permissionObjType, permissionObjId);
	if (!hasPermission) {
		jrhExpress.sendJsonErorrAcl(jrContext, permission, permissionObjType, permissionObjId);
		return;
	}

	// success
	const returnData = {
		app,
		// oringinalQuery: query,
	};
	jrhExpress.sendJsonDataSuccess(jrContext, "app", returnData);
}
//---------------------------------------------------------------------------






module.exports = {
	setupRouter,
};
