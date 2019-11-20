/**
 * @module routes/analytics
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 10/31/19
 * @description
 * Provides analytics/stats for the site
 */

"use strict";


// modules
const express = require("express");

// helpers
const JrResult = require("../helpers/jrresult");


// requirement service locator
const jrequire = require("../helpers/jrequire");

// controllers
const adminAid = jrequire("adminaid");
const arserver = jrequire("arserver");


// express router
const router = express.Router();



//---------------------------------------------------------------------------
// module variables

// remember base url path of router
var routerBaseUrlPath;
//---------------------------------------------------------------------------




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
