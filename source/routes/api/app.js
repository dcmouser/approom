/**
 * @module routes/api/app
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 4/16/20
 * @description
 * ##### Overview
 * This file handles all requests related to the programmatic API interface for accessing the system.
 * @todo These routes are all intended to be called programmatically by other code, and so should all return json replies, but currently some return standard web pages for testing.
*/

"use strict";


// modules
const express = require("express");


// requirement service locator
const jrequire = require("../../helpers/jrequire");

// controllers
const arserver = jrequire("arserver");

// helpers
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
	// consume access token
	const jrResult = JrResult.makeNew();
	const [userPassport, user] = await arserver.asyncRoutePassportAuthenticateFromTokenNonSessionGetPassportProfileAndUser(req, res, next, jrResult, "access");
	if (jrResult.isError()) {
		jrhExpress.sendResJsonJrResultTokenError(res, jrResult);
		return;
	}

	// the api roomdata list function is for retrieving a list of (matching) roomdata items
	// for a specific appid, and roomid, with optional filters (on data)
	jrResult.clear();
	const query = jrhExpress.parseReqGetJsonField(req, "query", jrResult);
	if (jrResult.isError()) {
		jrhExpress.sendResJsonJrResult(res, 400, jrResult);
		return;
	}

	// now we expect to find appid, and room shortcode; error if missing
	const appShortcode = jrhMisc.getNonNullValueFromObject(query, "appShortcode", jrResult, "application shortcode");
	if (jrResult.isError()) {
		jrhExpress.sendResJsonJrResult(res, 400, jrResult);
		return;
	}

	// look up app id
	const app = await AppModel.mFindOneByShortcode(appShortcode);
	if (!app) {
		jrResult.pushError("Specified application shortcode [" + appShortcode + "] could not be found.");
		jrhExpress.sendResJsonJrResult(res, 400, jrResult);
		return;
	}

	// now let's ask if user is actually ALLOWED to look at this app
	const permission = appdef.DefAclActionView;
	const permissionObjType = AppModel.getAclName();
	const permissionObjId = app.getIdAsString();
	const hasPermission = await user.aclHasPermission(permission, permissionObjType, permissionObjId);
	if (!hasPermission) {
		jrhExpress.sendResJsonAclErorr(res, permission, permissionObjType, permissionObjId);
		return;
	}

	// success
	const result = {
		app,
		// oringinalQuery: query,
	};
	jrhExpress.sendResJsonData(res, 200, "app", result);
}
//---------------------------------------------------------------------------






module.exports = {
	setupRouter,
};
