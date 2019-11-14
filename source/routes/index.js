/**
 * @module routes/index
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 10/28/19
 * @description
 * home page route
 */

"use strict";


// modules
const express = require("express");

// models
const arserver = require("../controllers/arserver");

// helpers
const JrResult = require("../helpers/jrresult");

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

// homepage
async function routerGetIndex(req, res, next) {

	// ignore any previous login diversions
	// NOTE: we have to be careful about this to make sure nothing like the email token onetime login redirects here after login token sent, or we will forget diverted url info
	arserver.forgetLoginDiversions(req);

	// render view
	res.render("index", {
		jrResult: JrResult.getMergeSessionResultAndClear(req, res),
		title: "AppRoom",
	});
}
//---------------------------------------------------------------------------




module.exports = {
	setupRouter,
};
