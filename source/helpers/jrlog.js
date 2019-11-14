/**
 * @module helpers/jrlog
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 5/7/19

 * @description
 * Logging support module
 * ##### Notes
 *  * Uses Winston module for logging to file
 *  * Uses debug module for logging to console
 *  * Uses Morgan for logging express web http requests
 */

"use strict";



//---------------------------------------------------------------------------
// modules

// we use winston to do the actual work of logging
const winston = require("winston");

// and debug for console logging
const debugmod = require("debug");

// and morgan for express web logging
const morgan = require("morgan");

// others
const fs = require("fs");
const util = require("util");
const path = require("path");
//---------------------------------------------------------------------------





//---------------------------------------------------------------------------
// constants

// winston debugging levels
// ideally every kind of log message type coming from app would be entered here
// if we try to log one not here it will go into log as "errorUnknown" and log to error file
const winstonCustomLevels = {
	errorUnknown: 0,
	errorAlert: 1,
	errorCrit: 2,
	error: 3,
	warning: 4,
	notice: 5,
	info: 6,
	debug: 7,
	db: 6,
	"crud.create": 6,
	"crud.edit": 6,
	"crud.delete": 6,
	"api.token": 6,
	"user.create": 6,
};
//---------------------------------------------------------------------------





//---------------------------------------------------------------------------
// module variables
var winstonLogger;
var debugfunc;
var serviceName;
var logDir;
var debugEnabled = false;
//---------------------------------------------------------------------------






/**
 * Initialize values for the logging system to use
 *
 * @param {string} iserviceName - name of the application or process, for use in filename and console messages
 * @param {string} ilogDir - base directory where log files should be created
 */
function setup(iserviceName, ilogDir) {
	// save values
	serviceName = iserviceName;
	logDir = ilogDir;
	// create winston object
	winstonLogger = setupWinston();
	// create debug func that is on only in debug mode
	debugfunc = setupDebugmod();
}
//---------------------------------------------------------------------------


//---------------------------------------------------------------------------
/**
 * Setup the morgan logging middleware for express web framework, which is create an access file (like apache access log).
 * Called by our server setup code when registering express middleware.
 * @returns the morgan middleware object to register with express
 */
function setupMorganMiddlewareForExpressWebAccessLogging() {
	const morganMode = "combined";
	const morganOutputAbsoluteFilePath = calcLogFilePath("access");
	var morganOutput = {
		stream: fs.createWriteStream(morganOutputAbsoluteFilePath, { flags: "a" }),
	};
	const morganMiddleware = morgan(morganMode, morganOutput);
	return morganMiddleware;
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
// just pass through stuff to winston

/**
 * Passthrough log function to winston logger, to log an item to file
 *
 * @param {*} args
 * @returns result of winston log command
 */
function log(...args) { return winstonLogger.log(...args); }

/**
 * Passthrough log("info") function to winston logger, to log an item to file
 *
 * @param {*} args
 * @returns result of winston log command
 */
function info(...args) { return winstonLogger.log("info", ...args); }

/**
 * Passthrough log("warning") function to winston logger, to log an item to file
 *
 * @param {*} args
 * @returns result of winston log command
 */
function warning(...args) { return winstonLogger.log("warning", ...args); }

/**
 * Passthrough log("error") function to winston logger, to log an item to file
 *
 * @param {*} args
 * @returns result of winston log command
 */
function error(...args) { return winstonLogger.log("error", ...args); }

/*
// old way, but these seem to format differently
function info(...args) { return winstonLogger.info(...args); }
function warning(...args) { return winstonLogger.warning(...args); }
function error(...args) { return winstonLogger.error(...args); }
*/
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
		debug(msg + ": " + objToString(obj, false));
	} else {
		debug(objToString(obj, false));
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





//---------------------------------------------------------------------------
/**
 * Stringify an object nicely for display on console
 * ##### Notes
 *  * See <a href="https://stackoverflow.com/questions/10729276/how-can-i-get-the-full-object-in-node-jss-console-log-rather-than-object">stackoverflow</a>
 *  * See <a href="https://nodejs.org/api/util.html#util_util_inspect_object_options">nodejs docs</a>
 *
 * @param {*} obj - the object to stringify
 * @param {*} flagCompact - if true then we use a compact single line output format
 * @returns string suitable for debug/diagnostic display
 */
function objToString(obj, flagCompact) {
	// return util.inspect(obj, false, null, true /* enable colors */);
	var options = {};
	if (flagCompact) {
		options = {
			showHidden: false,
			depth: 2,
			colors: false,
			compact: true,
			breakLength: Infinity,
		};
	} else {
		options = {
			showHidden: false,
			depth: 2,
			colors: false,
			compact: false,
			breakLength: 80,
		};
	}
	return util.inspect(obj, options);
}
//---------------------------------------------------------------------------




//---------------------------------------------------------------------------
/**
 * Log (to winston file logger) a message that mirrors the database log items the server normally logs to database.
 * This is used to create a plain file of log items that parallels our database log
 *
 * @param {string} type - the kind of message (ideally defined in winstonCustomLevels; if not it will be logged to file as an UnknownError)
 * @param {string} message - the main message to log
 * @param {int} severity - severity level from 0 (least important) to 100 (most important)
 * @param {string} userid - userid of logged in user of request (or undefined/null)
 * @param {string} ip - ip of user request (or undefined/null)
 * @param {obj} extraData - stringified with JSON.stringify
 */
function logStdDbMessage(type, message, severity, userid, ip, extraData) {
	var msg;

	// ideally the type is the same as a registered winston logging level; if not we have to make do
	var extras = "";
	var level = convertErrorTypeToWinstonLevel(type);
	if (level !== type) {
		// since the log level and type string are different, add the actual type to the message since it does not match level
		extras = util.format(" type='%s'", type);
	}
	if (extraData) {
		msg = util.format("severity='%s' userid='%s' ip='%s' msg='%s' data='%s'%s", severity, userid, ip, message, JSON.stringify(extraData), extras);
	} else {
		msg = util.format("severity='%s' userid='%s' ip='%s' msg='%s'%s", severity, userid, ip, message, extras);
	}
	winstonLogger.log(level, msg);
}


/**
 * Returns a registered winston logging level to use for this type.
 * If the type string is a known winstonCustomLevels we can use it directly as the level; if not, winston will throw an error if we try to use this as the log level, so instead caller will use UnknownError as the level
 * @private
 *
 * @param {string} type
 * @returns valid winston logging level to use
 */
function convertErrorTypeToWinstonLevel(type) {
	if (winstonCustomLevels[type]) {
		// the type is a known level, return it
		return type;
	}
	// not found, so we should return generic level
	return "errorUnknown";
}
//---------------------------------------------------------------------------











































/**
 * Setp the winston logging module and register our custom levels, etc.
 *
 * @returns a winston logging object
 */
function setupWinston() {
	// create the WINSTON logger
	// create transports and initialize
	// see https://github.com/winstonjs/winston/blob/master/examples/quick-start.js
	// NOTE: we use the module global winstonLogger here, as our default

	// color system only used for console logging which we don't use yet (?)
	const customColors = {
		errorUnknown: "red",
		errorAlert: "red",
		errorCrit: "red",
		error: "red",
		warning: "yellow",
		notice: "green",
		info: "blue",
		debug: "cyan",
		db: "grey",
	};

	// create the logger
	winstonLogger = winston.createLogger({
		levels: winstonCustomLevels,
		// level: "info",
		format: winston.format.combine(
			winston.format.timestamp({
				format: "YYYY-MM-DD HH:mm:ss",
			}),
			winston.format.errors({ stack: true }),
			winston.format.splat(),
			winston.format.json(),
		),
		defaultMeta: { service: serviceName },
		transports: [
			//
			// - Write to all logs with level `info` and below to `.log`
			// - Write all logs error (and below) to `error.log`.
			// NOTE: the level catches all items from the level specified AND LOWER (more important)
			//
			new winston.transports.File({ filename: calcLogFilePath("errors"), level: "error" }),
			new winston.transports.File({ filename: calcLogFilePath("") }),
		],
	});

	// currently we use a different module for console logging
	if (false) {
		// setup console logging
		winstonLogger.add(new winston.transports.Console({
			format: winston.format.combine(
				winston.format.colorize(),
				winston.format.simple(),
			),
		}));

		// we need to set colors since we are adding a custom log level (db)
		winston.addColors(customColors);
	}

	// we may in the future want to create additional transports to save logs to different places with different filters, etc.
	if (false) {
		// create a db file channel just for DB log messages?
		// doesnt work because this catched stuff above this level too
		winstonLogger.add(new winston.transports.File({
			format: winston.format.combine(
				winston.format.timestamp({
					format: "YYYY-MM-DD HH:mm:ss",
				}),
				winston.format.errors({ stack: true }),
				winston.format.splat(),
				winston.format.json(),
			),
			filename: calcLogFilePath("dblog"),
			level: "db",
		}));
	}

	return winstonLogger;
}
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
 * Given a base filename (typically the app or service name) and an optional suffix (when an app wants multiple log files for different purposes), calculate its full file path by adding base directory and .log extension.
 * @private
 *
 * @param {string} fileSuffix
 * @returns full file path
 */
function calcLogFilePath(fileSuffix) {
	var filePath = path.join(logDir, serviceName);
	if (fileSuffix !== "") {
		filePath += ("_" + fileSuffix + ".log");
	} else {
		filePath += ".log";
	}
	return filePath;
}
//---------------------------------------------------------------------------





















module.exports = {
	setup,
	setupMorganMiddlewareForExpressWebAccessLogging,

	setDebugEnabled, getDebugEnabled,

	log, info, warning, error,
	debug, debugf, debugObj,
	cdebug, cdebugf, cdebugObj,

	objToString,
	logStdDbMessage,
};
