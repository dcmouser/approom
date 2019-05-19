// approom
// login route
// v1.0.0 on 5/1/19 by mouser@donationcoder.com
//


"use strict";


// modules
const express = require("express");
// passport authentication stuff
const passport = require("passport");
const passportLocal = require("passport-local");
//
const arserver = require("../models/server");
const jrlog = require("../helpers/jrlog");

// init
const router = express.Router();


// process routes



//---------------------------------------------------------------------------
// simple login, present form
router.get("/", function(req, res, next) {
	res.render("login", {});
});

// user is posting login form
// see https://www.sitepoint.com/local-authentication-using-passport-node-js/
router.post("/", 
	// ask passport to authenticate the local login
	passport.authenticate('local', {
		failureRedirect: "/message"
		}),
	function(req, res) {
		// called on success
 		res.redirect("/profile");
	});
//---------------------------------------------------------------------------



//---------------------------------------------------------------------------
// facebook login start
router.get("/facebook", passport.authenticate("facebook"));

// facebook auth callback
router.get("/facebook/auth", passport.authenticate("facebook", {
	// ATTN: to do -- add flash message to screen
	failureRedirect: '/login' }),
	function(req, res) {
    	// Successful authentication, redirect home.
		res.redirect("/profile");
  	});
//---------------------------------------------------------------------------



//---------------------------------------------------------------------------
// twitter login start
router.get("/twitter", passport.authenticate("facebook"));

// twiter auth callback
router.get("/twitter/auth", function(req, res, next) {
	res.render("login_twitter", {message:"auth call"});
});
//---------------------------------------------------------------------------








module.exports = router;
