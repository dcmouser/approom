// approom
// internals route
// v1.0.0 on 10/31/19 by mouser@donationcoder.com
//
// route for admins to find info about the site

"use strict";

// modules
const express = require("express");

// helpers
const JrResult = require("../helpers/jrresult");
const jrlog = require("../helpers/jrlog");

// models
const arserver = require("../controllers/server");

// express router
const router = express.Router();


// module variable to remember base url path of router
var routerBaseUrlPath;



//---------------------------------------------------------------------------
function setupRouter(urlPath) {
	// save urlPath (in module locals)
	routerBaseUrlPath = urlPath;

	// setup routes
	router.get("/", routerGetIndex);
	router.get("/config_options", routerGetConfigOptions);
	router.get("/routes", routerGetRoutes);
	router.get("/structure_db", routerGetStructureDb);
	router.get("/resourceuse", routerGetResourceuse);
	router.get("/serverinfo", routerGetServerinfo);
	router.get("/aclinfo", routerGetAclinfo);
	router.get("/nodejs", routerGetNodejs);

	// return router
	return router;
}
//---------------------------------------------------------------------------




//---------------------------------------------------------------------------
// router functions


async function routerGetIndex(req, res, next) {
	if (!await arserver.requireLoggedInSitePermission("admin", req, res, routerBaseUrlPath)) {
		// all done
		return;
	}

	res.render("internals/index", {
		jrResult: JrResult.sessionRenderResult(req, res),
	});
}


async function routerGetConfigOptions(req, res, next) {
	if (!await arserver.requireLoggedInSitePermission("admin", req, res, routerBaseUrlPath)) {
		// all done
		return;
	}

	var rawData = arserver.getJrConfig().getDebugObj();
	res.render("internals/config_options", {
		rawData,
		jrResult: JrResult.sessionRenderResult(req, res),
	});
}


async function routerGetRoutes(req, res, next) {
	if (!await arserver.requireLoggedInSitePermission("admin", req, res, routerBaseUrlPath)) {
		// all done
		return;
	}

	var rawData = arserver.calcExpressRoutePathData();
	res.render("internals/routes", {
		rawData,
		jrResult: JrResult.sessionRenderResult(req, res),
	});
}


async function routerGetStructureDb(req, res, next) {
	if (!await arserver.requireLoggedInSitePermission("admin", req, res, routerBaseUrlPath)) {
		// all done
		return;
	}

	var rawData = await arserver.calcDatabaseStructure();
	res.render("internals/structure_db", {
		rawData,
		jrResult: JrResult.sessionRenderResult(req, res),
	});
}


async function routerGetResourceuse(req, res, next) {
	if (!await arserver.requireLoggedInSitePermission("admin", req, res, routerBaseUrlPath)) {
		// all done
		return;
	}

	// get database resource use
	var rawDataDb = await arserver.calcDatabaseResourceUse();

	res.render("internals/resourceuse", {
		rawDataDb,
		jrResult: JrResult.sessionRenderResult(req, res),
	});
}


async function routerGetServerinfo(req, res, next) {
	if (!await arserver.requireLoggedInSitePermission("admin", req, res, routerBaseUrlPath)) {
		// all done
		return;
	}

	// get database resource use
	var rawData = await arserver.calcWebServerInformation();

	res.render("internals/serverinfo", {
		rawData,
		jrResult: JrResult.sessionRenderResult(req, res),
	});
}


async function routerGetAclinfo(req, res, next) {
	if (!await arserver.requireLoggedInSitePermission("admin", req, res, routerBaseUrlPath)) {
		// all done
		return;
	}

	// get database resource use
	var rawData = arserver.calcAclInfo();

	res.render("internals/aclinfo", {
		rawData,
		jrResult: JrResult.sessionRenderResult(req, res),
	});
}


async function routerGetNodejs(req, res, next) {
	if (!await arserver.requireLoggedInSitePermission("admin", req, res, routerBaseUrlPath)) {
		// all done
		return;
	}

	// get database resource use
	var rawData = arserver.calcNodeJsInfo();

	res.render("internals/nodejs", {
		rawData,
		jrResult: JrResult.sessionRenderResult(req, res),
	});
}
//---------------------------------------------------------------------------






module.exports = {
	setupRouter,
};
