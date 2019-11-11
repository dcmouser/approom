// approom
// app route
// v1.0.0 on 10/28/19 by mouser@donationcoder.com
//

"use strict";


// modules
const express = require("express");

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
	res.render("app/index", {
		jrResult: JrResult.sessionRenderResult(req, res),
		title: "App Route",
	});
}
//---------------------------------------------------------------------------



module.exports = {
	setupRouter,
};
