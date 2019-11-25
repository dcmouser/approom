/**
 * @module routes/room
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 5/1/19
 * @description
 * room routes for working with the room objects
 */

"use strict";


// modules
const express = require("express");

// helpers
const JrResult = require("../helpers/jrresult");

// requirement service locator
const jrequire = require("../helpers/jrequire");













//---------------------------------------------------------------------------
function setupRouter(urlPath) {
	// create express router
	const router = express.Router();

	// setup route
	router.get("/", routerGetIndex);

	// return router
	return router;
}
//---------------------------------------------------------------------------



//---------------------------------------------------------------------------
// router functions

async function routerGetIndex(req, res, next) {
	res.render("room/index", {
		jrResult: JrResult.getMergeSessionResultAndClear(req, res),
		title: "Room Route",
	});
}
//---------------------------------------------------------------------------




module.exports = {
	setupRouter,
};
