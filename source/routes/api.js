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
	router.get("/tokenrequest", async (req, res, next) => {
		// render page
		res.render("api/tokenrequest", {
		});
	});


	// we process the login form
	// note how this differs from normal login.js route, we are not saving logged in user in session
	// instead we just check their credentials and give them a (jwt) access token that they can re-present to prove their identity.
	router.post("/tokenrequest", async (req, res, next) => {
		// api login, parse username and password in request and RETURN A TOKEN to be used in future calls (rather than setting cookie session)
		// this authenticate expects username and password in post form; if we want to handle it differently we could pass different values or do a manual username lookup on our own
		// we should enforce https here too
		var jrResult = JrResult.makeNew();

		// do a local login with passed username and password; DONT store session info
		var [userPassport, user] = await arserver.asyncRoutePassportAuthenticateNonSessionGetUserTuple("local", "with username and password", req, res, next, jrResult, true);
		if (jrResult.isError()) {
			var msg = "ATTN: Error during api test of login: " + jrResult.getErrorsAsString();
			jrlog.debug(msg);
			res.status(401).send(msg);
			return;
		}

		// success!
		const payload = {
			type: "accessToken",
			scope: "api",
			apiCode: await user.getApiCodeEnsureValid(),
			user: userPassport,
		};
		// add accessId -- the idea here is for every user object in database to ahve an accessId (either sequential or random); that can be changed to invalidate all previously issues access tokens
		var secureAccessToken = arserver.createSecureToken(payload);
		res.status(200).send(secureAccessToken);
	});


	router.all("/tokentest", async (req, res, next) => {
		// test if user has passed user login info through api token

		var jrResult = JrResult.makeNew();
		var [userPassport, user] = await arserver.asyncRoutePassportAuthenticateFromAccessTokenNonSessionGetPassportProfileAndUser(req, res, next, jrResult);
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
