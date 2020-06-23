/**
 * @module helpers/jrdebug
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 5/7/19

 * @description
 * Debug support module
 * ##### Notes
 *  * Uses debug module for logging to console
 */

"use strict";



// modules

// and debug for console logging
const debugmod = require("debug");

// others
const util = require("util");

// our helper modules
const jrhMisc = require("./jrh_misc");







//---------------------------------------------------------------------------
// module variables
let debugfunc;
let serviceName;
const debugTagsEnabled = [];
//---------------------------------------------------------------------------





//---------------------------------------------------------------------------
/**
 * Initialize values for the debugging system to use
 *
 * @param {string} iserviceName - name of the application or process, for use in filename and console messages
 */
function setup(iserviceName) {
	// save values
	serviceName = iserviceName;
	if (!serviceName) {
		throw Error("Service name is undefined; can't setup debugger without one.");
	}
	// create debug func that is on only in debug mode
	debugfunc = setupDebugmod();
}
//---------------------------------------------------------------------------





//---------------------------------------------------------------------------
/**
 * Setup the debug module logger for console messages
 *
 * @returns the debug module created function for invoking debug statement
 */
function setupDebugmod() {
	// now create the simple console logger from debug module
	debugfunc = debugmod(serviceName);

	// force it on for our service
	debugmod.enable(serviceName);

	// return it
	return debugfunc;
}
//---------------------------------------------------------------------------





















//---------------------------------------------------------------------------
/**
 * Getter for the debug mode
 *
 * @returns true if debugging is enabled for a tag
 */
function getDebugTagEnabled(debugTag) {
	if (typeof debugTag === "object") {
		// iterate over the list and return true if any match
		let bretv;
		for (var tag of debugTag) {
			bretv = getDebugTagEnabled(tag);
			if (bretv === false) {
				// explicit false on any tag is false
				return false;
			}
			if (bretv === true) {
				// explicit true is true
				return true;
			}
		}
		// not found is undefined (false)
		return undefined;
	}

	// explicitly set?
	if (debugTagsEnabled.includes(debugTag)) {
		return true;
	}

	// explicit block?
	if (debugTagsEnabled.includes("-" + debugTag)) {
		return false;
	}

	// if debugTag is "*" then always true, if "-" then always false
	// these just make it easier to quick code for debugging
	if (debugTag === "*") {
		return true;
	}
	if (debugTag === "-") {
		return false;
	}

	// if "*" is in debugtags, then ALL are enabled
	if (debugTagsEnabled.includes("*")) {
		return true;
	}

	// nope
	return undefined;
}


/**
 * Setter for debug mode on or off.
 * This controls whether certain debug functions (those ending in 'c' for conditional) actually generate output
 * @param {string} debugTag
 * @param {boolean} val
 */
function setDebugTagEnabled(debugTag, val) {
	if (val) {
		if (!(debugTagsEnabled.includes(debugTag))) {
			debugTagsEnabled.push(debugTag);
		}
	} else {
		const index = debugTagsEnabled.indexOf(debugTag);
		if (index > -1) {
			debugTagsEnabled.splice(index, 1);
		}
	}
}


function getDebugTagEnabledList() {
	const enabledTags = debugTagsEnabled;
	return enabledTags;
}

function getDebugTagEnabledListAsNiceString() {
	const enabledTags = debugTagsEnabled;
	if (!enabledTags) {
		return "";
	}
	return enabledTags.join();
}


function setDebugTagEnabledList(tagList) {
	tagList.forEach((tag) => {
		setDebugTagEnabled(tag, true);
	});
}
//---------------------------------------------------------------------------









//---------------------------------------------------------------------------
// pass through to debug function for quick and dirty screen display

/**
 * Passthrough to debug module function to show some info on console
 *
 * @param {*} args
 * @returns result of debug module function
 */
function debug(...args) { return debugfunc(...args); }


/**
 * Invoke to debug module function after formatting string using util.format
 * @example debugf("%s:%d", str, val);
 *
 * @param {string} string - string to pass to util.format
 * @param {*} args - arguments for util.format
 * @returns result of debug module function
 */
// formatted string ("%s:%d", str, val)
function debugf(str, ...args) { return debugfunc(util.format(str, ...args)); }


/**
 * Dump an object with its properties, with an optional message
 *
 * @param {object} obj - object to dump
 * @param {string} msg - message to show before dumping object (ignored if null/undefined)
 */
function debugObj(obj, msg) {
	// just helper log function
	if (msg) {
		debug(msg + ": " + jrhMisc.objToString(obj, false));
	} else {
		debug(jrhMisc.objToString(obj, false));
	}
}



/**
 * Dump an object with its properties, with an optional message
 *
 * @param {object} obj - object to dump
 * @param {string} msg - message to show before dumping object (ignored if null/undefined)
 */
function debugObj2(obj, msg) {
	// just helper log function
	if (msg) {
		debug(msg + ": " + jrhMisc.objToString2(obj, false));
	} else {
		debug(jrhMisc.objToString2(obj, false));
	}
}
//---------------------------------------------------------------------------



//---------------------------------------------------------------------------
/**
 * Conditional passthrough to debug module function to show some info on console.
 * Does nothing if debug mode is off.
 *
 * @param {*} args
 * @returns result of debug module function
 */
function cdebug(debugTag, ...args) {
	if (getDebugTagEnabled(debugTag)) {
		return debug(...args);
	}
	return null;
}


/**
 * Conditional call to debug module function after formatting string using util.format
 * Does nothing if debug mode is off.
 * @example cdebugf("misc", "%s:%d", str, val);
 *
 * @param {string} string - string to pass to util.format
 * @param {*} args - arguments for util.format
 * @returns result of debug module function
 */
function cdebugf(debugTag, str, ...args) {
	if (getDebugTagEnabled(debugTag)) {
		return debugf(str, ...args);
	}
	return null;
}


/**
 * Conditional dump an object with its properties, with an optional message
 * Does nothing if debug mode is off.
 *
 * @param {object} obj - object to dump
 * @param {string} msg - message to show before dumping object (ignored if null/undefined)
 */
function cdebugObj(debugTag, obj, msg) {
	if (getDebugTagEnabled(debugTag)) {
		return debugObj(obj, msg);
	}
	return null;
}
//---------------------------------------------------------------------------



























module.exports = {
	setup,

	getDebugTagEnabled, setDebugTagEnabled,
	getDebugTagEnabledList, getDebugTagEnabledListAsNiceString, setDebugTagEnabledList,

	debug, debugf, debugObj, debugObj2,
	cdebug, cdebugf, cdebugObj,
};
