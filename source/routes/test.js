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
	router.get("/makeappsrooms", routerGetMakeappsrooms);
	router.post("/makeappsrooms", routerPostMakeappsrooms);

	router.get("/emergencyalert", routerGetTestEmergencyAlerts);
	router.post("/emergencyalert", routerPostTestEmergencyAlerts);

	router.get("/trigger_crash", routerGetTriggerCrash);
	router.post("/trigger_crash", routerPostTriggerCrash);

	router.get("/shutdown", routerGetShutdown);
	router.post("/shutdown", routerPostShutdown);

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

	res.render("test/index", {
		jrResult: JrResult.getMergeSessionResultAndClear(req, res),
	});
}
//---------------------------------------------------------------------------



//---------------------------------------------------------------------------
async function routerGetMakeappsrooms(req, res, next) {
	await arserver.confirmUrlPost(req, res, "admin", "Generate some test Apps and Rooms", "This operation will bulk create a bunch of apps and rooms.  Note it will fail if run twice, due to clashing shortcodes.");
}


async function routerPostMakeappsrooms(req, res, next) {
	if (!await arserver.aclRequireLoggedInSitePermission("admin", req, res)) {
		// all done
		return;
	}
	// check required csrf token
	if (arserver.testCsrfThrowError(req, res, next) instanceof Error) {
		// csrf error will be handled by exception; we just need to return
		return;
	}

	// get logged in user (note we've already checked they are logged in with permission)
	var user = await arserver.getLoggedInUser(req);

	// do it using adminaid
	const addCountApps = 5;
	const addCountRooms = 3;
	const addCountRoomDatas = 3;
	var bretv = await adminAid.addTestAppsAndRooms(req, user, addCountApps, addCountRooms, addCountRoomDatas);
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
	await arserver.confirmUrlPost(req, res, "admin", "Test emergency alert functionality", "This function will send out some emergency alerts and test that rate limiting works for them.");
}


async function routerPostTestEmergencyAlerts(req, res, next) {
	if (!await arserver.aclRequireLoggedInSitePermission("admin", req, res)) {
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





//---------------------------------------------------------------------------
async function routerGetTriggerCrash(req, res, next) {
	await arserver.confirmUrlPost(req, res, "admin", "Test fatal uncaught nodejs crash/exception", "This function will deliberately throw an uncaught nodejs exception to test how the system deals with it; it will likely exit nodejs, but hopefully log+email an error message and trace.");
}

async function routerPostTriggerCrash(req, res, next) {
	// trigger a crash to check handling
	if (!await arserver.aclRequireLoggedInSitePermission("admin", req, res)) {
		// all done
		return;
	}
	// check required csrf token
	if (arserver.testCsrfThrowError(req, res, next) instanceof Error) {
		// csrf error, next will have been called with it
		return;
	}

	throw new Error("PURPOSEFUL_TEST_CRASH_EXCEPTION");
}
//---------------------------------------------------------------------------



//---------------------------------------------------------------------------
async function routerGetShutdown(req, res, next) {
	await arserver.confirmUrlPost(req, res, "admin", "Shutdown application server", "This will shut down the application server and do a clean exit.");
}

async function routerPostShutdown(req, res, next) {
	// trigger a crash to check handling
	if (!await arserver.aclRequireLoggedInSitePermission("admin", req, res)) {
		// all done
		return;
	}
	// check required csrf token
	if (arserver.testCsrfThrowError(req, res, next) instanceof Error) {
		// csrf error, next will have been called with it
		return;
	}

	// render simple message
	if (true) {
		res.status(200).send("Initiating shutdown.");
	} else {
		res.render("generic/infopage", {
			headline: "Final message",
			message: "Server shut down.",
		});
		// manually end response to send it
		// res.end();
	}

	// tell server to shut down after some short delay to allow it to send response and flush session data, etc.
	setTimeout(async () => {
		await arserver.shutDown();
	}, 250);
}
//---------------------------------------------------------------------------




module.exports = {
	setupRouter,
};
