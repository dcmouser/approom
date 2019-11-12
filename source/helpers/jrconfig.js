// jrconfig
// v1.0.0 on 5/9/19 by mouser@donationcoder.com
//
// helper module for commandline/config-file processing
// higher level wrapper around nconf
//
// to ask jrconfig to load config files via the commandline,
//  call with commandline option "config" with comma separated list of config files
//  (you can skip directory if they are in the config dir of app, and skip .json extension)
//
//

"use strict";


//---------------------------------------------------------------------------
// modules

// nconf allows us to parse environment vars, config files, and commandline args via yargs
const nconf = require("nconf");
const path = require("path");
const fs = require("fs");
//
const jrhelpers = require("./jrhelpers");
const jrlog = require("./jrlog");
//---------------------------------------------------------------------------


//---------------------------------------------------------------------------
// constants
const envListDefault = ["NODE_ENV"];
// default files we always look for -- note that earlier dominates later in this list
const configFilesDefault = ["sitePrivate", "defaultPrivate", "default"];
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




function queueYargsCommand(commandName, argv, callback) {
	// internally called during yargs processing when it finds a command to run

	// store the queued command
	queuedCommands.push({
		command: commandName,
		argv,
		callback,
	});
}



// different way to get/run the queued commands
// this will run callbacks for queued commands:
//   jrconfig.runQueuedCommands();
// this will just get them so you can check and manually do what you want:
//   var cmd = jrconfig.popQueuedCommand();
//   var cmd = jrconfig.findQueuedCommand("dbsetup",true);

function runQueuedCommands(flagErrorIfNone) {
	// run all queued commands
	if (flagErrorIfNone && queuedCommands.length === 0) {
		if (yargsObj !== undefined) {
			yargsObj.showHelp();
		} else {
			jrlog.error("Error: No command specified to run on commandline.");
		}
		return;
	}
	queuedCommands.forEach((cmdEntry) => {
		if (cmdEntry.callback) {
			cmdEntry.callback(cmdEntry.command, cmdEntry.argv);
		} else {
			jrlog.log("Warning: No callback to run for command " + cmdEntry.cmd);
		}
	});
}


function popQueuedCommand() {
	if (queuedCommands.length === 0) {
		return undefined;
	}
	var retv = queuedCommands[0];
	queuedCommands.splice(0, 1);
	return retv;
}


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
function setConfigDir(val) {
	// configDirPath can be base path where there is a config subdir, or the full path to the configdir;
	//  filenames specified via config option will be looked for in this dir
	// fixups - auto add config subdir if caller passed in base dir
	var configDirPathPlus = path.join(val, "config");
	if (fs.existsSync(configDirPathPlus)) {
		configDirPath = configDirPathPlus;
	} else {
		configDirPath = val;
	}

	// add ip-based config files to default list
	addServerPrefixedDefaultConfigFiles();

	// now that we have the config fir, we can se the default a default configfile to process before others
	configFilesDefault.forEach((filepath) => {
		addConfigFile(filepath, false);
	});
}

function setDefaultOptions(val) {
	// defaultOptions is an object loaded into values which are overridden by others from commandline, files, env, etc.
	defaultOptions = val;

}

function setOverrideOptions(val) {
	// overrideOptions is a setting oject whose contents will override anything else read in any other stting
	overrideOptions = val;
}

function setEnvList(val) {
	envList = jrhelpers.mergeArraysDedupe(val, envListDefault);
}

function setYargs(val) {
	// called after creation, so that yargsObj can point to us
	yargsObj = val;
}
//---------------------------------------------------------------------------














//---------------------------------------------------------------------------
// private functions

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


function addServerPrefixedDefaultConfigFiles() {
	// try to read config files specific to ip of server.. this makes it easier to use same file sets running on different (local and remote) servers
	if (!serverFilenamePrefix || serverFilenamePrefix === "") {
		return;
	}
	var ipbases = ["private", "public"];
	ipbases.forEach((filepath) => {
		filepath = serverFilenamePrefix + "_" + filepath;
		addConfigFile(filepath, false);
	});
}


function nconfMergeCliConfigFiles() {
	// find any config files requested on the commandline
	var configFileStr = nconf.get("config");
	if (!configFileStr) {
		// nothing to do
		return true;
	}
	// split list of config files by commas
	var configFileStrs = configFileStr.split(",");
	configFileStrs.forEach((configFilePath) => {
		// try to load it
		nconfMergeConfigFile(configFilePath, true);
	});

	return true;
}


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


function fixConfigFilePathName(filepath) {
	// fixup filepath specified to add extension and relative to our base path
	// add .json
	if (filepath.indexOf(".json") === -1) {
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

function getNconf() {
	// just return nconf object
	return nconf;
}

function getVal(...args) {
	// just pass along to nconf
	var val = nconf.get(...args);
	if (val === undefined) {
		throw new Error("Request for config getVal of a non-existent variable (" + args[0] + ")");
	}
	return val;
}

function getValDefault(arg, defaultVal) {
	var val = nconf.get(arg);
	if (val === undefined) {
		return defaultVal;
	}
	return val;
}

function setServerFilenamePrefixFromServerIp(val) {
	val = ipStringToSafeFilenameString(val);
	serverFilenamePrefix = val;
}

function ipStringToSafeFilenameString(val) {
	// replace . and : with _
	val = val.replace(/[.:]+/g, "_");
	return val;
}

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

	setConfigDir,
	setDefaultOptions,
	setOverrideOptions,
	setEnvList,
	setYargs,

	getNconf,
	getVal,
	getValDefault,
	setServerFilenamePrefixFromServerIp,
	getDebugObj,
};

