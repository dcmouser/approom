// approom
// membersonly test route
// v1.0.0 on 5/28/19 by mouser@donationcoder.com
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



router.get("/", async (req, res, next) => {

	// require them to be logged in, or creates a redirect
	var user = await arserver.getLoggedInUser(req);
	if (!arserver.requireUserIsLoggedIn(req, res, user, "/membersonly", "/login")) {
		// all done
		return;
	}

	res.render("user/membersonly", {
		// jrResult: JrResult.sessionRenderResult(req, res, jrResult, true),
		jrResult: JrResult.sessionRenderResult(req, res),
		username: user.getUsername(),
		id: user.getIdAsString(),
	});
});




module.exports = router;
