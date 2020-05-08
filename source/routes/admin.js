/**
 * @module routes/admin
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 6/4/19
 * @description
 * Provides administrative routes
 */

"use strict";


// modules
const express = require("express");


// requirement service locator
const jrequire = require("../helpers/jrequire");

// helpers
const JrResult = require("../helpers/jrresult");
const jrdebug = require("../helpers/jrdebug");

// controllers
const adminAid = jrequire("adminaid");
const arserver = jrequire("arserver");

// constants
const appdef = jrequire("appdef");













//---------------------------------------------------------------------------
function setupRouter(urlPath) {
	// create express router
	const router = express.Router();

	// setup routes
	router.get("/", routerGetIndex);

	/*
	router.get("/testing", routerGetTesting);
	router.get("/testing/makeappsrooms", routerGetTestingMakeappsrooms);
	router.post("/testing/makeappsrooms", routerPostTestingMakeappsrooms);
	*/

	// return router
	return router;
}
//---------------------------------------------------------------------------




//---------------------------------------------------------------------------
// router functions


async function routerGetIndex(req, res, next) {
	if (!await arserver.aclRequireLoggedInSitePermission(appdef.DefAclActionAdminister, req, res)) {
		// all done
		return;
	}

	res.render("admin/index", {
		jrResult: JrResult.getMergeSessionResultAndClear(req, res),
	});
}
//---------------------------------------------------------------------------





module.exports = {
	setupRouter,
};
