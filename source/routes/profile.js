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

// init
const router = express.Router();



router.get("/", function(req, res, next) {
	const auth = req.isAuthenticated();
	if (auth) {
		jrlog.cdebugObj(req.session, "REQ SESSION");
		jrlog.cdebugObj(req.user, "REQ USER");
	}

	var userInfo = (req.session.passport!=undefined) ? JSON.stringify(req.session.passport.user) : 'not logged in';

	// ATTN: test
	//var jrResult = JrResult.makeSuccess("Hello.");

	res.render("user/profile", {
		jrResult: JrResult.sessionRenderResult(req, res /*, jrResult, true*/),
		auth: auth,
 		userInfo: userInfo,
	});
});




module.exports = router;
