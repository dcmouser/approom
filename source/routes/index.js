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


// requirement service locator
const jrequire = require("../helpers/jrequire");

// controllers
const arserver = jrequire("arserver");

// helpers
const JrContext = require("../helpers/jrcontext");
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

// homepage
async function routerGetIndex(req, res, next) {
	const jrContext = JrContext.makeNew(req, res, next);

	// ignore any previous login diversions
	// NOTE: we have to be careful about this to make sure nothing like the email token onetime login redirects here after login token sent, or we will forget diverted url info
	arserver.clearLastSessionedDivertedUrl(jrContext);

	// render view
	res.render("index", {
		jrResult: jrContext.mergeSessionMessages(),
		title: "AppRoom",
	});
}
//---------------------------------------------------------------------------




module.exports = {
	setupRouter,
};
