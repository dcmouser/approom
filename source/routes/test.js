/**
 * @module routes/admin
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 6/4/19
 * @description
 * Provides admin test routes
 */

"use strict";


// modules
const express = require("express");
const util = require("util");


// requirement service locator
const jrequire = require("../helpers/jrequire");

// helpers
const JrResult = require("../helpers/jrresult");

// controllers
const adminAid = jrequire("adminaid");
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
	router.get("/makeappsrooms", routerGetMakeappsrooms);
	router.post("/makeappsrooms", routerPostMakeappsrooms);

	router.get("/emergencyalert", routerGetTestEmergencyAlerts);
	router.post("/emergencyalert", routerPostTestEmergencyAlerts);

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

	res.render("test/index", {
		jrResult: JrResult.getMergeSessionResultAndClear(req, res),
	});
}


async function routerGetMakeappsrooms(req, res, next) {
	if (!await arserver.requireLoggedInSitePermission("admin", req, res, routerBaseUrlPath + "/makeappsrooms")) {
		// all done
		return;
	}

	res.render("generic/confirmpage", {
		jrResult: JrResult.getMergeSessionResultAndClear(req, res),
		csrfToken: arserver.makeCsrf(req, res),
		headline: "Generate some test Apps and Rooms",
		message: "This operation will bulk create a bunch of apps and rooms.  Note it will fail if run twice, due to clashing shortcodes.",
		formExtraSafeHtml: "",
	});
}


async function routerPostMakeappsrooms(req, res, next) {
	if (!await arserver.requireLoggedInSitePermission("admin", req, res, routerBaseUrlPath + "/makeappsrooms")) {
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
		res.redirect("/test");
	} else {
		res.redirect("/test/makeappsrooms");
	}
}
//---------------------------------------------------------------------------





//---------------------------------------------------------------------------
async function routerGetTestEmergencyAlerts(req, res, next) {
	if (!await arserver.requireLoggedInSitePermission("admin", req, res, routerBaseUrlPath + "/emergencyalert")) {
		// all done
		return;
	}

	res.render("generic/confirmpage", {
		jrResult: JrResult.getMergeSessionResultAndClear(req, res),
		csrfToken: arserver.makeCsrf(req, res),
		headline: "Test emergency alert functionality",
		message: "This function will send out some emergency alerts and test that rate limiting works for them.",
		formExtraSafeHtml: "",
	});
}


async function routerPostTestEmergencyAlerts(req, res, next) {
	if (!await arserver.requireLoggedInSitePermission("admin", req, res, routerBaseUrlPath + "/emergencyalert")) {
		// all done
		return;
	}
	// check required csrf token
	if (arserver.testCsrfThrowError(req, res, next) instanceof Error) {
		// csrf error, next will have been called with it
		return;
	}

	// send emergency alerts
	var subject = "Test of emergency alert system";
	var message = "This is a test of the emergency alert system.\nYou should receive a number of these messages and then a messaeg that rate limiting has kicked in for them.";
	var extraData = {};
	var flagAlsoSendToSecondaries = true;
	var numToSend = 1;
	var numSent = 0;
	for (let i = 0; i < numToSend; ++i) {
		extraData.info = util.format("Message %d of %d", i + 1, numToSend);
		numSent += await arserver.emergencyAlert("test", subject, message, req, extraData, flagAlsoSendToSecondaries);
	}

	// push session
	var jrResult = JrResult.makeSuccess(util.format("Testing sent a total of %d messages while triggering %d emergency alerts.", numSent, numToSend));
	jrResult.addToSession(req, false);

	// return them to page
	res.redirect("/test/emergencyalert");
}
//---------------------------------------------------------------------------










module.exports = {
	setupRouter,
};
