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
	jrlog.cdebugObj(req.session, "REQUESTED SESSION");
	jrlog.cdebugObj(req.user, "REQUESTED USER");
	res.render("profile", {
 		auth: auth,
 		userInfo: JSON.stringify(req.session.passport.user),
	});
});




module.exports = router;
