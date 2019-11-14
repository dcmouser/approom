// approom
// logout route
// v1.0.0 on 5/1/19 by mouser@donationcoder.com
//

"use strict";


// modules
const express = require("express");

// models
const arserver = require("../controllers/arserver");

// helpers
const JrResult = require("../helpers/jrresult");

// express router
const router = express.Router();


// module variable to remember base url path of router
var routerBaseUrlPath;


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
