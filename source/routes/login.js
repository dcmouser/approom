// approom
// login route
// v1.0.0 on 5/1/19 by mouser@donationcoder.com
//

"use strict";


// modules
const express = require("express");
// passport authentication stuff
const passport = require("passport");

// helpers
const JrResult = require("../helpers/jrresult");
const jrlog = require("../helpers/jrlog");

// our models
const UserModel = require("../models/user");
const VerificationModel = require("../models/verification");
const arserver = require("../models/server");


// init
const router = express.Router();




//---------------------------------------------------------------------------
// simple login, present form
router.get("/", function(req, res, next) {
	// grab pending session errors to display
	// render page
	res.render("account/login", {
		jrResult: JrResult.sessionRenderResult(req, res),
	});
});



// user is posting login form
// see https://www.sitepoint.com/local-authentication-using-passport-node-js/
router.post("/", async function(req, res, next) {
	// our manual passport authentification helper, sends user to /profile on success or /login on failure
	// we use a custom errorCallback so that we can re-render the login form on error

	await arserver.routePassportAuthenticate("local", req, res, next, "using your password", (req, res, jrinfo) => {
		res.render("account/login", {
			reqBody: req.body,
			jrResult: JrResult.sessionRenderResult(req, res, jrinfo),
		  });
		});
	});
//---------------------------------------------------------------------------






//---------------------------------------------------------------------------
// facebook login start
router.get("/facebook",
	passport.authenticate("facebook", {
	}));

// facebook auth callback
router.get("/facebook/auth", async function(req, res, next) {
	// our manual passport authentification helper, sends user to /profile on success or /login on failure
	await arserver.routePassportAuthenticate("facebook", req, res, next, "via facebook");
	});
//---------------------------------------------------------------------------





//---------------------------------------------------------------------------
// twitter login start
router.get("/twitter",
	passport.authenticate("twitter", {
	}));

// twiter auth callback
router.get("/twitter/auth", async function(req, res, next) {
	// our manual passport authentification helper, sends user to /profile on success or /login on failure
	await arserver.routePassportAuthenticate("twitter", req, res, next, "via twitter");
	});
//---------------------------------------------------------------------------



//---------------------------------------------------------------------------
// simple login via email
router.get("/email", function(req, res, next) {
	res.render("account/login_email", {
		jrResult: JrResult.sessionRenderResult(req, res),
	});
});



// user is posting login via email
router.post("/email", async function(req, res, next) {
	var message;
	var jrResult;

	// get email address provides
	var username_email = req.body.username_email;

	// lookup the user with this email address
	var user = await UserModel.findOneByUsernameEmail(username_email);
	if (user==null) {
		// set error and drop down to re-display email login form with error
		jrResult = UserModel.makeJrResultErrorNoUserFromField("username_email", username_email);
	} else {
		var userid = user.getIdAsString();
		var userEmail = user.email;
		var flagRevealEmail = (userEmail == username_email);
		jrResult = await VerificationModel.createVerificationOneTimeLoginTokenEmail(userEmail, null, null, userid, null, flagRevealEmail, null);
		if (!jrResult.isError()) {
			// success; redirect them to homepage and tell them to check their email for a login token (see the verify route for when they click the link to login)
			jrResult.pushSuccess("Check your mail for your link to login.");
			jrResult.addToSession(req);
			return res.redirect('/login');
		} else {
			// error, just drop down and re-display the email login form with error
		}
	}

	// show the email login form
	res.render("account/login_email", {
		jrResult: JrResult.sessionRenderResult(req, res, jrResult),
		reqBody: req.body,
	});
});

//---------------------------------------------------------------------------









module.exports = router;
