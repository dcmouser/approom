// approom
// profile route
// v1.0.0 on 5/1/19 by mouser@donationcoder.com
//

"use strict";


// modules
const express = require("express");

// models
const UserModel = require("../models/user");
const VerificationModel = require("../models/verification");

// helpers
const jrhelpers = require("../helpers/jrhelpers");
const JrResult = require("../helpers/jrresult");

// init
const router = express.Router();



router.get("/", function(req, res, next) {
	res.render("account/register", {
	});
});


// user is posting registration form
router.post("/", async function (req, res) {
	// ok so user is trying to register with an email (and possibly other info, username, etc)
	// first thing we can do is check if person is asking for an email address already in use; if so we can error them right away
	// if not, we generate a special verification object with their registration info and email it to them, in order to defer creation of user and verify email address

	// ok lets check for errors
	var retvResult;
	var jrResult = JrResult.makeNew();

	// defaults
	var passwordHashed = "";

	// valid email?
	retvResult = await UserModel.validateEmail(req.body.email, true, false);
	if (retvResult.isError()) {
		jrResult.mergeIn(retvResult);
	}

	// valid username? they don't have to specify one, but if they do it must be unique
	retvResult = await UserModel.validateUsername(req.body.username, true, true);
	if (retvResult.isError()) {
		jrResult.mergeIn(retvResult);
	}

	// valid password? they don't have to specify one, but if they do?
	retvResult = await UserModel.validatePassword(req.body.password, true);
	if (retvResult.isError()) {
		jrResult.mergeIn(retvResult);
	} else {
		// hash password for storage
		if (!jrhelpers.isEmpty(req.body.password)) {
			// hash their password
			passwordHashed = await UserModel.hashPasswordToObj(req.body.password);
		}
	}

	// any errors, re-render form with errors
	if (jrResult.isError()) {
		res.render("account/register", {
			reqbody: req.body,
			jrResult: jrResult,
		});
		return;
	}

	// ok form is good, process it
	var message;

	// extra data to remember and use if they verify their email and we eventually create account
	var extraData = {
		username: req.body.username,
		passwordHashed: passwordHashed
	}

	// create the email verification and mail it; we pass userId and loginId as null, so this is an email verification NOT associated with an existing user
	var jrResult = await VerificationModel.createVerificationNewAccountEmail(req.body.email, null, null, extraData);
	//
	jrResult.pushSuccess("Please check for the verification email.  You will need to verify that you have received it before you can log in.");
	if (true) {
		jrResult.storeInSession(req);
		return res.redirect('/');
	} else {
		res.render("account/register", {
			reqbody: req.body,
			jrResult: jrResult,
		});
	}
});



module.exports = router;
