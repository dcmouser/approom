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

// our models
const UserModel = require("../models/user");
const VerificationModel = require("../models/verification");


// init
const router = express.Router();




//---------------------------------------------------------------------------
// simple login, present form
router.get("/", function(req, res, next) {
	// grab pending session errors to display
	// render page
	res.render("account/login", {
	});
});



// user is posting login form
// see https://www.sitepoint.com/local-authentication-using-passport-node-js/
router.post("/", async function(req, res, next) {
	// "manual" authenticate via passport (as opposed to middleware auto); allows us to get richer info about error, and better decide what to do
	// note this doesn't seem to be called if username is BLANK
	await passport.authenticate('local', function(err, user, info) {
		if (err) {
		  return next(err);
		}
		if (!user) {
			// sometimes passport returns error info instead of us, when credentials are missing; this ensures we have error in format we like
			info = JrResult.passportInfoAsJrResult(info);
			// test
			if (true) {
				info.pushBiFieldError("password", "fix password", "In this day and age you really need a longer password");
				info.pushMessage("Just a message1");
				info.pushMessage("Another mesage2");
				info.pushError("Generic error");
				info.pushSuccess("Congratulations! You did it.");
			}
			// failure to login; error info but not an exception
			// re-render login form with error info
			if (true) {
				res.render("account/login", {
					reqBody: req.body,
					jrResult: info,
		  		});
			return;
			} else {
				// redirect method to test session flash errors
				// save error to session (flash)
				info.storeInSession(req);
				return res.redirect('/login');
			}
		}
		// login the user
		req.logIn(user, function(err) {
			if (err) {
				//error (exception) logging them in
				return next(err);
			}
		// success
		return res.redirect('/profile');
	  });
	})(req, res, next);
  });
//---------------------------------------------------------------------------






//---------------------------------------------------------------------------
// facebook login start
router.get("/facebook",
	passport.authenticate("facebook", {
	}));

// facebook auth callback
router.get("/facebook/auth",
	passport.authenticate("facebook", {
		// ATTN: to do -- add flash message to screen
		failureRedirect: '/login',
	}),

	function(req, res) {
		// Successful authentication, redirect home.
		JrResult.makeNew("info").pushSuccess("You have successfully logged in via Facebook.").storeInSession(req);
		res.redirect("/profile");
  	});
//---------------------------------------------------------------------------



//---------------------------------------------------------------------------
// twitter login start
router.get("/twitter",
	passport.authenticate("twitter", {
	}));

// twiter auth callback
router.get("/twitter/auth", function(req, res, next) {
	res.render("account/login_twitter", {
		message:"auth call"
	});
});
//---------------------------------------------------------------------------



//---------------------------------------------------------------------------
// simple login via email
router.get("/email", function(req, res, next) {
	res.render("account/login_email", {
	});
});



// user is posting login via email
router.post("/email", async function(req, res, next) {
	var message;
	var jrResult;

	// get email address provides
	var emailAddress = req.body.email;

	// lookup the user with this email address
	var user = await UserModel.findOneByEmail(emailAddress);
	if (user==null) {
		// error
		jrResult = UserModel.makeJrResultErrorNoUserFromField("email", emailAddress);
	} else {
		var userId = user.getId();
		jrResult = await VerificationModel.createVerificationOneTimeLoginTokenEmail(emailAddress, null, null, userId, null, null);
		if (!jrResult.isError()) {
			// success
			// we could REPLACE the succces result, or ADD info to it after the part about it sending successfully
			jrResult.pushSuccess("Check your mail for your link to login.");
			//jrResult = JrResult.makeNew().pushSuccess("Check your email for your login token.");
			// if we want we might redirect here -- perhaps to a page where they can type in verification token
			jrResult.storeInSession(req);
			return res.redirect('/');
		} else {
			// error, just pass it through
		}
	}

	// show the email login form
	res.render("account/login_email", {
		jrResult: jrResult,
		reqBody: req.body,
	});
});

//---------------------------------------------------------------------------









module.exports = router;
