// jrvalidator
// v1.0.0 on 6/27/19 by mouser@donationcoder.com
//
// validation helper funcs

"use strict";





//---------------------------------------------------------------------------
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


function validateRealName(jrResult, keyname, str, flagRequired) {
	return validateString(jrResult, keyname, str, flagRequired);
}


function validateCheckbox(jrResult, keyname, val, flagRequired) {
	if (val) {
		return true;
	}
	if (flagRequired && (val === undefined || val === null)) {
		jrResult.pushFieldError(keyname, keyname + " cannot be left blank");
		return undefined;
	}
	return false;
}


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





module.exports = {
	validateString,
	validateRealName,
	validateCheckbox,
	validateInteger,
	validateIntegerRange,
};
