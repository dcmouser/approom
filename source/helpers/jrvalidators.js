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
//---------------------------------------------------------------------------


//---------------------------------------------------------------------------
function validateCheckbox(jrResult, keyname, val, flagRequired) {
	if (val) {
		return true;
	}
	if (flagRequired) {
		jrResult.pushFieldError(keyname, keyname + " cannot be left blank");
		return undefined;
	}
	return false;
}
//---------------------------------------------------------------------------










//---------------------------------------------------------------------------
module.exports = {
	validateString, validateRealName,
	validateCheckbox,
};
//---------------------------------------------------------------------------
