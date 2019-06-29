// approom
// logout route
// v1.0.0 on 5/1/19 by mouser@donationcoder.com
//

"use strict";


// modules
const express = require("express");

// models
const arserver = require("../controllers/server");

// helpers
const JrResult = require("../helpers/jrresult");


const router = express.Router();

router.get("/", (req, res, next) => {

	// remove all?most? session data that the user might want forgotten and log them out
	arserver.logoutForgetSessionData(req);

	// session message
	JrResult.makeNew("info").pushSuccess("You have been logged out.").addToSession(req);

	res.redirect("/");
});





module.exports = router;
