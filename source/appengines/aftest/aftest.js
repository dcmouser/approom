/**
 * @module appengine/testplugin
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 11/20/19
 * @description
 * A test appEngine
 */

"use strict";




//---------------------------------------------------------------------------
// module variables
const addonInfo = {
	author: "mouser@donationcoder.com",
	version: "v1.0 (11/20/19)",
};
//---------------------------------------------------------------------------



//---------------------------------------------------------------------------
async function hookInitialize(arserver) {
	// console.log("In aftest hookInitialize.");
}
//---------------------------------------------------------------------------



//---------------------------------------------------------------------------
async function hookSetupExpressRoutes(arserver, expressApp) {
	// console.log("In aftest hookSetupExpress.");

	// this appengine addon registers a new route with the server
	const urlPath = "/appengine/aftest";
	const routeModulePath = "./route";
	arserver.setupRouteModule(expressApp, urlPath, require(routeModulePath), require.resolve(routeModulePath));
}
//---------------------------------------------------------------------------



//---------------------------------------------------------------------------
function getInfo(arserver) {
	// just return some info for display (as object or string)
	return addonInfo;
}
//---------------------------------------------------------------------------





module.exports = {
	hookInitialize,
	hookSetupExpressRoutes,
	getInfo,
};
