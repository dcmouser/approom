// approom
// profile route
// v1.0.0 on 5/1/19 by mouser@donationcoder.com
//

"use strict";


// modules
const express = require("express");

// code files
const UserModel = require("../models/user");
const VerificationModel = require("../models/verification");

// our helper modules
const jrhelpers = require("../helpers/jrhelpers");



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
	var errors = {};
	var errorCount = 0;
	var retv;

	// defaults
	var passwordHashed = "";

	// valid email?
	retv = await UserModel.validateEmail(req.body.email, true, false);
	if (retv!==true) {
		errors.email = retv;
		++errorCount;
	}

	// valid username? they don't have to specify one, but if they do it must be unique
	retv = await UserModel.validateUsername(req.body.username, true, true);
	if (retv!==true) {
		errors.username = retv;
		++errorCount;
	}

	// valid password? they don't have to specify one, but if they do it must be unique
	retv = await UserModel.validatePassword(req.body.password, true);
	if (retv!==true) {
		errors.password = retv;
		++errorCount;
	} else {
		// hash password for storage
		if (!jrhelpers.isEmpty(req.body.password)) {
			// hash their password
			passwordHashed = await UserModel.hashPasswordToObj(req.body.password);
		}
	}

	// any errors, re-render form with errors
	if (errorCount > 0) {
		//console.log(errors);
		//console.log(req.body.username);
		//console.log(req.body.email);
		res.render("account/register", {
			reqbody: req.body, errors: errors
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
	var flag_send = true;
	var verification = await VerificationModel.createVerificationNewAccountEmail(req.body.email, null, null, extraData);
	//
	message = "Please check for the verification email that has been sent to "+req.body.email;
	res.render("message", {
		message: message
	});
});



module.exports = router;
