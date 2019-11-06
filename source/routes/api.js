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

	// normally in api call they would not get a web form, but this is to help test interactively
	router.get("/loginform", async (req, res, next) => {
		// render page
		res.render("api/loginform", {
		});
	});


	// we process the login form
	// note how this differs from normal login.js route, we are not saving logged in user in session
	// instead we just check their credentials and give them a (jwt) access token that they can re-present to prove their identity.
	router.all("/login", async (req, res, next) => {
		// api login, parse username and password in request and RETURN A TOKEN to be used in future calls (rather than setting cookie session)

		// do a local login with passed username and password; DONT store session info
		const passportAuthOptions = {
			session: false,
		};
		// this authenticate expects username and password in post form; if we want to handle it differently we could pass different values or do a manual username lookup on our own
		// we should enforce https here too
		await passport.authenticate("local", passportAuthOptions, async (err, userPassport, info) => {
			// see server.js routePassportAuthenticate() for some of this code
			if (err) {
				jrlog.debugObj(err, "ATTN: test error1 in api login");
				next(err);
				res.status(401).send("ATTN: in api login test - UNAUTHORIZED 1.");
				// return;
			} else if (!userPassport) {
				// sometimes passport returns error info instead of us, when credentials are missing; this ensures we have error in format we like
				var jrinfo = JrResult.passportInfoAsJrResult(info);
				// ATTN: test debug info
				jrlog.debugObj(jrinfo, "ATTN: test error2 in api login");
				res.status(401).send("ATTN: in api login test - UNAUTHORIZED 2.");
				// return;
			} else {
				// ok their username+password matches.
				// get the full user
				var user = await arserver.loadUserFromMinimalPassportUserData(userPassport);
				if (!user) {
					jrlog.debug("ATTN: test error2 in api login");
					res.status(401).send("ATTN: in api login test - UNAUTHORIZED 2.");
				} else {
					// now we would like to give them a (json) token providing their identity that they can pass in future calls
					// sign a token which is just user minimal profile and extra info that might determine expiration etc
					// BUT FIRST, add some extra info to user object restricting use of the token
					// add scope "api" so that the access token can only be used for safer api actions
					const payload = {
						type: "accessToken",
						scope: "api",
						apiCode: await user.getApiCodeEnsureValid(),
						user: userPassport,
					};
					// add accessId -- the idea here is for every user object in database to ahve an accessId (either sequential or random); that can be changed to invalidate all previously issues access tokens
					var secureAccessToken = arserver.createSecureToken(payload);
					res.status(200).send(secureAccessToken);
				}
			}
		})(req, res, next);
	});


	router.all("/tokentest", async (req, res, next) => {
		// test if user has passed user login info through api token

		var jrResult = JrResult.makeNew();

		var [userPassport, user] = await arserver.parseAccessTokenFromRequestGetPassportProfileAndUser(req, res, next, jrResult);
		if (jrResult.isError()) {
			res.status(403).send(jrResult.getErrorsAsString());
			return;
		}

		// it's good
		res.status(200).send("Valid access token passed to api test.<br/><br/>User minimal passport profile " + JSON.stringify(userPassport) + " <br/><br/>Full user: " + JSON.stringify(user));
	});
	//---------------------------------------------------------------------------





	//---------------------------------------------------------------------------
	// test rate limiting of generic 404s at api route
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
	//---------------------------------------------------------------------------


	// need to return router
	return router;
}



module.exports = {
	setupRouter,
};
