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



//---------------------------------------------------------------------------
// modules

// and debug for console logging
const debugmod = require("debug");

// others
const util = require("util");

// our helper modules
const jrhMisc = require("./jrh_misc");
//---------------------------------------------------------------------------






//---------------------------------------------------------------------------
// module variables
var debugfunc;
var serviceName;
var debugEnabled = false;
//---------------------------------------------------------------------------





//---------------------------------------------------------------------------
/**
 * Initialize values for the debugging system to use
 *
 * @param {string} iserviceName - name of the application or process, for use in filename and console messages
 * @param {boolean} flagDebugEnabled - initial state whether enabled or disabled; when disabled all conditional debug statements (cdebug..) will have no effect
 */
function setup(iserviceName, flagDebugEnabled) {
	// save values
	serviceName = iserviceName;
	// create debug func that is on only in debug mode
	debugfunc = setupDebugmod();
	// set initial debug enabled state
	setDebugEnabled(flagDebugEnabled);
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
 * Set debug mode on or off.
 * This controls whether certain debug functions (those ending in 'c' for conditional) actually generate output
 *
 * @param {boolean} val
 */
function setDebugEnabled(val) {
	debugEnabled = val;
}

/**
 * Accessor for the debug mode
 *
 * @returns true if debugging is enabled
 */
function getDebugEnabled() {
	return debugEnabled;
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
//---------------------------------------------------------------------------



//---------------------------------------------------------------------------
/**
 * Conditional passthrough to debug module function to show some info on console.
 * Does nothing if debug mode is off.
 *
 * @param {*} args
 * @returns result of debug module function
 */
function cdebug(...args) {
	if (getDebugEnabled()) {
		return debug(...args);
	}
	return null;
}


/**
 * Conditional call to debug module function after formatting string using util.format
 * Does nothing if debug mode is off.
 * @example cdebugf("%s:%d", str, val);
 *
 * @param {string} string - string to pass to util.format
 * @param {*} args - arguments for util.format
 * @returns result of debug module function
 */
function cdebugf(str, ...args) {
	if (getDebugEnabled()) {
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
function cdebugObj(obj, msg) {
	if (getDebugEnabled()) {
		return debugObj(obj, msg);
	}
	return null;
}
//---------------------------------------------------------------------------



























module.exports = {
	setup,

	setDebugEnabled, getDebugEnabled,

	debug, debugf, debugObj,
	cdebug, cdebugf, cdebugObj,
};
