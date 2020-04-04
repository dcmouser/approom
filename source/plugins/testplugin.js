/**
 * @module plugins/testplugin
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 11/20/19
 * @description
 * A test plugin
 */

"use strict";


//---------------------------------------------------------------------------
// module variables
var pluginData = {
	label: "Test plugin",
	author: "mouser@donationcoder.com",
	version: "v1.0 (11/20/19)",
};
//---------------------------------------------------------------------------



//---------------------------------------------------------------------------
function initialize(arserver) {
	console.log("Hello world from testplugin initialize()");
}
//---------------------------------------------------------------------------



//---------------------------------------------------------------------------
function getDebugInfo(arserver) {
	// just return some info for display (as object or string)
	return pluginData;
}
//---------------------------------------------------------------------------





module.exports = {
	initialize,
	getDebugInfo,
};
