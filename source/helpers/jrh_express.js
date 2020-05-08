/**
 * @module helpers/jrh_express
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 11/2/19

 * @description
 * Collection of helper functions for use with the nodejs express web framework
*/

"use strict";


// modules
const passport = require("passport");

const util = require("util");

// our helper modules
const JrResult = require("./jrresult");








//---------------------------------------------------------------------------
/**
 * Async Wrapper around the express/passport passport.authenticate function
 *
 * The passport library uses callbacks instead of promises and aync functions, so we wrap it here in a function that let's us use it like an async function for ease of use.
 * @see <a href="https://github.com/jaredhanson/passport/issues/605">passport docs</a>
 *
 * @param {*} authOptions
 * @param {*} provider
 * @param {*} providerNiceLabel
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @param {*} jrResult - our JrResult class with info about success or errors; pass in a valid instance and it is updated
 * @returns a simple object with passport user data
 */
async function asyncPasswordAuthenticate(authOptions, provider, providerNiceLabel, req, res, next, jrResult) {
	// first we make a promise out of passport.authenticate then await on it

	var userPassport;

	// create promise wrapper around passport.authenticate
	const passportPromiseAuth = (ireq, ires, inext) => new Promise((resolve, reject) => {
		passport.authenticate(provider, authOptions, async (err, inuserPassport, info) => {
			if (err || !inuserPassport) {
				// add error
				jrResult.pushError("error authenticating " + providerNiceLabel + ": " + JrResult.passportOrJrResultErrorAsString(info) + ".");
				// run next on error in chain
				if (false && err) {
					inext(err);
				}
				resolve(jrResult);
			}
			// success
			userPassport = inuserPassport;
			// success resolve
			resolve(jrResult);
		})(ireq, ires, inext);
	});


	// wait for promise resolution
	try {
		// now wait for the passport authenticate promise to run; note there is no case where it rejects; we could do this differently and catch an error
		await passportPromiseAuth(req, res, next);
	} catch (err) {
		// unexpected error
		jrResult.pushError(err.message);
	}

	// return userPassport data object
	return userPassport;
}
//---------------------------------------------------------------------------



//---------------------------------------------------------------------------
// ASYNC wrapper around passport req.login
/**
 * Async Wrapper around the express req.logIn function
 *
 * The express library uses callbacks instead of promises and aync functions, so we wrap it here in a function that let's us use it like an async function for ease of use.
 * @see <a href="https://github.com/jaredhanson/passport/issues/605">passport docs</a>
 *
 * @param {*} userPassport - simple object with user data to log in the user
 * @param {*} errorMessage - text of errror message added to jrResult on error
 * @param {*} req - express request
 * @param {*} jrResult - our JrResult class with info about success or errors; pass in a valid instance and it is updated
 */
async function asyncPasswordReqLogin(userPassport, errorMessage, req, jrResult) {
	// first we make a promise out of req.logIn then await on it

	// again create promise for passport req.login
	const passportPromiseReqLogin = (ireq) => new Promise((resolve, reject) => {
		// actually login the user
		ireq.logIn(userPassport, async (ierr) => {
			if (ierr) {
				// error (exception) logging them in
				jrResult.pushError(errorMessage + ": " + JrResult.passportOrJrResultErrorAsString(ierr));
				resolve(jrResult);
			}
			// success
			// success resolve
			resolve(jrResult);
		})(ireq);
	});

	try {
		// now wait for the passport req login promise to run; note there is no case where it rejects; we could do this differently and catch an error
		await passportPromiseReqLogin(req);
	} catch (err) {
		// unexpected error
		jrResult.pushError(err.message);
	}
}
//---------------------------------------------------------------------------









//---------------------------------------------------------------------------
/**
 * Suggested code from express builder sample applications; used when creating server and binding it to ip+port
 *
 * @param {*} portval
 * @returns port value (possibly provided as string), converted to an integer if possible
 */
function normalizePort(portval) {
	var port = parseInt(portval, 10);
	if (Number.isNaN(port)) {
		// named pipe
		return portval;
	}
	if (port >= 0) {
		// port number
		return port;
	}
	return false;
}
//---------------------------------------------------------------------------




//---------------------------------------------------------------------------
/**
 * Helper debug function that generates a list (object) of express middleware for display
 * @see <a href="https://github.com/yshing/express-list-middleware/blob/master/index.js">github code</a>
 * @see <a href="https://github.com/yshing/express-repl-toolkit/tree/master/tools">github code</a>
 * ##### Notes
 *  * Uses an interesting trick to get file and line number where the middleware is located
 *
 * @param {object} app - the express app object
 * @returns object containing all middleware, suitable for json stringifcation to console, etc.
 */
function calcExpressMiddleWare(app) {
	const jrdebug = require("./jrdebug");
	//
	var middlewareName, middlewareHint, extraDebugInfo;
	var appStack = app._router.stack;
	return Array.prototype.map.call(appStack, (middleware, index) => {
		middlewareName = middleware.handle.name;
		middlewareHint = "";

		// jrdebug.debugObj(middleware, middlewareName);
		middlewareHint = calcExpressMiddlewareRouterHint(middleware);
		if (middlewareHint) {
			middlewareName += " " + middlewareHint;
		}

		var lineInfo = calcExpressMiddlewareGetFileLine(middleware.handle);
		var retv = index + ". " + (middlewareName || "<anonymous function>");
		if (false || (lineInfo && !lineInfo.startsWith("at Function.handle") && !lineInfo.startsWith("at serveStatic"))) {
			retv += " " + lineInfo;
		}
		return retv;
	});
}


/**
 * Helper funciton to try to get function file line from handle
 *
 * @param {*} handler
 * @returns string specifying the line number of the handler
 */
function calcExpressMiddlewareGetFileLine(handler) {
	const jrdebug = require("./jrdebug");

	// This is a little trick we found to get the line number
	// ATTN: But on 3/31/20 it stopped working, due to our custom error handler catching this exception; we fixed the custom error catcher so it works now but I'm leaving this a flag so it can be bypassed if it ceases to work in the future
	const flagTryGetFileLine = true;
	//
	if (!flagTryGetFileLine) {
		return "[file line n/a]";
	}

	try {
		// trigger an ignorable exception (caught in arserver and ignored)
		handler("IGNORE_EXCEPTION");
	} catch (e) {
		var retstr = e.stack.split("\n")[1];
		retstr = retstr.trim();
		return retstr;
	}
	return null;
}



/**
 * Get a hint for a router middleware?
 *
 * @param {*} middlewareHandle
 */
function calcExpressMiddlewareRouterHint(middleware) {
	const jrhMisc = require("./jrh_misc");
	var hintstr = "";

	// extra debug info?
	if (middleware.handle.appRoomDebugInfo) {
		hintstr += jrhMisc.objToString(middleware.handle.appRoomDebugInfo, true);
	}

	if (middleware.regexp) {
		var rhint;
		if (middleware.regexp.source) {
			rhint = middleware.regexp.source;
		} else {
			rhint = middleware.regexp;
		}
		if (rhint !== "^\\/?(?=\\/|$)") {
			if (hintstr !== "") {
				hintstr += " ";
			}
			hintstr += "[regex:" + rhint + "]";
		}
	}
	return hintstr;
}




/**
 * Helper debug function the generates a list (object) of all paths registered to the express app
 *
 * @param {object} expressApp
 * @returns object containing all routes (and whether they are get|post|all)
 */
function calcExpressRoutePathData(expressApp) {
	var siteRoutes = expressApp._router.stack;

	var routes = [];
	siteRoutes.forEach(calcExpressRoutePathDataRouteArray.bind(this, routes, []));
	return routes;
}
//---------------------------------------------------------------------------










//---------------------------------------------------------------------------
/**
 * Internal helper debug function the helps to generate a list (object) of all paths registered to the express app
 * @private
 * @param {*} routes
 * @param {*} routepath
 * @param {*} layer
 */
function calcExpressRoutePathDataRouteArray(routes, routepath, layer) {
	if (layer.route) {
		layer.route.stack.forEach(calcExpressRoutePathDataRouteArray.bind(this, routes, routepath.concat(calcExpressRoutePathDataSplit(layer.route.path))));
	} else if (layer.name === "router" && layer.handle.stack) {
		routes.push("");
		layer.handle.stack.forEach(calcExpressRoutePathDataRouteArray.bind(this, routes, routepath.concat(calcExpressRoutePathDataSplit(layer.regexp))));
	} else if (layer.method) {
		var pathstr = layer.method.toUpperCase() + " /" + routepath.concat(calcExpressRoutePathDataSplit(layer.regexp)).filter(Boolean).join("/");
		routes.push(pathstr);
	}
}


/**
 * Internal helper debug function the helps to generate a list (object) of all paths registered to the express app.
 * Splits on path separator.
 * @private
 * @see <a href="https://github.com/expressjs/express/issues/3308">github code</a>
 *
 * @param {*} thing
 * @returns split of path
 */
function calcExpressRoutePathDataSplit(thing) {
	if (typeof thing === "string") {
		return thing.split("/");
	}
	if (thing.fast_slash) {
		return "";
	}
	var match = thing.toString().replace("\\/?", "").replace("(?=\\/|$)", "$").match(/^\/\^((?:\\[.*+?^${}()|[\]\\/]|[^.*+?^${}()|[\]\\/])*)\$\//);
	return match ? match[1].replace(/\\(.)/g, "$1").split("/") : "<complex:" + thing.toString() + ">";
}
//---------------------------------------------------------------------------




//---------------------------------------------------------------------------
/**
 * Express helper function to look for property in request BODY or QUERY and return it, or defaultVal if not present
 *
 * @param {object} req - express request object
 * @param {string} key - key to look for in request body or query
 * @param {*} defaultVal - to return if key not found in request
 * @returns req.body[key] or req.query[key] or defaultVal
 */
function reqVal(req, key, defaultVal) {
	// return query param or post val or default
	if (req.body[key] !== undefined && req.body[key] !== null) {
		return req.body[key];
	}
	if (req.query[key] !== undefined && req.query[key] !== null) {
		return req.query[key];
	}
	return defaultVal;
}


/**
 * Express helper to look for property in request BODY or QUERY and return it, or defaultVal if not present
 *
 * @param {object} req - express request object
 * @param {string} key - key to look for in request body or query
 * @param {int} min - min int to floor the value to
 * @param {int} max - max int to ceil the value to
 * @param {int} defaultVal - to return if key not found in request
 * @returns req.body[key] or req.query[key] cast to int in range [min,max] or defaultVal
 */
function reqValAsInt(req, key, min, max, defaultVal) {
	// get val as int and min and max it
	var val = Number(reqVal(req, key, defaultVal));
	if (min !== null) {
		val = Math.max(val, min);
	}
	if (max !== null) {
		val = Math.min(val, max);
	}
	return val;
}


/**
 * Express helper to look for property in request BODY or QUERY and return it, or defaultVal if not present
 *
 * @param {object} req - express request object
 * @param {string} key - key to look for in request body or query
 * @param {array} valueList - list of values that are acceptable
 * @param {*} defaultVal - to return if key not found in request
 * @returns req.body[key] or req.query[key] as long as they are present in valueList, otherwise defaultVal
 */
function reqValFromList(req, key, valueList, defaultVal) {
	var val = reqVal(req, key, defaultVal);
	if (valueList.indexOf(val) > -1) {
		return val;
	}
	return defaultVal;
}


/**
 * Express helper to look for all properties with a given prefix
 *
 * @param {*} req - express request object
 * @param {string} prefix - the prefix string
 * @param {*} keyList
 * @returns an associative array of all key=>value pairs of request properties where key starts with "prefix_key" and key is in keyList
 */
function reqPrefixedValueArray(req, prefix, keyList) {
	// look for ALL values for prefix+"_"+key and return an associative array of them
	var valArray = {};
	var fieldName;
	var val;
	keyList.forEach((key) => {
		fieldName = prefix + "_" + key;
		val = reqVal(req, fieldName, undefined);
		if (val !== undefined && val !== "") {
			// store it
			valArray[key] = val;
		}
	});

	return valArray;
}


/**
 * Express helper to look for all items with a given prefix
 *
 * @param {*} req - express request object
 * @param {string} prefix - the prefix string
 * @returns an array of all form values with id prefix_ (used for checklists)
 */
function reqPrefixedCheckboxItemIds(reqbody, prefix) {
	// look for ALL values for prefix+"_"+key and return an associative array of them
	var valArray = [];
	var id;
	var keys = Object.keys(reqbody);
	const prefixlen = prefix.length;
	keys.forEach((keyname) => {
		if (keyname.startsWith(prefix)) {
			id = keyname.substr(prefixlen);
			valArray.push(id);
		}
	});

	return valArray;
}



/**
 * Deletes the varname from session data
 *
 * @param {obj} req
 * @param {string} varName
 */
function forgetSessionVar(req, varName) {
	if (req.session && req.session[varName] !== undefined) {
		delete req.session[varName];
	}
}
//---------------------------------------------------------------------------



//---------------------------------------------------------------------------
function getRequestLogString(req) {
	var str = util.format("url='%s' userid='%s' ip='%s'", req.url, (req.user ? req.user.id : undefined), req.ip);
	return str;
}
//---------------------------------------------------------------------------



//---------------------------------------------------------------------------
/**
 * @see https://expressjs.com/en/api.html#req
 *
 * @param {*} req
 * @returns the url of the request
 */
function reqUrlWithPath(req) {
	if (!req) {
		return "/";
	}
	return req.baseUrl + "/" + req.path;
}


/**
 * @see https://expressjs.com/en/api.html#req
 *
 * @param {*} req
 * @returns the original url of the request
 */
function reqOriginalUrl(req) {
	if (!req) {
		return "/";
	}
	return req.originalUrl;
}
//---------------------------------------------------------------------------




/**
 * Send a json reply to the express Response object
 *
 * @param {*} res - the express response object
 * @param {int} status - status code to send
 * @param {string} str - success string (send as value of success key)
 * @param {*} obj - other data to send in reply
 */
function sendResJsonData(res, status, str, obj) {
	var data;
	if (str === null || str === undefined || str === "") {
		data = {
			...obj,
		};
	} else {
		data = {
			success: str,
			...obj,
		};
	}
	//
	res.status(status).send(data);
}

/**
 * Send a json reply to the response, which is an error
 *
 * @param {*} res - the express response object
 * @param {int} status - the http status code (error)
 * @param {*} errorStr - the value for the error key
 */
function sendResJsonError(res, status, errorStr) {
	const data = {
		error: errorStr,
	};
	res.status(status).send(data);
}


/**
 * Send a JrResult as a reply, either as an error or success, depending on jrResult data
 *
 * @param {*} res - the express repsonse object
 * @param {int} status - the http status code
 * @param {*} jrResult - the jrResult object to send
 */
function sendResJsonJrResult(res, status, jrResult) {
	// is it error?
	if (jrResult.isError()) {
		sendResJsonError(res, status, jrResult.getErrorsAsString());
		return;
	}
	// it's a success
	sendResJsonData(res, status, jrResult.getSuccessAsString(), undefined);
}


/**
 * Send a json result that indicates an api token error, with status 403
 *
 * @param {*} res
 * @param {*} jrResult - the details of the error
 */
function sendResJsonJrResultTokenError(res, jrResult) {
	const status = 403;
	const data = {
		error: jrResult.getErrorsAsString(),
		tokenError: true,
	};
	res.status(status).send(data);
}


/**
 * Send a json result that indicates an ACL error, with status 403
 *
 * @param {*} res
 * @param {string} permission - permission that the user is denied
 * @param {string} permissionObjType - type of permission to complain about
 * @param {string} permissionObjId - actual object id to complain about
 */
function sendResJsonAclErorr(res, permission, permissionObjType, permissionObjId) {
	const status = 403;
	var errorMessage = "you do not have permission to " + permission;
	if (permissionObjType) {
		errorMessage += " on " + permissionObjType;
	}
	if (permissionObjId) {
		errorMessage += " #" + permissionObjId;
	}
	const data = {
		error: errorMessage,
	};
	res.status(status).send(data);
}
//---------------------------------------------------------------------------



//---------------------------------------------------------------------------
/**
 * We expect a json encodd string in the request body under a certain field (post var) name.
 * Get it and parse it to json and return the json
 * Caller should check jrResult for any error
 *
 * @param {*} req - express request object
 * @param {*} keyName - name of the post var to get the data from
 * @param {*} jrResult - errors are pushed into here.
 * @returns the json object encoded by the post var
 */
function parseReqGetJsonField(req, keyName, jrResult) {
	if (!req.body[keyName]) {
		jrResult.pushError("Missing json data, expected in post variable " + keyName + ".");
		return null;
	}

	var jsonVal;
	try {
		// var jsonStr = req.body[keyName];
		// It's already in json format(!)
		// console.log("ATTN: debug trying to decode jsonstr:");
		// console.log(jsonStr);
		// jsonVal = JSON.parse(jsonStr);
		jsonVal = req.body[keyName];
	} catch (e) {
		jrResult.pushException("Invalid json data in field " + keyName, e);
		return null;
	}

	return jsonVal;
}
//---------------------------------------------------------------------------







// export the class as the sole export
module.exports = {
	asyncPasswordAuthenticate,
	asyncPasswordReqLogin,

	normalizePort,

	calcExpressMiddleWare,
	calcExpressRoutePathData,

	reqVal,
	reqValAsInt,
	reqValFromList,
	reqPrefixedValueArray,
	reqPrefixedCheckboxItemIds,
	forgetSessionVar,

	getRequestLogString,

	reqUrlWithPath,
	reqOriginalUrl,

	sendResJsonData,
	sendResJsonError,
	sendResJsonJrResult,
	sendResJsonJrResultTokenError,
	sendResJsonAclErorr,

	parseReqGetJsonField,
};
