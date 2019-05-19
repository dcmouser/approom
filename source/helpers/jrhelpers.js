// jrhelpers
// v1.0.0 on 5/7/19 by mouser@donationcoder.com
//
// some of my generic helper functions

"use strict";


//---------------------------------------------------------------------------
// modules
// for password hashing
var crypto = require("crypto");

// ATTN: move to bcrypt; not yet used
//var bcrypt = require("bcrypt");

// our helper modules
const jrlog = require("./jrlog");
//---------------------------------------------------------------------------










//---------------------------------------------------------------------------
// helper function for merging unique arrays
// see https://stackoverflow.com/questions/1584370/how-to-merge-two-arrays-in-javascript-and-de-duplicate-items
function mergeArraysDedupe(array1, array2) {
	return Array.from(new Set(array1.concat(array2)));
}
//---------------------------------------------------------------------------


//---------------------------------------------------------------------------
function getNonEmptyPropertyOrDefault(val, defaultval) {
	if (isEmpty(val)) {
		return defaultval;
	}
	return val;
}


function isEmpty(val) {
	return (val == undefined || val==null || val=="");
}
//---------------------------------------------------------------------------





//---------------------------------------------------------------------------
module.exports = {
	mergeArraysDedupe, getNonEmptyPropertyOrDefault, isEmpty
	}
//---------------------------------------------------------------------------