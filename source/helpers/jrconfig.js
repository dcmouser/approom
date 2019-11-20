/**
 * @module helpers/jrconfig
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 5/9/19

 * @description
 * Configuration support module that manages configuration commandlineargs/files/options/environment
 * ##### Notes
 *  * We use nconf module for holding all configuration data;  our functions just offer ways to use that more flexibly
 *  * We use yargs to handle commandline processing; our functions just offer ways to use that more flexibly
*/

"use strict";



// modules

const nconf = require("nconf");

const path = require("path");
const fs = require("fs");


// our helpers
const jrhMisc = require("./jrh_misc");
const jrlog = require("./jrlog");







//---------------------------------------------------------------------------
// constants

// what environmental variables to grab out of OS environment and put into config data
const envListDefault = ["NODE_ENV"];

// default files we always look for -- note that earlier dominates later in this list
const configFilesDefault = ["%SERVERPREFIX%_private", "%SERVERPREFIX%_public", "sitePrivate", "sitePublic", "defaultPrivate", "default"];
//---------------------------------------------------------------------------


//---------------------------------------------------------------------------
// module variables
var configDirPath;
var serverFilenamePrefix;
var envList;
var yargsObj;
var configFileCount = 0;
var didParse = false;
//
var defaultOptions = {};
var overrideOptions = {};
var queuedCommands = [];
var configFiles = [];
//---------------------------------------------------------------------------







//---------------------------------------------------------------------------
/**
 * One time call to process options that have been set through other functions first
 *
 * @throws error if you try to run this twice
 */
function parse() {
	// process env, argv, files, etc.
	if (didParse) {
		throw new Error("Parse of config files already ran and can only run once.");
	}
	// set flag saying we have parsed
	didParse = true;

	// now merge in options -- EARLIER dominates LATER (except for defaults)

	// 1. overrides, always dominate
	nconf.overrides(overrideOptions);

	// 2. commandline (via yargs?) [dominates all others]
	if (yargsObj !== undefined) {
		nconf.argv(yargsObj);
	} else {
		nconf.argv();
	}

	// 3. environmental variables
	nconf.env(envList);

	// 4. now we would like to load in any config files found ON THE COMMANDLINE
	// ATTN: one difficulty is we would ideally like to have the order of the files
	//  specified on commandline matter wrt other options
	//  as a practical close-enough, we might just take the list of config files,
	//  and then load them into a separate hierarchy,
	//  and always treat them as less priortity than cli args
	nconfMergeCliConfigFiles();

	// 5. now merge in any explicit list of config files
	configFiles.forEach((fileObj) => {
		if (fileObj.found) {
			nconfMergeConfigFile(fileObj.path, false);
		}
	});

	// 6*. DEFAULT config file, if it exists.
	// ATTN: we no longer call this here, since user can easily call addConfigFile("default",false)
	// nconfMergeConfigFile("default", false);

	// 7. defaultOptions object passed into us
	nconf.defaults(defaultOptions);
}
//---------------------------------------------------------------------------




//---------------------------------------------------------------------------
/**
 * Queue a command with arguments, for the yargs commandline processing library
 *
 * @param {string} commandName
 * @param {*} argv
 * @param {function} callback
 */
function queueYargsCommand(commandName, argv, callback) {
	// internally called during yargs processing when it finds a command to run

	// store the queued command
	queuedCommands.push({
		command: commandName,
		argv,
		callback,
	});
}


/**
 * Run a set of queued yarg commandline options/commands.
 *
 * @param {boolean} flagErrorIfNone
 */
function runQueuedCommands(flagErrorIfNone) {
	// run all queued commands

	// error if none, and show help
	if (flagErrorIfNone && queuedCommands.length === 0) {
		if (yargsObj !== undefined) {
			yargsObj.showHelp();
		} else {
			jrlog.error("Error: No command specified to run on commandline.");
		}
		return;
	}

	// run them
	queuedCommands.forEach((cmdEntry) => {
		if (cmdEntry.callback) {
			cmdEntry.callback(cmdEntry.command, cmdEntry.argv);
		} else {
			jrlog.log("Warning: No callback to run for command " + cmdEntry.cmd);
		}
	});
}


/**
 * An alternate way to manually go through queue of commands
 * @returns the next queued command, in format \{command: commandName, argv, callback\}
 */
function popQueuedCommand() {
	if (queuedCommands.length === 0) {
		return undefined;
	}
	var retv = queuedCommands[0];
	queuedCommands.splice(0, 1);
	return retv;
}


/**
 * Find a queud command by name and return it.
 * This is useful as an alternative way of finding commands explicitly
 *
 * @param {string} cmd
 * @param {boolean} flagPop - if true the found command will be popped off the queue
 * @returns undefined if not found, or queued command in format \{command: commandName, argv, callback\}
 */
function findQueuedCommand(cmd, flagPop) {
	// find the command cmd in the queued list and return it
	var len = queuedCommands.length;
	for (var i = 0; i < len; i++) {
		if (queuedCommands[i].command === cmd) {
			// found it
			var retv = queuedCommands[i];
			if (flagPop) {
				queuedCommands.splice(i, 1);
			}
			return retv;
		}
	}
	return undefined;
}
//---------------------------------------------------------------------------








//---------------------------------------------------------------------------
/**
 * Set the base directory for config files and find a list of all valid config files in this subdir
 * ##### Notes
 *  * Normally you would call this with the actual directory containing the config files, but if you call it with the parent directory, it will look for a "config/" subdir and use that instead.
 *  * This function then looks for a set of specific filenames in the config directory, in a specificy priority order, and queues the ones it finds
 *
 * @param {string} val - base directory where config files are stored
 */
function setConfigDirAndDiscoverFiles(val) {
	// configDirPath can be base path where there is a config subdir, or the full path to the configdir;
	//  filenames specified via config option will be looked for in this dir
	// fixups - auto add config subdir if caller passed in base dir
	var configDirPathPlus = path.join(val, "config");
	if (fs.existsSync(configDirPathPlus)) {
		configDirPath = configDirPathPlus;
	} else {
		configDirPath = val;
	}

	// now that we have the config fir, we can se the default a default configfile to process before others
	configFilesDefault.forEach((filepath) => {
		addConfigFile(filepath, false);
	});
}


/**
 * Set an object with default config options, which will be overridden by options found in config files
 *
 * @param {object} - configuration object with properties that will be used if no config file sets them
 */
function setDefaultOptions(val) {
	// defaultOptions is an object loaded into values which are overridden by others from commandline, files, env, etc.
	defaultOptions = val;

}


/**
 * Set an object containing override options that will take precedence over any options found in any config files
 *
 * @param {object} val - configuration object with properties that will override any config file
 */
function setOverrideOptions(val) {
	// overrideOptions is a setting oject whose contents will override anything else read in any other stting
	overrideOptions = val;
}

/**
 * Sets the list of environment variable key names that will be loaded into the config environment (if not overridden in config files)
 *
 * @param {array} val - list of strings that identify which variables from environment to load
 */
function setEnvList(val) {
	envList = jrhMisc.mergeArraysDedupe(val, envListDefault);
}

/**
 * The caller should pass us the yargs commandline processor module object to use
 *
 * @param {object} val
 */
function setYargs(val) {
	// called after creation, so that yargsObj can point to us
	yargsObj = val;
}
//---------------------------------------------------------------------------














//---------------------------------------------------------------------------
// private functions
/**
 * Helper function to add a file to our queued list of config files (which will be processed in order)
 * @private
 *
 * @param {*} filepath
 * @param {*} flagErrorOnFileNotExist - if set then an exception will be thrown if file does not exist; otherwise nothing happens
 * @returns true if file found and loaded
 * @throws error if file is not found and flagErrorOnFileNotExist is true
 */
function addConfigFile(filepath, flagErrorOnFileNotExist) {
	// queue a config file to load
	var filepathFixed = fixConfigFilePathName(filepath);
	if (!fs.existsSync(filepathFixed)) {
		if (flagErrorOnFileNotExist) {
			// it"s an error that we couldn"t find it
			throw (new Error("Could not locate config file: " + filepath));
		}
		// not found so don"t add it
		configFiles.push({
			path: filepathFixed,
			found: false,
		});
		return false;
	}
	configFiles.push({
		path: filepathFixed,
		found: true,
	});
	return true;
}




/**
 * Get a list of config files specified on the commandline via nconf, and load those in
 * @private
 */
function nconfMergeCliConfigFiles() {
	// find any config files requested on the commandline
	var configFileStr = nconf.get("config");
	if (!configFileStr) {
		// nothing to do
		return;
	}
	// split list of config files by commas
	var configFileStrs = configFileStr.split(",");
	configFileStrs.forEach((configFilePath) => {
		// try to load it
		nconfMergeConfigFile(configFilePath, true);
	});
}


/**
 * Merge in a config file to nconf configuration settings using nconf.file command
 * @private
 *
 * @param {string} filepath
 * @param {boolean} flagErrorOnFileNotExist - throw an error if file does not exist?
 * @returns true if file found and loaded
 * @throws exception if file is missing and flagErrorOnFileNotExist is true
 */
function nconfMergeConfigFile(filepath, flagErrorOnFileNotExist) {
	// merge in a file of options
	filepath = fixConfigFilePathName(filepath);
	if (!fs.existsSync(filepath)) {
		if (flagErrorOnFileNotExist) {
			throw (new Error("Config file does not exist: " + filepath));
		}
		return false;
	}
	// keep track of # of files loaded, each must have their own unique key because nconf is weird
	// note that these options are still available merged when we call get() but when loaded they must have unique rootTag
	// I gather this is so we can CHANGE all under a key by reloading
	configFileCount += 1;
	var rootTag = "jrConfigFile_" + (configFileCount).toString();
	// merge in file options, under rootTag
	nconf.file(rootTag, filepath);
	return true;
}


/**
 * Fixup config file name by adding base directory, doing any %SPECIAL% substrings and adding .json after it if its not explicitly provided
 * @private
 * @todo support jsoc files?
 *
 * @param {string} filepath
 * @returns filepath with base directory and .json added
 */
function fixConfigFilePathName(filepath) {
	// fixup filepath specified to add extension and relative to our base path

	// fixup special fields
	filepath = filepath.replace("%SERVERPREFIX%", serverFilenamePrefix);

	// add .json
	if (filepath.indexOf(".jso") === -1) {
		filepath += ".json";
	}
	// add path
	if (!fs.existsSync(filepath)) {
		filepath = path.join(configDirPath, filepath);
	}
	return filepath;
}
//---------------------------------------------------------------------------







//---------------------------------------------------------------------------
// accessors

/**
 * Just pass along a get request to the underlying nconf module.
 * Use getValDefault if you don't want exception error thrown on missing variable
 * @private
 * @example getVal("DEBUG") - returns the value of the DEBUG config variable
 *
 * @param {*} variadic args but normally just a single string with the variable name
 * @returns value
 * @throws error if variable not found
 */
function getVal(...args) {
	// just pass along to nconf
	var val = nconf.get(...args);
	if (val === undefined) {
		throw new Error("Request for config getVal of a non-existent variable (" + args[0] + ")");
	}
	return val;
}


/**
 * Get the value of a variable; if its undefined then return defaultVal
 * @private
 *
 * @param {string} arg - variable name to find
 * @param {*} defaultVal
 * @returns the config value for variable specified, or defaultVal if not found
 */
function getValDefault(arg, defaultVal) {
	var val = nconf.get(arg);
	if (val === undefined) {
		return defaultVal;
	}
	return val;
}


/**
 * Caller should call this in order for us to discover and load SERVERIP prefixed config files automatically
 * @private
 *
 * @param {string} val - server ip as string (we will convert : to _)
 */
function setServerFilenamePrefixFromServerIp(val) {
	val = ipStringToSafeFilenameString(val);
	serverFilenamePrefix = val;
}


/**
 * Replace filename illegal characters (:) from ip string with underscores
 *
 * @param {*} val - ip string with colons
 * @returns ip string with colons replaced with underscores
 */
function ipStringToSafeFilenameString(val) {
	// replace . and : with _
	val = val.replace(/[.:]+/g, "_");
	return val;
}


/**
 * Function for diagnostics/debugging.
 *
 * @returns an object that contains the nconf.get() full set of assignments of configuration variables, as well as the priority order list of configuration files loaded (and not found)
 */
function getDebugObj() {
	// for debug introspection
	var configFileList = configFiles;
	var debugObj = {
		nconfData: nconf.get(),
		configFiles: configFileList,
	};
	return debugObj;
}
//---------------------------------------------------------------------------











module.exports = {
	parse,
	queueYargsCommand,
	runQueuedCommands,
	findQueuedCommand,

	setConfigDirAndDiscoverFiles,
	setDefaultOptions,
	setOverrideOptions,
	setEnvList,
	setYargs,

	getVal,
	getValDefault,
	setServerFilenamePrefixFromServerIp,
	getDebugObj,
};

