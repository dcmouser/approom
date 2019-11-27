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















//---------------------------------------------------------------------------
function setupRouter(urlPath) {
	// create express router
	const router = express.Router();

	// setup routes
	router.get("/", routerGetIndex);
	router.get("/testing", routerGetTesting);
	router.get("/testing/makeappsrooms", routerGetTestingMakeappsrooms);
	router.post("/testing/makeappsrooms", routerPostTestingMakeappsrooms);

	// return router
	return router;
}
//---------------------------------------------------------------------------




//---------------------------------------------------------------------------
// router functions


async function routerGetIndex(req, res, next) {
	if (!await arserver.aclRequireLoggedInSitePermission("admin", req, res)) {
		// all done
		return;
	}

	res.render("admin/index", {
		jrResult: JrResult.getMergeSessionResultAndClear(req, res),
	});
}


async function routerGetTesting(req, res, next) {
	if (!await arserver.aclRequireLoggedInSitePermission("admin", req, res)) {
		// all done
		return;
	}

	res.render("admin/testing", {
		jrResult: JrResult.getMergeSessionResultAndClear(req, res),
	});
}


async function routerGetTestingMakeappsrooms(req, res, next) {
	if (!await arserver.aclRequireLoggedInSitePermission("admin", req, res)) {
		// all done
		return;
	}

	res.render("admin/confirmpage", {
		jrResult: JrResult.getMergeSessionResultAndClear(req, res),
		csrfToken: arserver.makeCsrf(req, res),
		headline: "Generate some test Apps and Rooms",
		message: "This operation will bulk create a bunch of apps and rooms.  Note it will fail if run twice, due to clashing shortcodes.",
		formExtraSafeHtml: "",
	});
}


async function routerPostTestingMakeappsrooms(req, res, next) {
	if (!await arserver.aclRequireLoggedInSitePermission("admin", req, res)) {
		// all done
		return;
	}
	// check required csrf token
	if (arserver.testCsrfThrowError(req, res, next) instanceof Error) {
		// csrf error, next will have been called with it
		return;
	}

	// do it using adminaid
	const addCountApps = 5;
	const addCountRooms = 25;
	var bretv = await adminAid.addTestAppsAndRooms(req, addCountApps, addCountRooms);
	//
	if (bretv) {
		// return them to admin testing page
		res.redirect("/admin/testing");
	} else {
		res.redirect("/admin/testing/makeappsrooms");
	}
}
//---------------------------------------------------------------------------




module.exports = {
	setupRouter,
};
