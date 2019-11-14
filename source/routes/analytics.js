// approom
// analytics route
// v1.0.0 on 10/31/19 by mouser@donationcoder.com
//
// route for admins to find info about the site

"use strict";

// modules
const express = require("express");

// helpers
const JrResult = require("../helpers/jrresult");
const jrlog = require("../helpers/jrlog");
const AdminAid = require("../controllers/adminaid");

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
	if (!await arserver.requireLoggedInSitePermission("admin", req, res, routerBaseUrlPath)) {
		// all done
		return;
	}

	res.render("analytics/index", {
		jrResult: JrResult.getMergeSessionResultAndClear(req, res),
	});
}
//---------------------------------------------------------------------------



module.exports = {
	setupRouter,
};
