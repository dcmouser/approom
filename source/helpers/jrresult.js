// jrresult
// v1.0.0 on 5/24/19 by mouser@donationcoder.com
//
// error helper class

"use strict";


//---------------------------------------------------------------------------
// modules

// our helper modules
const jrhelpers = require("./jrhelpers");
const jrlog = require("../helpers/jrlog");
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
        if (msg == undefined) {
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
        if (msg!==undefined) {
            jrResult.pushSuccess(msg);
        }
        return jrResult;
    }

    static makeMessage(msg) {
        var jrResult = new JrResult("message");
        if (msg!==undefined) {
            jrResult.pushMessage(msg);
        }
        return jrResult;
    }
    //---------------------------------------------------------------------------


    //---------------------------------------------------------------------------
    // accessors
    getType() { return this.typestr; }

    isError() {
        if ( this.items != undefined && this.items.error !== undefined && this.items.error.length > 0) {
            return true;
        }
        if ( this.fields !== undefined && this.fields.length >0 ) {
            return true;
        }
        return false;
    }

    // fields are key=> value pairs, used for input form errors typically
    setFieldError(key, value) {
        if (this.fields == undefined) {
            this.fields = {};
        }
        this.fields[key] = value;
        return this;
    }
    //
    getFieldError(key, defaultval) {
        if (this.fields == undefined || this.fields[key] == undefined) {
            return defaultval;
        }
        return this.fields[key];
    }
    //
    // now we have more generic lists of messages/errors
    push(key, msg) {
        if (this.items == undefined) {
            this.items = {};
        }
        if (this.items[key] == undefined) {
            this.items[key] = [msg];
        } else {
            this.items[key].push(msg);
        }
        return this;
    }
    //
    pushFieldError(key, msg) {
        // push an error, and also add a field error for it
        this.push("error", msg);
        this.setFieldError(key, msg);
        return this;
    }
    //
    pushBiFieldError(key, shortMsg, longMsg) {
        // push an error, and also add a field error for it
        this.push("error", longMsg);
        this.setFieldError(key, shortMsg);
        return this;
    }
    //
    pushError(msg) {
        this.push("error", msg);
        return this;
    }
    pushMessage(msg) {
        this.push("message", msg);
        return this;
    }
    pushSuccess(msg) {
        this.push("success", msg);
        return this;
    }
    //---------------------------------------------------------------------------


    //---------------------------------------------------------------------------
    // merge source into us, adding errors
    mergeIn(source, flagMergeSourceToTop) {
        // this is really an awkward function, i wonder if there isn't a better cleaner way to merge objects and arrays
        // this function is specific to the JrResult class, and not generic

        if (!source) {
            return this;
        }

        // for fields, each keyed item should be a string; on the rare occasion we have an entry in both our field and source field with same key, we can append them.
        if (source.fields) {
            if (!this.fields) {
                //this.fields = Object.assign({}, source.fields);
                this.fields = jrhelpers.makeClonedObjFromEnumerableProperties(source.fields);
            } else {
                for (var key in source.fields) {
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
                //this.items = Object.assign({}, source.items);
                this.items = jrhelpers.makeClonedObjFromEnumerableProperties(source.items);
            } else {
                for (var key in source.items) {
                    if (!this.items[key]) {
                        //this.items[key] = Object.assign({}, source.items[key]);
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
            this.typestr = source.typestr
        }

        return this;
    }


    static makeClone(source) {
        // first we make a new JrResult object, then copy properties
        var target = this.makeNew();
        target.copyFrom(source);
        //Object.assign(target, source);
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

    // this static helper lets us easily check for a case where caller did something like "var jrResult = JrResult.makeNew();" but then in conditional blocks never added any messages or errors to it
    static isBlank(obj) {
        // helper function
        if (!obj) {
            return true;
        }
        if ( !obj.items && !obj.fields) {
            return true;
        }
        return false;
    }
    //
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


    static passportInfoAsJrResult(info) {
        if (!info) {
            return undefined;
        }
        if (JrResult.is(info)) {
            return info;
        }
        return this.createFromPassportInfoError(info);
    }


    static passportErrorAsString(info) {
        if (!info || !info.message) {
            return "unknown authorization error";
        } 
        return info.message;
    }
    //---------------------------------------------------------------------------


    //---------------------------------------------------------------------------
    // session helpers for flash message save/load
    addToSession(req, flagAddToTop) {
        // addd to session
        // for consistency we return THIS not the newly merged session info
        if (!req.session) {
            throw("No session defined, can't add result to it.");
        }
        if (!req.session.jrResult) {
            // just assign it since there is nothing in session -- but should we ASSIGN it instead?
            //jrlog.debugObj(this, "addToSession 1");
            if (false) {
                req.session.jrResult = this;
            } else {
                req.session.jrResult = JrResult.makeClone(this);
            }
        } else {
            // merge it
            //jrlog.debugObj(req.session.jrResult, "addToSession 2a");
            req.session.jrResult.mergeIn(this, flagAddToTop);
            //jrlog.debugObj(req.session.jrResult, "addToSession 2b");
        }
        return this;
    }

    loadFromSession(req) {
        // load and ADD from session, then CLEAR session
        if (req.session.jrResult) {
            //jrlog.debugObj(req.session.jrResult, "loadFromSession 1");
            this.copyFrom(req.session.jrResult);
            //jrlog.debugObj(this, "loadFromSession 2");
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
        //jrlog.debugObj(jrResult, "makeFromSession");
        return jrResult;
    }


    static sessionRenderResult(req, res, jrResult, flagSessionAtTop) {
        // ok we have a jrResult locally that we are about to pass along to view template
        // but if we just passed it in as a local template/view variable, it would OVERWRITE any session data, so we would like to
        // combine them
        // session result, if any (deleting it from session if found, like a flash message)
        //jrlog.debugObj(jrResult, "In sessionRenderResult");
        var jrResultSession = this.makeFromSession(req);

        //jrlog.debugObj(jrResultSession,"Got jrResultSession from session");
        // 
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
    /*
    static expressMiddlewareInjectSessionResult(options) {
        options = options || {};
        var safe = (options.unsafe === undefined) ? true : !options.unsafe;
        
        return function(req, res, next) {
            // grab reference of render
            var _jrrender = res.render;
            // override logic
            res.render = function( view, options, fn ) {
                // transfer any session jrResult into RESPONSE view available variable
                res.locals.jrResult = JrResult.makeFromSession(req);
                //console.log(res.jrResult);
                //console.log(req.session);
                // continue with original render
                _jrrender.call( this, view, options, fn );
            }
            next();
        }
    }
    */
    //---------------------------------------------------------------------------

}





//---------------------------------------------------------------------------
// export the class
module.exports = JrResult;
//---------------------------------------------------------------------------