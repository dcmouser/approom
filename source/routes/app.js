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

// requirement service locator
const jrequire = require("../helpers/jrequire");

// helpers
const JrResult = require("../helpers/jrresult");











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
	res.render("app/index", {
		jrResult: JrResult.getMergeSessionResultAndClear(req, res),
		title: "App Route",
	});
}
//---------------------------------------------------------------------------



module.exports = {
	setupRouter,
};
