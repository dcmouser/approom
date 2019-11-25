// approom
// v1.0.0 on 4/26/19 by mouser@donationcoder.com
//
//  Server backend to facilitate multi-user communication and synchronization using a room metaphor
//  commandline main app

"use strict";


// modules
const yargs = require("yargs");


//---------------------------------------------------------------------------
// program globals (version, author, etc.)
const arGlobals = require("./approomglobals");

// initialize the service dependency requires helper
arGlobals.setupDefaultModulePaths();

// requirement service locator
const jrequire = require("./helpers/jrequire");

const jrconfig = require("./helpers/jrconfig");
const jrdebug = require("./helpers/jrdebug");

const arserver = jrequire("arserver");
//---------------------------------------------------------------------------






//---------------------------------------------------------------------------
// create custom yargs object for commandline options and commands
// you might have multiple cli apps, each with their own createYargsObj
// NOTE: you MUST do this before calling jrconfig.parse or setup, etc.
jrconfig.setYargs(createYargsObj());
//---------------------------------------------------------------------------




//---------------------------------------------------------------------------
// this should be done by even the unit test runners
arserver.setup();
//---------------------------------------------------------------------------




// Everything below here is app cli specific



//---------------------------------------------------------------------------
// now do what commandline says to do
processJrConfigAndCommandline();
//---------------------------------------------------------------------------



//---------------------------------------------------------------------------
// commandline process
function processJrConfigAndCommandline() {
	// run commandline callbacks (show help if none found)
	jrconfig.runQueuedCommands(true);
}
//---------------------------------------------------------------------------











//---------------------------------------------------------------------------
// commandline options for this program

function createYargsObj() {
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
	jrdebug.debug("Finished dbsetup.");
	arserver.closeDown();
	return bretv;
}
//---------------------------------------------------------------------------
