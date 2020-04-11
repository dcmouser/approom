// approom
// v1.0.0 on 4/26/19 by mouser@donationcoder.com
//
//  Server backend to facilitate multi-user communication and synchronization using a room metaphor
//  commandline main app

"use strict";


//---------------------------------------------------------------------------
// modules
const yargs = require("yargs");
//---------------------------------------------------------------------------




//---------------------------------------------------------------------------
// program globals (version, author, etc.)
const arGlobals = require("./approomglobals");

// initialize the service dependency requires helper
arGlobals.setupDefaultModulePaths();

// requirement service locator
const jrequire = require("./helpers/jrequire");

// dynamic dependency requires
const arserver = jrequire("arserver");

// some helpers
const jrconfig = require("./helpers/jrconfig");
const jrdebug = require("./helpers/jrdebug");
//---------------------------------------------------------------------------






//---------------------------------------------------------------------------
// Parse commandline
// The code for setting commandline options is in createYargsObj() object below

// create custom yargs object for commandline options and commands
// you might have multiple cli apps, each with their own createYargsObj
// NOTE: you MUST do this before calling jrconfig.parse() or arserver.setup(), etc.
jrconfig.setYargs(createYargsObj());
//---------------------------------------------------------------------------



//---------------------------------------------------------------------------
// Generic setup call after commandline options are parsed; this call should be done by even the unit test runners
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
	yargs.version("v" + arGlobals.programVersion);
	yargs.epilog("copyright " + arGlobals.programDate + " by " + arGlobals.programAuthor);
	yargs.strict();
	yargs.options({
		config: {
			describe: "Comma separated list of json configuration files to load",
		},
	});
	//
	yargs.command({
		command: "runserver",
		desc: "Run the approom server",
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
	// startup server and run it
	var bretv = await arserver.startUp(true);
	return bretv;
}
//---------------------------------------------------------------------------
