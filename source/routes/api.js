/**
 * API Routes
 * @module routes/api
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 10/28/19
 * @description
 * This file handles all requests related to the programmatic API interface for accessing the system.
*/


"use strict";

// passport
const passport = require("passport");

// modules
const express = require("express");
const assert = require("assert");

// server
const arserver = require("../controllers/server");

// helpers
const JrResult = require("../helpers/jrresult");
const jrlog = require("../helpers/jrlog");

// express router
const router = express.Router();


// module variable to remember base url path of router
var routerBaseUrlPath;



//---------------------------------------------------------------------------
function setupRouter(urlPath) {
	// save urlPath (in module locals)
	routerBaseUrlPath = urlPath;

	// setup routes
	router.get("/", routerGetIndex);
	router.get("/reqrefresh", routerGetReqrefresh);
	router.post("/reqrefresh", routerPostReqrefresh);
	router.get("/refreshaccess", routerGetRefreshaccess);
	router.get("/reqaccess", routerGetReqaccess);
	router.post("/reqaccess", routerPostReqaccess);
	router.all("/tokentest", routerAllTokentest);
	router.get("*", routerGetWildcard);

	// return router
	return router;
}
//---------------------------------------------------------------------------




//---------------------------------------------------------------------------
// router functions

// show api index
async function routerGetIndex(req, res, next) {
	// just show index
	res.render("api/index", {
		jrResult: JrResult.sessionRenderResult(req, res),
	});
}


// generate a long-lived refresh token using username+password
async function routerGetReqrefresh(req, res, next) {
	// render page
	res.render("api/tokenuserpassform", {
	});
}


// process request
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


// generate an access token from refresh token
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

	// jrlog.debugObj(userPassport.token);

	// ok they gave us a valid refresh token, so now we generate an access token for them
	var secureToken = await makeSecureTokenAccessFromRefreshToken(userPassport, user, userPassport.token);

	// log request
	arserver.logr(req, "api.token", "refreshed access token for " + user.getLogIdString());

	// provide it
	res.status(200).send(secureToken);
}


// direct access token request
// see https://scotch.io/@devGson/api-authentication-with-json-web-tokensjwt-and-passport
// normally in api call they would not get a web form, but this is to help test interactively
async function routerGetReqaccess(req, res, next) {
	// render page
	res.render("api/tokenuserpassform", {
	});
}


// we process the login form
// note how this differs from normal login.js route, we are not saving logged in user in session
// instead we just check their credentials and give them a (jwt) access token that they can re-present to prove their identity.
async function routerPostReqaccess(req, res, next) {
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
	var secureToken = await makeSecureTokenAccess(userPassport, user, "api");

	// log request
	arserver.logr(req, "api.token", "warning: generated direct access token for " + user.getLogIdString(), 500);

	// provide it
	res.status(200).send(secureToken);
}


// token test
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



async function makeSecureTokenAccessFromRefreshToken(userPassport, user, refreshToken) {
	// make an access token with SAME scope as refresh token
	return await makeSecureTokenAccess(userPassport, user, refreshToken.scope);
}


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
