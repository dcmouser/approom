// approom
// profile route
// v1.0.0 on 5/1/19 by mouser@donationcoder.com
//

"use strict";


// modules
const express = require("express");
// helpers
const JrResult = require("../helpers/jrresult");
const jrlog = require("../helpers/jrlog");

// models
const arserver = require("../controllers/server");

// init
const router = express.Router();


function setupRouter(urlPath) {

	router.get("/", async (req, res, next) => {

		// require them to be logged in, or creates a redirect
		var user = await arserver.getLoggedInUser(req);
		if (!arserver.requireUserIsLoggedIn(req, res, user, urlPath, "/login")) {
			// all done
			return;
		}

		var userInfo = (req.session.passport) ? JSON.stringify(req.session.passport.user, null, "  ") : "not logged in";

		// ignore any previous login diversions
		arserver.forgetLoginDiversions(req);

		res.render("user/profile", {
			jrResult: JrResult.sessionRenderResult(req, res),
			userInfo,
		});
	});

	// need to return router
	return router;
}



module.exports = {
	setupRouter,
};
