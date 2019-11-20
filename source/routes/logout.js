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
const JrResult = require("../helpers/jrresult");

// requirement service locator
const jrequire = require("../helpers/jrequire");

// controllers
const arserver = jrequire("arserver");


// express router
const router = express.Router();



//---------------------------------------------------------------------------
// module variables

// remember base url path of router
var routerBaseUrlPath;
//---------------------------------------------------------------------------




//---------------------------------------------------------------------------
function setupRouter(urlPath) {
	// save urlPath (in module locals)
	routerBaseUrlPath = urlPath;

	// setup routes
	router.get("/", routerGetIndex);

	// return router
	return router;
}
//---------------------------------------------------------------------------




//---------------------------------------------------------------------------
// router functions
async function routerGetIndex(req, res, next) {

	// remove all?most? session data that the user might want forgotten and log them out
	arserver.logoutForgetSessionData(req);

	// session message
	JrResult.makeSuccess("You have been logged out.").addToSession(req);

	res.redirect("/");
}
//---------------------------------------------------------------------------



module.exports = {
	setupRouter,
};
