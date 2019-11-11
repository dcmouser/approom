// jrhelpers
// v1.0.0 on 5/7/19 by mouser@donationcoder.com
//
// some of my generic helper functions

"use strict";

// our helper modules
const jrlog = require("../helpers/jrlog");









class JrHelpers {

	//---------------------------------------------------------------------------
	constructor() {
	}

	// global singleton request
	static getSingleton(...args) {
		// we could do this more simply by just exporting a new instance as module export, but we wrap a function for more flexibility
		if (this.globalSingleton === undefined) {
			this.globalSingleton = new JrHelpers(...args);
		}
		return this.globalSingleton;
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	// helper function for merging unique arrays
	// see https://stackoverflow.com/questions/1584370/how-to-merge-two-arrays-in-javascript-and-de-duplicate-items
	mergeArraysKeepDupes(array1, array2) {
		return array1.concat(array2);
	}

	mergeArraysDedupe(array1, array2) {
		return Array.from(new Set(array1.concat(array2)));
	}

	isInAnyArray(val, ...arrays) {
		for (var ar of arrays) {
			if (ar && ar.indexOf(val) !== -1) {
				return true;
			}
		}
		return false;
	}


	// ATTENTION: very weird things happen if you try to do a foreach loop with async functions inside, they run in parallal essentialy
	// make very sure this is called with "await jrhelpers.asyncForEach" or you will not get correct outcome
	async asyncForEach(array, callback) {
		for (let index = 0; index < array.length; index++) {
			await callback(array[index], index, array);
		}
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	getNonEmptyPropertyOrDefault(val, defaultval) {
		if (!val) {
			return defaultval;
		}
		return val;
	}


	/*
	isEmpty(val) {
		// ATTN: we could just simply do:  "if (val) return true; else return false"
		// which would only differ in the unimportant cases like where val is false or 0
		// The reason we are using this function instead of the simpler "if (val)" is only to help us locate these kind of tests in code via a search, since they are prone to issues..
		return (val === undefined || val===null || val==="");
	}
	*/


	firstNonEmptyValue(...args) {
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
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	// we want to check if its an empty {}
	// see https://stackoverflow.com/questions/679915/how-do-i-test-for-an-empty-javascript-object
	isObjectIsEmpty(obj) {
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
	DateNowPlusMinutes(expirationMinutes) {
		var expirationDate = new Date();
		expirationDate.setMinutes(expirationDate.getMinutes() + expirationMinutes);
		return expirationDate;
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	stringArrayToNiceString(arr) {
		if (!arr || arr.length === 0) {
			return "";
		}
		return arr.toString();
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	makeClonedObjFromEnumerableProperties(source) {
		// just a simple wrapper to make code easier to understand
		// var obj = Object.assign({}, source);
		var obj = { ...source };
		return obj;
	}


	// see https://medium.com/@Farzad_YZ/3-ways-to-clone-objects-in-javascript-f752d148054d
	iterationCopy(src) {
		var target = {};
		for (var prop in src) {
			if (Object.prototype.hasOwnProperty.call(src, prop)) {
				target[prop] = src[prop];
			}
		}
		return target;
	}


	keyCopy(src) {
		var keys = Object.keys(src);
		var target = {};
		for (var prop in keys) {
			target[prop] = src[prop];
		}
		return target;
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	getFormTypeStrToPastTenseVerb(formTypeStr) {
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
	//---------------------------------------------------------------------------

	//---------------------------------------------------------------------------
	// see https://github.com/Automattic/mongoose/issues/1959
	isValidMongooseObjectId(str) {
		if (typeof str !== "string") {
			return false;
		}
		return str.match(/^[a-f\d]{24}$/i);
	}
	//---------------------------------------------------------------------------





	//---------------------------------------------------------------------------
	getNiceNowString() {
		return new Date(Date.now()).toLocaleString();
	}

	getPreciseNowString() {
		return new Date(Date.now()).toISOString();
	}
	//---------------------------------------------------------------------------





	//---------------------------------------------------------------------------
	reqVal(req, key, defaultVal) {
		// return query param or post val or default
		if (req.body[key]) {
			return req.body[key];
		}
		if (req.query[key]) {
			return req.query[key];
		}
		return defaultVal;
	}


	reqValAsInt(req, key, min, max, defaultVal) {
		// get val as int and min and max it
		var val = Number(this.reqVal(req, key, defaultVal));
		if (min !== null) {
			val = Math.max(val, min);
		}
		if (max !== null) {
			val = Math.min(val, max);
		}
		return val;
	}


	reqValFromList(req, key, valueList, defaultVal) {
		var val = this.reqVal(req, key, defaultVal);
		if (valueList.indexOf(val) > -1) {
			return val;
		}
		return defaultVal;
	}

	reqPrefixedValueArray(req, prefix, keyList) {
		// look for ALL values for prefix+"_"+key and return an associative array of them
		var valArray = {};
		var fieldName;
		var val;
		keyList.forEach((key) => {
			fieldName = prefix + "_" + key;
			val = this.reqVal(req, fieldName, undefined);
			if (val !== undefined && val !== "") {
				// store it
				valArray[key] = val;
			}
		});

		return valArray;
	}
	//---------------------------------------------------------------------------






	//---------------------------------------------------------------------------
	regexEscapeStr(str) {
		// replace special characters in string so it can be used in regex
		str = str.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
		return str;
	}

	makeSafeForFormInput(str) {
		return str.replace(/"/g, "&quot;");
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	// https://stackoverflow.com/questions/27746304/how-do-i-tell-if-an-object-is-a-promise
	isPromise(value) {
		return Boolean(value && typeof value.then === "function");
	}
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	parseJsonObj(obj, defaultVal) {
		if (!obj) {
			return defaultVal;
		}
		var parsedObj = JSON.parse(obj);
		return parsedObj;
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	forgetSessionVar(req, varName) {
		if (req.session && req.session[varName] !== undefined) {
			delete req.session[varName];
		}
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	// ATTN: untested and unreliable
	getServerIpAddress() {
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


	//---------------------------------------------------------------------------
	ipStringToSafeString(val) {
		// replace . and : with _
		val = val.replace(/[.:]+/g, "_");
		return val;
	}
	//---------------------------------------------------------------------------


}


// export the class as the sole export
module.exports = JrHelpers.getSingleton();
