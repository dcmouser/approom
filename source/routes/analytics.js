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

		res.render("analytics/index", {
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
