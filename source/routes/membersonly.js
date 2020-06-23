/**
 * @module routes/membersonly
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 5/1/19
 * @description
 * members only test route
 * @todo Remove this route eventually, it's only used for testing
 */

"use strict";


// modules
const express = require("express");

// helpers
const JrContext = require("../helpers/jrcontext");


// requirement service locator
const jrequire = require("../helpers/jrequire");

// controllers
const arserver = jrequire("arserver");














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
	const jrContext = JrContext.makeNew(req, res, next);

	// require them to be logged in, or creates a redirect
	const user = await arserver.lookupLoggedInUser(jrContext);
	if (!arserver.requireUserIsLoggedInRenderErrorPageOrRedirect(jrContext, user, "/membersonly")) {
		// all done
		return;
	}

	res.render("user/membersonly", {
		jrResult: jrContext.mergeSessionMessages(),
		username: user.getUsername(),
		id: user.getIdAsString(),
	});
}
//---------------------------------------------------------------------------





module.exports = {
	setupRouter,
};
