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
	router.all("/add", routerAdd);

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
	const appShortcode = jrhMisc.getNonNullValueFromObject(jrContext, query, "appShortcode", "application shortcode hosting the room");
	const roomShortcode = jrhMisc.getNonNullValueFromObject(jrContext, query, "roomShortcode", "room shortcode");
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
	// look up the room
	const room = await RoomModel.mFindOneByAppIdAndRoomShortcode(app.id, roomShortcode);
	if (!room) {
		jrContext.pushError("Could not find specified room with shortcode [" + roomShortcode + "] in specified app [" + appShortcode + "].");
		jrhExpress.sendJsonResult(jrContext, 400);
		return;
	}

	// now let's ask if user is actually ALLOWED to look at this room room
	const permission = appdef.DefAclActionView;
	const permissionObjType = RoomModel.getAclName();
	const permissionObjId = room.getIdAsM();
	const hasPermission = await user.aclHasPermission(jrContext, permission, permissionObjType, permissionObjId);
	if (!hasPermission) {
		jrhExpress.sendJsonErorrAcl(jrContext, permission, permissionObjType, permissionObjId);
		return;
	}

	// success
	const returnData = {
		room,
		// oringinalQuery: query,
	};
	jrhExpress.sendJsonDataSuccess(jrContext, "room", returnData);
}
//---------------------------------------------------------------------------






//---------------------------------------------------------------------------
async function routerAdd(req, res, next) {
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

	// get query
	const query = jrhExpress.parseReqGetJsonField(jrContext, "query");
	if (jrContext.isError()) {
		jrhExpress.sendJsonResult(jrContext, 400);
		return;
	}

	// allow lookup by app shortcode instead of id
	if (!query.appId && query.appShortcode) {
		const queryApp = await AppModel.mFindOneByShortcode(query.appShortcode);
		query.appId = !queryApp ? null : queryApp.getIdAsString();
	}

	// now let's ask if user is actually ALLOWED to add a room to this app
	const appId = query.appId;
	const permission = appdef.DefAclActionAddData;
	const permissionObjType = AppModel.getAclName();
	const permissionObjId = appId;
	const hasPermission = await user.aclHasPermission(jrContext, permission, permissionObjType, permissionObjId);
	if (!hasPermission) {
		jrhExpress.sendJsonErorrAcl(jrContext, permission, permissionObjType, permissionObjId);
		return;
	}

	// create the item
	const room = RoomModel.createModel();
	// force some values
	room.creator = user.getIdAsM();

	// validate and save the fields passed
	const saveFields = RoomModel.getSaveFields("add");
	const preValidatedFields = [];
	// form fields that we dont complain about finding even though they arent for the form object
	const ignoreFields = [];

	const roomdoc = await RoomModel.validateSave(jrContext, {}, true, user, query, saveFields, preValidatedFields, ignoreFields, room, RoomModel.getShouldBeOwned());

	if (jrContext.isError()) {
		jrhExpress.sendJsonResult(jrContext, 400);
		return;
	}


	// success
	const returnData = {
		room: roomdoc,
	};

	// provide it
	jrhExpress.sendJsonDataSuccess(jrContext, "room", returnData);
}
//---------------------------------------------------------------------------




module.exports = {
	setupRouter,
};
