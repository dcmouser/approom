// jrlogger
// v1.0.0 on 5/7/19 by mouser@donationcoder.com
//
// simple logging wrapper class that handles BOTH logging to file and conditional debugging info to console
//
// Uses Winston module for logging to file
// Uses debug module for logging to console
// Uses Morgan for logging express web http requests


"use strict";



//---------------------------------------------------------------------------
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
// debugging levels
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






//---------------------------------------------------------------------------
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
// just a helper function for the server to setup file logging of web http express access log
// it's here in this file just to have a central location for all logging setup stuff
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
function setDebugEnabled(val) {
	debugEnabled = val;
}

function getDebugEnabled() {
	return debugEnabled;
}
//---------------------------------------------------------------------------




//---------------------------------------------------------------------------
// just pass through stuff to winston
function log(...args) { return winstonLogger.log(...args); }

function info(...args) { return winstonLogger.log("info", ...args); }

function warning(...args) { return winstonLogger.log("warning", ...args); }

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

// simple debug passthrough
function debug(...args) { return debugfunc(...args); }

// formatted string ("%s:%d", str, val)
function debugf(str, ...args) { return debugfunc(util.format(str, ...args)); }

// debug dump an object with optional title
function debugObj(obj, msg) {
	// just helper log function
	if (msg) {
		debug(msg + ": " + objToString(obj, false));
	} else {
		debug(objToString(obj, false));
	}
}


// conditional versions

function cdebug(...args) { if (getDebugEnabled()) return debug(...args); return null; }

function cdebugf(str, ...args) { if (getDebugEnabled()) return debugf(str, ...args); return null; }

// debug an object
function cdebugObj(obj, msg) { if (getDebugEnabled()) return debugObj(obj, msg); return null; }
//---------------------------------------------------------------------------





//---------------------------------------------------------------------------
// helper for debugging object

// see https://stackoverflow.com/questions/10729276/how-can-i-get-the-full-object-in-node-jss-console-log-rather-than-object
// see https://nodejs.org/api/util.html#util_util_inspect_object_options
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
// dblog is a mirror of our server.log function that adds log object to file (see server.js);
// it basically saves a copy of a database log object to a file logger
function dblog(type, message, severity, userid, ip, extraData) {
	var msg;

	// if winston has a registered error level matching the type, we use it
	// if NOT, we consider this an unknownError type of message (it will got to error log)
	var level;
	var extras = "";
	if (isErrorTypeValidWinstonLevel(type)) {
		level = type;
	} else {
		level = "errorUnknown";
		extras = util.format(" type='%s'", type);
	}
	if (extraData) {
		msg = util.format("severity='%s' userid='%s' ip='%s' msg='%s' data='%s'%s", severity, userid, ip, message, JSON.stringify(extraData), extras);
	} else {
		msg = util.format("severity='%s' userid='%s' ip='%s' msg='%s'%s", severity, userid, ip, message, extras);
	}
	winstonLogger.log(level, msg);
}


function isErrorTypeValidWinstonLevel(type) {
	return (winstonCustomLevels[type]);
}
//---------------------------------------------------------------------------











































//---------------------------------------------------------------------------
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


	if (false) {
		// setup console logging?
		winstonLogger.add(new winston.transports.Console({
			format: winston.format.combine(
				winston.format.colorize(),
				winston.format.simple(),
			),
		}));

		// we need to set colors since we are adding a custom log level (db)
		winston.addColors(customColors);
	}

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


//---------------------------------------------------------------------------
function setupDebugmod() {
	// now create the simple console logger from debug module
	debugfunc = debugmod(serviceName);

	// force it on for us
	debugmod.enable(serviceName);

	// return it
	return debugfunc;
}
//---------------------------------------------------------------------------







//---------------------------------------------------------------------------
// log file path helper
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
	dblog,
};
