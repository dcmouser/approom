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
	// direct access token request


	// see https://scotch.io/@devGson/api-authentication-with-json-web-tokensjwt-and-passport

	// normally in api call they would not get a web form, but this is to help test interactively
	router.get("/reqaccess", async (req, res, next) => {
		// render page
		res.render("api/tokenuserpassform", {
		});
	});


	// we process the login form
	// note how this differs from normal login.js route, we are not saving logged in user in session
	// instead we just check their credentials and give them a (jwt) access token that they can re-present to prove their identity.
	router.post("/reqaccess", async (req, res, next) => {
		// api login, parse username and password in request and RETURN A TOKEN to be used in future calls (rather than setting cookie session)
		// this authenticate expects username and password in post form; if we want to handle it differently we could pass different values or do a manual username lookup on our own
		// we should enforce https here too

		// do a local login with passed username and password; DONT store session info
		var jrResult = JrResult.makeNew();
		var [userPassport, user] = await arserver.asyncRoutePassportAuthenticateNonSessionGetUserTuple("local", "with username and password", req, res, next, jrResult, true);
		if (jrResult.isError()) {
			var msg = "Error during api token request: " + jrResult.getErrorsAsString();
			res.status(401).send(msg);
			return;
		}

		// success
		var secureToken = await makeSecureTokenAccess(userPassport, user);
		res.status(200).send(secureToken);
	});
	//---------------------------------------------------------------------------






	//---------------------------------------------------------------------------
	// normally in api call they would not get a web form, but this is to help test interactively
	router.get("/reqrefresh", async (req, res, next) => {
		// render page
		res.render("api/tokenuserpassform", {
		});
	});

	// process request
	router.post("/reqrefresh", async (req, res, next) => {

		// do a local login with passed username and password; DONT store session info
		var jrResult = JrResult.makeNew();
		var [userPassport, user] = await arserver.asyncRoutePassportAuthenticateNonSessionGetUserTuple("local", "with username and password", req, res, next, jrResult, true);
		if (jrResult.isError()) {
			var msg = "Error during api token request: " + jrResult.getErrorsAsString();
			res.status(401).send(msg);
			return;
		}

		// success
		var secureToken = await makeSecureTokenRefresh(userPassport, user);
		res.status(200).send(secureToken);
	});
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	// get an access token from refresh token
	router.get("/refreshaccess", async (req, res, next) => {

		// first the user has to give us a valid REFRESH token
		var jrResult = JrResult.makeNew();
		var [userPassport, user] = await arserver.asyncRoutePassportAuthenticateFromTokenNonSessionGetPassportProfileAndUser(req, res, next, jrResult);
		if (jrResult.isError()) {
			res.status(403).send(jrResult.getErrorsAsString());
			return;
		}

		// it's a token, but is it the right type?
		const tokenType = userPassport.token.type;
		if (tokenType !== "refresh") {
			res.status(403).send("Error: A valid REFRESH token must be passed to request an access token.");
			return;
		}

		// ok they gave us a valid refresh token, so now we generate an access token for them
		var secureToken = await makeSecureTokenAccess(userPassport, user);
		res.status(200).send(secureToken);
	});
	//---------------------------------------------------------------------------















	//---------------------------------------------------------------------------
	router.all("/tokentest", async (req, res, next) => {
		// test if user has passed user login info through api token

		var jrResult = JrResult.makeNew();
		var [userPassport, user] = await arserver.asyncRoutePassportAuthenticateFromTokenNonSessionGetPassportProfileAndUser(req, res, next, jrResult);
		if (jrResult.isError()) {
			res.status(403).send(jrResult.getErrorsAsString());
			return;
		}

		// it's good
		const tokenType = userPassport.token.type;
		res.status(200).send("Valid token parsed in API test.<br/><br/>Token type: " + tokenType + "<br/><br/>User minimal passport profile " + JSON.stringify(userPassport) + " <br/><br/>Full user: " + JSON.stringify(user));
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







//---------------------------------------------------------------------------
async function makeSecureTokenAccess(userPassport, user) {
	const payload = {
		type: "access",
		scope: "api",
		apiCode: await user.getApiCodeEnsureValid(),
		user: userPassport,
	};
	// add accessId -- the idea here is for every user object in database to ahve an accessId (either sequential or random); that can be changed to invalidate all previously issues access tokens
	const expirationSeconds = arserver.getConfigVal("token:EXPIRATIONSECS_ACCESS");
	const secureToken = arserver.createSecureToken(payload, expirationSeconds);
	return secureToken;
}


async function makeSecureTokenRefresh(userPassport, user) {
	const payload = {
		type: "refresh",
		scope: "api",
		apiCode: await user.getApiCodeEnsureValid(),
		user: userPassport,
	};
	// create secure toke
	const expirationSeconds = arserver.getConfigVal("token:EXPIRATIONSECS_REFRESH");
	const secureToken = arserver.createSecureToken(payload, expirationSeconds);
	return secureToken;
}
//---------------------------------------------------------------------------






module.exports = {
	setupRouter,
};
