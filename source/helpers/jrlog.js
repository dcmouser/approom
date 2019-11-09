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
};
//---------------------------------------------------------------------------



class JrLog {

	//---------------------------------------------------------------------------
	constructor() {
		// init
		this.winstonLogger = undefined;
		this.debugfunc = undefined;
		//
		this.debugEnabled = false;
	}


	// global singleton request
	static getSingleton(...args) {
		// we could do this more simply by just exporting a new instance as module export, but we wrap a function for more flexibility
		if (this.globalSingleton === undefined) {
			this.globalSingleton = new JrLog(...args);
		}
		return this.globalSingleton;
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	// just pass through stuff to winston
	log(...args) { return this.winstonLogger.log(...args); }

	info(...args) { return this.winstonLogger.log("info", ...args); }

	warning(...args) { return this.winstonLogger.log("warning", ...args); }

	error(...args) { return this.winstonLogger.log("error", ...args); }

	/*
	// old way, but these seem to format differently
	info(...args) { return this.winstonLogger.info(...args); }
	warning(...args) { return this.winstonLogger.warning(...args); }
	error(...args) { return this.winstonLogger.error(...args); }
	*/
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	// pass through to debug function for quick and dirty screen display

	// simple debug passthrough
	debug(...args) { return this.debugfunc(...args); }

	// formatted string ("%s:%d", str, val)
	debugf(str, ...args) { return this.debugfunc(util.format(str, ...args)); }

	// debug dump an object with optional title
	debugObj(obj, msg) {
		// just helper log function
		if (msg) {
			this.debug(msg + ": " + this.objToString(obj, false));
		} else {
			this.debug(this.objToString(obj, false));
		}
	}


	// conditional versions

	cdebug(...args) { if (this.getDebugEnable()) return this.debug(...args); return null; }

	cdebugf(str, ...args) { if (this.getDebugEnable()) return this.debugf(str, ...args); return null; }

	// debug an object
	cdebugObj(obj, msg) { if (this.getDebugEnable()) return this.debugObj(obj, msg); return null; }
	//---------------------------------------------------------------------------











	//---------------------------------------------------------------------------
	setup(serviceName, logDir) {
		// save values
		this.serviceName = serviceName;
		this.logDir = logDir;
		// create winston object
		this.winstonLogger = this.setupWinston();
		// create debug func that is on only in debug mode
		this.debugfunc = this.setupDebugmod();
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	// just a helper function for the server to setup file logging of web http express access log
	// it's here in this file just to have a central location for all logging setup stuff
	setupMorganMiddlewareForExpressWebAccessLogging() {
		const morganMode = "combined";
		const morganOutputAbsoluteFilePath = this.calcLogFilePath("access");
		var morganOutput = {
			stream: fs.createWriteStream(morganOutputAbsoluteFilePath, { flags: "a" }),
		};
		const morganMiddleware = morgan(morganMode, morganOutput);
		return morganMiddleware;
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	setupWinston() {
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

		var winstonLogger = winston.createLogger({
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
			defaultMeta: { service: this.serviceName },
			transports: [
				//
				// - Write to all logs with level `info` and below to `.log`
				// - Write all logs error (and below) to `error.log`.
				// NOTE: the level catches all items from the level specified AND LOWER (more important)
				//
				new winston.transports.File({ filename: this.calcLogFilePath("errors"), level: "error" }),
				new winston.transports.File({ filename: this.calcLogFilePath("") }),
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
				filename: this.calcLogFilePath("dblog"),
				level: "db",
			}));
		}

		return winstonLogger;
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	setupDebugmod() {
		// now create the simple console logger from debug module
		var debugfunc = debugmod(this.serviceName);

		// force it on for us
		debugmod.enable(this.serviceName);

		// return it
		return debugfunc;
	}

	setDebugEnable(val) {
		this.debugEnabled = val;
	}

	getDebugEnable() {
		return this.debugEnabled;
	}
	//---------------------------------------------------------------------------















	//---------------------------------------------------------------------------
	// log file path helper
	calcLogFilePath(fileSuffix) {
		var filePath = path.join(this.logDir, this.serviceName);
		if (fileSuffix !== "") {
			filePath += ("_" + fileSuffix + ".log");
		} else {
			filePath += ".log";
		}
		return filePath;
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	// helper for debugging object

	// see https://stackoverflow.com/questions/10729276/how-can-i-get-the-full-object-in-node-jss-console-log-rather-than-object
	// see https://nodejs.org/api/util.html#util_util_inspect_object_options
	objToString(obj, flagCompact) {
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
	dblog(type, message, severity, userid, ip, extraData) {
		var msg;
		const level = winstonCustomLevels[type] ? type : "errorUnknown";
		if (extraData) {
			msg = util.format("type='%s' severity='%s' userid='%s' ip='%s' msg='%s' data='%s'", type, severity, userid, ip, message, JSON.stringify(extraData));
		} else {
			msg = util.format("type='%s' severity='%s' userid='%s' ip='%s' msg='%s'", type, severity, userid, ip, message);
		}
		this.winstonLogger.log(level, msg);
	}
	//---------------------------------------------------------------------------












}







//---------------------------------------------------------------------------
// export A SINGLETON INSTANCE of the class as the sole export
module.exports = JrLog.getSingleton();
//---------------------------------------------------------------------------
