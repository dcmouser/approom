// approom
// api route
// v1.0.0 on 10/28/19 by mouser@donationcoder.com
//
// API routes are for programmatic interfaces to the system
//

"use strict";


// modules
const express = require("express");

// server
const arserver = require("../controllers/server");

// helpers
const JrResult = require("../helpers/jrresult");

// express router
const router = express.Router();


function setupRouter(urlPath) {

	router.get("*", async (req, res, next) => {
		var msg;

		// ATTN: test of rate limiting block
		const rateLimiter = arserver.getRateLimiterApi();
		const rateLimiterKey = req.ip;
		//
		try {
			await rateLimiter.consume(rateLimiterKey, 1);
		} catch (rateLimiterRes) {
			// rate limiter triggered
			msg = {
				message: "API rate limiting triggered; your ip has been blocked for " + rateLimiter.blockDuration + " seconds.",
			};
			res.status(429).send(msg);
			// exit from function
			return;
		}

		msg = {
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
