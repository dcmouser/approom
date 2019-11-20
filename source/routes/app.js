/**
 * @module routes/app
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 10/28/19
 * @description
 * app related routes
 */

"use strict";


// modules
const express = require("express");

// helpers
const JrResult = require("../helpers/jrresult");

// requirement service locator
const jrequire = require("../helpers/jrequire");


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
	res.render("app/index", {
		jrResult: JrResult.getMergeSessionResultAndClear(req, res),
		title: "App Route",
	});
}
//---------------------------------------------------------------------------



module.exports = {
	setupRouter,
};
