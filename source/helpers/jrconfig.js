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

// nconf
const nconf = require("nconf");

// support yaml config files
const yaml = require("js-yaml");

const path = require("path");
const fs = require("fs");

// for stupid nconf display dump.. ugh we need to get rid of nconf
const mergeDeep = require("merge-deep");


// our helpers
const jrhMisc = require("./jrh_misc");
const jrlog = require("./jrlog");







//---------------------------------------------------------------------------
// constants

// what environmental variables to grab out of OS environment and put into config data
var envList = ["NODE_ENV"];

// default files we always look for -- note that earlier dominates later in this list
var configFileEarlySet = [];
const configFilesNormal = ["%SERVERPREFIX%_private", "%SERVERPREFIX%_public", "site_private", "site_public", "private", "public"];
const configFilesSource = ["default_private", "default_public"];
//---------------------------------------------------------------------------


//---------------------------------------------------------------------------
// module variables
// var configDirPath;
var sourceConfigDir, normalConfigDir;
//
var serverFilenamePrefix;
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
		// ATTN: i think yargsObj has a bunch of stuff we don't really want.. maybe there's a better way to get a more compact version
		nconf.argv(yargsObj);
	} else {
		nconf.argv();
	}

	// 3. which environmental variables are imported into settings
	nconf.env(envList);

	// 4. discover configuration files and add to configFiles
	this.discoverConfigFiles();

	// 5. now merge in any explicit list of config files
	configFiles.forEach((fileObj) => {
		if (fileObj.found) {
			nconfMergeConfigFile(fileObj.path, false);
		}
	});

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
			jrlog.logDefaultError("Error: No command specified to run on commandline.");
		}
		return;
	}

	// run them
	queuedCommands.forEach((cmdEntry) => {
		if (cmdEntry.callback) {
			cmdEntry.callback(cmdEntry.command, cmdEntry.argv);
		} else {
			jrlog.logDefaultError("Warning: No callback to run for command " + cmdEntry.cmd);
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
function setConfigDirs(inSourceConfigDir, inNormalConfigDir) {
	// configDirPath can be base path where there is a config subdir, or the full path to the configdir;
	//  filenames specified via config option will be looked for in this dir
	sourceConfigDir = inSourceConfigDir;
	normalConfigDir = inNormalConfigDir;
}

/**
 * Add all the config files we can find from default source config dir, and local dir, plus maybe some cli passed ones, PLUS some special overrides that can be used for testing
 *
 */
function discoverConfigFiles() {
	// now that we have the config fir, we can se the default a default configfile to process before others

	// first commandline config files get precedence
	addConfigFilesCli();

	// after cli comes these early ones
	configFileEarlySet.forEach((earlyName) => {
		// each early name in set means we try a bunch in normal user local dir
		configFilesNormal.forEach((setBaseName) => {
			var filepath = setBaseName + "_" + earlyName;
			addConfigFile(normalConfigDir, filepath, false, false);
		});
		// and some in default source config dir
		configFilesSource.forEach((setBaseName) => {
			var filepath = setBaseName + "_" + earlyName;
			addConfigFile(sourceConfigDir, filepath, false, false);
		});
	});

	// earlier has priority over later, so we start with normalConfig dir
	configFilesNormal.forEach((filepath) => {
		addConfigFile(normalConfigDir, filepath, false, false);
	});

	// and now source config dir as our fallback
	configFilesSource.forEach((filepath) => {
		addConfigFile(sourceConfigDir, filepath, false, false);
	});
}



/**
 * Get a list of config files specified on the commandline via nconf, and load those in
 * @private
 */
function addConfigFilesCli() {
	// find any config files requested on the commandline
	var configFileStr = nconf.get("config");
	if (!configFileStr) {
		// nothing to do
		return;
	}
	// split list of config files by commas
	var configFileStrs = configFileStr.split(",");
	configFileStrs.forEach((filepath) => {
		// try to load it (note last parameter true meaning trigger error if not found)
		addConfigFile(normalConfigDir, filepath, true, false);
	});
}



// add to list of early config files
function addEarlyConfigFileSet(filename) {
	configFileEarlySet.push(filename);
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
	envList = jrhMisc.mergeArraysDedupe(val, envList);
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
 * @returns true if file found and queued for loading
 * @throws error if file is not found and flagErrorOnFileNotExist is true
 */
function addConfigFile(baseDir, filepath, flagErrorOnFileNotExist, flagInsertAtBeginning) {
	// queue a config file to load
	var foundFlag = true;
	var filepathFixed = fixConfigFilePathName(baseDir, filepath);

	if (!fs.existsSync(filepathFixed)) {
		if (flagErrorOnFileNotExist) {
			// it"s an error that we couldn"t find it
			throw (new Error("Could not locate config file: " + filepath));
		}
		// not found
		// drop down and "add" it to our list for debugging purposes, but set found flag false meaning it cannot be loaded
		foundFlag = false;

	}

	// add it
	var fval = {
		path: filepathFixed,
		found: foundFlag,
	};
	if (flagInsertAtBeginning) {
		configFiles.unshift(fval);
	} else {
		configFiles.push(fval);
	}

	// return true if found
	return foundFlag;
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

	// filepath = fixConfigFilePathName(basedir, filepath);
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
	doNconfFile(rootTag, filepath);
	return true;
}


/**
 * Invoke the nconf.file function but check file extension and support yaml files
 * @private
 *
 * @param {*} rootTag tag for nconf
 * @param {*} filepath filepath for nconf
 */
function doNconfFile(rootTag, filepath) {
	var retv;

	if (filepath.indexOf(".yaml") !== -1 || filepath.indexOf(".yml") !== -1) {
		// ok its a yaml file
		// see https://gist.github.com/clarkdave/f31d92ca88d11ef5340c
		// console.log("ATTN: doNconfFile yaml file: " + filepath);
		retv = nconf.file(rootTag, {
			file: filepath,
			format: {
				parse: yaml.safeLoad,
				stringify: yaml.safeDump,
			},
		});
	} else {
		// fall back on json/native nconf file we assume
		// console.log("ATTN: doNconfFile JSON file: " + filepath);
		retv = nconf.file(rootTag, filepath);
	}
	return retv;
}


/**
 * Fixup config file name by adding base directory, doing any %SPECIAL% substrings and adding .json after it if its not explicitly provided
 * @private
 * @todo support jsoc files?
 *
 * @param {string} filepath
 * @returns filepath with base directory and extension (yml) added
 */
function fixConfigFilePathName(baseDir, filepath) {
	// fixup filepath specified to add extension and relative to our base path

	// fixup special fields
	filepath = filepath.replace("%SERVERPREFIX%", serverFilenamePrefix);

	// add assumed extension
	if (filepath.indexOf(".yaml") === -1 && filepath.indexOf(".yml") === -1 && filepath.indexOf(".json") === -1) {
		// ATTN: new default is yml (yaml)
		filepath += ".yml";
	}
	// add path
	if (!fs.existsSync(filepath)) {
		filepath = path.join(baseDir, filepath);
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
	if (args.length === 0) {
		// complain
		throw new Error("Request for config getVal but no variable key name was passed.");
	}

	var val = nconf.get(...args);
	if (val === undefined) {
		throw new Error("Request for config getVal of a non-existent variable (" + args[0] + ")");
	}
	return configAutoConverTypeVal(val);
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
	return configAutoConverTypeVal(val);
}

/**
 * Convert boolean "strings" to boolean values
 *
 * @param {*} val
 * @returns val converted to bool if its "true" or "false"
 */
function configAutoConverTypeVal(val) {
	// ATTN: TODO auto convert numbers?
	// ATTN: this is not needed; its auto performed by the yml reader
	/*
	if (typeof val === "string") {
		if (val === "true") {
			return true;
		}
		if (val === "false") {
			return false;
		}
		if (val === "undefined") {
			return undefined;
		}
	}
	*/
	// return it as is
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
//---------------------------------------------------------------------------






//---------------------------------------------------------------------------
/**
 * Function for diagnostics/debugging.
 *
 * @returns an object that contains the merged set of options, so that overridden options are respected
 */
function getDebugOptions() {
	// for debug introspection

	// iterate nconf stores and merge them -- THIS is how we get a compact list of the nconf values actually available -- a dump of nconf values
	// it is necesary to be so ridiculous because nconf does not store a merged set of keyvalues as you might expect if you were sane, but instead
	// it keeps all values and does a full lookup each time you query.
	// This is why we need to get rid of nconf asap
	var nconfDataMerged = {};
	var astore;
	var storekeys = Object.keys(nconf.stores);
	storekeys.reverse();
	storekeys.forEach((key) => {
		astore = nconf.stores[key].store;
		nconfDataMerged = mergeDeep(nconfDataMerged, astore);
	});

	var debugObj = {
		options: nconfDataMerged,
	};
	return debugObj;
}



/**
 * Function for diagnostics/debugging.
 *
 * @returns an object that contains a list of the config files in order of priority
 */
function getDebugFiles() {
	// for debug introspection

	var debugObj = {
		configFiles,
	};
	return debugObj;
}





/**
 * Function for diagnostics/debugging.
 *
 * @returns an object that contains a list of the config files in order of priority
 */
function getDebugHierarchy() {
	// for debug introspection

	var debugObj = {
		nconf_stores: nconf.stores,
	};
	return debugObj;
}
//---------------------------------------------------------------------------











module.exports = {
	parse,
	queueYargsCommand,
	runQueuedCommands,
	findQueuedCommand,

	setConfigDirs,
	addEarlyConfigFileSet,
	discoverConfigFiles,

	setDefaultOptions,
	setOverrideOptions,
	setEnvList,
	setYargs,

	getVal,
	getValDefault,
	setServerFilenamePrefixFromServerIp,

	getDebugOptions,
	getDebugFiles,
	getDebugHierarchy,
};

