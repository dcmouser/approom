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


// modules
// nconf allows us to parse environment vars, config files, and commandline args via yargs
const nconf = require("nconf");
const path = require("path");
const fs = require("fs");
//
const jrhelpers = require("./jrhelpers");
const jrlog = require("./jrlog");


//---------------------------------------------------------------------------
// constants
const envListDefault = ["NODE_ENV"];
// default files we always look for -- note that earlier dominates later in this list
const configFilesDefault = ["defaultPrivate", "default"];
//---------------------------------------------------------------------------






class JrConfig {

	//---------------------------------------------------------------------------
	constructor() {
		// envList is an array of strings of environmental variables whose values will be merged in

		// defaults
		this.configDirPath = undefined;
		this.defaultOptions = {};
		this.overrideOptions = {};

		// init
		this.didParse = false;
		this.fileCount = 0;
		this.queuedCommands = [];
		this.configFiles = [];
	}

	// global singleton request
	static getSingleton(...args) {
		// we could do this more simply by just exporting a new instance as module export,
		// but we wrap a function for more flexibility
		if (this.globalSingleton === undefined) {
			this.globalSingleton = new JrConfig(...args);
		}
		return this.globalSingleton;
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	setConfigDir(configDirPath) {
		// configDirPath can be base path where there is a config subdir, or the full path to the configdir;
		//  filenames specified via config option will be looked for in this dir
		// fixups - auto add config subdir if caller passed in base dir
		var configDirPathPlus = path.join(configDirPath, "config");
		if (fs.existsSync(configDirPathPlus)) {
			configDirPath = configDirPathPlus;
		}
		this.configDirPath = configDirPath;

		// now that we have the config fir, we can se the default a default configfile to process before others
		configFilesDefault.forEach((filepath) => {
			this.addConfigFile(filepath, false);
		});

		return this;
	}

	setDefaultOptions(defaultOptions) {
		// defaultOptions is an object loaded into values which are overridden by others from commandline, files, env, etc.
		this.defaultOptions = defaultOptions;
		return this;
	}

	setOverrideOptions(overrideOptions) {
		// overrideOptions is a setting oject whose contents will override anything else read in any other stting
		this.overrideOptions = overrideOptions;
		return this;
	}

	setEnvList(envList) {
		this.envList = jrhelpers.mergeArraysDedupe(envList, envListDefault);
		return this;
	}

	setYargs(yargsObj) {
		// called after creation, so that yargsObj can point to us
		this.yargsObj = yargsObj;
		return this;
	}

	addConfigFile(filepath, flagErrorOnFileNotExist) {
		// queue a config file to load
		var filepathFixed = this.fixConfigFilePathName(filepath);
		if (!fs.existsSync(filepathFixed)) {
			if (flagErrorOnFileNotExist) {
				// it"s an error that we couldn"t find it
				throw ("Could not locate config file: " + filepath);
			}
			// not found so don"t add it
			return false;
		}
		this.configFiles.push(filepathFixed);
		return true;
	}
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	parseIfNotYetParsed() {
		if (!this.didParse) {
			return this.parse();
		}
		return true;
	}


	parse() {
		// process env, argv, files, etc.
		// return True on success, or False on error
		var bretv = true;

		// set flag saying we have parsed
		this.didParse = true;

		// now merge in options -- EARLIER dominates LATER (except for defaults)

		// 1. overrides, always dominate
		nconf.overrides(this.overrideOptions);

		// 2. commandline (via yargs?) [dominates all others]
		if (this.yargsObj !== undefined) {
			nconf.argv(this.yargsObj);
		} else {
			nconf.argv();
		}

		// 3. environmental variables
		nconf.env(this.envList);

		// 4. now we would like to load in any config files found ON THE COMMANDLINE
		// ATTN: one difficulty is we would ideally like to have the order of the files
		//  specified on commandline matter wrt other options
		//  as a practical close-enough, we might just take the list of config files,
		//  and then load them into a separate hierarchy,
		//  and always treat them as less priortity than cli args
		this.nconfMergeCliConfigFiles();

		// 5. now merge in any explicit list of config files
		this.configFiles.forEach((filepath) => {
			this.nconfMergeConfigFile(filepath, false);
		});

		// 6*. DEFAULT config file, if it exists.
		// ATTN: we no longer call this here, since user can easily call addConfigFile("default",false)
		// this.nconfMergeConfigFile("default", false);

		// 7. defaultOptions object passed into us
		nconf.defaults(this.defaultOptions);

		// done
		return bretv;
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	nconfMergeCliConfigFiles() {
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
			// jrlog.log("LOADING CONFIG FILE: "+configFilePath);
			this.nconfMergeConfigFile(configFilePath, true);
		});

		return true;
	}


	nconfMergeConfigFile(filepath, flagErrorOnFileNotExist) {
		// merge in a file of options
		filepath = this.fixConfigFilePathName(filepath);
		if (!fs.existsSync(filepath)) {
			if (flagErrorOnFileNotExist) {
				throw ("Config file does not exist: " + filepath);
			}
			return false;
		}
		// keep track of # of files loaded, each must have their own unique key because nconf is weird
		// note that these options are still available merged when we call get() but when loaded they must have unique rootTag
		// I gather this is so we can CHANGE all under a key by reloading
		this.fileCount += 1;
		var rootTag = "jrConfigFile_" + (this.fileCount).toString();
		// merge in file options, under rootTag
		nconf.file(rootTag, filepath);
		return true;
	}


	fixConfigFilePathName(filepath) {
		// fixup filepath specified to add extension and relative to our base path
		// add .json
		if (filepath.indexOf(".json") === -1) {
			filepath += ".json";
		}
		// add path
		if (!fs.existsSync(filepath)) {
			filepath = path.join(this.configDirPath, filepath);
		}
		return filepath;
	}


	queueYargsCommand(commandName, argv, callback) {
		// internally called during yargs processing when it finds a command to run
		if (false) {
			jrlog.log("jrconfig Queing command " + commandName);
			jrlog.logObj(argv, "command argv");
		}
		// store the queued command
		this.queuedCommands.push({
			command: commandName,
			argv,
			callback,
		});
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	// accessors

	getNconf() {
		// just return nconf object
		return nconf;
	}

	getYargs() {
		// just return yargs object
		return this.yargsObj;
	}

	get(...args) {
		// just pass along to nconf
		return nconf.get(...args);
	}

	getDefault(arg, defaultVal) {
		var val = nconf.get(arg);
		if (val === undefined) {
			return defaultVal;
		}
		return val;
	}
	//---------------------------------------------------------------------------





	//---------------------------------------------------------------------------
	// different way to get/run the queued commands
	// this will run callbacks for queued commands:
	//   jrconfig.runQueuedCommands();
	// this will just get them so you can check and manually do what you want:
	//   var cmd = jrconfig.popQueuedCommand();
	//   var cmd = jrconfig.findQueuedCommand("dbsetup",true);

	runQueuedCommands(flagErrorIfNone) {
		// run all queued commands
		if (flagErrorIfNone && this.queuedCommands.length === 0) {
			if (this.yargsObj !== undefined) {
				this.yargsObj.showHelp();
			} else {
				jrlog.error("Error: No command specified to run on commandline.");
			}
			return;
		}
		this.queuedCommands.forEach((cmdEntry) => {
			if (cmdEntry.callback) {
				cmdEntry.callback(cmdEntry.command, cmdEntry.argv);
			} else {
				jrlog.log("Warning: No callback to run for command " + cmdEntry.cmd);
			}
		});
	}


	findQueuedCommand(cmd, flagPop) {
		// find the command cmd in the queued list and return it
		var len = this.queuedCommands.length;
		for (var i = 0; i < len; i++) {
			if (this.queuedCommands[i].command === cmd) {
				// found it
				var retv = this.queuedCommands[i];
				if (flagPop) {
					this.queuedCommands.splice(i, 1);
				}
				return retv;
			}
		}
		return undefined;
	}

	popQueuedCommand() {
		if (this.queuedCommands.length === 0) {
			return undefined;
		}
		var retv = this.queuedCommands[0];
		this.queuedCommands.splice(0, 1);
		return retv;
	}
	//---------------------------------------------------------------------------


}


// export A SINGLETON INSTANCE of the class as the sole export
module.exports = JrConfig.getSingleton();
