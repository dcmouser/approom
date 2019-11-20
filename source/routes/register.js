/**
 * @module routes/register
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 5/1/19
 * @description
 * registration/signup route
 */

"use strict";


// modules
const express = require("express");


// requirement service locator
const jrequire = require("../helpers/jrequire");

// controllers
const arserver = jrequire("arserver");
const registrationAid = jrequire("registrationaid");

// models
const UserModel = jrequire("models/user");
const VerificationModel = jrequire("models/verification");


// helpers
const JrResult = require("../helpers/jrresult");








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

	// return router
	return router;
}
//---------------------------------------------------------------------------





//---------------------------------------------------------------------------
// router functions

async function routerGetIndex(req, res, next) {
	// they should not already be logged in. if they are send them elsewhere (e.g. to their profile page)

	if (arserver.sendLoggedInUsersElsewhere(req, res)) {
		return;
	}

	// initialize req.body with default values for form if we find them in a session field
	//  (for example if they just verified their new account), similar to as if they had submitted values and we were re-presenting with errors
	var jrResult = await registrationAid.fillReqBodyWithSessionedFieldValues(req);

	// render
	var viewpath = await getRegisterViewPath(req);
	res.render(viewpath, {
		jrResult: JrResult.getMergeSessionResultAndClear(req, res, jrResult, true),
		reqbody: req.body,
		flagFullRegistrationForm: arserver.getOptionUseFullRegistrationForm(),
		csrfToken: arserver.makeCsrf(req, res),
	});
}


// user is posting registration form
async function routerPostIndex(req, res, next) {
	// ok so user is trying to register with an email (and possibly other info, username, etc)
	// first thing we can do is check if person is asking for an email address already in use; if so we can error them right away
	// if not, we generate a special verification object with their registration info and email it to them, in order to defer creation of user and verify email address

	// they should not already be logged in. if they are send them elsewhere (e.g. to their profile page)
	if (arserver.sendLoggedInUsersElsewhere(req, res)) {
		return;
	}

	// check required csrf token
	if (arserver.testCsrfThrowError(req, res, next) instanceof Error) {
		// csrf error, next will have been called with it
		return;
	}

	// ok hand off processing of the registration form
	var { jrResult, successRedirectTo } = await registrationAid.processAccountAllInOneForm(req);

	// any errors, re-render form with errors
	if (jrResult.isError()) {
		var viewpath = await getRegisterViewPath(req);
		res.render(viewpath, {
			jrResult: JrResult.getMergeSessionResultAndClear(req, res, jrResult),
			reqbody: req.body,
			flagFullRegistrationForm: arserver.getOptionUseFullRegistrationForm(),
			csrfToken: arserver.makeCsrf(req, res),
		});
		return;
	}

	// redirect on success
	jrResult.addToSession(req);
	res.redirect(successRedirectTo);
}
//---------------------------------------------------------------------------





//---------------------------------------------------------------------------
// helper functions

// which register view we render depends on whether this is initial registration, or continuing one after they have verified an email
async function getRegisterViewPath(req) {
	var renderview;

	// get any verification code associated with this registration, to prove they own the email
	// verificationCode can come explicitly from the form (takes priority) OR the session if not in the form
	var verification = await registrationAid.getValidNewAccountVerificationFromRequestOrLastSession(req);

	if (verification) {
		// show full form
		renderview = "account/register_full";
	} else {
		renderview = "account/register_initial";
	}

	return renderview;
}
//---------------------------------------------------------------------------




module.exports = {
	setupRouter,
};

