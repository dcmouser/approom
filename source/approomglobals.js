// approom
// v1.0.0 on 4/26/19 by mouser@donationcoder.com
//
// some global options
//
// ATTN: TODO replace these properties with getters for better error detection

"use strict";



//---------------------------------------------------------------------------
// OPTIONS
const programName = "approom";
const programVersion = "1.0.1";
const programDate = "5/1/19 - 6/19/19";
const programAuthor = "mouser@donationcoder.com";
const programDescription = "multi-user room-based coordination framework";
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
module.exports = {
	programName, programVersion, programDate, programAuthor, programDescription,
	defaultOptions, overrideOptions, envListOptions,
};
//---------------------------------------------------------------------------
