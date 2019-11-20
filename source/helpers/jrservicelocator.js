/**
 * @module helpers/jrservice
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 11/16/19
 * @description
 * Service locator to make module dependencies more flexible
 *
 * @see <a href="https://www.amazon.com/Node-js-Design-Patterns-server-side-applications/dp/1785885588">NodeJs Patterns book</a>
 */

"use strict";


// modules
const util = require("util");



//---------------------------------------------------------------------------
// module global
const requires = {};
const requirePaths = {};
//---------------------------------------------------------------------------




//---------------------------------------------------------------------------
class JrServiceLocator {

	//---------------------------------------------------------------------------
	// constructor
	constructor() {
	}

	// global singleton request
	static getSingleton(...args) {
		// we could do this more simply by just exporting a new instance as module export, but we wrap a function for more flexibility
		if (this.globalSingleton === undefined) {
			this.globalSingleton = new JrServiceLocator(...args);
		}
		return this.globalSingleton;
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	registerPath(name, requirePath) {
		requirePaths[name] = requirePath;
		requires[name] = require(requirePath);
	}

	registerRequire(name, requireResult) {
		requires[name] = requireResult;
		requirePaths[name] = "path unknown";
	}

	require(name) {
		if (requires[name]) {
			return requires[name];
		}
		// not found
		throw new Error("In JrServiceLocator requires replacement, cannot find module: " + name);
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	calcDebugInfo() {
		return requirePaths;
	}
	//---------------------------------------------------------------------------


}
//---------------------------------------------------------------------------





// our sole export is this function
module.exports = JrServiceLocator.getSingleton();
