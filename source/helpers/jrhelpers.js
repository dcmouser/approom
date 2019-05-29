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
	if (!val) {
		return defaultval;
	}
	return val;
}


/*
function isEmpty(val) {
	// ATTN: we could just simply do:  "if (val) return true; else return false"
	// which would only differ in the unimportant cases like where val is false or 0
	// The reason we are using this function instead of the simpler "if (val)" is only to help us locate these kind of tests in code via a search, since they are prone to issues..
	return (val === undefined || val===null || val==="");
}
*/


function firstNonEmptyValue(...args) {
	if (args == undefined || args.length == 0) {
		return undefined;
	}
    for (var arg of args) {
		if (arg) {
			return arg;
    	}
    // return last
    return args[args.length-1];
    }
}
//---------------------------------------------------------------------------



//---------------------------------------------------------------------------
function DateNowPlusMinutes(expirationMinutes) {
	var expirationDate = new Date;
	expirationDate.setMinutes( expirationDate.getMinutes() + expirationMinutes );
	return expirationDate;
}
//---------------------------------------------------------------------------



//---------------------------------------------------------------------------
function stringArrayToNiceString(arr) {
	if (arr === undefined || arr.length==0) {
		return "";
	}
	return arr.toString();
}
//---------------------------------------------------------------------------



//---------------------------------------------------------------------------
function makeClonedObjFromEnumerableProperties(source) {
	// just a simple wrapper to make code easier to understand
	var obj = Object.assign({}, source);
	return obj;
}
//---------------------------------------------------------------------------






//---------------------------------------------------------------------------
module.exports = {
	mergeArraysDedupe, getNonEmptyPropertyOrDefault, firstNonEmptyValue,
	DateNowPlusMinutes,
	stringArrayToNiceString,
	makeClonedObjFromEnumerableProperties,
	}
//---------------------------------------------------------------------------