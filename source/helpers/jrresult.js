/**
 * @module helpers/jrresult
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 5/24/19

 * @description
 * Error helper class
*/

"use strict";


// modules
const assert = require("assert");

// helper modules
const jrhMisc = require("./jrh_misc");
const jrhExpress = require("./jrh_express");






//---------------------------------------------------------------------------
// JrResult is a class for returning an error from functions with enough information that it can be displayed to the user
// with helper methods for logging, etc.
/**
 * We use JrResult object instances to store the results of operations, where we may want to indicate a success or an error with additional information about the nature of the error.
 * The result can hold multiple errors, possibly keyed to fields (for example an error message corresponding to each input form variable)
 *
 * @class JrResult
 */

class JrResult {

	//---------------------------------------------------------------------------
	/**
	 * Creates an instance of JrResult.
	 * @memberof JrResult
	 */
	constructor() {
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	/**
	 * Helper function to create a new blank JrResult object
	 *
	 * @static
	 * @returns new JrResult object
	 */
	static makeNew() {
		// static helper.
		return new JrResult();
	}


	/**
	 * Helper function to create a new JrResult object and store an error for it
	 *
	 * @static
	 * @returns new JrResult object
	 */
	static makeError(msg) {
		const jrResult = new JrResult();
		jrResult.pushError(msg);
		return jrResult;
	}


	/**
	 * Helper function to create a new JrResult object and store a success message in it
	 *
	 * @static
	 * @returns new JrResult object
	 */
	static makeSuccess(msg) {
		if (msg === "" || msg === undefined) {
			// throw an error, or just do nothing, since lack of error means success
			throw new Error("makeSuccessInJrResultCannotHaveBlankReason");
		}
		const jrResult = new JrResult();
		jrResult.pushSuccess(msg);
		return jrResult;
	}

	/**
	 * Helper function to create a new JrResult object and store a generic message in it
	 *
	 * @static
	 * @returns new JrResult object
	 */
	static makeMessage(msg) {
		const jrResult = new JrResult();
		jrResult.pushMessage(msg);
		return jrResult;
	}


	/**
	 * make a clone of an existing jr result
	 *
	 * @static
	 * @param {object} source
	 * @returns new JrResult object
	 */
	static makeClone(source) {
		// first we make a new JrResult object, then copy properties
		const target = this.makeNew();
		target.copyFrom(source);
		return target;
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	/**
	 * clear all fields of the jrResult object
	 */

	clear() {
		this.typestr = undefined;
		this.errorFields = undefined;
		this.items = undefined;
		this.eData = undefined;
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	// accessors

	/**
	 * Set the type value which can be checked later
	 * @param {*} typestr
	 */
	setType(typestr) {
		this.typestr = typestr;
	}


	/**
	 * Get the type value for the object which can be set
	 */
	getType() { return this.typestr; }
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	/**
	 * Checks if the jrResult is (contains) an error
	 * @returns true if there are any error items pushed into this jrResult
	 */
	isError() {
		if (this.items && this.items.error && this.items.error.length > 0) {
			// explicit error messages in the object
			return true;
		}
		if (this.errorFields && this.errorFields.length > 0) {
			// there are field specific errors registered
			return true;
		}
		return false;
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	// fields are key=> value pairs, used for input form errors typically

	/**
	 * Set a field-associated error; marks the result as an error and makes it possible for observer to check which specific field caused it
	 *
	 * @param {string} key
	 * @param {*} value
	 * @returns this
	 */
	setFieldError(key, value) {
		// ATTN: note that these alone aren't shown in error to string
		// for that you need to call pushFieldError
		if (this.errorFields === undefined) {
			this.errorFields = {};
		}
		this.errorFields[key] = value;
		return this;
	}


	/**
	 * Gets any error associated with this field key, or defaultVal if none set (defaults to undefined)
	 *
	 * @param {string} key
	 * @param {*} defaultval (if not provided, undefined will be used)
	 * @returns error message associated with key, or defaultVal if none set
	 */
	getFieldError(key, defaultval) {
		if (this.errorFields === undefined || this.errorFields[key] === undefined) {
			return defaultval;
		}
		return this.errorFields[key];
	}


	/**
	 * Generic helper to clear all items in the given section (errors, success, messages)
	 * @private
	 *
	 * @param {*} key
	 * @returns this
	 */
	clearSection(sectionKey) {
		if (this.items === undefined) {
			return this;
		}
		if (this.items[sectionKey] === undefined) {
			return this;
		}
		this.items[sectionKey].clear();

		return this;
	}


	// now we have more generic lists of messages/errors
	/**
	 * Generic helper to push a message into a given section (errors, success, messages)
	 * @private
	 *
	 * @param {string} sectionKey
	 * @param {*} msg - message to add
	 * @param {*} flagOnTop - if true, the new message will be pushed at top of list
	 * @returns this
	 */
	push(sectionKey, msg, flagOnTop) {
		if (this.items === undefined) {
			this.items = {};
		}
		if (this.items[sectionKey] === undefined) {
			this.items[sectionKey] = [msg];
		} else {
			if (flagOnTop) {
				this.items[sectionKey].unshift(msg);
			} else {
				this.items[sectionKey].push(msg);
			}
		}
		return this;
	}


	/**
	 * Set the error associated with a specific key
	 * ##### Notes:
	 *  * this also causes a general (non-feild) error to be added to the object, with the same message
	 *
	 * @param {string} key - the field name to set the error for
	 * @param {string} msg - the error messsage
	 * @returns this
	 */
	pushFieldError(key, msg) {
		// push a generic error, and also add a field error for it
		this.push("error", msg);
		this.setFieldError(key, msg);
		return this;
	}


	/**
	 * Set the error associated with a specific key, AND adds a different error message as a general error
	 *
	 * @param {string} key - the field name to set the error for
	 * @param {string} shortMsg - the error messsage to add to the field
	 * @param {string} longMsg - the error message to add as a generic error
	 * @returns this
	 */
	pushBiFieldError(key, shortMsg, longMsg) {
		// push an error, and also add a field error for it
		this.push("error", longMsg);
		this.setFieldError(key, shortMsg);
		return this;
	}


	/**
	 * Add a generic error to the result
	 *
	 * @param {string} msg
	 * @returns this
	 */
	pushError(msg) {
		this.push("error", msg);
		return this;
	}

	/**
	 * Add a generic exception error to the result
	 *
	 * @param {string} msg
	 * @returns this
	 */
	pushException(msg, e) {
		this.push("error", msg + ": " + e.toString());
		return this;
	}


	/**
	 * Add a generic error to the result, pushing it to the top of the error list
	 *
	 * @param {string} msg
	 * @returns this
	 */
	pushErrorOnTop(msg) {
		this.push("error", msg, true);
		return this;
	}


	/**
	 * Clear any previous error and then add a generic error to the result
	 *
	 * @param {string} msg
	 * @returns this
	 */
	setError(msg) {
		this.clearSection("error");
		this.push("error", msg);
		return this;
	}


	/**
	 * Add a generic message (not an error) to the result
	 *
	 * @param {string} msg
 	 * @param {boolean} flagOnTop - if true the message will be pushed on top; if unspecified it will not
	 * @returns this
	 */
	pushMessage(msg, flagOnTop) {
		this.push("message", msg, flagOnTop);
		return this;
	}


	/**
	 * Add a success message (not an error) to the result
	 *
	 * @param {string} msg
 	 * @param {boolean} flagOnTop - if true the message will be pushed on top; if unspecified it will not
	 * @returns this
	 */
	pushSuccess(msg, flagOnTop) {
		this.push("success", msg, flagOnTop);
		return this;
	}


	/**
	 * Set generic extra data for the result
	 *
	 * @param {string} key - key to store data in
	 * @param {*} val - data to store
	 * @returns this
	 */
	setExtraData(key, val) {
		if (!this.eData) {
			this.eData = [];
		}
		this.eData[key] = val;
		return this;
	}


	/**
	 * Get generic extra data for the result
	 *
	 * @param {string} key - key to retrieve data for
	 * @param {*} defaultVal - returned if key not set
	 * @returns extra data stored under key, or defaultVal if none
	 */
	getExtraData(key, defaultVal) {
		if (!this.eData || !(key in this.eData)) {
			return defaultVal;
		}
		return this.eData[key];
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	// merge source into us, adding errors

	/**
	 * This function is used to merge one result into another, combining errors and successes, etc.
	 * It's a rather elaborate function but serves an important purpose when we have multiple results and we care about errors in either.
	 *
	 * @param {object} source - source JrResult
	 * @param {boolean} flagMergeSourceToTop - whether to merge souce object messages above ours when combinging
	 * @returns this
	 */
	mergeIn(source, flagMergeSourceToTop) {
		// this is really an awkward function, i wonder if there isn't a better cleaner way to merge objects and arrays
		// this function is specific to the JrResult class, and not generic
		let key;

		if (!source) {
			return this;
		}

		/*
		if (!(source instanceof JrResult)) {
			throw (new Error("In JrResult mergeIn with improper source result of class " + (typeof source)));
		}
		*/

		// for fields, each keyed item should be a string; on the rare occasion we have an entry in both our field and source field with same key, we can append them.
		if (source.errorFields) {
			if (!this.errorFields) {
				this.errorFields = jrhMisc.shallowCopy(source.errorFields);
			} else {
				for (key in source.errorFields) {
					if (!this.errorFields[key]) {
						this.errorFields[key] = source.errorFields[key];
					} else {
						if (flagMergeSourceToTop) {
							this.errorFields[key] = source.errorFields[key] + " " + this.errorFields[key];
						} else {
							this.errorFields[key] = this.errorFields[key] + " " + source.errorFields[key];
						}
					}
				}
			}
		}

		if (source.items) {
			// but items need to be concatenated
			if (!this.items) {
				this.items = jrhMisc.shallowCopy(source.items);
			} else {
				for (key in source.items) {
					if (!this.items[key]) {
						this.items[key] = jrhMisc.shallowCopy(source.items[key]);
					} else {
						if (flagMergeSourceToTop) {
							this.items[key] = (source.items[key]).concat(this.items[key]);
						} else {
							this.items[key] = (this.items[key]).concat(source.items[key]);
						}
					}
				}
			}
		}

		// if our typestr is blank, use source typestr
		if (!this.typestr) {
			this.typestr = source.typestr;
		} else if (flagMergeSourceToTop && source.typestr) {
			this.typestr = source.typestr;
		}

		return this;
	}


	/**
	 * Just a shallow copy of the object
	 *
	 * @param {object} source JrResult
	 * @returns this
	 */
	copyFrom(source) {
		// first we make a new JrResult object, then copy properties
		Object.assign(this, source);
		return this;
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	/**
	 * Check if the passed value is a JrResult
	 *
	 * @static
	 * @param {*} obj
	 * @returns true if obj is an instance of JrResult
	 */
	static isJrResult(obj) {
		return obj instanceof JrResult;
	}


	/**
	 * Simple helper function thats lets us easily check for a case where no errors or messages were added to a JrResult (i.e. it can be completely ignored)
	 *
	 * @static
	 * @param {object} obj
	 * @returns true if the JrResult obj has no data
	 */
	static isBlank(obj) {
		// helper function
		if (!obj) {
			return true;
		}
		if (!obj.items && !obj.errorFields) {
			return true;
		}
		return false;
	}


	/**
	 * Simple helper function thats makes it easier to ignore a result if there is nothing important in it
	 *
	 * @static
	 * @returns undefined if thhis JrResult is blank
	 */
	undefinedIfBlank() {
		if (JrResult.isBlank(this)) {
			return undefined;
		}
		return this;
	}


	isEmpty() {
		return JrResult.isBlank(this);
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	// passport helpers

	/**
	 * Return the string associated with a passport error, OR convert the JrResult to an error string if they pass in a JrResult
	 *
	 * @static
	 * @param {object} info - the passport info error (or a jrResult)
	 * @returns error message string
	 */
	static passportOrJrResultErrorAsString(info) {
		if (JrResult.isJrResult(info)) {
			return info.getErrorsAsString();
		}
		if (info && JrResult.isJrResult(info.result)) {
			return info.result.getErrorsAsString();
		}
		if (typeof info === "string") {
			return info;
		}
		if (!info || !info.message) {
			return "unknown authorization error";
		}
		return info.message;
	}
	//---------------------------------------------------------------------------

















	//---------------------------------------------------------------------------
	// ATTN: its not fun how these functions all hardcode the session variable name .jrResult

	// session helpers for flash message save/load
	/**
	 * Add this JrResult to the (request)session, so it can be remembered for flash error messages (when we show an error on their next/redirected page request)
	 * ##### Notes
	 *  * We add the mergeIn function to combine multiple jrResults into one
	 *
	 * @param {*} req - express request
	 * @param {*} flagAddToTop - add it to the top of the list of such error messages
	 * @returns this
	 */
	addToSession(req, flagAddToTop) {
		// addd to session
		const jrResultSession = JrResult.getSessionedJrResult(req);

		if (!jrResultSession) {
			// just assign it since there is nothing in session -- but should we ASSIGN it instead?
			JrResult.setSessionedJrResult(req, this);
		} else {
			// merge it -- the problem is that the SESSION version is not a true jrresult object so we have to do it backwards
			this.mergeIn(jrResultSession, !flagAddToTop);
			JrResult.setSessionedJrResult(req, this);
		}
		return this;
	}


	/**
	 * Create a result from the session, or return undefined if there is none, then clear session jrResult
	 * ##### Notes
	 *  * Important: The results will be REMOVED from the session after this is called
	 *
	 * @param {*} req - express request
	 * @returns jrResult from session or undefined if none found
	 */
	static retrieveThenRemoveFromSession(req) {
		const jrResultSession = JrResult.getSessionedJrResult(req);
		if (!jrResultSession) {
			return undefined;
		}

		// create new result and load and ADD from session, then CLEAR session
		// NOTE: we need to *COPY* the session result because the session may not actually be a full JrResult object and may be a simple flat json {} object
		const jrResult = JrResult.makeClone(jrResultSession);
		// remove it from session
		JrResult.clearSessionedJrResult(req);

		return jrResult;
	}


	/**
	 * Get any existing result from session, merging it with any provided here, and clearing any existing result from session
	 *
	 * @param {*} flagSessionAtTop - if true, result errors will be placed at top
	 * @returns the new combined result in the session
	 */

	mergeInThenRemoveFromSession(req, flagAddToTop) {
		const jrResultSession = JrResult.getSessionedJrResult(req);
		if (jrResultSession) {
			this.mergeIn(jrResultSession, flagAddToTop);
			// remove it from session
			JrResult.clearSessionedJrResult(req);
		}
		return this;
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	// low level static functions that actually work with session values
	static setSessionedJrResult(req, jrResult) {
		// we copy it so caller can do what they want with their copy and it wont effect session data
		if (JrResult.isBlank(jrResult)) {
			// if there's nothing in it then don't even bother
			JrResult.clearSessionedJrResult(req);
			return;
		}
		req.session.arJrResult = JrResult.makeClone(jrResult);
	}

	static getSessionedJrResult(req) {
		return req.session.arJrResult;
	}

	static clearSessionedJrResult(req) {
		delete req.session.arJrResult;
	}
	//---------------------------------------------------------------------------

















	//---------------------------------------------------------------------------
	/**
	 * Helper function for common issue where we want to store in result whether we have already started rendering result
	 * @todo - remove use of this function and simply store flag in express result
	 *
	 * @param {boolean} val - true or false
	 */
	setDoneRendering(val) {
		this.doneRendering = val;
	}


	/**
	 * Helper function for common issue where we want to store in result whether we have already started rendering result
	 * @todo - remove use of this function and simply store flag in express result
	 * @returns true if this flag has been set
	 */
	getDoneRendering() {
		return this.doneRendering;
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	/**
	 * Experimental express middleware function that automatically grabs any pending jrResult error from session and makes it available in the locals variable of a view for display
	 * ##### Notes
	 * express middleware helper
	 * the idea here is we want to take any session jrResult found in session, and put it automatically in any render call res
	 * all this does is save us from having to make every render look like this:
	 *    	res.render("viewpage", {
	 *         jrResult: JrResult.restoreFromSession(req);
	 *      });
	 * see https://stackoverflow.com/questions/9285880/node-js-express-js-how-to-override-intercept-res-render-function
	 *
	 * ATTN: 5/27/19 -- although this worked flawlessly, we have decided to force the manaul use of this into all render calls, to have better control over it
	 * but the proper call now is a bit more involved, it should be like this:
	 *	res.render("urlpath", {
	 *      jrResult: jrContext.mergeSessionMessages(),
	 *      // or if we have no result of our own: jrResult: jrContext.mergeSessionMessages()
	 *      }
	 * this old code does NOT do a merge combine of session data with manual jrresult, so can no longer be used
	 *
	 *
	 * @static
	 * @param {*} options
	 */
	static _unusedCodeExpressMiddlewareInjectSessionResult(options) {
		options = options || {};
		// let safe = (options.unsafe === undefined) ? true : !options.unsafe;
		return (req, res, next) => {
			// grab reference of render
			const jRrender = res.render;
			// override logic
			res.render = (view, roptions, fn) => {
				// transfer any session jrResult into RESPONSE view available variable
				res.locals.jrResult = JrResult.retrieveThenRemoveFromSession(req);
				// continue with original render
				jRrender.call(this, view, roptions, fn);
			};
			next();
		};
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	/**
	 * Return a string containing all errors in the result
	 *
	 * @returns error string
	 */
	getErrorsAsString() {
		if (!this.items || !this.items.error || this.items.error.length <= 0) {
			return "";
		}
		const str = this.items.error.join(";");
		return str;
	}


	/**
	 * Return a string containing all non-errors in the result
	 *
	 * @returns success string
	 */
	getSuccessAsString() {
		if (!this.items || !this.items.success || this.items.success.length <= 0) {
			return "";
		}
		const str = this.items.success.join(";");
		return str;
	}
	//---------------------------------------------------------------------------







}





//---------------------------------------------------------------------------
// export the class
module.exports = JrResult;
//---------------------------------------------------------------------------
