/**
 * @module routes/logout
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 5/1/19
 * @description
 * logout route
 */

"use strict";


// modules
const express = require("express");


// helpers
const JrContext = require("../helpers/jrcontext");
const JrResult = require("../helpers/jrresult");

// requirement service locator
const jrequire = require("../helpers/jrequire");

// controllers
const arserver = jrequire("arserver");










//---------------------------------------------------------------------------
function setupRouter(urlPath) {
	// create express router
	const router = express.Router();

	// setup routes
	router.get("/", routerGetIndex);

	// return router
	return router;
}
//---------------------------------------------------------------------------




//---------------------------------------------------------------------------
// router functions
async function routerGetIndex(req, res, next) {
	const jrContext = JrContext.makeNew(req, res, next);
	// remove all?most? session data that the user might want forgotten and log them out
	arserver.clearSessionDataForUserOnLogout(jrContext, false);

	// session message
	jrContext.pushSuccess("You have been logged out.");
	jrContext.addToThisSession();

	res.redirect("/");
}
//---------------------------------------------------------------------------



module.exports = {
	setupRouter,
};
