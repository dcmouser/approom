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
const JrContext = require("../helpers/jrcontext");
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
	const jrContext = JrContext.makeNew(req, res, next);
	res.render("room/index", {
		jrResult: jrContext.mergeSessionMessages(),
		title: "Room Route",
	});
}
//---------------------------------------------------------------------------







//---------------------------------------------------------------------------
async function routerGetInvite(req, res, next) {
	const jrContext = JrContext.makeNew(req, res, next);

	// require them to be logged in, or creates a redirect
	const user = await arserver.lookupLoggedInUser(jrContext);
	if (!arserver.requireUserIsLoggedInRenderErrorPageOrRedirect(jrContext, user)) {
		// all done
		return;
	}

	// present form
	presentFormInvite(req, res, null);
}



async function routerPostInvite(req, res, next) {
	const jrContext = JrContext.makeNew(req, res, next);

	// require them to be logged in, or creates a redirect
	const user = await arserver.lookupLoggedInUser(jrContext);
	if (!arserver.requireUserIsLoggedInRenderErrorPageOrRedirect(jrContext, user)) {
		// all done
		return;
	}

	// test csrf token
	arserver.testCsrf(jrContext);

	if (!jrContext.isError()) {
		// variables from form
		const roleChange = {
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
		await aclAid.performRoleChange(jrContext, roleChange);
	}

	// error in form, re-present the form
	presentFormInvite(jrContext);
}
//---------------------------------------------------------------------------



//---------------------------------------------------------------------------
function presentFormInvite(jrContext) {
	jrContext.res.render("room/inviteform", {
		jrResult: jrContext.mergeSessionMessages(),
		title: "Invite to Room",
		csrfToken: arserver.makeCsrf(jrContext),
		reqBody: jrContext.req.body,
	});
}
//---------------------------------------------------------------------------





module.exports = {
	setupRouter,
};
