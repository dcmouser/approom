// approom
// api route
// v1.0.0 on 10/28/19 by mouser@donationcoder.com
//
// API routes are for programmatic interfaces to the system
//

"use strict";


// modules
const express = require("express");

// helpers
const JrResult = require("../helpers/jrresult");

// express router
const router = express.Router();


function setupRouter(urlPath) {

	router.get("*", async (req, res, next) => {
		var msg = {
			message: "API Route " + urlPath + req.url + " not found.  API not implemented yet.",
		};
		res.status(404).send(msg);
	});

	// need to return router
	return router;
}



module.exports = {
	setupRouter,
};
