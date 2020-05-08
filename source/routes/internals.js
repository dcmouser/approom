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

// constants
const appdef = jrequire("appdef");











//---------------------------------------------------------------------------
function setupRouter(urlPath) {
	// create express router
	const router = express.Router();

	// setup routes
	router.get("/", routerGetIndex);
	router.get("/appinfo", routerGetAppInfo);
	router.get("/config_options", routerGetConfigOptions);
	router.get("/config_files", routerGetConfigFiles);
	router.get("/config_hierarchy", routerGetConfigHierarchy);
	router.get("/routes", routerGetRoutes);
	router.get("/structure_db", routerGetStructureDb);
	router.get("/resourceuse", routerGetResourceuse);
	router.get("/serverinfo", routerGetServerinfo);
	router.get("/aclstructure", routerGetAclStructure);
	router.get("/nodejs", routerGetNodejs);
	router.get("/dependencies", routerDependencies);
	router.get("/plugins", routerPlugins);

	// return router
	return router;
}
//---------------------------------------------------------------------------




//---------------------------------------------------------------------------
// router functions


async function routerGetIndex(req, res, next) {
	if (await arserver.aclRequireLoggedInSitePermission(appdef.DefAclActionAdminister, req, res)) {
		res.render("internals/index", {
			jrResult: JrResult.getMergeSessionResultAndClear(req, res),
		});
	}
}


async function routerGetAppInfo(req, res, next) {
	if (await arserver.aclRequireLoggedInSitePermission(appdef.DefAclActionAdminister, req, res)) {
		var rawData = arserver.calcAppInfo();
		res.render("internals/appinfo", {
			rawData,
			jrResult: JrResult.getMergeSessionResultAndClear(req, res),
		});
	}
}



//---------------------------------------------------------------------------
async function routerGetConfigOptions(req, res, next) {
	// await arserver.adminPermissionRenderRawData(req, res, () => {} );

	if (await arserver.aclRequireLoggedInSitePermission(appdef.DefAclActionAdminister, req, res)) {
		var rawData = arserver.getJrConfig().getDebugOptions();
		res.render("internals/config", {
			rawData,
			jrResult: JrResult.getMergeSessionResultAndClear(req, res),
		});
	}
}


async function routerGetConfigFiles(req, res, next) {
	if (await arserver.aclRequireLoggedInSitePermission(appdef.DefAclActionAdminister, req, res)) {
		var rawData = arserver.getJrConfig().getDebugFiles();
		res.render("internals/config", {
			rawData,
			jrResult: JrResult.getMergeSessionResultAndClear(req, res),
		});
	}
}

async function routerGetConfigHierarchy(req, res, next) {
	if (await arserver.aclRequireLoggedInSitePermission(appdef.DefAclActionAdminister, req, res)) {
		var rawData = arserver.getJrConfig().getDebugHierarchy();
		res.render("internals/config", {
			rawData,
			jrResult: JrResult.getMergeSessionResultAndClear(req, res),
		});
	}
}
//---------------------------------------------------------------------------



async function routerGetRoutes(req, res, next) {
	if (await arserver.aclRequireLoggedInSitePermission(appdef.DefAclActionAdminister, req, res)) {
		var rawData = arserver.calcExpressRoutePathData();
		res.render("internals/routes", {
			rawData,
			jrResult: JrResult.getMergeSessionResultAndClear(req, res),
		});
	}
}


async function routerGetStructureDb(req, res, next) {
	if (await arserver.aclRequireLoggedInSitePermission(appdef.DefAclActionAdminister, req, res)) {
		var rawData = await arserver.calcDatabaseStructure();
		res.render("internals/structure_db", {
			rawData,
			jrResult: JrResult.getMergeSessionResultAndClear(req, res),
		});
	}
}


async function routerGetResourceuse(req, res, next) {
	if (await arserver.aclRequireLoggedInSitePermission(appdef.DefAclActionAdminister, req, res)) {
		// get database resource use
		var rawDataDb = await arserver.calcDatabaseResourceUse();
		res.render("internals/resourceuse", {
			rawDataDb,
			jrResult: JrResult.getMergeSessionResultAndClear(req, res),
		});
	}
}


async function routerGetServerinfo(req, res, next) {
	if (await arserver.aclRequireLoggedInSitePermission(appdef.DefAclActionAdminister, req, res)) {
		// get database resource use
		var rawData = await arserver.calcWebServerInformation();
		res.render("internals/serverinfo", {
			rawData,
			jrResult: JrResult.getMergeSessionResultAndClear(req, res),
		});
	}
}


async function routerGetAclStructure(req, res, next) {
	if (await arserver.aclRequireLoggedInSitePermission(appdef.DefAclActionAdminister, req, res)) {
		// get database resource use
		var rawData = arserver.calcAclStructure();
		res.render("internals/aclstructure", {
			rawData,
			jrResult: JrResult.getMergeSessionResultAndClear(req, res),
		});
	}
}


async function routerGetNodejs(req, res, next) {
	if (await arserver.aclRequireLoggedInSitePermission(appdef.DefAclActionAdminister, req, res)) {
		// get database resource use
		var rawData = arserver.calcNodeJsInfo();
		res.render("internals/nodejs", {
			rawData,
			jrResult: JrResult.getMergeSessionResultAndClear(req, res),
		});
	}
}


async function routerDependencies(req, res, next) {
	if (await arserver.aclRequireLoggedInSitePermission(appdef.DefAclActionAdminister, req, res)) {
		// get database resource use
		var rawData = arserver.calcDependencyInfo();
		res.render("internals/dependencies", {
			rawData,
			jrResult: JrResult.getMergeSessionResultAndClear(req, res),
		});
	}
}


async function routerPlugins(req, res, next) {
	if (await arserver.aclRequireLoggedInSitePermission(appdef.DefAclActionAdminister, req, res)) {
		// get database resource use
		var rawData = arserver.calcPluginInfo();
		res.render("internals/plugins", {
			rawData,
			jrResult: JrResult.getMergeSessionResultAndClear(req, res),
		});
	}
}
//---------------------------------------------------------------------------




module.exports = {
	setupRouter,
};
