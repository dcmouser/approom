/**
 * @module helpers/jrh_misc
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 5/7/19

 * @description
 * Collection of general purpose helper functions
*/

"use strict";


// modules
const util = require("util");

// 3rd party for durations
const humanizeDuration = require("humanize-duration");






//---------------------------------------------------------------------------
// helper function for merging unique arrays
// see https://stackoverflow.com/questions/1584370/how-to-merge-two-arrays-in-javascript-and-de-duplicate-items
/**
 * Combine two arrays and return the concatenation; duplicates are *not* removed
 *
 * @param {array} array1
 * @param {array} array2
 * @returns concatenated array
 */
function mergeArraysKeepDupes(array1, array2) {
	return array1.concat(array2);
}

/**
 * Combine two arrays and return the combined array, removing all duplicates
 *
 * @param {array} array1
 * @param {array} array2
 * @returns the combined de-duped array
 */
function mergeArraysDedupe(array1, array2) {
	return Array.from(new Set(array1.concat(array2)));
}

/**
 * Check if a value is present in any arrays
 *
 * @param {*} val
 * @param {array} arrays (1 or more arrays passed as variadic arguements)
 * @returns true if val is found in any of the arrays
 */
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
/**
 * Take an iteratble (array) of objects and a function to call on each, and do an await function on each.
 * @example asyncAwaitForEachFunctionCall([1 2 3], (x) => {console.log(x)})
 * @see <a href="https://gist.github.com/Atinux/fd2bcce63e44a7d3addddc166ce93fb2">foreach async</a>
 *
 * @param {array} array
 * @param {function} func
 */
async function asyncAwaitForEachFunctionCall(array, func) {
	for (let index = 0; index < array.length; index++) {
		await func(array[index], index, array);
	}
}



/**
 * Take an iteratble (array) of objects and a function to call on each, and do an await function on each.
 * @example asyncAwaitForEachFunctionCall({key: val}}, (key, val) => {console.log(val)})
 * @see <a href="https://gist.github.com/Atinux/fd2bcce63e44a7d3addddc166ce93fb2">foreach async</a>
 *
 * @param {array} array
 * @param {function} func
 */
async function asyncAwaitForEachObjectKeyFunctionCall(obj, func) {
	for (var key in obj) {
		await func(key, obj[key]);
	}
}
//---------------------------------------------------------------------------



//---------------------------------------------------------------------------
/**
 * If val evaluates to false (which will happen on values of null, undefined, false, and ""), return defaultVal, otherwise return val.
 * ##### Notes
 *  * The intention of this function is to be used to check if a value was provided for some option, and use a default if not.
 *  * This can be confusing if the false value is passed in and caller expects to get it back instead of the defaultVal
 *  * In previous version we explicitly tested val against null, undefined, and ""
 *  * The main reason to use a function for this instead of just using a line in code testing truthiness of val, is to help us locate these kind of tests in code via a search, since they are prone to issues.
 *
 * @param {*} val
 * @param {*} defaultVal
 * @returns val [if it evaluates to true] else defaultVal
 */
function getNonFalseValueOrDefault(val, defaultVal) {
	if (!val) {
		return defaultVal;
	}
	return val;
}


/**
 * If val is not undefined and not null, return it; otherwise return default val.
 * ##### Notes
 *  * The intention of this function is to be used to check if a value was provided for some option, and use a default if not.
 *  * This can be confusing if the false value is passed in and caller expects to get it back instead of the defaultVal
 *  * The main reason to use a function for this instead of just using a line in code testing truthiness of val, is to help us locate these kind of tests in code via a search, since they are prone to issues.
 *
 * @param {*} val
 * @param {*} defaultVal
 * @returns val [if it evaluates to true] else defaultVal
 */
function getNonNullValueOrDefault(val, defaultVal) {
	if (val === undefined || val === null) {
		return defaultVal;
	}
	return val;
}



/**
 * Accepts a variadic list of arguments and returns the first one that can be coerced to true.
 *
 * @param {*} args - variadic list of arguments
 * @returns the first arg that evaluates to true (e.g. not null, undefined, false, ""); if none found returns undefined
 */
function firstCoercedTrueValue(...args) {
	if (!args || args.length === 0) {
		return undefined;
	}
	for (var arg of args) {
		if (arg) {
			return arg;
		}
	}
	// none found
	return undefined;
}



/**
 * Checks if the passed argument is an empty object/array/list by checking its length
 *
 * @param {*} obj - an array, object, or iterable with length property, OR an undefined/null valued variable
 * @returns true if the passed obj evaluates to false (null, undefined, "", false) OR is an object/array with no properties.
 * @see <a href="https://stackoverflow.com/questions/679915/how-do-i-test-for-an-empty-javascript-object">stackoverflow question on testing for empty objects</a>
 */
function isObjectEmpty(obj) {
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
/**
 * return a new Date() whose date is a certain number of minutes in the future; useful for setting expiration times
 *
 * @param {int} expirationMinutes
 * @returns Date
 */
function DateNowPlusMinutes(expirationMinutes) {
	var expirationDate = new Date();
	expirationDate.setMinutes(expirationDate.getMinutes() + expirationMinutes);
	return expirationDate;
}
//---------------------------------------------------------------------------







//---------------------------------------------------------------------------
/**
 * Copies an objects properties, in a shallow fashion (nested objects/arrays reuse the references)
 * ##### Notes
 *  * This is not a deep copy, it will reuse any sub object/array properties
 *  * We use a function instead of one-line of code to make it easier to find places in code where this happens
 *  * See <a href="https://medium.com/better-programming/3-ways-to-clone-objects-in-javascript-f752d148054d">Medium.com post on different ways to copy objects</a>
 *
 * @param {object} source
 * @returns new object with cloned properties
 */
function shallowCopy(source) {
	// just a simple wrapper to make code easier to understand
	// var obj = Object.assign({}, source);
	var obj = { ...source };
	return obj;
}



/**
 * Performs a deep copy of an object, recursing into sub properties to clone them instead of reuse references
 * ##### Notes
 * See <a href="https://medium.com/better-programming/3-ways-to-clone-objects-in-javascript-f752d148054d">Medium.com post on different ways to copy objects</a>
 * @param {*} src
 * @returns new object deep copy of the source
 */
function deepIterationCopy(src) {
	var target = {};
	for (var prop in src) {
		if (Object.prototype.hasOwnProperty.call(src, prop)) {
			if (isSimpleObject(src[prop])) {
				// it's a nested property
				target[prop] = deepIterationCopy(src[prop]);
			} else {
				target[prop] = src[prop];
			}
		}
	}
	return target;
}
//---------------------------------------------------------------------------


//---------------------------------------------------------------------------
/**
 * Simple wrapper arround array.toString that returns blank string if passed value is null, undefined, or empty
 *
 * @param {array} arr - an array or null or undefined
 * @returns arr.toString() if there are items in the array, otherwise empty string ""
 */
function stringArrayToNiceString(arr) {
	if (!arr || arr.length === 0) {
		return "";
	}
	return arr.toString();
}


/**
 * Return current date as a string in a nice format, in local time zone
 * @returns current date as string
 */
function getNiceNowString() {
	return new Date(Date.now()).toLocaleString();
}


/**
 * Return the current date in a standardized string format with precise timing; suitable for timestampign to seconds accuracy
 * @returns current date and time as string with seconds precision
 */
function getPreciseNowString() {
	return new Date(Date.now()).toISOString();
}


/**
 * Return date as a string in a nice format, in local time zone
 * @returns current date as string
 */
function getNiceDateValString(val) {
	return new Date(val).toLocaleString();
}


/**
 * Nice string expressing duration at useful granularity
 *
 * @param {integer} elapsedMs
 * @returns human readable string describing the durations in milliseconds
 */
function getNiceDurationTimeMs(elapsedMs) {
	return humanizeDuration(elapsedMs);
}

/**
 * Return current date as a compact string suitable for filename
 * @returns current date as string
 */
function getCompactNowString() {
	const dt = new Date(Date.now());
	const str = dt.getFullYear() + jrZeroPadInt(dt.getMonth() + 1, 2) + jrZeroPadInt(dt.getDate(), 2) + "_" + jrZeroPadInt(dt.getHours(), 2) + jrZeroPadInt(dt.getMinutes(), 2) + jrZeroPadInt(dt.getSeconds(), 2);
	return str;
}

function jrZeroPadInt(intval, padding) {
	var str = intval.toString();
	while (str.length < padding) {
		str = "0" + str;
	}
	return str;
}
//---------------------------------------------------------------------------








//---------------------------------------------------------------------------
/**
 * Replace special characters in string so it can be used in regex.
 * This is useful when we want to use a user-provided string in a regular expression and so we need to validate/escape it first.
 * It is used in our admin crud area filters to convert a simple user substring into a wildcard search string
 * @todo Check this for any security vulnerabilities
 *
 * @param {string} str
 * @returns escaped version of string suitable for use inside a regular expression (i.e. no unescaped regex characters)
 */
function regexEscapeStr(str) {
	str = str.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
	return str;
}

/**
 * Escape any characters or remove them, that would be illegal to have inside a form input value
 * ##### Notes
 *  * Replaces double quote characters with &quot;
 *
 * @param {string} str
 * @returns version of string with double quotes replaced, etc.
 */
function makeSafeForFormInput(str) {
	return str.replace(/"/g, "&quot;");
}
//---------------------------------------------------------------------------




//---------------------------------------------------------------------------
/**
 * Returns true if the passed value is derived from the Object class/constructor.
 * ##### Notes
 *  * This will return false for object that are more elaborate classes, and is only meant to be used for doing deep copies of simple {} objects
 *  * This will return false if the passed value is null or undefined
 *  * This will return false if the passed object is a function (unlike the code it was based on)
 *  * see <a href="https://stackoverflow.com/questions/8511281/check-if-a-value-is-an-object-in-javascript">stackoverflow on checking if a value is an object</a>
 *
 * @param {*} maybeObj
 * @returns true if the passed value is a (simple) object
 */
function isSimpleObject(maybeObj) {
	// return (maybeObj !== undefined && maybeObj !== null && maybeObj.constructor === Object);
	var type = typeof maybeObj;
	return type === "object" && !!maybeObj;
}



/**
 * Returns true if the passed value is derived from the Object class/constructor.
 * @param {*} maybeObj
 * @returns true if the passed value is a object
 */
function isObjectHashMappableType(maybeObj) {
	// return (maybeObj !== undefined && maybeObj !== null && maybeObj.constructor === Object);
	var type = typeof maybeObj;
	return type === "object" && !!maybeObj;
}




/**
 * Returns true if the object passed is a promise
 * @see <a href="https://stackoverflow.com/questions/27746304/how-do-i-tell-if-an-object-is-a-promise">stackoverflow post</a>
 *
 * @param {*} value
 * @returns true if the passed value is a promise
 */
function isPromise(value) {
	return Boolean(value && typeof value.then === "function");
}
//---------------------------------------------------------------------------




//---------------------------------------------------------------------------
/**
 * Simple wrapper around JSON.parse, which parses a json string and creates an object.
 * Only thing extra we do is check for being passed in an empty string/null/undefined and return {} in that case
 *
 * @param {string} str
 * @param {*} defaultVal
 * @returns result of JSON.parse on string or {} if string is "" or undefined or null
 */
function createObjectFromJsonParse(str, defaultVal) {
	if (!str) {
		return defaultVal;
	}
	var parsedObj = JSON.parse(str);
	return parsedObj;
}
//---------------------------------------------------------------------------



//---------------------------------------------------------------------------
/**
 * Try to figure out the servers ip address, and return it as a string.
 * ##### Notes
 *  * see <a href="https://stackoverflow.com/questions/3653065/get-local-ip-address-in-node-js">stackoverflow post</a>
 *  * This function has barely been tested and should not be considered reliable.
 *  * We are currently using it only to get a string that we can use to look for a site-specific configuration file based on the current server ip, and just to display on screen and in logs.
 *  * So our goal is simply to return a string that is different on different servers, but always the same on a given server
 *  * You cannot assume that the returned value is of a particular format; we dont check for that.
 * @returns string representation of ip address
 */
function getServerIpAddress() {
	var os = require("os");

	var ifaces = os.networkInterfaces();
	var ifacesKeys = Object.keys(ifaces);
	var iface, ifname, ifaceset;
	var bestip;
	var alias = 0;

	// jrdebug.debugObj(ifaces, "ifaces");
	// jrdebug.debugObj(ifacesKeys, "ifacesKeys");

	for (var j = 0; j < ifacesKeys.length; ++j) {
		ifname = ifacesKeys[j];

		ifaceset = ifaces[ifname];
		// jrdebug.debugObj(ifaceset, "ifaceset");

		alias = 0;
		for (var i = 0; i < ifaceset.length; ++i) {
			iface = ifaceset[i];
			// jrdebug.debugObj(iface, "iface[" + ifname + "]");
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
/**
 * Find the longest string in haystack which matches a prefix of longstr (with separatorStr or empty)
 * Then return a tuple [longeststring, remainder] with separatorStr removed from longeststring and remainder
 *
 * @param {string} longstr
 * @param {array} haystack
 * @param {string} separatorStr
 */
function findLongestPrefixAndRemainder(longstr, haystack, separatorStr) {
	var longestLen = 0;
	var longestStr = "";
	const separatorStrLength = separatorStr.length;
	const longstrLength = longstr.length;
	var candidateLength;
	var candidate;
	// walk array of strings
	for (var i = 0; i < haystack.length; ++i) {
		candidate = haystack[i];
		candidateLength = candidate.length;
		if (candidateLength > longstrLength) {
			// cannot match, too long
			continue;
		}
		if (candidate === longstr) {
			// found exact match, we can stop now
			return [candidate, ""];
		}
		if (candidateLength + separatorStrLength < longstrLength && candidateLength > longestLen) {
			// check if its an initial substring
			if (longstr.substr(0, candidateLength + separatorStrLength) === candidate + separatorStr) {
				// ok we have a match with candidate + separate on left hand side
				// our new longest candidate
				longestStr = candidate;
				longestLen = candidateLength;
			}
		}
	}
	// did we find a good match?
	if (longestLen === 0) {
		// nothing found
		return ["", longstr];
	}
	// we found something
	const remainderStr = longstr.substr(candidateLength + separatorStrLength);
	return [longestStr, remainderStr];
}
//---------------------------------------------------------------------------





//---------------------------------------------------------------------------
/**
 * Stringify an object nicely for display on console
 * ##### Notes
 *  * See <a href="https://stackoverflow.com/questions/10729276/how-can-i-get-the-full-object-in-node-jss-console-log-rather-than-object">stackoverflow</a>
 *  * See <a href="https://nodejs.org/api/util.html#util_util_inspect_object_options">nodejs docs</a>
 *
 * @param {*} obj - the object to stringify
 * @param {*} flagCompact - if true then we use a compact single line output format
 * @returns string suitable for debug/diagnostic display
 */
function objToString(obj, flagCompact) {
	// return util.inspect(obj, false, null, true /* enable colors */);
	var options = {};
	if (flagCompact) {
		options = {
			showHidden: false,
			depth: 2,
			colors: false,
			compact: true,
			breakLength: Infinity,
		};
	} else {
		options = {
			showHidden: false,
			depth: 2,
			colors: false,
			compact: false,
			breakLength: 80,
		};
	}
	return util.inspect(obj, options);
}
//---------------------------------------------------------------------------










//---------------------------------------------------------------------------
/**
 * Just a wrapper for process.nextTick for use when running an async await from a non async function
 * Having a dedicated function for this makes it easier to search for.
 * @example asyncNextTick(async () => {await anAsyncFunc(a,b,c);})
 *
 * @param {function} func
 */
function asyncNextTick(func) {
	process.nextTick(func);
}
//---------------------------------------------------------------------------




/**
 * For Error object instances, convert to nice simple object
 *
 * @param {Error} err
 * @returns a standard object with name, message, stack features
 */
function ErrorToHashableMapObject(err) {
	// mongo (and other cases) may have trouble getting properties of err objects (err instanceof Error), so we convert it to nice object
	const obj = {
		name: err.name,
		message: err.message,
		stack: err.stack,
	};
	return obj;
}
//---------------------------------------------------------------------------


/**
 * Simple wrapper that returns true if pop is a property of obj
 *
 * @param {object} obj
 * @param {string} prop
 * @returns returns true if pop is a property of obj
 */
function objectHasProperty(obj, prop) {
	if (!obj) {
		return false;
	}
	return (prop in obj);
}
//---------------------------------------------------------------------------


/**
 * Returns the value of a property of an object, or pushes a JrResult error and returns null if not found
 *
 * @param {*} obj
 * @param {string} key
 * @param {*} jrResult
 * @param {*} hintMessage
 * @returns value of property or null if not found (and pushes JrResult error)
 */
function getNonNullValueFromObject(obj, key, jrResult, hintMessage) {
	if (!obj || !obj[key]) {
		jrResult.pushFieldError(key, "Missing value for " + hintMessage + " (" + key + ")");
		return null;
	}
	return obj[key];
}
//---------------------------------------------------------------------------














module.exports = {
	mergeArraysKeepDupes,
	mergeArraysDedupe,
	isInAnyArray,

	asyncAwaitForEachFunctionCall,
	asyncAwaitForEachObjectKeyFunctionCall,

	getNonFalseValueOrDefault,
	getNonNullValueOrDefault,
	firstCoercedTrueValue,
	isObjectEmpty,

	DateNowPlusMinutes,

	shallowCopy,
	deepIterationCopy,

	stringArrayToNiceString,
	getNiceNowString,
	getPreciseNowString,
	getNiceDateValString,
	getNiceDurationTimeMs,
	getCompactNowString,

	regexEscapeStr,
	makeSafeForFormInput,

	isSimpleObject, isObjectHashMappableType,
	isPromise,
	createObjectFromJsonParse,

	getServerIpAddress,

	findLongestPrefixAndRemainder,

	objToString,

	asyncNextTick,

	ErrorToHashableMapObject,

	objectHasProperty,

	getNonNullValueFromObject,
};
