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

    static makeSuccess() {
        var jrResult = new JrResult("success");
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
    // merge result into us, adding errors
    mergeIn(result) {
        // this is really an awkward function, i wonder if there isn't a better cleaner way to merge objects and arrays
        // this function is specific to the JrResult class, and not generic

        // for fields, each keyed item should be a string; on the rare occasion we have an entry in both our field and result field with same key, we can append them.
        if (result.fields !== undefined) {
            if (this.fields == undefined) {
                this.fields = Object.assign({}, result.fields);
            } else {
                for (var key in result.fields) {
                    if (this.fields[key] == undefined) {
                        this.fields[key] = result.fields[key];
                    } else {
                        this.fields[key] = this.fields[key] + " " + result.fields[key];
                    }
                }
            }
            /*
            this.fields = {
                ...this.fields,
                ...result.fields
            };
            */
        }

        if (result.items != undefined) {
            // but items need to be concatenated
            if (this.items == undefined) {
                this.items = Object.assign({}, result.items);
            } else {
                for (var key in result.items) {
                    if (this.items[key] == undefined) {
                        this.items[key] = Object.assign({}, result.items[key]);
                    } else {
                        this.items[key] = (this.items[key]).concat(result.items[key]);
                    }
                }
            }
        }

        // if our typestr is blank, use result typestr
        if (this.typestr == undefined || this.typestr == null || this.typestr == "") {
            this.typestr = result.typestr;
        }
    }
    //---------------------------------------------------------------------------


    //---------------------------------------------------------------------------
    // simple static helper
    static is(obj) {
        return obj instanceof JrResult;
    }
    //---------------------------------------------------------------------------


    //---------------------------------------------------------------------------
    // passport helpers
    static createFromPassportInfoError(info) {
        // just convert from a passport error info object, which simply has a message field
        var jrresult = new JrResult("PassportError");
        if (info.message !== undefined) {
            jrresult.pushError(info.message);   
        } else {
            jrresult.pushError("unknown authorization error");
        }
        return jrresult;
    }


    static passportInfoAsJrResult(info) {
        if (info == undefined) {
            return undefined;
        }
        if (JrResult.is(info)) {
            return info;
        }
        return this.createFromPassportInfoError(info);
    }
    //---------------------------------------------------------------------------


    //---------------------------------------------------------------------------
    // session helpers for flash message save/load
    storeInSession(req) {
        // addd to session
        req.session.jrResult = this;
    }

    loadFromSession(req) {
        // load and ADD from session, then CLEAR session
        if (req.session.jrResult != undefined) {
            Object.assign(this, req.session.jrResult);
            // remove it from session
            delete req.session.jrResult;
        }
    }

    static restoreFromSession(req) {
        // if not found, just return undefined quickly
        if (req.session.jrResult == undefined) {
            return undefined;
        }
        //
        var jrResult = new JrResult;
        jrResult.loadFromSession(req);
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
    // ATTN: I don't trust this (or the performance of it)
    // see https://stackoverflow.com/questions/9285880/node-js-express-js-how-to-override-intercept-res-render-function
    static expressMiddlewareInjectSessionResult(options) {
        options = options || {};
        var safe = (options.unsafe === undefined) ? true : !options.unsafe;
        
        return function(req, res, next) {
            // grab reference of render
            var _jrrender = res.render;
            // override logic
            res.render = function( view, options, fn ) {
                // transfer any session jrResult into RESPONSE view available variable
                res.locals.jrResult = JrResult.restoreFromSession(req);
                //console.log(res.jrResult);
                //console.log(req.session);
                // continue with original render
                _jrrender.call( this, view, options, fn );
            }
            next();
        }
    }
    //---------------------------------------------------------------------------

}





//---------------------------------------------------------------------------
// export the class
module.exports = JrResult;
//---------------------------------------------------------------------------