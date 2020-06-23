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
const JrContext = require("../helpers/jrcontext");
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
	const jrContext = JrContext.makeNew(req, res, next);
	await handleVerifyCode(jrContext, req.params.code);
}


async function routerPostCode(req, res, next) {
	const jrContext = JrContext.makeNew(req, res, next);
	// check required csrf token
	arserver.testCsrf(jrContext);

	const code = req.body.code;
	await handleVerifyCode(jrContext, code);
}


async function routerGetIndex(req, res, next) {
	const jrContext = JrContext.makeNew(req, res, next);
	res.render("account/verify", {
		jrResult: jrContext.mergeSessionMessages(),
		csrfToken: arserver.makeCsrf(jrContext),
	});
}
//---------------------------------------------------------------------------




//---------------------------------------------------------------------------
// helper functions


// this is an agnostic function that might handle all kinds of verifications (change of email, new account email, mobile text, onetime login code, multi-factor login, etc.)
async function handleVerifyCode(jrContext, code) {
	let successRedirectTo;

	// so we can check if verifying this code logs someone in
	const previouslyLoggedInUserId = arserver.getUntrustedLoggedInUserIdFromSession(jrContext);

	if (jrContext.isError()) {
		// just drop down, it's an error from the start (caller errore
	} else if (!code) {
		jrContext.pushError.makeError("Please specify the code to verify.");
	} else {
		successRedirectTo = await VerificationModel.verifiyCode(jrContext, code, {});
	}

	if (jrContext.isError()) {
		// on error, show verify form
		jrContext.res.render("account/verify", {
			jrResult: jrContext.mergeSessionMessages(),
			reqBody: jrContext.req.body,
			csrfToken: arserver.makeCsrf(jrContext),
		});
		return;
	}


	// success -- redirect and show flash message about success
	jrContext.addToThisSession();

	// if they are NOW logged in (and weren't before the verify code check), then check if they were waiting to go to another page
	const newlyLoggedInUserId = arserver.getUntrustedLoggedInUserIdFromSession(jrContext);
	if (newlyLoggedInUserId && (previouslyLoggedInUserId !== newlyLoggedInUserId)) {
		if (arserver.userLogsInCheckDiverted(jrContext)) {
			return;
		}
	}

	// redirect someplace specific on success?
	if (successRedirectTo) {
		jrContext.res.redirect(successRedirectTo);
		return;
	}

	// otherwise default
	jrContext.res.redirect("/");
}
//---------------------------------------------------------------------------




module.exports = {
	setupRouter,
};
