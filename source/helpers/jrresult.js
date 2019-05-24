// jrresult
// v1.0.0 on 5/24/19 by mouser@donationcoder.com
//
// error helper class

"use strict";


//---------------------------------------------------------------------------
// modules

// our helper modules
const jrhelpers = require("./jrhelpers");
//---------------------------------------------------------------------------




// JrResult is a class for returning an error from functions with enough information that it can be displayed to the user
// with helper methods for logging, etc.
class JrResult {

    constructor(typestr) {
        this.typestr = typestr;
    }

    //---------------------------------------------------------------------------
    // accessors
    getType() { return this.typestr; }

    // fields are key=> value pairs, used for input form errors typically
    setFieldError(key, value) {
        if (this.fields == undefined) {
            this.fields = {};
        }
        this.fields[key] = value;
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
    }
    //
    pushFieldError(key, msg) {
        // push an error, and also add a field error for it
        this.push("error", msg);
        this.setFieldError(key, msg);
    }
    //
    pushBiFieldError(key, shortMsg, longMsg) {
        // push an error, and also add a field error for it
        this.push("error", longMsg);
        this.setFieldError(key, shortMsg);
    }
    //
    pushError(msg) {
        this.push("error", msg);
    }
    pushMessage(msg) {
        this.push("message", msg);
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

}





//---------------------------------------------------------------------------
// export the class
module.exports = JrResult;
//---------------------------------------------------------------------------