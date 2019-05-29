// index
// home page route
// v1.0.0 on 5/1/19 by mouser@donationcoder.com
//

"use strict";


// modules
const express = require("express");

// models
const arserver = require("../models/server");

// helpers
const JrResult = require("../helpers/jrresult");

// init
const router = express.Router();



// Get home page
router.get("/", function(req, res, next) {
	// session test - store count of how many times they've viewed page
	if (req.session.views) {
		req.session.views++;
	} else {
		req.session.views = 1;
	}

	// ignore any previous login diversions
	// NOTE: we have to be careful about this to make sure nothing like the email token onetime login redirects here after login token sent, or we will forget diverted url info
	arserver.forgetLoginDiversions(req);

	// render view
	res.render("index", {
		jrResult: JrResult.sessionRenderResult(req, res),
		title: "AppRoom" 
	});
});




module.exports = router;