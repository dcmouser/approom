// jrvalidator
// v1.0.0 on 6/27/19 by mouser@donationcoder.com
//
// validation helper funcs

"use strict";



class JrValidators {

	//---------------------------------------------------------------------------
	constructor() {
	}

	// global singleton request
	static getSingleton(...args) {
		// we could do this more simply by just exporting a new instance as module export, but we wrap a function for more flexibility
		if (this.globalSingleton === undefined) {
			this.globalSingleton = new JrValidators(...args);
		}
		return this.globalSingleton;
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	validateString(jrResult, keyname, str, flagRequired) {
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


	validateRealName(jrResult, keyname, str, flagRequired) {
		return this.validateString(jrResult, keyname, str, flagRequired);
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	validateCheckbox(jrResult, keyname, val, flagRequired) {
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

}



// export the class as the sole export
module.exports = JrValidators.getSingleton();
