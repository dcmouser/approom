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
// if we try to log one not here it will go into log as "unknown"
const winstonCustomLevels = {
	emerg: 0,
	alert: 1,
	crit: 2,
	error: 3,
	warning: 4,
	notice: 5,
	info: 6,
	debug: 7,

	unknown: 0,

	crud: 8,
	api: 7,
	user: 7,

	maxlevel: 99,
};

const winstonCustomLevelsKeys = Object.keys(winstonCustomLevels);
//---------------------------------------------------------------------------





//---------------------------------------------------------------------------
// module variables
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
 * Setp the winston logging module and register our custom levels, etc.
 *
 * @returns a winston logging object
 */
function setupWinstonLogger(category, filename) {
	winstonCategoryLoggers[category] = createWinstonLoggerObject(filename);
	return winstonCategoryLoggers[category];
}


function aliasWinstonLogger(categoryNew, categoryOld) {
	winstonCategoryLoggers[categoryNew] = winstonCategoryLoggers[categoryOld];
}


function createWinstonLoggerObject(filename) {

	// ATTN: showLevel: false does not work, it's ignored by winston :(

	var wobj = winston.createLogger({
		level: "maxlevel",
		showLevel: false,
		levels: winstonCustomLevels,
		format: winston.format.combine(
			winston.format.timestamp({
				format: "YYYY-MM-DD HH:mm:ss",
			}),
			// winston.format.splat(),
			winston.format.json(),
		),
		// defaultMeta: { service: serviceName },
		transports: [
			new winston.transports.File({
				filename: calcLogFilePath(filename),
				showLevel: false,
			}),
		],
	});

	return wobj;
}


function getWinstonCategoryLogger(category) {
	// create it if it doesn't yet exist
	if (!winstonCategoryLoggers[category]) {
		setupWinstonLogger(category, category);
	}
	return winstonCategoryLoggers[category];
}


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
// just pass through stuff to winston

/**
 * Passthrough log function to winston logger, to log an item to file created for a specific cateogry; creating category logger if it does not yet exist
 *
 * @param {string} category -- the category associated with the logger
 * @param {*} args
 * @returns result of winston log command
 */
function log(category, ...args) {
	return getWinstonCategoryLogger(category).log(...args);
}
//---------------------------------------------------------------------------






















//---------------------------------------------------------------------------
function logMessage(category, type, message, extraData, mergeData) {

	// make the object to save in file log
	var logObj = createLogFileObj(type, message, extraData, mergeData);

	if (false) {
		const jrdebug = require("./jrdebug");
		jrdebug.debugObj(category, "logging to category");
		jrdebug.debugObj(logObj, "logging obj");
	}

	// get the level corrresponding to this error type (usually leftmost of dot notation)
	const level = convertLogTypeToLevel(type);
	logObjectByLevel(category, level, logObj);
}
//---------------------------------------------------------------------------



//---------------------------------------------------------------------------
function logExceptionError(category, err) {
	const logObjError = {
		type: "errorCrit.logging",
		message: "Exception while trying to log to database: " + err.message,
	};
	doLogExceptionErrorObj(category, logObjError);
}


function logExceptionErrorWithMessage(category, err, type, message, extraData, mergeData) {
	// create normal log messsage object
	var logObj = createLogFileObj(type, message, extraData, mergeData);
	// now alter it for exception
	const logObjError = {
		type: "errorCrit.logging",
		message: "Exception while trying to log to database: " + err.message,
		origLog: logObj,
	};
	doLogExceptionErrorObj(category, logObjError);
}


function doLogExceptionErrorObj(category, logObjError) {
	// get the log level corresponding to the exception
	const level = convertLogTypeToLevel("error.exception");
	// log it
	logObjectByLevel(category, level, logObjError);
}
//---------------------------------------------------------------------------



//---------------------------------------------------------------------------
function logObjectByLevel(category, level, obj) {
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
		return ["unknown", type];
	}
	return [level, remainder];
}


function convertLogTypeToLevel(type) {
	var [level, remainder] = convertLogTypeToLevelAndSubtype(type);
	return level;
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
	setupWinstonLogger,
	aliasWinstonLogger,

	log,

	logMessage,
	logExceptionError,
	logExceptionErrorWithMessage,

	logObjectByLevel,
	convertLogTypeToLevel,

	createLogFileObj,
};
