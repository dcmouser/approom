// verify
// route for processing verifications
// v1.0.0 on 5/1/19 by mouser@donationcoder.com
//

"use strict";


// modules
const express = require("express");

// models
const VerificationModel = require("../models/verification");
const arserver = require("../models/server");

// helpers
const JrResult = require("../helpers/jrresult");


// init
const router = express.Router();



//---------------------------------------------------------------------------
// verifying a code
router.get("/code/:code?", async (req, res, next) => {
	await handleVerifyCode(req.params.code, req, res, next);
});

router.post(/(code\/.*)?/, async (req, res, next) => {
	var code = req.body.code;
	await handleVerifyCode(code, req, res, next);
});


// we don't know what they want to verify?
router.get("/", (req, res, next) => {
	res.render("account/verify", {
		jrResult: JrResult.sessionRenderResult(req, res),
	});
});
//---------------------------------------------------------------------------





//---------------------------------------------------------------------------
// this is an agnostic function that might handle all kinds of verifications (change of email, new account email, mobile text, onetime login code, multi-factor login, etc.)
async function handleVerifyCode(code, req, res, next) {
	var jrResult;
	var successRedirectTo;

	// so we can check if verifying this code logs someone in
	var previouslyLoggedInUserId = arserver.getLoggedInLocalUserIdFromSession(req);

	if (!code) {
		jrResult = JrResult.makeNew("VerificationError").pushError("Please specify the code to verify.");
	} else {
		({ jrResult, successRedirectTo } = await VerificationModel.verifiyCode(code, {}, req, res));
	}

	// if caller handled everything
	if (jrResult.getDoneRendering()) {
		// all done by caller
		return;
	}

	if (jrResult.isError()) {
		// on error, show verify form
		res.render("account/verify", {
			jrResult: JrResult.sessionRenderResult(req, res, jrResult),
			reqBody: req.body,
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




module.exports = router;
