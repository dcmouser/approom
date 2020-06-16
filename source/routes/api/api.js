/**
 * @module routes/api/api
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 10/28/19
 * @description
 * ##### Overview
 * This file handles all requests related to the programmatic API interface for accessing the system.
 * @todo These routes are all intended to be called programmatically by other code, and so should all return json replies, but currently some return standard web pages for testing.
*/

"use strict";


// modules
const express = require("express");


// requirement service locator
const jrequire = require("../../helpers/jrequire");

// controllers
const arserver = jrequire("arserver");

// helpers
const JrContext = require("../../helpers/jrcontext");
const jrhExpress = require("../../helpers/jrh_express");
const jrdebug = require("../../helpers/jrdebug");

// constants
const appdef = jrequire("appdef");









//---------------------------------------------------------------------------
/**
 * Add the API routes
 *
 * @param {string} urlPath - the base path of these relative paths
 * @returns router object
 */
function setupRouter(urlPath) {
	// create express router
	const router = express.Router();

	// setup routes
	router.get("/", routerGetIndex);
	router.get("/reqrefresh", routerGetReqRefresh);
	router.post("/reqrefresh", routerPostReqRefresh);
	router.all("/refreshaccess", routerAllRefreshAccess);
	router.all("/tokentest", routerAllTokenTest);
	router.get("/dos", routerGetDos);

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
	const jrContext = JrContext.makeNew(req, res, next);
	// just show index
	res.render("api/index", {
		jrResult: jrContext.mergeSessionMessages(),
	});
}



/**
 * @description
 * Test function, and just complains and checks for rate limiting.
 * ##### NOTES
 * * Currently this function is just used to test rate limiting for DOS type attacks.
 */
// test rate limiting of generic 404s at api route
async function routerGetDos(req, res, next) {
	const jrContext = JrContext.makeNew(req, res, next);
	// ATTN: test of rate limiting block
	const rateLimiter = arserver.getRateLimiterApi();
	// ATTN: NOTE that this is a PER-IP rate limit since we use rateLimiterKey = req.ip
	const rateLimiterKey = req.ip;
	//
	try {
		// ATTN: NOTE that this is a PER-IP rate limit since we use rateLimiterKey = req.ip
		await rateLimiter.consume(rateLimiterKey, 1);
	} catch (rateLimiterRes) {
		// rate limiter triggered
		jrhExpress.sendJsonError(jrContext, 429, "API rate limiting triggered; your ip has been blocked for " + (rateLimiter.blockDuration).toString() + " seconds.", "rateLimit");
		// exit from function
		return;
	}

	jrhExpress.sendJsonError(jrContext, 404, "API Route " + req.baseUrl + "/" + req.path + " not found.  API not implemented yet.", "404");
}



/**
 * @description
 * Present user with form for their username and password,
 * so they may request a long-lived Refresh token (JWT).
 * @todo Note that this web page we present is useful for debugging, but should not be necesary in production use, because we expect code to be posting to us programmatically.
 */
async function routerGetReqRefresh(req, res, next) {
	const jrContext = JrContext.makeNew(req, res, next);
	// render page
	res.render("api/tokenuserpassform", {
	});
}
//---------------------------------------------------------------------------


















//---------------------------------------------------------------------------
/**
 * @description
 * Process request for a long-lived Refresh token (JWT), after checking user's username and password in post data.
 * If username and password match, they will be issued a JWT refresh token that they can use to generate short-lived access tokens.
 * ##### Notes
 * * The IDEA is that the refresh token is coded with scope "api" and cannot be used to perform arbitrary actions on the site; it can only be used for api-like actions.
 * * The refresh token should only be used to request access tokens, which are short-lived tokens that can be use to perform actual api functions.
 */
async function routerPostReqRefresh(req, res, next) {
	const jrContext = JrContext.makeNew(req, res, next);
	// do a local test of passed username and password; DON'T store session info (i.e. don't actually log them in just look up user if they match password)
	// The reason we do this like this instead of trusting a logged in session user is so that this call can be made by a client that does not ever do session login
	const user = await arserver.asyncPassportManualNonSessionAuthenticateGetUser(jrContext, "local", "with username and password", next);
	if (jrContext.isError()) {
		arserver.renderErrorJson(jrContext, 401);
		return;
	}

	// success
	const secureToken = await arserver.makeSecureTokenRefresh(user);

	// log request
	arserver.logr(jrContext, "api.token", "generated refresh token", null, user);

	// provide it
	jrhExpress.sendJsonDataSuccess(jrContext, "token generated", secureToken);
}



/**
 * @description
 * Make a short-lived (JWT) Access token, using a Refresh token.  Here the user passes us a Refresh token and we give them (after verifying it's validity) an Access token.
 * @todo It gets token from the query string (token parameter); eventually we want this to be (only) retrieved from headers or post data.  This just makes it easier to test initially.
 * ##### NOTES
 * * see <a href="https://scotch.io/@devGson/api-authentication-with-json-web-tokensjwt-and-passport">using refresh tokens with jwt</a>
 */
async function routerAllRefreshAccess(req, res, next) {
	const jrContext = JrContext.makeNew(req, res, next);

	// first the user has to give us a valid REFRESH token
	const [userPassport, user] = await arserver.asyncPassportManualNonSessionAuthenticateFromTokenGetPassportProfileAndUser(jrContext, next, "refresh");
	if (jrContext.isError()) {
		arserver.renderErrorJson(jrContext, 403);
		return;
	}

	// ok they gave us a valid refresh token, so now we generate an access token for them
	const secureToken = await arserver.makeSecureTokenAccessFromRefreshToken(user, userPassport.token);

	// log request
	arserver.logr(jrContext, "api.token", "refreshed access token", null, user);

	// provide it
	jrhExpress.sendJsonDataSuccess(jrContext, "token generated", secureToken);
}



/**
 * @description
 * Evaluate a refresh or access token, and report on its contents and validity; useful for testing.
 * @todo This should probably not be present in production version.
 * @todo It gets token from the query string (token parameter); we probably want it in header or post data eventually.
 */
async function routerAllTokenTest(req, res, next) {
	const jrContext = JrContext.makeNew(req, res, next);

	// retrieve/test the token passed by the user
	const userPassport = await arserver.asyncPassportManualNonSessionAuthenticateFromTokenGetMinimalPassportUsrData(jrContext, next, null);
	if (jrContext.isError()) {
		arserver.renderErrorJson(jrContext, 403);
		return;
	}

	// it's good
	// show them the userPassport data which will include .token
	const returnData = {
		token: userPassport.token,
	};
	jrhExpress.sendJsonDataSuccess(jrContext, "Valid token parsed in API test", returnData);
}
//---------------------------------------------------------------------------























module.exports = {
	setupRouter,
};
