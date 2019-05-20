// verify
// route for processing verifications
// v1.0.0 on 5/1/19 by mouser@donationcoder.com
//

"use strict";


// modules
const express = require("express");

// code files
const VerificationModel = require("../models/verification");
// our helper modules
const jrhelpers = require("../helpers/jrhelpers");


const router = express.Router();


// verifying a code
router.get("/code/:code?", async function(req, res, next) {

	if (jrhelpers.isEmpty(req.params.code)) {
		res.render("message", {
			message: "Please specify the code to verify."
		});
		return;
	}

	var retv = await VerificationModel.verifiyCode(req.params.code, {}, req);
	var success = retv.success;
	var message = retv.message;

	message = (success ? "SUCCESS." : "FAILED.") + " with code "+req.params.code+": "+message;

	res.render("message", {
		message: message
	});
});


// we don't know what they want to verify?
router.get("/", function(req, res, next) {
	res.render("message", {
		message: "What are you trying to verify?"
	});
});



module.exports = router;
