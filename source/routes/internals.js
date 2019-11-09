// approom
// internals route
// v1.0.0 on 10/31/19 by mouser@donationcoder.com
//
// route for admins to find info about the site

"use strict";

// modules
const express = require("express");

// helpers
const JrResult = require("../helpers/jrresult");
const jrlog = require("../helpers/jrlog");
const jrhmisc = require("../helpers/jrhmisc");
const AdminAid = require("../controllers/adminaid");

// models
const arserver = require("../controllers/server");

// express router
const router = express.Router();


//---------------------------------------------------------------------------
function setupRouter(urlPath) {

	router.get("/", async (req, res, next) => {
		if (!await arserver.requireLoggedInSitePermission("admin", req, res, urlPath)) {
			// all done
			return;
		}

		res.render("internals/index", {
			jrResult: JrResult.sessionRenderResult(req, res),
		});
	});


	router.get("/site_options", async (req, res, next) => {
		if (!await arserver.requireLoggedInSitePermission("admin", req, res, urlPath)) {
			// all done
			return;
		}

		var rawData = arserver.getJrConfig().getDebugObj();
		res.render("internals/site_options", {
			rawData,
			jrResult: JrResult.sessionRenderResult(req, res),
		});
	});


	router.get("/structure_path", async (req, res, next) => {
		if (!await arserver.requireLoggedInSitePermission("admin", req, res, urlPath)) {
			// all done
			return;
		}

		var rawData = arserver.calcExpressRoutePathData();
		res.render("internals/structure_path", {
			rawData,
			jrResult: JrResult.sessionRenderResult(req, res),
		});
	});


	router.get("/structure_db", async (req, res, next) => {
		if (!await arserver.requireLoggedInSitePermission("admin", req, res, urlPath)) {
			// all done
			return;
		}

		var rawData = await arserver.calcDatabaseStructure();
		res.render("internals/structure_db", {
			rawData,
			jrResult: JrResult.sessionRenderResult(req, res),
		});
	});


	router.get("/resourceuse", async (req, res, next) => {
		if (!await arserver.requireLoggedInSitePermission("admin", req, res, urlPath)) {
			// all done
			return;
		}

		// get database resource use
		var rawDataDb = await arserver.calcDatabaseResourceUse();

		res.render("internals/resourceuse", {
			rawDataDb,
			jrResult: JrResult.sessionRenderResult(req, res),
		});
	});


	router.get("/serverinfo", async (req, res, next) => {
		if (!await arserver.requireLoggedInSitePermission("admin", req, res, urlPath)) {
			// all done
			return;
		}

		// get database resource use
		var rawData = await arserver.calcWebServerInformation();

		res.render("internals/serverinfo", {
			rawData,
			jrResult: JrResult.sessionRenderResult(req, res),
		});
	});


	router.get("/aclinfo", async (req, res, next) => {
		if (!await arserver.requireLoggedInSitePermission("admin", req, res, urlPath)) {
			// all done
			return;
		}

		// get database resource use
		var rawData = arserver.calcAclInfo();

		res.render("internals/aclinfo", {
			rawData,
			jrResult: JrResult.sessionRenderResult(req, res),
		});
	});


	router.get("/nodejs", async (req, res, next) => {
		if (!await arserver.requireLoggedInSitePermission("admin", req, res, urlPath)) {
			// all done
			return;
		}

		// get database resource use
		var rawData = arserver.calcNodeJsInfo();

		res.render("internals/nodejs", {
			rawData,
			jrResult: JrResult.sessionRenderResult(req, res),
		});
	});



	// important -- we must return the router variable from this function
	return router;
}
//---------------------------------------------------------------------------










module.exports = {
	setupRouter,
};
