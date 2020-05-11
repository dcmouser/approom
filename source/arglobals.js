/**
 * @module arglobals
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 4/26/19

 * @description
 * Defines and exports some contsants for the APPLICATION (not the server); concerning the name, version, etc of the application
*/


"use strict";



//---------------------------------------------------------------------------
// PROGRAM INFO
const programName = "AppRoom";
const programVersion = "1.0.6";
const programVersionDate = "5/1/19-4/14/20";
const programAuthor = "mouser@donationcoder.com";
const programDescription = "Commandline test app for approom/mewlo";
//---------------------------------------------------------------------------




//---------------------------------------------------------------------------
/**
 * The idea here is that we want to be able to easily replace any of the modules of the application.
 * So we include a built-in function for returning the DEFAULT set of module dependency mappings, and most of the time we can just return that here
 */
function setupDefaultModulePaths() {
	const jrequireaid = require("./controllers/jrequireaid");
	jrequireaid.setupDefaultModulePaths();
}
//---------------------------------------------------------------------------






//---------------------------------------------------------------------------
module.exports = {
	programName, programVersion, programVersionDate, programAuthor, programDescription,
	setupDefaultModulePaths,
};
//---------------------------------------------------------------------------
