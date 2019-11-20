/**
 * @module routes/profile
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 5/1/19
 * @description
 * user profile route
 */

"use strict";


// modules
const express = require("express");


// helpers
const JrResult = require("../helpers/jrresult");
const jrlog = require("../helpers/jrlog");

// requirement service locator
const jrequire = require("../helpers/jrequire");

// controllers
const arserver = jrequire("arserver");
const crudAid = jrequire("crudaid");

// models
const UserModel = jrequire("models/user");







//---------------------------------------------------------------------------
// module variables

// remember base url path of router
var routerBaseUrlPath;

// others
var viewFilePathEdit;
//---------------------------------------------------------------------------







function setupRouter(urlPath) {
	// create express router
	const router = express.Router();

	// save urlPath (in module locals)
	routerBaseUrlPath = urlPath;
	// save local vars
	viewFilePathEdit = {
		viewFile: "user/profile",
		isGeneric: true,
	};

	// setup routes
	router.get("/edit", routerGetEdit);
	router.post("/edit", routerPostEdit);
	router.get("/", routerGetIndex);

	// return router
	return router;
}
//---------------------------------------------------------------------------




//---------------------------------------------------------------------------
// router functions


// edit profile form
async function routerGetEdit(req, res, next) {
	// require them to be logged in, or creates a redirect
	var user = await arserver.getLoggedInUser(req);
	if (!arserver.requireUserIsLoggedIn(req, res, user, routerBaseUrlPath + "/edit")) {
		// all done
		return;
	}
	// ignore any previous login diversions
	arserver.forgetLoginDiversions(req);

	// extra info
	var userInfo = (req.session.passport) ? JSON.stringify(req.session.passport.user, null, "  ") : "not logged in";
	var extraViewData = {
		userInfo,
	};

	// force id
	req.body._id = user.getIdAsString();
	req.params.id = req.body._id;

	// hand off work to crudAid
	var bretv = await crudAid.handleEditGet(req, res, next, UserModel, "", viewFilePathEdit, extraViewData);
}


// edit profile submit
async function routerPostEdit(req, res, next) {
	// require them to be logged in, or creates a redirect
	var user = await arserver.getLoggedInUser(req);
	if (!arserver.requireUserIsLoggedIn(req, res, user, routerBaseUrlPath + "/edit")) {
		// all done
		return;
	}
	// ignore any previous login diversions
	arserver.forgetLoginDiversions(req);

	// extra info
	var userInfo = (req.session.passport) ? JSON.stringify(req.session.passport.user, null, "  ") : "not logged in";
	var extraViewData = {
		userInfo,
	};

	// force id
	req.body._id = user.getIdAsString();
	req.params.id = req.body._id;

	// hand off work to crudAid
	var bretv = await crudAid.handleEditPost(req, res, next, UserModel, "", viewFilePathEdit, extraViewData);
	if (!bretv) {
		// just send them back to profile edit
		res.redirect(routerBaseUrlPath + "/edit");
	}
}



async function routerGetIndex(req, res, next) {

	// require them to be logged in, or creates a redirect
	var user = await arserver.getLoggedInUser(req);
	if (!arserver.requireUserIsLoggedIn(req, res, user, routerBaseUrlPath)) {
		// all done
		return;
	}
	// ignore any previous login diversions
	arserver.forgetLoginDiversions(req);

	// extra info
	var userInfo = (req.session.passport) ? JSON.stringify(req.session.passport.user, null, "  ") : "not logged in";
	var extraViewData = {
		userInfo,
	};

	res.render("user/profile", {
		jrResult: JrResult.getMergeSessionResultAndClear(req, res),
		extraViewData,
	});
}
//---------------------------------------------------------------------------




module.exports = {
	setupRouter,
};
