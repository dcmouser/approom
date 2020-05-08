/**
 * @module routes/api/roomdata
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
	router.all("/add", routerAdd);

	// return router
	return router;
}
//---------------------------------------------------------------------------















//---------------------------------------------------------------------------
async function routerLookup(req, res, next) {
	// consume access token
	var jrResult = JrResult.makeNew();
	var [userPassport, user] = await arserver.asyncRoutePassportAuthenticateFromTokenNonSessionGetPassportProfileAndUser(req, res, next, jrResult, "access");
	if (jrResult.isError()) {
		jrhExpress.sendResJsonJrResultTokenError(res, jrResult);
		return;
	}

	// the api roomdata list function is for retrieving a list of (matching) roomdata items
	// for a specific appid, and roomid, with optional filters (on data)
	jrResult.clear();
	var query = jrhExpress.parseReqGetJsonField(req, "query", jrResult);
	if (jrResult.isError()) {
		jrhExpress.sendResJsonJrResult(res, 400, jrResult);
		return;
	}

	// now we expect to find appid, and room shortcode; error if missing
	var appShortcode = jrhMisc.getNonNullValueFromObject(query, "appShortcode", jrResult, "application shortcode hosting the room");
	var roomShortcode = jrhMisc.getNonNullValueFromObject(query, "roomShortcode", jrResult, "room shortcode");
	if (jrResult.isError()) {
		jrhExpress.sendResJsonJrResult(res, 400, jrResult);
		return;
	}

	// look up app id
	var app = await AppModel.findOneByShortcode(appShortcode);
	if (!app) {
		jrResult.pushError("Specified application shortcode [" + appShortcode + "] could not be found.");
		jrhExpress.sendResJsonJrResult(res, 400, jrResult);
		return;
	}
	// look up the room
	var room = await RoomModel.findOneByAppIdAndRoomShortcode(app.id, roomShortcode);
	if (!room) {
		jrResult.pushError("Could not find specified room with shortcode [" + roomShortcode + "] in specified app [" + appShortcode + "].");
		jrhExpress.sendResJsonJrResult(res, 400, jrResult);
		return;
	}

	// now let's ask if user is actually ALLOWED to look at this room room
	const permission = appdef.DefAclActionView;
	const permissionObjType = RoomModel.getAclName();
	const permissionObjId = room.getIdAsM();
	const hasPermission = await user.aclHasPermission(permission, permissionObjType, permissionObjId);
	if (!hasPermission) {
		jrhExpress.sendResJsonAclErorr(res, permission, permissionObjType, permissionObjId);
		return;
	}

	// success
	var result = {
		room,
		// oringinalQuery: query,
	};
	jrhExpress.sendResJsonData(res, 200, "room", result);
}
//---------------------------------------------------------------------------






//---------------------------------------------------------------------------
async function routerAdd(req, res, next) {
	// consume access token
	var jrResult = JrResult.makeNew();
	var [userPassport, user] = await arserver.asyncRoutePassportAuthenticateFromTokenNonSessionGetPassportProfileAndUser(req, res, next, jrResult, "access");
	if (jrResult.isError()) {
		jrhExpress.sendResJsonJrResultTokenError(res, jrResult);
		return;
	}

	// get query
	jrResult.clear();
	var query = jrhExpress.parseReqGetJsonField(req, "query", jrResult);
	if (jrResult.isError()) {
		jrhExpress.sendResJsonJrResult(res, 400, jrResult);
		return;
	}

	// allow lookup by app shortcode instead of id
	if (!query.appId && query.appShortcode) {
		var queryApp = await AppModel.findOneByShortcode(query.appShortcode);
		query.appId = !queryApp ? null : queryApp.getIdAsString();
	}

	// now let's ask if user is actually ALLOWED to add a room to this app
	var appId = query.appId;
	const permission = appdef.DefAclActionAddData;
	const permissionObjType = AppModel.getAclName();
	const permissionObjId = appId;
	const hasPermission = await user.aclHasPermission(permission, permissionObjType, permissionObjId);
	if (!hasPermission) {
		jrhExpress.sendResJsonAclErorr(res, permission, permissionObjType, permissionObjId);
		return;
	}

	// create the item
	var room = RoomModel.createModel();
	// force some values
	room.creator = user.getIdAsM();

	// validate and save the fields passed
	var saveFields = RoomModel.getSaveFields("add");
	var preValidatedFields = [];
	// form fields that we dont complain about finding even though they arent for the form object
	var ignoreFields = [];

	var roomdoc = await RoomModel.validateSave(jrResult, {}, true, user, query, saveFields, preValidatedFields, ignoreFields, room, RoomModel.getShouldBeOwned());

	if (jrResult.isError()) {
		jrhExpress.sendResJsonJrResult(res, 400, jrResult);
		return;
	}


	// success
	var result = {
		room: roomdoc,
	};

	// provide it
	jrhExpress.sendResJsonData(res, 200, "room", result);
}
//---------------------------------------------------------------------------




module.exports = {
	setupRouter,
};
