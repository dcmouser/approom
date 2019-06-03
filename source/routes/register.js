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

// helpers
const JrResult = require("../helpers/jrresult");

// init
const router = express.Router();




//---------------------------------------------------------------------------
// simple request at register page
router.get("/", async function(req, res, next) {

	// they should not already be logged in. if they are send them elsewhere (e.g. to their profile page)
	if (arserver.sendLoggedInUsersElsewhere(req)) {
		return;
	}

	// initialize req.body with default values for form if we find them in a session field (for example if they just verified their new account), similar to as if they had submitted values and we were re-presenting with errors
	await UserModel.fillReqBodyWithSessionedFieldValues(req);

	// render
	res.render(getRegisterViewPath(req), {
		jrResult: JrResult.sessionRenderResult(req, res),
		reqbody: req.body,
		flagFullRegistrationForm: getUseFullRegistrationForm(),
	});
});





// user is posting registration form
router.post("/", async function (req, res) {
	// ok so user is trying to register with an email (and possibly other info, username, etc)
	// first thing we can do is check if person is asking for an email address already in use; if so we can error them right away
	// if not, we generate a special verification object with their registration info and email it to them, in order to defer creation of user and verify email address

	// they should not already be logged in. if they are send them elsewhere (e.g. to their profile page)
	if (arserver.sendLoggedInUsersElsewhere(req)) {
		return;
	}

	// ok hand off processing of the registration form
	var {jrResult, successRedirectTo} = await UserModel.processAccountAllInOneForm(req);

	// any errors, re-render form with errors
	if (jrResult.isError()) {
		res.render(getRegisterViewPath(req), {
			jrResult: JrResult.sessionRenderResult(req, res, jrResult),
			reqbody: req.body,
			flagFullRegistrationForm: getUseFullRegistrationForm(),
		});
		return;
	}

	// redirect on success
	jrResult.addToSession(req);
	return res.redirect(successRedirectTo);
});
//---------------------------------------------------------------------------



//---------------------------------------------------------------------------
// which register view we render depends on whether this is initial registration, or continuing one after they have verified an email
function getRegisterViewPath(req) {
	var renderview;
	if (!arserver.getLoggedInLocalVerificationIdFromSession(req) && !req.body.verifyCode) {
		renderview = "account/register_initial";
	} else {
		renderview = "account/register_full";
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
