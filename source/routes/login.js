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
const arserver = require("../controllers/server");

// express router
const router = express.Router();



function setupRouter(urlPath) {

	//---------------------------------------------------------------------------
	// simple login, present form
	router.get("/", (req, res, next) => {
		// ATTN: unfinished - if they have just created an account and been redirected here to login (in order to encourage them to remember their password),
		//  we could try to be a bit nice and pre-fill their username, eg. req.body.usernameEmail

		// render page
		res.render("account/login", {
			jrResult: JrResult.sessionRenderResult(req, res),
			csrfToken: arserver.makeCsrf(req, res),
		});
	});


	// user is posting login form
	// see https://www.sitepoint.com/local-authentication-using-passport-node-js/
	router.post("/", async (req, res, next) => {
		// our manual passport authentification helper, sends user to /profile on success or /login on failure
		// we use a custom errorCallback so that we can re-render the login form on error

		// check required csrf token
		if (arserver.testCsrfThrowError(req, res, next) instanceof Error) {
			// csrf error, next will have been called with it
			return;
		}

		// handle local authentication; this is a wrapper around passport.authenticate("local" which handles a bunch of session and redirect stuff
		var jrResult = JrResult.makeNew();
		// the true,false at end says to auto handle the login success case (redirect generically), but not auto handle the error case (so that we can re-present it)
		await arserver.asyncRoutePassportAuthenticate("local", "using your password", req, res, next, jrResult, true, false);
		if (jrResult.isError()) {
			// re-present the login form
			res.render("account/login", {
				reqBody: req.body,
				jrResult: JrResult.sessionRenderResult(req, res, jrResult),
				csrfToken: arserver.makeCsrf(req, res),
			});
		} else {
			// this case is redirected handled automatically by call
		}

		/*
		await arserver.asyncRoutePassportAuthenticate("local", "using your password", req, res, next, (breq, bres, jrinfo) => {
			bres.render("account/login", {
				reqBody: breq.body,
				jrResult: JrResult.sessionRenderResult(breq, bres, jrinfo),
				csrfToken: arserver.makeCsrf(req, res),
			});
		});
		*/
	});
	//---------------------------------------------------------------------------






	//---------------------------------------------------------------------------
	// facebook login start
	router.get("/facebook",
		passport.authenticate("facebook", {
		}));

	// facebook auth callback
	router.get("/facebook/auth", async (req, res, next) => {
		// our manual passport authentification helper, sends user to /profile on success or /login on failure
		await arserver.asyncRoutePassportAuthenticate("facebook", "via facebook", req, res, next, null, true, true);
	});
	//---------------------------------------------------------------------------





	//---------------------------------------------------------------------------
	// twitter login start
	router.get("/twitter",
		passport.authenticate("twitter", {
		}));

	// twiter auth callback
	router.get("/twitter/auth", async (req, res, next) => {
		// our manual passport authentification helper, sends user to /profile on success or /login on failure
		await arserver.asyncRoutePassportAuthenticate("twitter", "via twitter", req, res, next, null, true, true);
	});
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	// simple login via email
	router.get("/email", (req, res, next) => {

		res.render("account/login_email", {
			jrResult: JrResult.sessionRenderResult(req, res),
			csrfToken: arserver.makeCsrf(req, res),
		});
	});



	// user is posting login via email
	router.post("/email", async (req, res, next) => {
		var message;
		var jrResult;

		// check required csrf token
		if (arserver.testCsrfThrowError(req, res, next) instanceof Error) {
			// csrf error, next will have been called with it
			return;
		}

		// get email address provides
		var usernameEmail = req.body.usernameEmail;

		// lookup the user with this email address
		var user = await UserModel.findOneByUsernameEmail(usernameEmail);
		if (!user) {
			// set error and drop down to re-display email login form with error
			jrResult = UserModel.makeJrResultErrorNoUserFromField("usernameEmail", usernameEmail);
		} else {
			var userId = user.getId();
			var userEmail = user.email;
			var flagRevealEmail = (userEmail === usernameEmail);
			jrResult = await VerificationModel.createVerificationOneTimeLoginTokenEmail(userEmail, userId, flagRevealEmail, null);
			if (!jrResult.isError()) {
				// success; redirect them to homepage and tell them to check their email for a login token (see the verify route for when they click the link to login)
				jrResult.pushSuccess("Check your mail for your link to login.");
				jrResult.addToSession(req);
				// res.redirect("/login");
				res.redirect("/verify");
				return;
			// error, just drop down and re-display the email login form with error
			}
		}

		// show the email login form
		res.render("account/login_email", {
			jrResult: JrResult.sessionRenderResult(req, res, jrResult),
			reqBody: req.body,
			csrfToken: arserver.makeCsrf(req, res),
		});
	});
	//---------------------------------------------------------------------------


	// need to return router
	return router;
}



module.exports = {
	setupRouter,
};
