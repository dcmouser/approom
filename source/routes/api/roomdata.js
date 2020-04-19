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
const aclAid = jrequire("aclaid");

// helpers
const JrResult = require("../../helpers/jrresult");
const jrhExpress = require("../../helpers/jrh_express");
const jrhMisc = require("../../helpers/jrh_misc");
const jrdebug = require("../../helpers/jrdebug");
const jrhMongo = require("../../helpers/jrh_mongo");

// models
const RoomModel = jrequire("models/room");









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
	router.all("/list", routerList);
	router.all("/download", routerDownload);
	router.all("/upload", routerUpload);

	// return router
	return router;
}
//---------------------------------------------------------------------------















//---------------------------------------------------------------------------
async function routerList(req, res, next) {
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

	// get roomdata items for room
	var roomId = jrhMisc.getNonNullValueFromObject(query, "roomId", jrResult, "room id");
	if (roomId && !jrhMongo.isValidMongooseObjectId(roomId)) {
		jrResult.pushFieldError("roomId", "Bad syntax for rooomId");
	}
	if (jrResult.isError()) {
		jrhExpress.sendResJsonJrResult(res, 400, jrResult);
		return;
	}

	// now let's ask if user is actually ALLOWED to look at the data in this room
	const permission = "viewdata";
	const permissionObjType = RoomModel.getAclName();
	const permissionObjId = roomId;
	const hasPermission = await user.aclHasPermission(permission, permissionObjType, permissionObjId);
	if (!hasPermission) {
		jrhExpress.sendResJsonAclErorr(res, permission, permissionObjType, permissionObjId);
		return;
	}

	// get all room data
	const RoomDataModel = jrequire("models/roomdata");
	var findArgs = {
		roomid: roomId,
	};
	var roomData = await RoomDataModel.findAllExec(findArgs);



	// success
	var result = {
		roomData,
		// oringinalQuery: query,
	};

	// provide it
	jrhExpress.sendResJsonData(res, 200, "roomdata", result);
}



async function routerDownload(req, res, next) {
}


async function routerUpload(req, res, next) {
	// ATTN: we would need to validate and check it first, but for now test we simply add it as is

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


	// now let's ask if user is actually ALLOWED to look at the data in this room
	var roomid = query.roomId;
	const permission = "add";
	const permissionObjType = RoomModel.getAclName();
	const permissionObjId = roomid;
	const hasPermission = await user.aclHasPermission(permission, permissionObjType, permissionObjId);
	if (!hasPermission) {
		jrhExpress.sendResJsonAclErorr(res, permission, permissionObjType, permissionObjId);
		return;
	}

	// create the item
	const RoomDataModel = jrequire("models/roomdata");
	var roomdata = RoomDataModel.createModel();
	// force some values
	roomdata.creator = user.getId();

	// validate and save the fields passed
	var saveFields = RoomDataModel.getSaveFields("add");
	var preValidatedFields = [];
	// form fields that we dont complain about finding even though they arent for the form object
	var ignoreFields = [];

	var roomdatadoc = await RoomDataModel.validateAndSave(jrResult, {}, true, user, query, saveFields, preValidatedFields, ignoreFields, roomdata);
	if (jrResult.isError()) {
		jrhExpress.sendResJsonJrResult(res, 400, jrResult);
		return;
	}

	// success
	var result = {
		roomdata: roomdatadoc,
	};

	// provide it
	jrhExpress.sendResJsonData(res, 200, "roomdata", result);
}
//---------------------------------------------------------------------------









module.exports = {
	setupRouter,
};
