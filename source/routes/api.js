// approom
// api route
// v1.0.0 on 10/28/19 by mouser@donationcoder.com
//
// API routes are for programmatic interfaces to the system
//

"use strict";

// passport
const passport = require("passport");

// modules
const express = require("express");

// server
const arserver = require("../controllers/server");

// helpers
const JrResult = require("../helpers/jrresult");
const jrlog = require("../helpers/jrlog");

// express router
const router = express.Router();



function setupRouter(urlPath) {



	//---------------------------------------------------------------------------
	// test api token access stuff
	// see https://scotch.io/@devGson/api-authentication-with-json-web-tokensjwt-and-passport

	router.get("/loginform", async (req, res, next) => {
		// render page
		res.render("api/loginform", {
		});
	});


	router.all("/login", async (req, res, next) => {
		// api login, parse username and password in request and RETURN A TOKEN to be used in future calls (rather than setting cookie session)

		// do a local login with passed username and password; DONT store session info
		const passportAuthOptions = {
			session: false,
		};
		// this authenticate expects username and password in post form; if we want to handle it differently we could pass different values or do a manual username lookup on our own
		// we should enforce https here too
		await passport.authenticate("local", passportAuthOptions, async (err, user, info) => {
			// see server.js routePassportAuthenticate() for some of this code
			if (err) {
				jrlog.debugObj(err, "ATTN: test error1 in api login");
				next(err);
				res.status(401).send("ATTN: in api login test - UNAUTHORIZED 1.");
				// return;
			} else if (!user) {
				// sometimes passport returns error info instead of us, when credentials are missing; this ensures we have error in format we like
				var jrinfo = JrResult.passportInfoAsJrResult(info);
				// ATTN: test debug info
				jrlog.debugObj(jrinfo, "ATTN: test error2 in api login");
				res.status(401).send("ATTN: in api login test - UNAUTHORIZED 2.");
				// return;
			} else {
				// ok we logged them in
				// now we would like to give them a (json) token providing their identity that they can pass in future calls
				jrlog.debugObj(user, "ATTN: test success API login of user.");
				// built the object we will SIGN, which is just user profile and extra info that might determine expiration etc
				var secureAccessToken = arserver.createSecureToken(user, "accessToken", "user");
				res.status(200).send(secureAccessToken);
			}
		})(req, res, next);
	});


	router.all("/tokentest", async (req, res, next) => {
		// test if user has passed user login info through api token

		// get user from access token we expect to find in request
		var user = await arserver.getAccessTokenUserFromRequestFull(req, res, next);
		if (!user) {
			res.status(403).send("Invalid access token in api test 3.  Access denied.");
		} else {
			res.status(200).send("Valied access token passed to api test.  User " + JSON.stringify(user));
		}
	});
	//---------------------------------------------------------------------------




	// test
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
