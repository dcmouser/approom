/**
 * @module routes/login
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 5/1/19
 * @description
 * login-related routes
 */

"use strict";


// modules
const express = require("express");
// passport authentication stuff
const passport = require("passport");

// helpers
const JrResult = require("../helpers/jrresult");
const jrlog = require("../helpers/jrlog");


// requirement service locator
const jrequire = require("../helpers/jrequire");

// controllers
const arserver = jrequire("arserver");

// our models
const UserModel = jrequire("models/user");
const VerificationModel = jrequire("models/verification");









//---------------------------------------------------------------------------
// module variables

// remember base url path of router
var routerBaseUrlPath;
//---------------------------------------------------------------------------








//---------------------------------------------------------------------------
function setupRouter(urlPath) {
	// create express router
	const router = express.Router();

	// save urlPath (in module locals)
	routerBaseUrlPath = urlPath;

	// setup routes
	router.get("/", routerGetIndex);
	router.post("/", routerPostIndex);
	router.get("/facebook", passport.authenticate("facebook", {}));
	router.get("/facebook/auth", routerGetFacebookAuth);
	router.get("/twitter", passport.authenticate("twitter", {}));
	router.get("/twitter/auth", routerGetTwitterAuth);
	router.get("/email", routerGetEmail);
	router.post("/email", routerPostEmail);

	// return router
	return router;
}
//---------------------------------------------------------------------------




//---------------------------------------------------------------------------
// router functions


// present login form
async function routerGetIndex(req, res, next) {
	// ATTN: unfinished - if they have just created an account and been redirected here to login (in order to encourage them to remember their password),
	//  we could try to be a bit nice and pre-fill their username, eg. req.body.usernameEmail

	// render page
	res.render("account/login", {
		jrResult: JrResult.getMergeSessionResultAndClear(req, res),
		csrfToken: arserver.makeCsrf(req, res),
	});
}


// process login form
// see https://www.sitepoint.com/local-authentication-using-passport-node-js/
async function routerPostIndex(req, res, next) {
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
			jrResult: JrResult.getMergeSessionResultAndClear(req, res, jrResult),
			csrfToken: arserver.makeCsrf(req, res),
		});
	} else {
		// this case is redirected/handled automatically by call
	}
}



// facebook auth callback
async function routerGetFacebookAuth(req, res, next) {
	// our manual passport authentification helper, sends user to /profile on success or /login on failure
	await arserver.asyncRoutePassportAuthenticate("facebook", "via facebook", req, res, next, null, true, true);
}


// twiter auth callback
async function routerGetTwitterAuth(req, res, next) {
	// our manual passport authentification helper, sends user to /profile on success or /login on failure
	await arserver.asyncRoutePassportAuthenticate("twitter", "via twitter", req, res, next, null, true, true);
}



// present one-time login via email form
async function routerGetEmail(req, res, next) {
	res.render("account/login_email", {
		jrResult: JrResult.getMergeSessionResultAndClear(req, res),
		csrfToken: arserver.makeCsrf(req, res),
	});
}


// process one-time login via email form
async function routerPostEmail(req, res, next) {
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
		jrResult: JrResult.getMergeSessionResultAndClear(req, res, jrResult),
		reqBody: req.body,
		csrfToken: arserver.makeCsrf(req, res),
	});
}
//---------------------------------------------------------------------------



module.exports = {
	setupRouter,
};
