// jrresult
// v1.0.0 on 5/24/19 by mouser@donationcoder.com
//
// error helper class

"use strict";

// modules
const assert = require("assert");

//---------------------------------------------------------------------------
// modules
const jrhelpers = require("./jrhelpers");
//---------------------------------------------------------------------------





// JrResult is a class for returning an error from functions with enough information that it can be displayed to the user
// with helper methods for logging, etc.
class JrResult {
	constructor(typestr) {
		this.typestr = typestr;
	}

	//---------------------------------------------------------------------------
	static makeNew(typestr) {
		// static helper.
		var jrResult = new JrResult(typestr);
		return jrResult;
	}

	static makeError(typestr, msg) {
		if (!msg) {
			// if only one arg is passed, its a message with typestr treated as the msg
			msg = typestr;
			typestr = "error";
		}
		var jrResult = new JrResult(typestr);
		jrResult.pushError(msg);
		return jrResult;
	}

	static makeSuccess(msg) {
		var jrResult = new JrResult("success");
		if (msg) {
			jrResult.pushSuccess(msg);
		}
		return jrResult;
	}

	static makeMessage(msg) {
		var jrResult = new JrResult("message");
		if (msg) {
			jrResult.pushMessage(msg);
		}
		return jrResult;
	}


	clear() {
		this.typestr = undefined;
		this.fields = undefined;
		this.items = undefined;
		this.eData = undefined;
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	// accessors
	getType() { return this.typestr; }

	isError() {
		if (this.items && this.items.error && this.items.error.length > 0) {
			return true;
		}
		if (this.fields && this.fields.length > 0) {
			return true;
		}
		return false;
	}

	// fields are key=> value pairs, used for input form errors typically
	setFieldError(key, value) {
		if (this.fields === undefined) {
			this.fields = {};
		}
		this.fields[key] = value;
		return this;
	}

	getFieldError(key, defaultval) {
		if (this.fields === undefined || this.fields[key] === undefined) {
			return defaultval;
		}
		return this.fields[key];
	}

	clearKey(key) {
		if (this.items === undefined) {
			return;
		}
		if (this.items[key] === undefined) {
			return;
		}
		this.items[key].clear();
	}

	// now we have more generic lists of messages/errors
	push(key, msg, flagOnTop) {
		if (this.items === undefined) {
			this.items = {};
		}
		if (this.items[key] === undefined) {
			this.items[key] = [msg];
		} else {
			if (flagOnTop) {
				this.items[key].unshift(msg);
			} else {
				this.items[key].push(msg);
			}
		}
		return this;
	}

	pushFieldError(key, msg) {
		// push an error, and also add a field error for it
		this.push("error", msg);
		this.setFieldError(key, msg);
		return this;
	}

	pushBiFieldError(key, shortMsg, longMsg) {
		// push an error, and also add a field error for it
		this.push("error", longMsg);
		this.setFieldError(key, shortMsg);
		return this;
	}

	pushError(msg) {
		this.push("error", msg);
		return this;
	}

	pushErrorOnTop(msg) {
		this.push("error", msg, true);
		return this;
	}

	setError(msg) {
		this.clearKey("error");
		this.push("error", msg);
		return this;
	}

	pushMessage(msg) {
		this.push("message", msg);
		return this;
	}

	pushSuccess(msg, flagOnTop) {
		this.push("success", msg, flagOnTop);
		return this;
	}

	setEData(key, val) {
		if (!this.eData) {
			this.eData = [];
		}
		this.eData[key] = val;
	}

	getEData(key, defaultVal) {
		if (!this.eData || !(key in this.eData)) {
			return defaultVal;
		}
		return this.eData[key];
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	// merge source into us, adding errors
	mergeIn(source, flagMergeSourceToTop) {
		// this is really an awkward function, i wonder if there isn't a better cleaner way to merge objects and arrays
		// this function is specific to the JrResult class, and not generic
		var key;

		if (!source) {
			return this;
		}

		/*
		if (!(source instanceof JrResult)) {
			throw ("In JrResult mergeIn with improper source result of class " + (typeof source));
		}
		*/

		// for fields, each keyed item should be a string; on the rare occasion we have an entry in both our field and source field with same key, we can append them.
		if (source.fields) {
			if (!this.fields) {
				this.fields = jrhelpers.makeClonedObjFromEnumerableProperties(source.fields);
			} else {
				for (key in source.fields) {
					if (!this.fields[key]) {
						this.fields[key] = source.fields[key];
					} else {
						if (flagMergeSourceToTop) {
							this.fields[key] = source.fields[key] + " " + this.fields[key];
						} else {
							this.fields[key] = this.fields[key] + " " + source.fields[key];
						}
					}
				}
			}
		}

		if (source.items) {
			// but items need to be concatenated
			if (!this.items) {
				this.items = jrhelpers.makeClonedObjFromEnumerableProperties(source.items);
			} else {
				for (key in source.items) {
					if (!this.items[key]) {
						this.items[key] = jrhelpers.makeClonedObjFromEnumerableProperties(source.items[key]);
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


	static makeClone(source) {
		// first we make a new JrResult object, then copy properties
		var target = this.makeNew();
		target.copyFrom(source);
		return target;
	}

	copyFrom(source) {
		// first we make a new JrResult object, then copy properties
		Object.assign(this, source);
		return this;
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	// simple static helper
	static is(obj) {
		return obj instanceof JrResult;
	}

	// this static helper lets us easily check for a case where caller did something like "var jrResult = JrResult.makeNew();"
	//  but then in conditional blocks never added any messages or errors to it
	static isBlank(obj) {
		// helper function
		if (!obj) {
			return true;
		}
		if (!obj.items && !obj.fields) {
			return true;
		}
		return false;
	}

	undefinedIfBlank() {
		if (JrResult.isBlank(this)) {
			return undefined;
		}
		return this;
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	// passport helpers
	static createFromPassportInfoError(info) {
		// just convert from a passport error info object, which simply has a message field
		return JrResult.makeNew("PassportError").pushError(this.passportErrorAsString(info));
	}


	static passportInfoAsJrResultError(info) {
		if (!info) {
			return undefined;
		}
		if (JrResult.is(info)) {
			return info;
		}
		return this.createFromPassportInfoError(info);
	}


	static passportErrorAsString(info) {
		if (JrResult.is(info)) {
			return info.getErrorsAsString();
		}
		if (!info || !info.message) {
			return "unknown authorization error";
		}
		return info.message;
	}

	addPassportInfoAsError(info) {
		// add passport info value as an error to us
		this.pushError(this.passportErrorAsString(info));
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	// session helpers for flash message save/load
	addToSession(req, flagAddToTop) {
		// addd to session
		// for consistency we return THIS not the newly merged session info
		assert(req.session, "No session defined, can't add result to it.");

		if (!req.session.jrResult) {
			// just assign it since there is nothing in session -- but should we ASSIGN it instead?
			if (false) {
				req.session.jrResult = this;
			} else {
				req.session.jrResult = JrResult.makeClone(this);
			}
		} else {
			// merge it -- the problem is that the SESSION version is not a true jrresult object so we have to do it backwards
			var sjrResult = req.session.jrResult;
			this.mergeIn(sjrResult, !flagAddToTop);
			// sjrResult.mergeIn(this, flagAddToTop);
			req.session.jrResult = this;
		}
		return this;
	}

	loadFromSession(req) {
		// load and ADD from session, then CLEAR session
		if (req.session.jrResult) {
			this.copyFrom(req.session.jrResult);
			// remove it from session
			delete req.session.jrResult;
		}
		// return ourselves so we can be used to chain functions
		return this;
	}

	static makeFromSession(req) {
		// if not found, just return undefined quickly
		if (!req.session || !req.session.jrResult) {
			return undefined;
		}
		//
		var jrResult = JrResult.makeNew().loadFromSession(req);
		return jrResult;
	}


	static sessionRenderResult(req, res, jrResult, flagSessionAtTop) {
		// ok we have a jrResult locally that we are about to pass along to view template
		// but if we just passed it in as a local template/view variable, it would OVERWRITE any session data, so we would like to
		// combine them
		// session result, if any (deleting it from session if found, like a flash message)
		var jrResultSession = this.makeFromSession(req);

		if (!jrResult) {
			// empty jrResult, just return session version
			return jrResultSession;
		}
		// combine them
		jrResult.mergeIn(jrResultSession, flagSessionAtTop);
		return jrResult;
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	// to help use short circuit a procedure that would normally end in rendering a view -- sort of like throwing an exception
	setDoneRendering(val) {
		this.doneRendering = val;
	}

	getDoneRendering() {
		return this.doneRendering;
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	// express middleware helper
	// the idea here is we want to take any session jrResult found in session, and put it automatically in any render call res
	// all this does is save us from having to make every render look like this:
	//    	res.render("viewpage", {
	//          jrResult: JrResult.restoreFromSession(req);
	//      });
	// see https://stackoverflow.com/questions/9285880/node-js-express-js-how-to-override-intercept-res-render-function
	//
	// ATTN: 5/27/19 -- although this worked flawlessly, we have decided to force the manaul use of this into all render calls, to have better control over it
	// but the proper call now is a bit more involved, it should be like this:
	//	res.render("urlpath", {
	//      jrResult: JrResult.sessionRenderResult(req, res, jrResult),
	//      // or if we have no result of our own: jrResult: JrResult.sessionRenderResult(req, res)
	//      }
	// this old code does NOT do a merge combine of session data with manual jrresult, so can no longer be used
	//
	static unusedCodeExpressMiddlewareInjectSessionResult(options) {
		options = options || {};
		// var safe = (options.unsafe === undefined) ? true : !options.unsafe;
		return (req, res, next) => {
			// grab reference of render
			var jRrender = res.render;
			// override logic
			res.render = (view, roptions, fn) => {
				// transfer any session jrResult into RESPONSE view available variable
				res.locals.jrResult = JrResult.makeFromSession(req);
				// continue with original render
				jRrender.call(this, view, roptions, fn);
			};
			next();
		};
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	getErrorsAsString() {
		if (!this.items || !this.items.error || this.items.error.length <= 0) {
			return "";
		}
		var str = this.items.error.join(";");
		return str;
	}
	//---------------------------------------------------------------------------


}





//---------------------------------------------------------------------------
// export the class
module.exports = JrResult;
//---------------------------------------------------------------------------
