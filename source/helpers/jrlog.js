// jrlogger
// v1.0.0 on 5/7/19 by mouser@donationcoder.com
//
// simple logging wrapper

"use strict";



//---------------------------------------------------------------------------
// we use winston to do the actual work of logging
const winston = require("winston");
// and debug for console logging
const debugmod = require("debug");
// others
const util = require("util");
const path = require("path");
//---------------------------------------------------------------------------


//---------------------------------------------------------------------------
// module-global instance of winston logger for our app
var logger;
// module-global instance of debugmod for our app
var debugfunc;
//---------------------------------------------------------------------------




class JrLog {

	//---------------------------------------------------------------------------
	constructor() {
		// init
		this.logger = undefined;
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
	log(...args) { return this.logger.log(...args); }

	info(...args) { return this.logger.info(...args); }

	warning(...args) { return this.logger.warning(...args); }

	error(...args) { return this.logger.error(...args); }

	// meant as quick replacement for console.log
	clog(...args) { return this.logger.info(...args); }
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	// pass through to debug function for quick and dirty screen display

	cdebug(...args) { if (this.getDebugEnable()) return this.debug(...args); return null; }

	debug(...args) { return this.debugfunc(...args); }

	// helper that simplifies sending a formatted string ("%s:%d", str, val)
	cdebugf(str, ...args) { if (this.getDebugEnable()) return this.debugf(str, ...args); return null; }

	debugf(str, ...args) { return this.debugfunc(util.format(str, ...args)); }

	cdebugObj(obj, msg) { if (this.getDebugEnable()) return this.debugObj(obj, msg); return null; }
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
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
	setup(serviceName, logDir) {
		// save values
		this.serviceName = serviceName;
		this.logDir = logDir;
		//
		this.logger = this.setupWinston();
		// create debug func that is on only in debug mode
		this.debugfunc = this.setupDebugmod();
	}
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	setupWinston() {
		// create the WINSTON logger
		// create transports and initialize
		// see https://github.com/winstonjs/winston/blob/master/examples/quick-start.js
		// NOTE: we use the module global winstonLogger here, as our default

		const customLevels = {
			emerg: 0,
			alert: 1,
			crit: 2,
			error: 3,
			warning: 4,
			notice: 5,
			info: 6,
			debug: 7,
			db: 6,
		};
		const customColors = {
			emerg: "red",
			alert: "red",
			crit: "red",
			error: "red",
			warning: "yellow",
			notice: "green",
			info: "blue",
			debug: "cyan",
			db: "grey",
		};

		var winstonLogger = winston.createLogger({
			levels: customLevels,
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
				//
				new winston.transports.File({ filename: this.calcLogFilePath("errors"), level: "error" }),
				new winston.transports.File({ filename: this.calcLogFilePath("") }),
			],
		});


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


		if (false) {
			// create a db file channel just for DB log messages
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
		debugfunc = debugmod(this.serviceName);
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
	// helpers
	infoObj(obj, msg) {
		// just helper log function

		if (obj === undefined) {
			obj = "___UNDEFINED___";
		}

		if (msg) {
			this.info(msg + ": " + this.objToString(obj, true));
		} else {
			this.info(this.objToString(obj, true));
		}
	}


	debugObj(obj, msg) {
		// just helper log function
		if (msg) {
			this.debug(msg + ": " + this.objToString(obj, false));
		} else {
			this.debug(this.objToString(obj, false));
		}
	}


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
	// dblog is a mirror of our server.log function that adds log to file, so see Server object
	dblog(type, message, severity) {
		var msg = util.format("type='%s' severity='%s' msg='%s'", type, severity, message);
		this.logger.log("db", msg);
		// console.log("dblogging "+msg);
	}
	//---------------------------------------------------------------------------


}







//---------------------------------------------------------------------------
// export A SINGLETON INSTANCE of the class as the sole export
module.exports = JrLog.getSingleton();
//---------------------------------------------------------------------------
