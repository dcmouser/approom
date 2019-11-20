/**
 * @module helpers/jrequire
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 11/16/19
 * @description
 * Service locator to make module dependencies more flexible..
 * The basic idea is that for a framework, one wants to be able to decouple dependencies so that one could swap in a replacement module easily.
 * For example, imagine a framework with different classes for users, resources, etc., which are tightly coupled and co-dependent, where
 * one would like to use the framework but swap out a class for a replacement (derived) class.
 * The approach here is to use a singleton centralized registry of modules used by a framework, and allow an initial setup to change the mappings from names to modules.
 * Use as a replacement for require, after modules/paths have been registered.
 * This is meant to be used as a singleton -- a global central requirement loader for our classes.
 * It is only meant to be used for modules that one might want to swap out with replacements when using a given framework.
 *
 * @todo
 * Force use of a namespace along with names, to avoid collissions.
 *
 * @see <a href="https://www.amazon.com/Node-js-Design-Patterns-server-side-applications/dp/1785885588">NodeJs Patterns book</a>
 */

"use strict";





//---------------------------------------------------------------------------
// module global
const requires = {};
const requirePaths = {};

// we normally used deferred loading, which is better if we might replace a path before it's needed
var flagDeferredLoading = true;
//---------------------------------------------------------------------------






//---------------------------------------------------------------------------
/**
 * Register a new module dependency by its path.
 * @example jrequire.registerPath("helper", require.path("accessories/helper"));
 *
 * @param {string} name - the same to store the requirement under (can include / . etc)
 * @param {string} requirePath - full path to pass to the require module
 */
function registerPath(name, requirePath) {

	// save the path for this name
	requirePaths[name] = requirePath;

	// console.log("In registerPath: " + name);
	// console.log("In registerPath: " + name + " at path " + requirePath);

	if (require[name]) {
		// already exists, so it is being replaced for subsequent jrequire(name)
		console.log("Warning: In jrequire.registerPath, replacing requirement of " + name + ".");
		// delete any current cached require
		delete require[name];
	}

	if (!flagDeferredLoading) {
		// we normally defer loading, especially useful if we might replace requirement modules after a default init; but for testing we might do it now
		// console.log("In registerPath, immediate load of: " + name);
		requires[name] = require(requirePath);
	}
}


/**
 * Register a new module dependency by directly passing in the result of require()
 * @example jrequire.registerRequire("helper", require("accessories/helper"));
 *
 * @param {string} name - the same to store the requirement under (can include / . etc)
 * @param {object} requireResult - result of a require statement on a module
 */
function registerRequire(name, requireResult) {
	requires[name] = requireResult;
	requirePaths[name] = "path unknown";
}


/**
 * Substitute for the normal cached require() statement
 *
 * @param {string} name - name used to register previously
 * @returns result of previous require statement
 */
function jrequire(name) {
	if (requires[name]) {
		return requires[name];
	}
	if (requirePaths[name]) {
		// deferred, so require it now
		// console.log("Deferred loading of module: " + name);
		requires[name] = require(requirePaths[name]);
		// return it if it succeeded
		if (requires[name]) {
			return requires[name];
		}
	}

	// not found
	var emsg = "In jrequire: The following module was requested to be loaded but was not registered with jrequire: " + name;
	if (Object.keys(requires).length === 0 && Object.keys(requirePaths).length === 0) {
		emsg += ".  ATTENTION: No modules were registered with jrequire -- did you forget to register your module paths?";
	}
	throw new Error(emsg);
}



/**
 * Just return an object with debugging information suitable for display
 *
 * @returns debug object with info on named and paths
 */
function calcDebugInfo() {
	return requirePaths;
}


/**
 * Set the deferred loading flag
 *
 * @param {boolean} val
 */
function setDeferredLoading(val) {
	flagDeferredLoading = val;
}
//---------------------------------------------------------------------------




//---------------------------------------------------------------------------
// set these on top of the main function for access to them (weird nodejs pattern)
// in this way we can export just the one main function (jrequire), but the other functions can be invoked by doing jrequire.registerPath etc...
jrequire.registerPath = registerPath;
jrequire.registerRequire = registerRequire;
jrequire.calcDebugInfo = calcDebugInfo;
jrequire.setDeferredLoading = setDeferredLoading;
//---------------------------------------------------------------------------




// our sole export is the main function
module.exports = jrequire;
