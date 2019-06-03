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
const arserver = require("../models/server");


// init
const router = express.Router();



router.get("/", async function(req, res, next) {

    // require them to be logged in, or creates a redirect
    var user = await arserver.getLoggedInUser(req);
    if (!arserver.requireUserIsLoggedIn(req, res, user, "/membersonly", "/login")) {
        // all done
        return;
    }

    // ATTN: test
    //jrlog.debugObj(user, "User in members");
	//var jrResult = JrResult.makeSuccess("Welcome, "+user.getUsername()+"!");

	// ignore any previous login diversions
    arserver.forgetLoginDiversions(req);
    
	res.render("user/membersonly", {
        //jrResult: JrResult.sessionRenderResult(req, res, jrResult, true),
        jrResult: JrResult.sessionRenderResult(req, res),
        username: user.getUsername(),
        id: user.getIdAsString(),
	});
});




module.exports = router;
