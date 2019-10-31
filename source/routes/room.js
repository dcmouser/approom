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



function setupRouter(urlPath) {

	router.get("/", async (req, res, next) => {
		res.render("room/index", {
			jrResult: JrResult.sessionRenderResult(req, res),
			title: "Room Route",
		});
	});


	// need to return router
	return router;
}



module.exports = {
	setupRouter,
};