// approom
// profile route
// v1.0.0 on 5/1/19 by mouser@donationcoder.com
//

"use strict";


// modules
const express = require("express");

// helpers
const JrResult = require("../helpers/jrresult");
const jrlog = require("../helpers/jrlog");

// models
const UserModel = require("../models/user");

// controllers
const arserver = require("../controllers/server");
const CrudAid = require("../controllers/crudaid");

// express router
const router = express.Router();



function setupRouter(urlPath) {

	//---------------------------------------------------------------------------
	// based on crudaid code
	// edit (get)
	const viewFilePathEdit = {
		viewFile: "user/profile",
		isGeneric: true,
	};

	const modelClass = UserModel;


	// edit profile (get)
	router.get("/edit", async (req, res, next) => {
		// require them to be logged in, or creates a redirect
		var user = await arserver.getLoggedInUser(req);
		if (!arserver.requireUserIsLoggedIn(req, res, user, urlPath + "/edit")) {
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

		// hand off work to CrudAid
		var bretv = await CrudAid.handleEditGet(req, res, next, modelClass, "", viewFilePathEdit, extraViewData);
	});




	// edit profile (post submit)
	router.post("/edit", async (req, res, next) => {
		// require them to be logged in, or creates a redirect
		var user = await arserver.getLoggedInUser(req);
		if (!arserver.requireUserIsLoggedIn(req, res, user, urlPath + "/edit")) {
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

		// hand off work to CrudAid
		var bretv = await CrudAid.handleEditPost(req, res, next, modelClass, "", viewFilePathEdit, extraViewData);
		if (!bretv) {
			// just send them back to profile edit
			res.redirect(urlPath + "/edit");
		}
	});
	//---------------------------------------------------------------------------





	//---------------------------------------------------------------------------
	router.get("/", async (req, res, next) => {

		// require them to be logged in, or creates a redirect
		var user = await arserver.getLoggedInUser(req);
		if (!arserver.requireUserIsLoggedIn(req, res, user, urlPath)) {
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
			jrResult: JrResult.sessionRenderResult(req, res),
			extraViewData,
		});
	});
	//---------------------------------------------------------------------------


	// need to return router
	return router;
}



module.exports = {
	setupRouter,
};
