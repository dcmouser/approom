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
 * Save it in our local hash winstonCategoryLoggers where it can be referenced by category name
 *
 * @param {string} category - the category to store the new logger under
 * @param {string} filenameSuffix - base filename (suffix added to our stored logfilename)
 * @returns a winston logging object
 */
function setupWinstonLogger(category, filenameSuffix) {
	winstonCategoryLoggers[category] = createWinstonLoggerObject(filenameSuffix);
	return winstonCategoryLoggers[category];
}

/**
 * Alias an existing category winston logger to another name.
 * This can be useful when we want to mark different categories of log messages for POTENTIALLY different targets but use the same file for the time being
 *
 * @param {string} categoryNew
 * @param {string} categoryOld
 */
function aliasWinstonLogger(categoryNew, categoryOld) {
	winstonCategoryLoggers[categoryNew] = winstonCategoryLoggers[categoryOld];
}


/**
 * Create a winston logger with out parameters and the filename suffix
 * @private
 *
 * @param {string} filename
 * @returns the new winston logger object
 */
function createWinstonLoggerObject(filenameSuffix) {

	// ATTN: showLevel: false does not work, it's ignored by winston :(

	// create a custom transform helper to remove level from log output
	const customFormatTransformNoLogLevel = winston.format((info, opts) => {
		delete info.level;
		return info;
	});

	var wobj = winston.createLogger({
		// level: "maxlevel",
		// levels: winstonCustomLevels,
		format: winston.format.combine(
			// remove log level
			customFormatTransformNoLogLevel(),
			// other stuff
			winston.format.timestamp({
				format: "YYYY-MM-DD HH:mm:ss",
			}),
			// winston.format.splat(),
			winston.format.json(),
		),
		// defaultMeta: { service: serviceName },
		transports: [
			new winston.transports.File({
				filename: calcLogFilePath(filenameSuffix),
			}),
		],
	});

	return wobj;
}



/**
 * Look up winston logger stored by category.
 * Create it if it doesn't yet exist (and the store it)
 * @private
 *
 * @param {string} category
 * @returns the winston logger associated with this cateogry
 */
function getWinstonCategoryLogger(category) {
	// create it if it doesn't yet exist? or better to let it throw an error
	if (false) {
		if (!winstonCategoryLoggers[category]) {
			setupWinstonLogger(category, category);
		}
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
/**
 * Log a standard set of fields to a catgory.
 * These are standard fields that our caller will use to log both to db and to file.
 * We have a way of taking these fields and converting them to an object.
 *
 * @param {string} category
 * @param {string} type - in dot notation
 * @param {string} message (or object)
 * @param {map} extraData
 * @param {map} mergeData
 */
function logMessage(category, type, message, extraData, mergeData) {

	// make the object to save in file log
	var logObj = createLogFileObj(type, message, extraData, mergeData);

	// get the level corrresponding to this error type (usually leftmost of dot notation)
	logObject(category, logObj);
}
//---------------------------------------------------------------------------







/**
 * Shortcut for logging an exception error
 *
 * @param {string} category
 * @param {error} err
 */
function logExceptionError(category, err) {
	const logObjError = {
		type: "errorCrit.logging",
		message: "Exception while trying to log to database: " + err.message,
	};
	logObject(category, logObjError);
}


/**
 * Shortcut for logging an exception error, along with extra original message and parameters referenced by it
 *
 * @param {string} category
 * @param {error} err
 * @param {string} type
 * @param {string} message (or object)
 * @param {map} extraData
 * @param {map} mergeData
 */
function logExceptionErrorWithMessage(category, err, type, message, extraData, mergeData) {
	// create normal log messsage object
	var logObj = createLogFileObj(type, message, extraData, mergeData);
	// now alter it for exception
	const logObjError = {
		type: "errorCrit.logging",
		message: "Exception while trying to log to database: " + err.message,
		origLog: logObj,
	};
	logObject(category, logObjError);
}
//---------------------------------------------------------------------------




//---------------------------------------------------------------------------
/**
 * Main work function that asks the winston logger referred to by the category to log the object
 * ##### Notes
 *  * We always use the "info" level when writing to winston logs instead of winston logging level system; we use our own way to filter logs
 *
 * @param {string} category
 * @param {object} obj
 */
function logObject(category, obj) {
	winstonCategoryLoggers[category].log("info", obj);
}
//---------------------------------------------------------------------------









//---------------------------------------------------------------------------
// just pass through stuff to winston -- we don't normall use this

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
/**
 * Convert the parameters to an object suitable for logging.
 * Merge in some of these fields and handle message differently depending on whether it is a string or object.
 *
 * @private
 * @param {string} type
 * @param {string} message (or object)
 * @param {map} extraData
 * @param {map} mergeData
 * @returns object to log
 */
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

	logObject,

	createLogFileObj,
};
