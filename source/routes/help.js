/**
 * @module routes/admin
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 6/4/19
 * @description
 * Provides admin test routes
 */

"use strict";


// modules
const express = require("express");
const util = require("util");


// requirement service locator
const jrequire = require("../helpers/jrequire");

// helpers
const JrContext = require("../helpers/jrcontext");
const JrResult = require("../helpers/jrresult");
const jrdebug = require("../helpers/jrdebug");
const jrhExpress = require("../helpers/jrh_express");

// controllers
const adminAid = jrequire("adminaid");
const arserver = jrequire("arserver");











//---------------------------------------------------------------------------
function setupRouter(urlPath) {
	// create express router
	const router = express.Router();

	// setup routes
	router.get("/", routerGetIndex);

	router.get("/about", routerAbout);

	// return router
	return router;
}
//---------------------------------------------------------------------------




//---------------------------------------------------------------------------
// router functions


async function routerGetIndex(req, res, next) {
	const jrContext = JrContext.makeNew(req, res, next);
	res.render("help/index", {
		jrResult: jrContext.mergeSessionMessages(),
	});
}
//---------------------------------------------------------------------------



//---------------------------------------------------------------------------
async function routerAbout(req, res, next) {
	const jrContext = JrContext.makeNew(req, res, next);
	jrhExpress.sendJsonDataSuccess(jrContext, "about", arserver.getAboutInfo());
}
//---------------------------------------------------------------------------






module.exports = {
	setupRouter,
};
