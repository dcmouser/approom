/**
 * @module routes/room
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 5/1/19
 * @description
 * room routes for working with the room objects
 */

"use strict";


// modules
const express = require("express");

// helpers
const JrResult = require("../helpers/jrresult");

// requirement service locator
const jrequire = require("../helpers/jrequire");

// controllers
const arserver = jrequire("arserver");
const aclAid = jrequire("aclaid");

// models
const RoomModel = jrequire("models/room");








//---------------------------------------------------------------------------
function setupRouter(urlPath) {
	// create express router
	const router = express.Router();

	// setup route
	router.get("/", routerGetIndex);

	router.get("/invite", routerGetInvite);
	router.post("/invite", routerPostInvite);

	// return router
	return router;
}
//---------------------------------------------------------------------------



//---------------------------------------------------------------------------
// router functions

async function routerGetIndex(req, res, next) {
	res.render("room/index", {
		jrResult: JrResult.getMergeSessionResultAndClear(req, res),
		title: "Room Route",
	});
}
//---------------------------------------------------------------------------







//---------------------------------------------------------------------------
async function routerGetInvite(req, res, next) {
	// require them to be logged in, or creates a redirect
	var user = await arserver.getLoggedInUser(req);
	if (!arserver.requireUserIsLoggedIn(req, res, user)) {
		// all done
		return;
	}

	// present form
	presentFormInvite(req, res, null);
}



async function routerPostInvite(req, res, next) {
	// require them to be logged in, or creates a redirect
	var user = await arserver.getLoggedInUser(req);
	if (!arserver.requireUserIsLoggedIn(req, res, user)) {
		// all done
		return;
	}

	// test csrf token
	var jrResult = arserver.testCsrfReturnJrResult(req, res);

	if (!jrResult.isError()) {
		// variables from form
		var roleChange = {
			operation: "add",
			role: req.body.role,
			object: {
				model: RoomModel,
				id: req.body.roomId,
			},
			petitioner: {
				user,
			},
			recipient: {
				usernameEmailId: req.body.usernameEmailId,
			},
		};

		// run the acl change
		jrResult = await aclAid.performRoleChange(roleChange);
	}

	// error in form, re-present the form
	presentFormInvite(req, res, jrResult);
}
//---------------------------------------------------------------------------



//---------------------------------------------------------------------------
function presentFormInvite(req, res, jrResult) {
	res.render("room/inviteform", {
		jrResult: JrResult.getMergeSessionResultAndClear(req, res, jrResult),
		title: "Invite to Room",
		csrfToken: arserver.makeCsrf(req, res),
		reqBody: req.body,
	});
}
//---------------------------------------------------------------------------





module.exports = {
	setupRouter,
};
