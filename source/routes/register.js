// approom
// signup route
// v1.0.0 on 5/1/19 by mouser@donationcoder.com
//

"use strict";


// modules
const express = require("express");

// models
const UserModel = require("../models/user");
const arserver = require("../models/server");
const RegistrationAid = require("../controllers/registrationaid");

// helpers
const JrResult = require("../helpers/jrresult");

// init
const router = express.Router();




//---------------------------------------------------------------------------
// simple request at register page
router.get("/", async (req, res, next) => {
	// they should not already be logged in. if they are send them elsewhere (e.g. to their profile page)
	if (arserver.sendLoggedInUsersElsewhere(req, res)) {
		return;
	}

	// initialize req.body with default values for form if we find them in a session field
	//  (for example if they just verified their new account), similar to as if they had submitted values and we were re-presenting with errors
	var jrResult = await RegistrationAid.fillReqBodyWithSessionedFieldValues(req);

	// render
	var viewpath = await getRegisterViewPath(req);
	res.render(viewpath, {
		jrResult: JrResult.sessionRenderResult(req, res, jrResult),
		reqbody: req.body,
		flagFullRegistrationForm: getUseFullRegistrationForm(),
		csrfToken: arserver.makeCsrf(req, res),
	});
});





// user is posting registration form
router.post("/", async (req, res, next) => {
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
	var { jrResult, successRedirectTo } = await RegistrationAid.processAccountAllInOneForm(req);

	// any errors, re-render form with errors
	if (jrResult.isError()) {
		var viewpath = await getRegisterViewPath(req);
		res.render(viewpath, {
			jrResult: JrResult.sessionRenderResult(req, res, jrResult),
			reqbody: req.body,
			flagFullRegistrationForm: getUseFullRegistrationForm(),
			csrfToken: arserver.makeCsrf(req, res),
		});
		return;
	}

	// redirect on success
	jrResult.addToSession(req);
	res.redirect(successRedirectTo);
});
//---------------------------------------------------------------------------



//---------------------------------------------------------------------------
// which register view we render depends on whether this is initial registration, or continuing one after they have verified an email
async function getRegisterViewPath(req) {
	//
	var verification;
	var renderview = "account/register_initial";

	if (req.body.verifyCode) {
		// first lookup verify code if code provided in form
		const VerificationModel = require("../models/verification");
		verification = await VerificationModel.findOneByCode(req.body.verifyCode);
	}
	if (!verification) {
		// not found in form, maybe there is a remembered verification id in ession regarding new account email verified, then show full
		verification = await arserver.getLastSessionedVerification(req);
	}

	if (verification) {
		// let's make sure it is still valid
		if (verification.isValidNewAccountEmailReady(req)) {
			// show full form
			renderview = "account/register_full";
		}
	}

	return renderview;
}


function getUseFullRegistrationForm() {
	// present with full registration even on initial signup?
	// if false, we just ask for email at signup and get other info after
	return false;
}
//---------------------------------------------------------------------------








module.exports = router;
