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
const JrContext = require("../helpers/jrcontext");
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
	router.get("/database", routerGetDatabaseInfo);
	// router.get("/resourceuse", routerGetResourceuse);
	router.get("/serverinfo", routerGetServerinfo);
	router.get("/aclstructure", routerGetAclStructure);
	router.get("/nodejs", routerGetNodejs);
	router.get("/dependencies", routerDependencies);
	router.get("/plugins", routerPlugins);
	router.get("/appframeworks", routerAppFrameworks);

	// return router
	return router;
}
//---------------------------------------------------------------------------




//---------------------------------------------------------------------------
// router functions


async function routerGetIndex(req, res, next) {
	const jrContext = JrContext.makeNew(req, res, next);
	if (await arserver.aclRequireLoggedInSitePermissionRenderErrorPageOrRedirect(jrContext, appdef.DefAclActionAdminister)) {
		res.render("internals/index", {
			jrResult: jrContext.mergeSessionMessages(),
		});
	}
}


async function routerGetAppInfo(req, res, next) {
	const jrContext = JrContext.makeNew(req, res, next);
	if (await arserver.aclRequireLoggedInSitePermissionRenderErrorPageOrRedirect(jrContext, appdef.DefAclActionAdminister)) {
		const rawData = arserver.calcAppInfo();
		res.render("internals/appinfo", {
			rawData,
			jrResult: jrContext.mergeSessionMessages(),
		});
	}
}



//---------------------------------------------------------------------------
async function routerGetConfigOptions(req, res, next) {
	const jrContext = JrContext.makeNew(req, res, next);

	if (await arserver.aclRequireLoggedInSitePermissionRenderErrorPageOrRedirect(jrContext, appdef.DefAclActionAdminister)) {
		const rawData = arserver.getJrConfig().getDebugOptions();
		res.render("internals/config", {
			jrResult: jrContext.mergeSessionMessages(),
			rawData,
		});
	}
}


async function routerGetConfigFiles(req, res, next) {
	const jrContext = JrContext.makeNew(req, res, next);
	if (await arserver.aclRequireLoggedInSitePermissionRenderErrorPageOrRedirect(jrContext, appdef.DefAclActionAdminister)) {
		const rawData = arserver.getJrConfig().getDebugFiles();
		res.render("internals/config", {
			jrResult: jrContext.mergeSessionMessages(),
			rawData,
		});
	}
}

async function routerGetConfigHierarchy(req, res, next) {
	const jrContext = JrContext.makeNew(req, res, next);
	if (await arserver.aclRequireLoggedInSitePermissionRenderErrorPageOrRedirect(jrContext, appdef.DefAclActionAdminister)) {
		const rawData = arserver.getJrConfig().getDebugHierarchy();
		res.render("internals/config", {
			jrResult: jrContext.mergeSessionMessages(),
			rawData,
		});
	}
}
//---------------------------------------------------------------------------




//---------------------------------------------------------------------------
async function routerGetRoutes(req, res, next) {
	const jrContext = JrContext.makeNew(req, res, next);
	if (await arserver.aclRequireLoggedInSitePermissionRenderErrorPageOrRedirect(jrContext, appdef.DefAclActionAdminister)) {
		const rawData = arserver.calcExpressRoutePathData();
		res.render("internals/routes", {
			jrResult: jrContext.mergeSessionMessages(),
			rawData,
		});
	}
}


async function routerGetDatabaseInfo(req, res, next) {
	const jrContext = JrContext.makeNew(req, res, next);
	if (await arserver.aclRequireLoggedInSitePermissionRenderErrorPageOrRedirect(jrContext, appdef.DefAclActionAdminister)) {
		const rawData = await arserver.calcDatabaseInfo();
		res.render("internals/database", {
			jrResult: jrContext.mergeSessionMessages(),
			rawData,
		});
	}
}


async function routerGetServerinfo(req, res, next) {
	const jrContext = JrContext.makeNew(req, res, next);
	if (await arserver.aclRequireLoggedInSitePermissionRenderErrorPageOrRedirect(jrContext, appdef.DefAclActionAdminister)) {
		// get database resource use
		const rawData = await arserver.calcWebServerInformation();
		res.render("internals/serverinfo", {
			jrResult: jrContext.mergeSessionMessages(),
			rawData,
		});
	}
}


async function routerGetAclStructure(req, res, next) {
	const jrContext = JrContext.makeNew(req, res, next);
	if (await arserver.aclRequireLoggedInSitePermissionRenderErrorPageOrRedirect(jrContext, appdef.DefAclActionAdminister)) {
		// get database resource use
		const rawData = arserver.calcAclStructure();
		res.render("internals/aclstructure", {
			jrResult: jrContext.mergeSessionMessages(),
			rawData,
		});
	}
}


async function routerGetNodejs(req, res, next) {
	const jrContext = JrContext.makeNew(req, res, next);
	if (await arserver.aclRequireLoggedInSitePermissionRenderErrorPageOrRedirect(jrContext, appdef.DefAclActionAdminister)) {
		// get database resource use
		const rawData = arserver.calcNodeJsInfo();
		res.render("internals/nodejs", {
			jrResult: jrContext.mergeSessionMessages(),
			rawData,
		});
	}
}


async function routerDependencies(req, res, next) {
	const jrContext = JrContext.makeNew(req, res, next);
	if (await arserver.aclRequireLoggedInSitePermissionRenderErrorPageOrRedirect(jrContext, appdef.DefAclActionAdminister)) {
		// get database resource use
		const rawData = arserver.calcDependencyInfo();
		res.render("internals/dependencies", {
			jrResult: jrContext.mergeSessionMessages(),
			rawData,
		});
	}
}


async function routerPlugins(req, res, next) {
	const jrContext = JrContext.makeNew(req, res, next);
	if (await arserver.aclRequireLoggedInSitePermissionRenderErrorPageOrRedirect(jrContext, appdef.DefAclActionAdminister)) {
		// get database resource use
		const rawData = arserver.calcAddonCollectionInfoPlugins();
		res.render("internals/addoncollections", {
			jrResult: jrContext.mergeSessionMessages(),
			collectionName: "plugins",
			rawData,
		});
	}
}



async function routerAppFrameworks(req, res, next) {
	const jrContext = JrContext.makeNew(req, res, next);
	if (await arserver.aclRequireLoggedInSitePermissionRenderErrorPageOrRedirect(jrContext, appdef.DefAclActionAdminister)) {
		// get database resource use
		const rawData = arserver.calcAddonCollectionInfoAppFrameworks();
		res.render("internals/addoncollections", {
			jrResult: jrContext.mergeSessionMessages(),
			collectionName: "appFrameworks",
			rawData,
		});
	}
}
//---------------------------------------------------------------------------




module.exports = {
	setupRouter,
};
