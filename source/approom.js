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
const arserver = require("./controllers/server");

// our helper modules
const jrconfig = require("./helpers/jrconfig");
const jrlog = require("./helpers/jrlog");

// program globals (version, author, etc.)
const arGlobals = require("./approomglobals");
//---------------------------------------------------------------------------










//---------------------------------------------------------------------------
// create custom yargs object for commandline options and commands
// you might have multiple cli apps, each with their own createYargsObj
// NOTE: you MUST do this before calling jrconfig.parse or setupConfigAndLoggingEnvironment, etc.
jrconfig.setYargs(createYargsObj());
//---------------------------------------------------------------------------




//---------------------------------------------------------------------------
// this should be done by even the unit test runners
arserver.setupConfigAndLoggingEnvironment();

// configure server instance (jrconfig should be parsed first)
arserver.parseConfig();
//---------------------------------------------------------------------------




// Everything below here is app cli specific



//---------------------------------------------------------------------------
// now do what commandline says to do
processJrConfigAndCommandline();
//---------------------------------------------------------------------------



//---------------------------------------------------------------------------
// commandline process
function processJrConfigAndCommandline() {
	if (jrconfig.getValDefault("debug", false)) {
		// testing
		var nconfobj = jrconfig.getNconf();
		var dataobj = nconfobj.get();
		jrlog.logObj(dataobj, "dataobj");
		jrlog.logObj(jrconfig.getValDefault("debug", false), "jrconfig.debug");
	}

	// run commandline callbacks (show help if none found)
	jrconfig.runQueuedCommands(true);
}
//---------------------------------------------------------------------------











//---------------------------------------------------------------------------
// commandline options for this program

function createYargsObj() {
	var yargs = require("yargs");
	yargs.version(arGlobals.programVersion);
	yargs.epilog("copyright " + arGlobals.programDate + " by " + arGlobals.programAuthor);
	yargs.strict();
	yargs.options({
		config: {
			describe: "Comma separated list of json configuration files to load",
		},
	});
	//
	yargs.command({
		command: "dbsetup",
		desc: "Setup the approoom database",
		handler: (argv) => {
			jrconfig.queueYargsCommand("dbsetup", argv, (cmd) => {
				commandDbSetup();
			});
		},
	});
	//
	yargs.command({
		command: "runserver",
		desc: "Run the approoom server",
		handler: (argv) => {
			jrconfig.queueYargsCommand("runserver", argv, (cmd) => {
				commandRunServer();
			});
		},
	});
	return yargs;
}
//---------------------------------------------------------------------------













//---------------------------------------------------------------------------
// functions callable from commandline

async function commandRunServer() {
	// first setup db stuff
	var bretv = await arserver.createAndConnectToDatabase();
	// now launch server
	bretv = await arserver.runServer();
	return bretv;
}


async function commandDbSetup() {
	// setup initial database and acl stuff
	const bretv = await arserver.createAndConnectToDatabase();
	jrlog.debug("Finished dbsetup.");
	arserver.closeDown();
	return bretv;
}
//---------------------------------------------------------------------------
