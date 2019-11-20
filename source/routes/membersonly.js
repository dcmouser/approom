/**
 * @module routes/membersonly
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 5/1/19
 * @description
 * members only test route
 * @todo
 * remove this route eventually
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








//---------------------------------------------------------------------------
// module variables

// remember base url path of router
var routerBaseUrlPath;
//---------------------------------------------------------------------------







//---------------------------------------------------------------------------
function setupRouter(urlPath) {
	// create express router
	const router = express.Router();

	// save urlPath (in module locals)
	routerBaseUrlPath = urlPath;

	// setup routes
	router.get("/", routerGetIndex);

	// return router
	return router;
}
//---------------------------------------------------------------------------




//---------------------------------------------------------------------------
// router functions

async function routerGetIndex(req, res, next) {

	// require them to be logged in, or creates a redirect
	var user = await arserver.getLoggedInUser(req);
	if (!arserver.requireUserIsLoggedIn(req, res, user, "/membersonly")) {
		// all done
		return;
	}

	res.render("user/membersonly", {
		// jrResult: JrResult.getMergeSessionResultAndClear(req, res, jrResult, true),
		jrResult: JrResult.getMergeSessionResultAndClear(req, res),
		username: user.getUsername(),
		id: user.getIdAsString(),
	});
}
//---------------------------------------------------------------------------





module.exports = {
	setupRouter,
};
