/**
 * @module routes/app
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 10/28/19
 * @description
 * routes for admins to discover diagnostic internal structure info about the system
 */

"use strict";


// modules
const express = require("express");


// requirement service locator
const jrequire = require("../helpers/jrequire");

// controllers
const arserver = jrequire("arserver");

// helpers
const JrResult = require("../helpers/jrresult");













//---------------------------------------------------------------------------
function setupRouter(urlPath) {
	// create express router
	const router = express.Router();

	// setup routes
	router.get("/", routerGetIndex);
	router.get("/config_options", routerGetConfigOptions);
	router.get("/routes", routerGetRoutes);
	router.get("/structure_db", routerGetStructureDb);
	router.get("/resourceuse", routerGetResourceuse);
	router.get("/serverinfo", routerGetServerinfo);
	router.get("/aclinfo", routerGetAclinfo);
	router.get("/nodejs", routerGetNodejs);
	router.get("/dependencies", routerDependencies);

	// return router
	return router;
}
//---------------------------------------------------------------------------




//---------------------------------------------------------------------------
// router functions


async function routerGetIndex(req, res, next) {
	if (!await arserver.requireLoggedInSitePermission("admin", req, res)) {
		// all done
		return;
	}

	res.render("internals/index", {
		jrResult: JrResult.getMergeSessionResultAndClear(req, res),
	});
}


async function routerGetConfigOptions(req, res, next) {
	if (!await arserver.requireLoggedInSitePermission("admin", req, res)) {
		// all done
		return;
	}

	var rawData = arserver.getJrConfig().getDebugObj();
	res.render("internals/config_options", {
		rawData,
		jrResult: JrResult.getMergeSessionResultAndClear(req, res),
	});
}


async function routerGetRoutes(req, res, next) {
	if (!await arserver.requireLoggedInSitePermission("admin", req, res)) {
		// all done
		return;
	}

	var rawData = arserver.calcExpressRoutePathData();
	res.render("internals/routes", {
		rawData,
		jrResult: JrResult.getMergeSessionResultAndClear(req, res),
	});
}


async function routerGetStructureDb(req, res, next) {
	if (!await arserver.requireLoggedInSitePermission("admin", req, res)) {
		// all done
		return;
	}

	var rawData = await arserver.calcDatabaseStructure();
	res.render("internals/structure_db", {
		rawData,
		jrResult: JrResult.getMergeSessionResultAndClear(req, res),
	});
}


async function routerGetResourceuse(req, res, next) {
	if (!await arserver.requireLoggedInSitePermission("admin", req, res)) {
		// all done
		return;
	}

	// get database resource use
	var rawDataDb = await arserver.calcDatabaseResourceUse();

	res.render("internals/resourceuse", {
		rawDataDb,
		jrResult: JrResult.getMergeSessionResultAndClear(req, res),
	});
}


async function routerGetServerinfo(req, res, next) {
	if (!await arserver.requireLoggedInSitePermission("admin", req, res)) {
		// all done
		return;
	}

	// get database resource use
	var rawData = await arserver.calcWebServerInformation();

	res.render("internals/serverinfo", {
		rawData,
		jrResult: JrResult.getMergeSessionResultAndClear(req, res),
	});
}


async function routerGetAclinfo(req, res, next) {
	if (!await arserver.requireLoggedInSitePermission("admin", req, res)) {
		// all done
		return;
	}

	// get database resource use
	var rawData = arserver.calcAclInfo();

	res.render("internals/aclinfo", {
		rawData,
		jrResult: JrResult.getMergeSessionResultAndClear(req, res),
	});
}


async function routerGetNodejs(req, res, next) {
	if (!await arserver.requireLoggedInSitePermission("admin", req, res)) {
		// all done
		return;
	}

	// get database resource use
	var rawData = arserver.calcNodeJsInfo();

	res.render("internals/nodejs", {
		rawData,
		jrResult: JrResult.getMergeSessionResultAndClear(req, res),
	});
}


async function routerDependencies(req, res, next) {
	if (!await arserver.requireLoggedInSitePermission("admin", req, res)) {
		// all done
		return;
	}

	// get database resource use
	var rawData = arserver.calcDependencyInfo();

	res.render("internals/dependencies", {
		rawData,
		jrResult: JrResult.getMergeSessionResultAndClear(req, res),
	});
}
//---------------------------------------------------------------------------






module.exports = {
	setupRouter,
};
