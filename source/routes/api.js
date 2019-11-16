/**
 * @module routes/api
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 10/28/19
 * @description
 * ##### Overview
 * This file handles all requests related to the programmatic API interface for accessing the system.
 * @todo These routes are all intended to be called programmatically by other code, and so should all return json replies, but currently some return standard web pages for testing.
*/

"use strict";


// passport
const passport = require("passport");

// modules
const express = require("express");
const assert = require("assert");

// server
const arserver = require("../controllers/arserver");

// helpers
const JrResult = require("../helpers/jrresult");
const jrdebug = require("../helpers/jrdebug");



//---------------------------------------------------------------------------
// module variables

// remember base url path of router
var routerBaseUrlPath;
//---------------------------------------------------------------------------




//---------------------------------------------------------------------------
/**
 * Add the API routes
 *
 * @param {string} urlPath - the base path of these relative paths
 * @returns router object
 */
function setupRouter(urlPath) {
	// save urlPath (in module locals)
	routerBaseUrlPath = urlPath;

	// setup routes
	const router = express.Router();
	router.get("/", routerGetIndex);
	router.get("/reqrefresh", routerGetReqrefresh);
	router.post("/reqrefresh", routerPostReqrefresh);
	router.get("/refreshaccess", routerGetRefreshaccess);
	router.all("/tokentest", routerAllTokentest);
	router.get("*", routerGetWildcard);

	// return router
	return router;
}
//---------------------------------------------------------------------------




//---------------------------------------------------------------------------
// router functions

/**
 * @description
 * Handle the request for the api index page,
 *  which currently just shows a web page index of links to all of the api functions.
 * @todo Replace the template with some json reply, since api should only be machine callable.
 */
async function routerGetIndex(req, res, next) {
	// just show index
	res.render("api/index", {
		jrResult: JrResult.getMergeSessionResultAndClear(req, res),
	});
}


/**
 * @description
 * Present user with form for their username and password,
 * so they may request a long-lived Refresh token (JWT).
 * @todo Note that this web page we present is useful for debugging, but should not be necesary in production use, because we expect code to be posting to us programmatically.
 */
async function routerGetReqrefresh(req, res, next) {
	// render page
	res.render("api/tokenuserpassform", {
	});
}


/**
 * @description
 * Process request for a long-lived Refresh token (JWT), after checking user's username and password in post data.
 * If username and password match, they will be issued a JWT refresh token that they can use to generate short-lived access tokens.
 * ##### Notes
 * * The refresh token is coded with scope "api" and cannot be used to perform arbitrary actions on the site; it can only be used for api-like actions.
 * * The refresh token should only be used to request access tokens, which are short-lived tokens that can be use to perform actual api functions.
 */
async function routerPostReqrefresh(req, res, next) {

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

	// log request
	arserver.logr(req, "api.token", "made refresh token for " + user.getLogIdString());

	// provide it
	res.status(200).send(secureToken);
}


/**
 * @description
 * Get a short-lived (JWT) Access token, using a Refresh token.  Here the user passes us a Refresh token and we give them (after verifying it's validity) an Access token.
 * @todo It gets token from the query string (token parameter); eventually we want this to be (only) retrieved from headers or post data.  This just makes it easier to test initially.
 * ##### NOTES
 * * see <a href="https://scotch.io/@devGson/api-authentication-with-json-web-tokensjwt-and-passport">using refresh tokens with jwt</a>
 */
async function routerGetRefreshaccess(req, res, next) {

	// first the user has to give us a valid REFRESH token
	var jrResult = JrResult.makeNew();
	var [userPassport, user] = await arserver.asyncRoutePassportAuthenticateFromTokenNonSessionGetPassportProfileAndUser(req, res, next, jrResult);
	if (jrResult.isError()) {
		res.status(403).send(jrResult.getErrorsAsString());
		return;
	}

	// while testing this we also want to make sure the refresh token wasn't revoked

	// it's a token, but is it the right type?
	const tokenType = userPassport.token.type;
	if (tokenType !== "refresh") {
		res.status(403).send("Error: A valid REFRESH token must be passed to request an access token.");
		return;
	}

	// jrdebug.debugObj(userPassport.token);

	// ok they gave us a valid refresh token, so now we generate an access token for them
	var secureToken = await makeSecureTokenAccessFromRefreshToken(userPassport, user, userPassport.token);

	// log request
	arserver.logr(req, "api.token", "refreshed access token for " + user.getLogIdString());

	// provide it
	res.status(200).send(secureToken);
}


/**
 * @description
 * Evaluate a refresh or access token, and report on its contents and validity; useful for testing.
 * @todo This should probably not be present in production version.
 * @todo It gets token from the query string (token parameter); we probably want it in header or post data eventually.
 */
async function routerAllTokentest(req, res, next) {
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
}


/**
 * @description
 * Test function, catches all other api routes (so no 404s), and just complains and checks for rate limiting.
 * ##### NOTES
 * * Currently this function is just used to test rate limiting for DOS type attacks.
 */
// test rate limiting of generic 404s at api route
async function routerGetWildcard(req, res, next) {
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
		message: "API Route " + routerBaseUrlPath + req.url + " not found.  API not implemented yet.",
	};
	res.status(404).send(msg);
}
//---------------------------------------------------------------------------












//---------------------------------------------------------------------------
// helper functions


/**
 * Helper function to make a secure access token from a refresh token
 *
 * @param {Object} userPassport - minimal object with properties of the user
 * @param {UserModel} user - full model object of User class
 * @param {String} refreshToken - the refresh token object to use to generate access token
 * @returns a token object.
 */
async function makeSecureTokenAccessFromRefreshToken(userPassport, user, refreshToken) {
	// make an access token with SAME scope as refresh token
	return await makeSecureTokenAccess(userPassport, user, refreshToken.scope);
}


/**
 * Helper function to make a Refresh token
 *
 * @param {Object} userPassport - minimal object with properties of the user
 * @param {UserModel} user - full model object of User class
 * @returns a token object
 */
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


/**
 * Helper function to make a generic secure token
 *
 * @param {Object} userPassport - minimal object with properties of the user
 * @param {UserModel} user - full model object of User class
 * @param {String} scope - the refresh token object to use to generate access token
 * @returns a token object
 */
async function makeSecureTokenAccess(userPassport, user, scope) {
	const payload = {
		type: "access",
		scope,
		apiCode: await user.getApiCodeEnsureValid(),
		user: userPassport,
	};
	// add accessId -- the idea here is for every user object in database to ahve an accessId (either sequential or random); that can be changed to invalidate all previously issues access tokens
	const expirationSeconds = arserver.getConfigVal("token:EXPIRATIONSECS_ACCESS");
	const secureToken = arserver.createSecureToken(payload, expirationSeconds);
	return secureToken;
}
//---------------------------------------------------------------------------









module.exports = {
	setupRouter,
};
