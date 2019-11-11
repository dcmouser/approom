// approom
// room route
// v1.0.0 on 10/28/19 by mouser@donationcoder.com
//
// Room routes:
// create - create a new room for a specified app
// join - join a room so we can receive and send messages to others in it
// filelist - list files available in the room
// filedownload - download a specific file
// fileupload - uplate a file to the room
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
		jrResult: JrResult.sessionRenderResult(req, res),
		title: "Room Route",
	});
}
//---------------------------------------------------------------------------




module.exports = {
	setupRouter,
};
