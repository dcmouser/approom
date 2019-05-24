// approom
// login route
// v1.0.0 on 5/1/19 by mouser@donationcoder.com
//

"use strict";


// modules
const express = require("express");
// passport authentication stuff
const passport = require("passport");
//
const arserver = require("../models/server");
//
const jrlog = require("../helpers/jrlog");
const JrResult = require("../helpers/jrresult");
//
const UserModel = require("../models/user");
const VerificationModel = require("../models/verification");

// init
const router = express.Router();


// process routes



//---------------------------------------------------------------------------
// simple login, present form
router.get("/", function(req, res, next) {
	// grab pending session errors to display
	// render page
	res.render("account/login", {
		jrResult: JrResult.restoreFromSession(req)
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
			if (false) {
				info.pushBiFieldError("password", "fix password", "In this day and age you really need a longer password");
				info.pushMessage("Just a message1");
				info.pushMessage("Another mesage2");
				info.pushError("Generic error");
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

	// get email address provides
	var emailAddress = req.body.email;

	// lookup the user with this email address
	var user = await UserModel.findOneByEmail(emailAddress);
	if (user==null) {
		message = 'Failed to find user with this email address.'
	} else {
		var userId = user.getId();
		var bretv = await VerificationModel.createVerificationOneTimeLoginTokenEmail(emailAddress, null, null, userId, null, null);
		if (bretv) {
			message = 'Check your email for your login token.';
		} else {
			message = 'Failed to send login token.';
		}
	}

	res.render("account/login_email", {message: message});
});

//---------------------------------------------------------------------------









module.exports = router;
