/**
 * @module routes/verify
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 5/1/19
 * @description
 * verify route for when users prove that they own an email, etc.
 */

"use strict";


// modules
const express = require("express");


// requirement service locator
const jrequire = require("../helpers/jrequire");

// models
const VerificationModel = jrequire("models/verification");

// controllers
const arserver = jrequire("arserver");

// helpers
const JrResult = require("../helpers/jrresult");














//---------------------------------------------------------------------------
function setupRouter(urlPath) {
	// create express router
	const router = express.Router();

	// setup routes
	router.get("/code/:code?", routerGetCode);
	router.post(/(code\/.*)?/, routerPostCode);
	router.get("/", routerGetIndex);

	// return router
	return router;
}
//---------------------------------------------------------------------------




//---------------------------------------------------------------------------
// router functions


async function routerGetCode(req, res, next) {
	await handleVerifyCode(req.params.code, req, res, next);
}


async function routerPostCode(req, res, next) {
	// check required csrf token
	if (arserver.testCsrfThrowError(req, res, next) instanceof Error) {
		// csrf error, next will have been called with it
		return;
	}

	var code = req.body.code;
	await handleVerifyCode(code, req, res, next);
}


async function routerGetIndex(req, res, next) {

	res.render("account/verify", {
		jrResult: JrResult.getMergeSessionResultAndClear(req, res),
		csrfToken: arserver.makeCsrf(req, res),
	});
}
//---------------------------------------------------------------------------




//---------------------------------------------------------------------------
// helper functions


// this is an agnostic function that might handle all kinds of verifications (change of email, new account email, mobile text, onetime login code, multi-factor login, etc.)
async function handleVerifyCode(code, req, res, next) {
	var jrResult;
	var successRedirectTo;

	// so we can check if verifying this code logs someone in
	var previouslyLoggedInUserId = arserver.getLoggedInLocalUserIdFromSession(req);

	if (!code) {
		jrResult = JrResult.makeError("Please specify the code to verify.");
	} else {
		({ jrResult, successRedirectTo } = await VerificationModel.verifiyCode(code, {}, req, res));
	}

	/*
	// ATTN: 11/14/19 don't think we use this anymore
	// if caller handled everything
	if (jrResult.getDoneRendering()) {
		// all done by caller
		return;
	}
	*/

	if (jrResult.isError()) {
		// on error, show verify form
		res.render("account/verify", {
			jrResult: JrResult.getMergeSessionResultAndClear(req, res, jrResult),
			reqBody: req.body,
			csrfToken: arserver.makeCsrf(req, res),
		});
		return;
	}

	// success -- redirect and show flash message about success
	jrResult.addToSession(req);

	// if they are NOW logged in (and weren't before the verify code check), then check if they were waiting to go to another page
	var newlyLoggedInUserId = arserver.getLoggedInLocalUserIdFromSession(req);
	if (newlyLoggedInUserId && (previouslyLoggedInUserId !== newlyLoggedInUserId)) {
		if (arserver.userLogsInCheckDiverted(req, res)) {
			return;
		}
	}

	// by default if no caller redirected or rendered already (by setting jrResult.setDontRendering), then we redirect to homepage after a successful processing
	if (successRedirectTo) {
		res.redirect(successRedirectTo);
		return;
	}

	// otherwise default
	res.redirect("/");
}
//---------------------------------------------------------------------------




module.exports = {
	setupRouter,
};
