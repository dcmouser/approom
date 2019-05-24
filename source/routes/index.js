// approom
// home page route
// v1.0.0 on 5/1/19 by mouser@donationcoder.com
//


"use strict";


// modules
const express = require("express");


const router = express.Router();



// Get home page
router.get("/", function(req, res, next) {
	// session test - store count of how many times they've viewed page
	if (req.session.views) {
		req.session.views++;
	} else {
		req.session.views = 1;
	}

	// render view
	res.render("index", {
		title: "AppRoom" 
	});
});




module.exports = router;