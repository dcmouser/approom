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
 * @see <a href="https://www.amazon.com/Node-js-Design-Patterns-server-side-applications/dp/1785885588">NodeJs Patterns book</a>
 */

"use strict";





//---------------------------------------------------------------------------
// module global
const requires = {};
const requirePaths = {};
const plugins = {};
const addonModules = {};
const addonModuleCategories = {};

// we normally used deferred loading, which is better if we might replace a path before it's needed; this can be overridden with call to setDeferredLoading(boolean)
let flagDeferredLoading = true;
//---------------------------------------------------------------------------






//---------------------------------------------------------------------------
/**
 * Register a new module dependency by its path.
 * @example jrequire.registerPath("helper", require.path("accessories/helper"));
 * @example jrequire.registerPath("coremod", "coremodule"); // where require(path) will resolve
 *
 * @param {string} name - the same to store the requirement under (can include / . etc)
 * @param {string} requirePath - full path to pass to the require module
 * ##### Notes
 *  * the requirePath can be a full path obtained via require.resolve() OR a path relative to where the jrequire.js module is, OR an npm registered module (might be useful for npm registered plugins)
 */
function registerPath(name, requirePath) {

	// save the path for this name
	requirePaths[name] = requirePath;

	if (require[name]) {
		// already exists, so it is being replaced for subsequent jrequire(name)
		console.log("Warning: In jrequire.registerPath, replacing requirement of " + name + ".");
		// delete any current cached require
		delete require[name];
	}

	if (!flagDeferredLoading) {
		// we normally defer loading, especially useful if we might replace requirement modules after a default init; but for testing we might do it now
		// console.log("In registerPath, immediate load of: " + name);
		requires[name] = require(fixRequirePath(requirePath));
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
//---------------------------------------------------------------------------

































//---------------------------------------------------------------------------
function registerAddonModule(collectionName, name, obj) {
	// register a new generic thing

	// console.log("in registerAddonModule with collection = " + collectionName + ", name = " + pluginName + " from category '" + pluginCategory + "' at path " + pluginPath);

	// add it to our registerPath normal registry
	const addonNameRegistered = calcAddonRegisteredName(collectionName, name);
	registerPath(addonNameRegistered, fixRequirePath(obj.path));

	// add it to our array of addons by collectionName
	// create category if it doesn't exist
	if (!addonModules[collectionName]) {
		addonModules[collectionName] = {};
	}
	addonModules[collectionName][name] = {
		...obj,
	};

	// and now we also store it in category tree under the collectionName
	let objCat = obj.category;
	if (!objCat) {
		objCat = "_UNCATEGORIZED_";
	}
	if (objCat) {
		if (!addonModuleCategories[collectionName]) {
			addonModuleCategories[collectionName] = {};
		}
		if (!addonModuleCategories[collectionName][objCat]) {
			addonModuleCategories[collectionName][objCat] = {};
		}
		addonModuleCategories[collectionName][objCat][name] = {
			...obj,
		};
	}
}


function getAllAddonModulesForCollectionName(collectionName) {
	return addonModules[collectionName];
}


function getAllAddonCategoriesForCollectionName(collectionName) {
	const catObjs = addonModuleCategories[collectionName];
	if (catObjs) {
		return catObjs;
	}
	return {};
}


function getAllAddonModulesInCategoryForCollectionName(collectionName, category) {
	const catObjs = addonModuleCategories[collectionName];
	if (catObjs[category]) {
		return catObjs[category];
	}
	return {};
}


function requireAddonModule(collectionName, name) {
	const addonNameRegistered = calcAddonRegisteredName(collectionName, name);
	return jrequire(addonNameRegistered);
}


function calcAddonRegisteredName(collectionName, name) {
	return collectionName + "/" + name;
}
//---------------------------------------------------------------------------























//---------------------------------------------------------------------------
/**
 * Substitute for the normal cached require() statement
 *
 * @param {string} name - name used to register previously
 * @returns result of previous require statement
 */
function jrequire(name) {
	// console.log("In requires for " + name);
	if (requires[name]) {
		// console.log("Returning cached1");
		return requires[name];
	}
	if (requirePaths[name]) {
		// deferred, so require it now
		// console.log("Deferred loading of module: " + name);
		const obj = require(fixRequirePath(requirePaths[name]));
		// console.log("Returning cached2");
		if (obj) {
			requires[name] = obj;
			return obj;
		}
	}

	// not found
	let emsg = "In jrequire: The following module was requested to be loaded but was not registered with jrequire: " + name;
	if (Object.keys(requires).length === 0 && Object.keys(requirePaths).length === 0) {
		emsg += ".  ATTENTION: No modules were registered with jrequire -- did you forget to register your module paths?";
	}
	throw new Error(emsg);
}



/**
 * Private function that we could use to do some special replacements, like replacing %APPROOT% with root path of project, etc.
 *
 * @param {string} path
 * @returns path with any special replacements
 */
function fixRequirePath(path) {
	// lets also try resolving it now
	path = require.resolve(path);
	return path;
}
//---------------------------------------------------------------------------






//---------------------------------------------------------------------------
/**
 * Just return an object with debugging information suitable for display
 *
 * @returns debug object with info on named and paths
 */
function calcDebugInfo() {
	return {
		requirePaths,
		plugins,
	};
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
function checkCircularRequireFailures() {
	// ATTN: THIS DOES NOT WORK
	// walk all names and see if any are empty
	console.log("IN checkCircularRequireFailures.");
	let obj;
	for (const rname in requires) {
		console.log("CHECKING VALIDITY OF REQUIRES NAME: " + rname + " TYPE = " + typeof requires[rname]);
		obj = requires[rname];
		if (typeof obj === "object") {
			if (!obj || (Object.entries(obj).length === 0 && obj.constructor === Object)) {
				console.log("LOOKS BAD.");
			} else {
				console.log("LEN = " + Object.entries(obj).length);
			}
		}
	}
}
//---------------------------------------------------------------------------











//---------------------------------------------------------------------------
// set these on top of the main function for access to them
// this is an unusual nodejs pattern that makes it easy to run the main function, and possible to call others
// in this way we can export just the one main function (jrequire), but the other functions can be invoked by doing jrequire.registerPath etc...
jrequire.registerPath = registerPath;
jrequire.registerRequire = registerRequire;
jrequire.calcDebugInfo = calcDebugInfo;
jrequire.setDeferredLoading = setDeferredLoading;
//
jrequire.registerAddonModule = registerAddonModule;
jrequire.getAllAddonModulesForCollectionName = getAllAddonModulesForCollectionName;
jrequire.getAllAddonCategoriesForCollectionName = getAllAddonCategoriesForCollectionName;
jrequire.getAllAddonModulesInCategoryForCollectionName = getAllAddonModulesInCategoryForCollectionName;
//
jrequire.requireAddonModule = requireAddonModule;
//
jrequire.checkCircularRequireFailures = checkCircularRequireFailures;
//---------------------------------------------------------------------------




// our sole export is the main function
module.exports = jrequire;
