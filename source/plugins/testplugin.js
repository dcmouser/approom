/**
 * @module plugins/testplugin
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 11/20/19
 * @description
 * A test plugin
 */

"use strict";





function initialize(arserver) {
	console.log("Hello world from testplugin initialize()");
}




module.exports = {
	initialize,
};
