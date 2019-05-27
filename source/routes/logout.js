// approom
// logout route
// v1.0.0 on 5/1/19 by mouser@donationcoder.com
//

"use strict";


// modules
const express = require("express");

// helpers
const JrResult = require("../helpers/jrresult");


const router = express.Router();

router.get("/", function(req, res, next) {
	// logout the user from passport
	req.logout();
	JrResult.makeNew("info").pushSuccess("You have been logged out.").addToSession(req);
	return res.redirect("/");
	});






module.exports = router;
