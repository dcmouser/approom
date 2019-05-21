// approom
// profile route
// v1.0.0 on 5/1/19 by mouser@donationcoder.com
//

"use strict";


// modules
const express = require("express");
//
const jrlog = require("../helpers/jrlog");


const router = express.Router();


router.get("/", function(req, res, next) {
	const auth = req.isAuthenticated();
	if (auth) {
		jrlog.cdebugObj(req.session, "REQUESTED SESSION");
		jrlog.cdebugObj(req.user, "REQUESTED USER");
	}

	var userInfo = (req.session.passport!=undefined) ? JSON.stringify(req.session.passport.user) : 'not logged in';

	res.render("user/profile", {
 		auth: auth,
 		userInfo: userInfo,
	});
});




module.exports = router;
