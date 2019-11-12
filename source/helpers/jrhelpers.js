// jrhelpers
// v1.0.0 on 5/7/19 by mouser@donationcoder.com
//
// some of my generic helper functions

"use strict";





//---------------------------------------------------------------------------
// helper function for merging unique arrays
// see https://stackoverflow.com/questions/1584370/how-to-merge-two-arrays-in-javascript-and-de-duplicate-items
function mergeArraysKeepDupes(array1, array2) {
	return array1.concat(array2);
}

function mergeArraysDedupe(array1, array2) {
	return Array.from(new Set(array1.concat(array2)));
}

function isInAnyArray(val, ...arrays) {
	for (var ar of arrays) {
		if (ar && ar.indexOf(val) !== -1) {
			return true;
		}
	}
	return false;
}
//---------------------------------------------------------------------------



//---------------------------------------------------------------------------
// ATTENTION: very weird things happen if you try to do a foreach loop with async functions inside, they run in parallal essentialy
// make very sure this is called with "await jrhelpers.asyncForEach" or you will not get correct outcome
async function asyncForEach(array, callback) {
	for (let index = 0; index < array.length; index++) {
		await callback(array[index], index, array);
	}
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
	if (!args || args.length === 0) {
		return undefined;
	}
	for (var arg of args) {
		if (arg) {
			return arg;
		}
	}
	// return last
	return args[args.length - 1];
}


// we want to check if its an empty {}
// see https://stackoverflow.com/questions/679915/how-do-i-test-for-an-empty-javascript-object
function isObjectIsEmpty(obj) {
	if (!obj || (Object.entries(obj).length === 0 && obj.constructor === Object)) {
		return true;
	}
	if (!obj || Object.keys(obj).length === 0) {
		return true;
	}
	return false;
}
//---------------------------------------------------------------------------



//---------------------------------------------------------------------------
function DateNowPlusMinutes(expirationMinutes) {
	var expirationDate = new Date();
	expirationDate.setMinutes(expirationDate.getMinutes() + expirationMinutes);
	return expirationDate;
}
//---------------------------------------------------------------------------






//---------------------------------------------------------------------------
function makeClonedObjFromEnumerableProperties(source) {
	// just a simple wrapper to make code easier to understand
	// var obj = Object.assign({}, source);
	var obj = { ...source };
	return obj;
}


// see https://medium.com/@Farzad_YZ/3-ways-to-clone-objects-in-javascript-f752d148054d
function iterationCopy(src) {
	var target = {};
	for (var prop in src) {
		if (Object.prototype.hasOwnProperty.call(src, prop)) {
			target[prop] = src[prop];
		}
	}
	return target;
}


function keyCopy(src) {
	var keys = Object.keys(src);
	var target = {};
	for (var prop in keys) {
		target[prop] = src[prop];
	}
	return target;
}
//---------------------------------------------------------------------------


//---------------------------------------------------------------------------
function stringArrayToNiceString(arr) {
	if (!arr || arr.length === 0) {
		return "";
	}
	return arr.toString();
}


function getFormTypeStrToPastTenseVerb(formTypeStr) {
	if (formTypeStr === "add") {
		return "added";
	}
	if (formTypeStr === "edit") {
		return "updated";
	}
	if (formTypeStr === "delete") {
		return "deleted";
	}
	return "operation unknown";
}


function getNiceNowString() {
	return new Date(Date.now()).toLocaleString();
}


function getPreciseNowString() {
	return new Date(Date.now()).toISOString();
}
//---------------------------------------------------------------------------









//---------------------------------------------------------------------------
function regexEscapeStr(str) {
	// replace special characters in string so it can be used in regex
	str = str.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
	return str;
}

function makeSafeForFormInput(str) {
	return str.replace(/"/g, "&quot;");
}
//---------------------------------------------------------------------------


//---------------------------------------------------------------------------
// https://stackoverflow.com/questions/27746304/how-do-i-tell-if-an-object-is-a-promise
function isPromise(value) {
	return Boolean(value && typeof value.then === "function");
}
//---------------------------------------------------------------------------




//---------------------------------------------------------------------------
function parseJsonObj(obj, defaultVal) {
	if (!obj) {
		return defaultVal;
	}
	var parsedObj = JSON.parse(obj);
	return parsedObj;
}
//---------------------------------------------------------------------------



//---------------------------------------------------------------------------
// ATTN: untested and unreliable
function getServerIpAddress() {
	// var ip = require("ip");
	// return ip.address();
	// see https://stackoverflow.com/questions/3653065/get-local-ip-address-in-node-js
	var os = require("os");

	var ifaces = os.networkInterfaces();
	var ifacesKeys = Object.keys(ifaces);
	var iface, ifname, ifaceset;
	var bestip;
	var alias = 0;

	// jrlog.debugObj(ifaces, "ifaces");
	// jrlog.debugObj(ifacesKeys, "ifacesKeys");

	for (var j = 0; j < ifacesKeys.length; ++j) {
		ifname = ifacesKeys[j];

		ifaceset = ifaces[ifname];
		// jrlog.debugObj(ifaceset, "ifaceset");

		alias = 0;
		for (var i = 0; i < ifaceset.length; ++i) {
			iface = ifaceset[i];
			// jrlog.debugObj(iface, "iface[" + ifname + "]");
			if (iface.family !== "IPv4" || iface.internal !== false) {
				// skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
				bestip = iface.address;
			} else if (alias >= 1) {
				// this single interface has multiple ipv4 addresses
				bestip = iface.address;
				break;
			} else {
				// this interface has only one ipv4 adress
				bestip = iface.address;
				break;
			}
			++alias;
		}
		if (bestip) {
			return bestip;
		}
	}
	// not found;
	return "";
}
//---------------------------------------------------------------------------








module.exports = {
	mergeArraysKeepDupes,
	mergeArraysDedupe,
	isInAnyArray,

	asyncForEach,

	getNonEmptyPropertyOrDefault,
	firstNonEmptyValue,
	isObjectIsEmpty,

	DateNowPlusMinutes,

	makeClonedObjFromEnumerableProperties,
	iterationCopy,
	keyCopy,

	stringArrayToNiceString,
	getFormTypeStrToPastTenseVerb,
	getNiceNowString,
	getPreciseNowString,

	regexEscapeStr,
	makeSafeForFormInput,

	isPromise,
	parseJsonObj,

	getServerIpAddress,

};
