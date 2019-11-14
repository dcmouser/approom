// approom
// membersonly test route
// v1.0.0 on 5/28/19 by mouser@donationcoder.com
//

"use strict";


// modules
const express = require("express");

// helpers
const JrResult = require("../helpers/jrresult");
const jrlog = require("../helpers/jrlog");

// models
const arserver = require("../controllers/server");

// express router
const router = express.Router();


// module variable to remember base url path of router
var routerBaseUrlPath;


//---------------------------------------------------------------------------
function setupRouter(urlPath) {
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
