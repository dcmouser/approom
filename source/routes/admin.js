// approom
// admin route
// v1.0.0 on 6/4/19 by mouser@donationcoder.com
//

"use strict";


// modules
const express = require("express");
// helpers
const JrResult = require("../helpers/jrresult");
const jrlog = require("../helpers/jrlog");

// models
const arserver = require("../models/server");

// init
const router = express.Router();



router.get("/", (req, res, next) => {
	res.render("admin/index", {
		jrResult: JrResult.sessionRenderResult(req, res),
	});
});











module.exports = router;
