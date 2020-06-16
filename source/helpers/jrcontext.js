/**
 * @module helpers/jrcontext
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 6/3/20

 * @description
 * Helper class that wraps a req,res pair along with a JrResult for holding errors
*/

"use strict";





// our helpers
const JrResult = require("./jrresult");
const jrhText = require("./jrh_text");





class JrContext {

	//---------------------------------------------------------------------------
	/**
	 * Creates an instance of JrContext.
	 * @memberof JrResult
	 */
	constructor(req, res, next, jrResult) {
		this.req = req;
		this.res = res;
		this.next = next;
		if (jrResult) {
			this.result = JrResult.makeClone(jrResult);
		} else {
			this.result = new JrResult();
		}
	}


	/**
	 * Helper function to create a new blank JrResult object
	 *
	 * @static
	 * @returns new JrResult object
	 */
	static makeNew(req, res, next) {
		// static helper.
		return new JrContext(req, res, next);
	}


	/**
	 * Helper function to create a new blank JrResult object
	 *
	 * @static
	 * @returns new JrResult object
	 */
	static makeNewFromResult(req, res, jrResult) {
		// static helper.
		return new JrContext(req, res, undefined, jrResult);
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	// Just shortcuts to call the most common functions of this.restul

	isError() { return this.result.isError(); }

	pushError(msg) { return this.result.pushError(msg); }

	pushFieldError(key, msg) { return this.result.pushFieldError(key, msg); }

	pushErrorOnTop(msg) { return this.result.pushErrorOnTop(msg); }

	pushBiFieldError(key, shortMsg, longMsg) { return this.result.pushBiFieldError(key, shortMsg, longMsg); }

	pushException(msg, e) { return this.result.pushException(msg, e); }

	pushSuccess(msg, flagOnTop) { return this.result.pushSuccess(msg, flagOnTop); }

	pushMessage(msg, flagOnTop) { return this.result.pushMessage(msg, flagOnTop); }

	setExtraData(key, val) { return this.result.setExtraData(key, val); }

	getExtraData(key, defaultVal) {	return this.result.getExtraData(key, defaultVal); }

	mergeIn(source, flagMergeSourceToTop) { return this.result.mergeIn(source, flagMergeSourceToTop); }

	getErrorsAsString() { return this.result.getErrorsAsString(); }

	getSuccessAsString() { return this.result.getSuccessAsString(); }

	getFieldError(key, defaultval) { return this.result.getFieldError(key, defaultval); }
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	// slightly heavier shortcuts
	addToThisSession(flagAddToTop) { return this.result.addToSession(this.req, flagAddToTop); }

	mergeSessionMessages(flagAddToTop) { return this.result.mergeInThenRemoveFromSession(this.req, flagAddToTop); }

	isResultEmpty() { return this.result.isEmpty(); }
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	// wrappers

	getReqIp() {
		return (this.req) ? this.req.ip : undefined;
	}

	getReqIpClean() {
		return (this.req) ? jrhText.cleanIp(this.req.ip) : undefined;
	}
	//---------------------------------------------------------------------------
}






//---------------------------------------------------------------------------
// export the class
module.exports = JrContext;
//---------------------------------------------------------------------------
