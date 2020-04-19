/**
 * @module helpers/jrh_validate
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 6/27/19

 * @description
 * Collection of helper functions for validating data
*/

"use strict";




//---------------------------------------------------------------------------
/**
 * Validate a string.  Just check that it's non-blank if so requested.
 *
 * @param {obj} jrResult - existing JrResult objec to push errors into
 * @param {string} keyname - name of the property we are validating, used only for error generation
 * @param {string} str - the value we are validating
 * @param {boolean} flagRequired - if true, it will be an error if value is blank
 * @returns validated string or undefined if invalid (with JrResult containing error)
 */
function validateString(jrResult, keyname, str, flagRequired) {
	if (!str) {
		if (!flagRequired) {
			return str;
		}
		jrResult.pushFieldError(keyname, keyname + " cannot be left blank");
		return undefined;
	}

	// anything else is good for now
	return str;
}


/**
 * Validate a name.  This code currently just calls validateString.
 *
 * @param {obj} jrResult - existing JrResult objec to push errors into
 * @param {string} keyname - name of the property we are validating, used only for error generation
 * @param {string} str - the value we are validating
 * @param {boolean} flagRequired - if true, it will be an error if value is blank
 * @returns validated string or undefined if invalid (with JrResult containing error)
 */
function validateRealName(jrResult, keyname, str, flagRequired) {
	return validateString(jrResult, keyname, str, flagRequired);
}


/**
 * Validate a true|false value.
 *
 * @param {obj} jrResult - existing JrResult objec to push errors into
 * @param {string} keyname - name of the property we are validating, used only for error generation
 * @param {boolean} val - the value we are validating
 * @param {boolean} flagRequired - if true, it will be an error if value is undefined or null
 * @returns true or false, or undefined if invalid (with JrResult containing error)
 */
function validateTrueFalse(jrResult, keyname, val, flagRequired) {
	if (val) {
		return true;
	}
	if (flagRequired && (val === undefined || val === null)) {
		jrResult.pushFieldError(keyname, keyname + " cannot be left blank");
		return undefined;
	}
	return false;
}


/**
 * Validate a number.
 *
 * @param {obj} jrResult - existing JrResult objec to push errors into
 * @param {string} keyname - name of the property we are validating, used only for error generation
 * @param {int} val - the value we are validating
 * @param {boolean} flagRequired - if true, it will be an error if value is undefined or null
 * @returns integer value, or undefined if invalid (with JrResult containing error)
 */
function validateInteger(jrResult, keyname, val, flagRequired) {
	// check for missing
	if (val === undefined || val === null) {
		if (flagRequired) {
			jrResult.pushFieldError(keyname, keyname + " cannot be left blank");
			return undefined;
		}
		return 0;
	}

	const num = parseInt(val, 10);
	if (Number.isNaN(num)) {
		jrResult.pushFieldError(keyname, keyname + " must be a valid integer value");
		return null;
	}
	return num;
}


/**
 * Validate a number in a [min,max] range
 *
 * @param {obj} jrResult - existing JrResult objec to push errors into
 * @param {string} keyname - name of the property we are validating, used only for error generation
 * @param {int} val - the value we are validating
 * @param {int} min - minimum value considered valid
 * @param {int} max - maximum value considered valid
 * @param {boolean} flagRequired - if true, it will be an error if value is undefined or null
 * @returns integer value, or undefined if invalid (with JrResult containing error)
 */
function validateIntegerRange(jrResult, keyname, val, min, max, flagRequired) {
	// check for missing
	if (val === undefined || val === null) {
		if (flagRequired) {
			jrResult.pushFieldError(keyname, keyname + " cannot be left blank");
			return undefined;
		}
		return undefined;
	}

	const num = parseInt(val, 10);
	if (Number.isNaN(num)) {
		jrResult.pushFieldError(keyname, keyname + " must be a valid integer value");
		return null;
	}

	if (num < min || num > max) {
		jrResult.pushFieldError(keyname, keyname + " must be an integer in the range [%d,%d]".format(min, max));
		return null;
	}

	return num;
}
//---------------------------------------------------------------------------


/**
 * Validates an object to yield proper json, or a json string, which is converted to a json object
 *
 * @param {*} jrResult
 * @param {*} keyname
 * @param {*} val
 * @param {*} flagRequired
 * @returns a json object or sets error in jrResult
 */
function validateJsonObjOrStringToObj(jrResult, keyname, val, flagRequired) {
	var oval = val;

	if (val === "" || val === null || val === undefined) {
		if (!flagRequired) {
			if (val === "") {
				return undefined;
			}
			return undefined;
		}
		jrResult.pushFieldError(keyname, keyname + " cannot be left blank");
		return oval;
	}

	// test to see if we can conver it
	if (typeof val === "string") {
		try {
			val = val.trim();
			if (val.length === 0 || val[0] !== "{") {
				jrResult.pushFieldError(keyname, keyname + " is not a valid json object string (must start with { bracket).");
				return oval;
			}
			val = JSON.parse(val);
			// success, just drop down and return the converted string
		} catch (e) {
			jrResult.pushFieldError(keyname, keyname + " is not a valid json string: " + e.toString());
			return oval;
		}
	} else {
		// it's not a string, so make it a json string to see if its valid
		try {
			var valAsString = JSON.stringify(val);
			// check that its not simple value
			if (valAsString.length === 0 || valAsString[0] !== "{") {
				jrResult.pushFieldError(keyname, keyname + " is not a valid json object (must start with { bracket).");
				return oval;
			}
			// success, just drop down and return the original string
		} catch (e) {
			jrResult.pushFieldError(keyname, keyname + " is not a valid json strinifyable object: " + e.toString());
			return oval;
		}
	}

	// anything else is good for now
	return val;
}


/*
function validateJson(jrResult, keyname, val, flagRequired) {
	if (!val) {
		if (!flagRequired) {
			return val;
		}
		jrResult.pushFieldError(keyname, keyname + " cannot be left blank");
		return undefined;
	}

	// convert string to json
	if (typeof val === "string") {
		try {
			val = JSON.parse(val);
		} catch (e) {
			jrResult.pushFieldError(keyname, keyname + " is not a valid json object");
		}
	}

	// anything else is good for now
	return val;
}
*/
//---------------------------------------------------------------------------






module.exports = {
	validateString,
	validateRealName,
	validateTrueFalse,
	validateInteger,
	validateIntegerRange,
	validateJsonObjOrStringToObj,
	// validateJson,
};
