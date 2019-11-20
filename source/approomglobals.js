/**
 * @module approomglobals
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 4/26/19

 * @description
 * Defines and exports some contsants concerning the name, version, etc of the application
 * @todo
 * Replace constant exports with accessors
*/



"use strict";



//---------------------------------------------------------------------------
// OPTIONS
const programName = "approom";
const programVersion = "1.0.2";
const programDate = "5/1/19 - 11/20/19";
const programAuthor = "mouser@donationcoder.com";
const programDescription = "multi-user room-based coordination framework (mewlo2)";
//---------------------------------------------------------------------------



//---------------------------------------------------------------------------
// default values if not specified by commandline/env/config files
// see also the default.json config file
const defaultOptions = {
};

// these are forced and override anything specified on commandline or in config files
const overrideOptions = {
};

// envListOptions is an array of strings to grab and merge from environment; use [""] for none, or set empty array for all
const envListOptions = [
	"",
];
//---------------------------------------------------------------------------





//---------------------------------------------------------------------------
/**
 * The idea here is that we want to be able to easily replace any of the modules of the application.
 * So we include a built-in function for returning the DEFAULT set of module dependency mappings, and most of the time we can just return that here
 *
 * @returns the service locator to use for this application
 */
function setupDefaultModulePaths() {
	const jrequireaid = require("./controllers/jrequireaid");
	jrequireaid.setDeferredLoading(true);
	jrequireaid.setupDefaultModulePaths();
}
//---------------------------------------------------------------------------












//---------------------------------------------------------------------------
module.exports = {
	programName, programVersion, programDate, programAuthor, programDescription,
	defaultOptions, overrideOptions, envListOptions,
	setupDefaultModulePaths,
};
//---------------------------------------------------------------------------
