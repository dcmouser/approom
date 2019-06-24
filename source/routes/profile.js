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



router.get("/", (req, res, next) => {
	const auth = req.isAuthenticated();
	if (auth) {
		jrlog.cdebugObj(req.session, "REQ SESSION");
		jrlog.cdebugObj(req.user, "REQ USER");
	}

	var userInfo = (req.session.passport) ? JSON.stringify(req.session.passport.user) : "not logged in";

	// ignore any previous login diversions
	arserver.forgetLoginDiversions(req);

	res.render("user/profile", {
		jrResult: JrResult.sessionRenderResult(req, res),
		auth,
		userInfo,
	});
});




module.exports = router;
