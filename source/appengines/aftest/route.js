/**
 * @module appengines/aftest/route
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 7/7/20
 * @description
 * ##### Overview
 * Test appEngine route
*/

"use strict";


// modules
const express = require("express");

// requirement service locator
const jrequire = require("../../helpers/jrequire");

// controllers
const arserver = jrequire("arserver");

// helpers
const JrContext = require("../../helpers/jrcontext");
const jrhExpress = require("../../helpers/jrh_express");








//---------------------------------------------------------------------------
/**
 * Add the API routes
 *
 * @param {string} urlPath - the base path of these relative paths
 * @returns router object
 */
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

/**
 * @description
 * Handle the request for the api index page,
 *  which currently just shows a web page index of links to all of the api functions.
 * @todo Replace the template with some json reply, since api should only be machine callable.
 */
async function routerGetIndex(req, res, next) {
	const jrContext = JrContext.makeNew(req, res, next);
	jrhExpress.sendJsonDataSuccess(jrContext, "aftest route " + req.baseUrl + req.path + " processes successfully.", {});
}
//---------------------------------------------------------------------------















module.exports = {
	setupRouter,
};
