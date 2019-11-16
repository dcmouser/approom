/**
 * @module helpers/jrlog
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 5/7/19

 * @description
 * Logging support module
 * ##### Notes
 *  * Uses Winston module for logging to file
 *  * Uses Morgan for logging express web http requests
 */

"use strict";



//---------------------------------------------------------------------------
// modules

// we use winston to do the actual work of logging
const winston = require("winston");

// and morgan for express web logging
const morgan = require("morgan");

// others
const fs = require("fs");
const path = require("path");

// our helper modules
const jrhMisc = require("./jrh_misc");
//---------------------------------------------------------------------------





//---------------------------------------------------------------------------
// constants

// winston log levels
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

	crud: 6,
	api: 6,
	user: 6,
};

const winstonCustomLevelsKeys = Object.keys(winstonCustomLevels);
//---------------------------------------------------------------------------





//---------------------------------------------------------------------------
// module variables
var winstonLogger;
var serviceName;
var logDir;
var winstonCategoryLoggers = [];
//---------------------------------------------------------------------------





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
// just pass through stuff to winston

/**
 * Passthrough log function to winston logger, to log an item to file
 *
 * @param {*} args
 * @returns result of winston log command
 */
function log(...args) { return winstonLogger.log(...args); }


/**
 * Passthrough log function to winston logger, to log an item to file created for a specific cateogry
 *
 * @param {string} category -- the category associated with the logger
 * @param {*} args
 * @returns result of winston log command
 */
function catlog(category, ...args) { return winstonCategoryLoggers[category].log(...args); }


/**
 * Passthrough log function to winston logger, to log an item to file created for a specific cateogry; creating category logger if it does not yet exist
 *
 * @param {string} category -- the category associated with the logger
 * @param {*} args
 * @returns result of winston log command
 */
function ecatlog(category, ...args) {
	if (!winstonCategoryLoggers[category]) {
		setupWinstonCategoryLogger(category, category);
	}
	return winstonCategoryLoggers[category].log(...args);
}
//---------------------------------------------------------------------------






















//---------------------------------------------------------------------------
function logMessage(type, message, extraData, mergeData) {
	// make the object to save in file log
	var logObj = createLogFileObj(type, message, extraData, mergeData);
	// log it
	logObjectByType(type, logObj);
}
//---------------------------------------------------------------------------



//---------------------------------------------------------------------------
function logExceptionError(err) {
	const logObjError = {
		type: "errorCrit.logging",
		message: "Exception while trying to log to database: " + err.message,
	};
	logObjectByLevel("errorCrit", logObjError);
}


function logExceptionErrorWithMessage(err, type, message, extraData, mergeData) {
	// create normal log messsage object
	var logObj = createLogFileObj(type, message, extraData, mergeData);
	// now alter it for exception
	const logObjError = {
		type: "errorCrit.logging",
		message: "Exception while trying to log to database: " + err.message,
		origLog: logObj,
	};
	logObjectByLevel("errorCrit", logObjError);
}
//---------------------------------------------------------------------------



//---------------------------------------------------------------------------
function logObjectByType(type, obj) {
	// just log the object to winston
	const level = convertLogTypeToLevel(type);
	logObjectByLevel(level, obj);
}


function logObjectByLevel(level, obj) {
	// log it
	winstonLogger.log(level, obj);
}


function catlogObjectByLevel(category, level, obj) {
	// log it
	winstonCategoryLoggers[category].log(level, obj);
}
//---------------------------------------------------------------------------


//---------------------------------------------------------------------------
/**
 * Take a type string (which may be dot notation path) and split it into a valid winston logger level and a subtype
 *
 * @param {string} type
 */
function convertLogTypeToLevelAndSubtype(type) {
	// try to find the longest prefix in the type corresponding to a known winston log level
	var [level, remainder] = jrhMisc.findLongestPrefixAndRemainder(type, winstonCustomLevelsKeys, ".");
	if (level === "") {
		// not found
		return ["errorUnknown", type];
	}
	return [level, remainder];
}


function convertLogTypeToLevel(type) {
	var [level, remainder] = convertLogTypeToLevelAndSubtype(type);
	return level;
}
//---------------------------------------------------------------------------













































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


	// create the logger
	winstonLogger = winston.createLogger({
		levels: winstonCustomLevels,
		// level: "info",
		format: winston.format.combine(
			winston.format.timestamp({
				format: "YYYY-MM-DD HH:mm:ss",
			}),
			winston.format.errors({ stack: true }),
			// winston.format.splat(),
			winston.format.json(),
		),
		// defaultMeta: { service: serviceName },
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



function setupWinstonCategoryLogger(category, filename) {
	winstonCategoryLoggers[category] = winston.createLogger({
		levels: winstonCustomLevels,
		// level: "info",
		format: winston.format.combine(
			winston.format.timestamp({
				format: "YYYY-MM-DD HH:mm:ss",
			}),
			// winston.format.splat(),
			winston.format.json(),
		),
		// defaultMeta: { service: serviceName },
		transports: [
			new winston.transports.File({ filename: calcLogFilePath(filename) }),
		],
	});

	return winstonCategoryLoggers[category];
}
//---------------------------------------------------------------------------






//---------------------------------------------------------------------------
function getWinstonCategoryLogger(category) {
	return winstonCategoryLoggers[category];
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













//---------------------------------------------------------------------------
function createLogFileObj(type, message, extraData, mergeData) {
	var logObj;
	if (message && !(typeof message === "string")) {
		// unusual case where the message is an object; for file we merge in message properties, and others
		logObj = {
			type,
			...message,
			...mergeData,
			...extraData,
		};
	} else {
		// message is a string, add it as message and merge in others.
		logObj = {
			type,
			message,
			...mergeData,
			...extraData,
		};
	}

	return logObj;
}
//---------------------------------------------------------------------------



















module.exports = {
	setup,
	setupMorganMiddlewareForExpressWebAccessLogging,
	setupWinstonCategoryLogger,

	log,
	catlog, ecatlog,

	logMessage,
	logExceptionError,
	logExceptionErrorWithMessage,

	logObjectByType,
	logObjectByLevel,
	catlogObjectByLevel,
	convertLogTypeToLevel,

	createLogFileObj,
};
