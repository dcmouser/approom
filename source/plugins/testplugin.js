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
const addonInfo = {
	author: "mouser@donationcoder.com",
	version: "v1.0 (11/20/19)",
};
//---------------------------------------------------------------------------



//---------------------------------------------------------------------------
async function hookInitialize(arserver) {
	console.log("Hello world from testplugin initialize()");
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
	getInfo,
};
