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
	router.all("/list", routerList);
	router.all("/get", routerGet);
	router.all("/add", routerAdd);

	// return router
	return router;
}
//---------------------------------------------------------------------------















//---------------------------------------------------------------------------
async function routerList(req, res, next) {
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

	// allow lookup by app shortcode instead of id
	if (!query.roomId && query.roomShortcode) {
		const queryRoom = await RoomModel.mFindOneByShortcode(query.roomShortcode);
		query.roomId = !queryRoom ? null : queryRoom.getIdAsString();
	}

	// get roomdata items for room
	const roomId = jrhMisc.getNonNullValueFromObject(query, "roomId", jrResult, "room id");
	if (roomId && !jrhMongo.isValidMongooseObjectId(roomId)) {
		jrResult.pushFieldError("roomId", "Bad syntax for rooomId: " + roomId);
	}
	if (jrResult.isError()) {
		jrhExpress.sendResJsonJrResult(res, 400, jrResult);
		return;
	}

	// now let's ask if user is actually ALLOWED to look at the data in this room
	const permission = appdef.DefAclActionViewData;
	const permissionObjType = RoomModel.getAclName();
	const permissionObjId = roomId;
	const hasPermission = await user.aclHasPermission(permission, permissionObjType, permissionObjId);
	if (!hasPermission) {
		jrhExpress.sendResJsonAclErorr(res, permission, permissionObjType, permissionObjId);
		return;
	}

	// get all room data
	const RoomDataModel = jrequire("models/roomdata");
	const findArgs = {
		roomid: roomId,
	};
	const roomData = await RoomDataModel.mFindAll(findArgs);



	// success
	const result = {
		roomData,
		// oringinalQuery: query,
	};

	// provide it
	jrhExpress.sendResJsonData(res, 200, "roomdata", result);
}



async function routerGet(req, res, next) {
	jrhExpress.sendResJsonError(res, 400, "not implemented yet");
}


async function routerAdd(req, res, next) {
	// consume access token
	const jrResult = JrResult.makeNew();
	const [userPassport, user] = await arserver.asyncRoutePassportAuthenticateFromTokenNonSessionGetPassportProfileAndUser(req, res, next, jrResult, "access");
	if (jrResult.isError()) {
		jrhExpress.sendResJsonJrResultTokenError(res, jrResult);
		return;
	}

	// get query
	jrResult.clear();
	const query = jrhExpress.parseReqGetJsonField(req, "query", jrResult);
	if (jrResult.isError()) {
		jrhExpress.sendResJsonJrResult(res, 400, jrResult);
		return;
	}

	// allow lookup by app shortcode instead of id
	if (!query.roomId && query.roomShortcode) {
		const queryRoom = await RoomModel.mFindOneByShortcode(query.roomShortcode);
		query.roomId = !queryRoom ? null : queryRoom.getIdAsString();
	}

	// now let's ask if user is actually ALLOWED to look at the data in this room
	const roomId = query.roomId;
	const permission = appdef.DefAclActionAddData;
	const permissionObjType = RoomModel.getAclName();
	const permissionObjId = roomId;
	const hasPermission = await user.aclHasPermission(permission, permissionObjType, permissionObjId);
	if (!hasPermission) {
		jrhExpress.sendResJsonAclErorr(res, permission, permissionObjType, permissionObjId);
		return;
	}

	// create the item
	const RoomDataModel = jrequire("models/roomdata");
	const roomdata = RoomDataModel.createModel();
	// force some values
	roomdata.creator = user.getIdAsM();

	// validate and save the fields passed
	const saveFields = RoomDataModel.getSaveFields("add");
	const preValidatedFields = [];
	// form fields that we dont complain about finding even though they arent for the form object
	const ignoreFields = [];

	const roomdatadoc = await RoomDataModel.validateSave(jrResult, {}, true, user, query, saveFields, preValidatedFields, ignoreFields, roomdata, RoomModel.getShouldBeOwned());
	if (jrResult.isError()) {
		jrhExpress.sendResJsonJrResult(res, 400, jrResult);
		return;
	}

	// success
	const result = {
		roomData: roomdatadoc,
	};

	// provide it
	jrhExpress.sendResJsonData(res, 200, "roomdata", result);
}
//---------------------------------------------------------------------------









module.exports = {
	setupRouter,
};
