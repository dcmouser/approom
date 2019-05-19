// approom
// message route
// v1.0.0 on 5/1/19 by mouser@donationcoder.com
//


"use strict";


// modules
const express = require("express");
//
const arserver = require("../models/server");
const jrlog = require("../helpers/jrlog");

// init
const router = express.Router();


// process routes


// simple login, present form
router.get("/", function(req, res, next) {
	res.render("message", {message: "TEST MSG FROM MESSAGE ROUTE"});
});






module.exports = router;
