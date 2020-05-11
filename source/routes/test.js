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
const jrhMisc = require("../helpers/jrh_misc");
const jrhRateLimiter = require("../helpers/jrh_ratelimiter");

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
	router.get("/makeappsrooms", routerGetMakeappsrooms);
	router.post("/makeappsrooms", routerPostMakeappsrooms);

	router.get("/emergencyalert", routerGetTestEmergencyAlerts);
	router.post("/emergencyalert", routerPostTestEmergencyAlerts);

	router.get("/trigger_crash", routerGetTriggerCrash);
	router.post("/trigger_crash", routerPostTriggerCrash);

	router.get("/shutdown", routerGetShutdown);
	router.post("/shutdown", routerPostShutdown);

	router.get("/ratelimit", routerGetRateLimit);
	router.post("/ratelimit", routerPostRateLimit);

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

	res.render("test/index", {
		jrResult: JrResult.getMergeSessionResultAndClear(req, res),
	});
}
//---------------------------------------------------------------------------



//---------------------------------------------------------------------------
async function routerGetMakeappsrooms(req, res, next) {
	await arserver.confirmUrlPost(req, res, appdef.DefAclActionAdminister, "Generate some test Apps and Rooms", "This operation will bulk create a bunch of apps and rooms.  Note it will fail if run twice, due to clashing shortcodes.");
}


async function routerPostMakeappsrooms(req, res, next) {
	if (!await arserver.aclRequireLoggedInSitePermission(appdef.DefAclActionAdminister, req, res)) {
		// all done
		return;
	}
	// check required csrf token
	if (!arserver.testCsrfRedirectToOriginalUrl(req, res)) {
		return;
	}

	// get logged in user (note we've already checked they are logged in with permission)
	var user = await arserver.getLoggedInUser(req);

	// do it using adminaid
	var jrResult = JrResult.makeNew();
	const addCountApps = 5;
	const addCountRooms = 3;
	const addCountRoomDatas = 3;
	jrResult = await adminAid.addTestAppsAndRooms(user, addCountApps, addCountRooms, addCountRoomDatas);
	jrResult.addToSession(req);
	//
	if (!jrResult.isError()) {
		// return them to admin testing page
		res.redirect("/test");
	} else {
		res.redirect("/test/makeappsrooms");
	}
}
//---------------------------------------------------------------------------





//---------------------------------------------------------------------------
async function routerGetTestEmergencyAlerts(req, res, next) {
	await arserver.confirmUrlPost(req, res, appdef.DefAclActionAdminister, "Test emergency alert functionality", "This function will send out some emergency alerts and test that rate limiting works for them.");
}


async function routerPostTestEmergencyAlerts(req, res, next) {
	if (!await arserver.aclRequireLoggedInSitePermission(appdef.DefAclActionAdminister, req, res)) {
		// all done
		return;
	}
	// check required csrf token
	if (!arserver.testCsrfRedirectToOriginalUrl(req, res)) {
		return;
	}

	var jrResult = JrResult.makeNew();

	// send emergency alerts
	var subject = "Test of emergency alert system";
	var message = "This is a test of the emergency alert system.\nThis will send out an email to a list of email address configured to receive emergency alerts.";
	var extraData = {};
	var flagAlsoSendToSecondaries = true;
	var numToSend = 1;
	var numSent = 0;
	for (let i = 0; i < numToSend; ++i) {
		extraData.info = util.format("Message %d of %d", i + 1, numToSend);
		numSent += await arserver.emergencyAlert("test", subject, message, req, extraData, flagAlsoSendToSecondaries, false);
	}

	// push session
	jrResult = JrResult.makeSuccess(util.format("Testing sent a total of %d email messages while triggering %d emergency alerts.", numSent, numToSend));
	jrResult.addToSession(req, false);

	// return them to page
	res.redirect("/test/emergencyalert");
}
//---------------------------------------------------------------------------





//---------------------------------------------------------------------------
async function routerGetTriggerCrash(req, res, next) {
	await arserver.confirmUrlPost(req, res, appdef.DefAclActionAdminister, "Test fatal uncaught nodejs crash/exception", "This function will deliberately throw an uncaught nodejs exception to test how the system deals with it; it will likely exit nodejs, but hopefully log+email an error message and trace.");
}

async function routerPostTriggerCrash(req, res, next) {
	// trigger a crash to check handling
	if (!await arserver.aclRequireLoggedInSitePermission(appdef.DefAclActionAdminister, req, res)) {
		// all done
		return;
	}
	// check required csrf token
	if (!arserver.testCsrfRedirectToOriginalUrl(req, res)) {
		return;
	}

	throw new Error("PURPOSEFUL_TEST_CRASH_EXCEPTION");
}
//---------------------------------------------------------------------------



//---------------------------------------------------------------------------
async function routerGetShutdown(req, res, next) {
	await arserver.confirmUrlPost(req, res, appdef.DefAclActionAdminister, "Shutdown application server", "This will shut down the application server and do a clean exit.");
}

async function routerPostShutdown(req, res, next) {
	// trigger a crash to check handling
	if (!await arserver.aclRequireLoggedInSitePermission(appdef.DefAclActionAdminister, req, res)) {
		// all done
		return;
	}
	// check required csrf token
	if (!arserver.testCsrfRedirectToOriginalUrl(req, res)) {
		return;
	}

	// render simple message
	res.status(200).send("Initiating shutdown.");

	// tell server to shut down after some short delay to allow it to send response and flush session data, etc.
	setTimeout(async () => {
		await arserver.shutDown();
	}, 250);
}
//---------------------------------------------------------------------------




//---------------------------------------------------------------------------
async function routerGetRateLimit(req, res, next) {
	await arserver.confirmUrlPost(req, res, appdef.DefAclActionAdminister, "Test rate limiter", "This will generate a number of events which should trigger the test rate limiter to kick in.  An operation will loop many times, with some iterations being blocked by the rate limiter.");
}

async function routerPostRateLimit(req, res, next) {
	// test rate limiter

	// require admin permission, etc.
	if (!await arserver.aclRequireLoggedInSitePermission(appdef.DefAclActionAdminister, req, res)) {
		// all done
		return;
	}
	// check required csrf token
	if (!arserver.testCsrfRedirectToOriginalUrl(req, res)) {
		return;
	}

	const rateLimiter = arserver.getRateLimiterTest();
	var jrResult = JrResult.makeSuccess("rateLimiterTest info:" + jrhRateLimiter.getRateLimiterInfo(rateLimiter));

	// ATTN: with rateLimiterKey == "" it means that we share a single rate limter for all emergencyAlerts
	const rateLimiterKey = "";

	var message = "";
	const numToTest = 36;
	var sleepPerTest = 100;
	for (var i = 0; i < numToTest; ++i) {
		message = "Rate limiter test " + i.toString() + " at " + jrhMisc.getPreciseNowString();
		jrResult.pushSuccess(message);
		try {
			// consume a point of action
			await rateLimiter.consume(rateLimiterKey, 1);
			// no excpetion
			jrResult.pushSuccess("Ok, rate limiter did not trigger.");
		} catch (rateLimiterRes) {
			// rate limiter triggered
			if (rateLimiterRes.isFirstInDuration) {
				message = "Rate limiter kicks in.\n";
				jrResult.pushSuccess(message);
			}
			// add message about rate limiter blocking
			const blockTime = rateLimiterRes.msBeforeNext / 1000.0;
			message = "Rate limiter blocking for " + blockTime.toString() + " seconds.";
			jrResult.pushSuccess(message);
		}
		// sleep a bit
		await jrhMisc.usleep(sleepPerTest);
	}

	// push reslt message to session
	jrResult.addToSession(req, false);

	// return them to page
	res.redirect("/test/ratelimit");
}
//---------------------------------------------------------------------------







module.exports = {
	setupRouter,
};
