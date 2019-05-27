// verify
// route for processing verifications
// v1.0.0 on 5/1/19 by mouser@donationcoder.com
//

"use strict";


// modules
const express = require("express");

// models
const VerificationModel = require("../models/verification");

// helpers
const jrhelpers = require("../helpers/jrhelpers");
const JrResult = require("../helpers/jrresult");


// init
const router = express.Router();


// verifying a code
router.get("/code/:code?", async function(req, res, next) {
	await handleVerifyCode(req.params.code, req, res, next);
});


router.post(/(code\/.*)?/, async function(req, res, next) {
	var code = req.body.code;
	await handleVerifyCode(code, req, res, next);
});


// we don't know what they want to verify?
router.get("/", function(req, res, next) {
	res.render("account/verify", {
		jrResult: JrResult.sessionRenderResult(req, res),
	});
});




async function handleVerifyCode(code, req, res, next) {
	var jrResult;
	if (jrhelpers.isEmpty(code)) {
		jrResult = JrResult.makeNew("VerificationError").pushError("Please specify the code to verify.");
	} else {
		jrResult = await VerificationModel.verifiyCode(code, {}, req);
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
	return res.redirect('/');
}





module.exports = router;
