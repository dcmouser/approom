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
const JrContext = require("../helpers/jrcontext");
const JrResult = require("../helpers/jrresult");
const jrlog = require("../helpers/jrlog");
const jrhExpress = require("../helpers/jrh_express");
const jrhMisc = require("../helpers/jrh_misc");
const jrdebug = require("../helpers/jrdebug");

// requirement service locator
const jrequire = require("../helpers/jrequire");

// controllers
const arserver = jrequire("arserver");
const crudAid = jrequire("crudaid");

// models
const UserModel = jrequire("models/user");







//---------------------------------------------------------------------------
// module variables

// others
let viewFilePathEdit;
//---------------------------------------------------------------------------







function setupRouter(urlPath) {
	// create express router
	const router = express.Router();

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
// ATTN: it's not clear to me why we have this code here, except as a demonstration of how you can use crudAid functions OUTSIDE the normal crud system

async function routerGetEdit(req, res, next) {
	const jrContext = JrContext.makeNew(req, res, next);

	// require them to be logged in, or creates a redirect
	const user = await arserver.lookupLoggedInUser(jrContext);
	if (!arserver.requireUserIsLoggedInRenderErrorPageOrRedirect(jrContext, user)) {
		// all done
		return;
	}
	// ignore any previous login diversions
	arserver.clearLastSessionedDivertedUrl(jrContext);

	// extra info
	const passportUserInfo = jrhExpress.getReqPassportUsrStringified(jrContext, "not logged in");
	const extraViewData = {
		passportUserInfo,
	};

	// force id parameter to users profile (do we really need both?)
	// req.body._id = user.getIdAsString();
	req.params.id = user.getIdAsString();

	// hand off work to crudAid
	const bretv = await crudAid.handleEditGet(jrContext, next, UserModel, "", viewFilePathEdit, extraViewData);
}


// edit profile submit
// ATTN: it's not clear to me why we have this code here, except as a demonstration of how you can use crudAid functions OUTSIDE the normal crud system
async function routerPostEdit(req, res, next) {
	const jrContext = JrContext.makeNew(req, res, next);

	// require them to be logged in, or creates a redirect
	const user = await arserver.lookupLoggedInUser(jrContext);
	if (!arserver.requireUserIsLoggedInRenderErrorPageOrRedirect(jrContext, user)) {
		// all done
		return;
	}
	// ignore any previous login diversions
	arserver.clearLastSessionedDivertedUrl(jrContext);

	// extra info
	const passportUserInfo = jrhExpress.getReqPassportUsrStringified(jrContext, "not logged in");
	const extraViewData = {
		passportUserInfo,
	};

	// force id?
	// req.body._id = user.getIdAsString();
	// req.params.id = req.body._id;

	// hand off work to crudAid
	const bretv = await crudAid.handleEditPost(jrContext, UserModel, "", viewFilePathEdit, extraViewData);
	if (!bretv) {
		// error; just send them back to profile edit
		res.redirect(jrhExpress.reqOriginalUrl(req));
	}
}



async function routerGetIndex(req, res, next) {
	const jrContext = JrContext.makeNew(req, res, next);

	// require them to be logged in, or creates a redirect
	const user = await arserver.lookupLoggedInUser(jrContext);
	if (!arserver.requireUserIsLoggedInRenderErrorPageOrRedirect(jrContext, user)) {
		// all done
		return;
	}
	// ignore any previous login diversions
	arserver.clearLastSessionedDivertedUrl(jrContext);

	// load user roles
	// ATTTN: See user model for more, but basically the user roles will be INVISIBLE if we console log or stringify,
	// thanks to javascript and mongoose "magic".  welcome to hell.
	await user.loadRolesForUserIfNeeded();

	// extra info
	const passportUserInfo = jrhExpress.getReqPassportUsrStringified(jrContext, "not logged in");
	const extraViewData = {
		passportUserInfo,
		user,
		UserExtRoles: user.getLoadedRoles(),
	};

	res.render("user/profile", {
		jrResult: jrContext.mergeSessionMessages(),
		extraViewData,
	});

}
//---------------------------------------------------------------------------




module.exports = {
	setupRouter,
};
