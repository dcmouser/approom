// approom
// v1.0.0 on 4/26/19 by mouser@donationcoder.com
//
//  Server backend to facilitate multi-user communication and synchronization using a room metaphor
//  commandline main app


"use strict";


//---------------------------------------------------------------------------
// package data
const pkg = require("./package.json");

// code files
const AppRoomServer = require("./models/server");

// modules
const JrConfig = require("./helpers/jrconfig");
const jrhelpers = require("./helpers/jrhelpers");
const path = require("path");
//---------------------------------------------------------------------------



//---------------------------------------------------------------------------
// create a singleton server instance
var arserver = AppRoomServer.getSingleton();
//---------------------------------------------------------------------------


//---------------------------------------------------------------------------
// jrconfig / nconf parsing of commandline/env/config file options
//
// default values if not specified by commandline/env/config files
const defaultOptions = {};
// these are forced and override anything specified on commandline or in config files
const overrideOptions = {};
// envList is an array of strings to grab and merge from environment; use [""] for none, or set empty array for all
const envList = [""];
//
// create jrconfig
var jrconfig = new JrConfig(__dirname, defaultOptions, overrideOptions, envList);
//
// create custom yargs object for commandline options and commands
var yargsObj = createYargsObj(jrconfig);
// add it to jrconfig
jrconfig.setYargs(yargsObj);
//
// config files to process (earlier dominates later)
jrconfig.addConfigFile("default", false);

// now parse commandline/config/env/ etc.
if (!jrconfig.parse()) {
	// errors processing commandline, exit;
	console.error("Error processing commandline/file/env options.");
	if (yargsObj!==undefined) {
		yargsObj.showHelp()
	}
	process.exit(1);
}

//
// now do what commandline says to do
processJrConfig(jrconfig);
//---------------------------------------------------------------------------










//---------------------------------------------------------------------------
// commandline process
function processJrConfig(jrconfig) {
	if (jrconfig.get("debug")) {
		// testing
		var nconfobj = jrconfig.getNconf();
		var dataobj = nconfobj.get();
		//	jrhelpers.consoleLogObj(dataobj, "dataobj");
		jrhelpers.consoleLogObj(jrconfig.get("debug"), "jrconfig.debug");
		//	jrhelpers.consoleLogObj(jrconfig.getYargs(), "yargs");
	}

	// run commandline callbacks (show help if none found)
	jrconfig.runQueuedCommands(true);
}
//---------------------------------------------------------------------------











//---------------------------------------------------------------------------
function createYargsObj(jrconfig) {
	var yargs = require("yargs");
	yargs.version("1.0.0");
	yargs.epilog("copyright 2019 mouser@donationcoder.com");
	yargs.strict();
	yargs.options({
		"config": {
			describe: "Comma separated list of json configuration files to load"
		}
	});
	//
	yargs.command({
		command: "dbsetup",
		desc: "Setup the approoom database",
		handler: (argv) => {jrconfig.queueYargsCommand("dbsetup", argv, (cmd, jrconfig)=> { commandDbSetup(jrconfig);} );}
	});
	//
	yargs.command({
		command: "runserver",
		desc: "Run the approoom server",
		handler: (argv) => {jrconfig.queueYargsCommand("runserver",argv, (cmd, jrconfig)=> { commandRunServer(jrconfig);} );}
	});
	return yargs;
}
//---------------------------------------------------------------------------













//---------------------------------------------------------------------------
// functions callable from commandline


async function commandRunServer(jrconfig) {
	// just do dummy work
	const bretv = await arserver.runServer();
	return bretv;
}


async function commandDbSetup(jrconfig) {
	// setup initial database and acl stuff
	const bretv = await arserver.dbSetup();
	console.log("Finished dbsetup.");
	arserver.closeDown();
	return bretv;
}
//---------------------------------------------------------------------------
