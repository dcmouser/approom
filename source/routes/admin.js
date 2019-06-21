// approom
// admin route
// v1.0.0 on 6/4/19 by mouser@donationcoder.com
//

"use strict";


// modules
const express = require("express");

// helpers
const JrResult = require("../helpers/jrresult");
const jrlog = require("../helpers/jrlog");
const AdminAid = require("../controllers/adminaid");

// models
const arserver = require("../models/server");

// init
const router = express.Router();



function setupRouter(urlPath) {

	router.get("/", async (req, res, next) => {
		if (!await arserver.requireLoggedIn(req, res, urlPath)) {
			// all done
			return;
		}

		res.render("admin/index", {
			jrResult: JrResult.sessionRenderResult(req, res),
		});
	});



	router.get("/testing", async (req, res, next) => {
		if (!await arserver.requireLoggedIn(req, res, urlPath + "/testing")) {
			// all done
			return;
		}

		res.render("admin/testing", {
			jrResult: JrResult.sessionRenderResult(req, res),
		});
	});


	router.get("/testing/makeappsrooms", async (req, res, next) => {
		if (!await arserver.requireLoggedIn(req, res, urlPath + "/testing/makeappsrooms")) {
			// all done
			return;
		}

		res.render("admin/confirmpage", {
			jrResult: JrResult.sessionRenderResult(req, res),
			csrfToken: arserver.makeCsrf(req, res),
			headline: "Generate some test Apps and Rooms",
			message: "This operation will bulk create a bunch of apps and rooms.  Note it will fail if run twice, due to clashing shortcodes.",
			formExtraSafeHtml: "",
		});
	});


	router.post("/testing/makeappsrooms", async (req, res, next) => {
		if (!await arserver.requireLoggedIn(req, res, urlPath + "/testing/makeappsrooms")) {
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
		var bretv = await AdminAid.addTestAppsAndRooms(req, addCountApps, addCountRooms);
		//
		if (bretv) {
			// return them to admin testing page
			res.redirect("/admin/testing");
		} else {
			res.redirect("/admin/testing/makeappsrooms");
		}
	});

	// important -- we must return the router variable from this function
	return router;
}








module.exports = {
	setupRouter,
};
