// index
// home page route
// v1.0.0 on 5/1/19 by mouser@donationcoder.com
//

"use strict";


// modules
const express = require("express");

// models
const arserver = require("../controllers/server");

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

// homepage
async function routerGetIndex(req, res, next) {

	// ignore any previous login diversions
	// NOTE: we have to be careful about this to make sure nothing like the email token onetime login redirects here after login token sent, or we will forget diverted url info
	arserver.forgetLoginDiversions(req);

	// render view
	res.render("index", {
		jrResult: JrResult.sessionRenderResult(req, res),
		title: "AppRoom",
	});
}
//---------------------------------------------------------------------------




module.exports = {
	setupRouter,
};
