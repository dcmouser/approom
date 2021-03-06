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


// requirement service locator
const jrequire = require("../helpers/jrequire");

// helpers
const JrContext = require("../helpers/jrcontext");
const JrResult = require("../helpers/jrresult");

// controllers
const arserver = jrequire("arserver");













//---------------------------------------------------------------------------
function setupRouter(urlPath) {
	// create express router
	const router = express.Router();

	// setup routes
	router.get("/", routerGetIndex);

	// return router
	return router;
}
//---------------------------------------------------------------------------




//---------------------------------------------------------------------------
// router functions


async function routerGetIndex(req, res, next) {
	const jrContext = JrContext.makeNew(req, res, next);
	if (!await arserver.aclRequireLoggedInSitePermissionRenderErrorPageOrRedirect(jrContext, "analytics")) {
		// all done
		return;
	}

	res.render("analytics/index", {
		jrResult: jrContext.mergeSessionMessages(),
	});
}
//---------------------------------------------------------------------------



module.exports = {
	setupRouter,
};
