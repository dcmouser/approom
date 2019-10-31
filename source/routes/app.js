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


function setupRouter(urlPath) {

	router.get("/", async (req, res, next) => {
		res.render("app/index", {
			jrResult: JrResult.sessionRenderResult(req, res),
			title: "App Route",
		});
	});


	// need to return router
	return router;
}



module.exports = {
	setupRouter,
};
