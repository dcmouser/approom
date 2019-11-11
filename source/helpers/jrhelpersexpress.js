// jrexpresshelpers
// v1.0.0 on 11/2/19 by mouser@donationcoder.com
//
// helper functions for express

"use strict";

// modules
const passport = require("passport");


// our helper modules
const jrlog = require("../helpers/jrlog");
const JrResult = require("../helpers/jrresult");



class JrHelpersExpress {


	//---------------------------------------------------------------------------
	constructor() {
	}

	// global singleton request
	static getSingleton(...args) {
		// we could do this more simply by just exporting a new instance as module export, but we wrap a function for more flexibility
		if (this.globalSingleton === undefined) {
			this.globalSingleton = new JrHelpersExpress(...args);
		}
		return this.globalSingleton;
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	// from https://github.com/yshing/express-list-middleware/blob/master/index.js
	// see also https://github.com/yshing/express-repl-toolkit/tree/master/tools
	listExpressMiddleWare(app) {
		var appStack = app._router.stack;
		return Array.prototype.map.call(appStack, (middleware, index) => {
			return index + ". " + (middleware.handle.name || "<anonymous function>") + " " + getFileLine(middleware.handle);
		});
		// force the middleware to produce an error to locate the file.
		function getFileLine(handler) {
			try {
				handler(undefined);
			} catch (e) {
				return e.stack.split("\n")[1];
			}
			return null;
		}
	}
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	normalizePort(portval) {
		// from nodejs express builder suggested code
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
	// see https://stackoverflow.com/questions/14934452/how-to-get-all-registered-routes-in-express

	calcExpressRoutePathData(expressApp) {
		// helper function to compute express app route paths for debugging
		var siteRoutes = expressApp._router.stack;

		var routes = [];
		siteRoutes.forEach(this.calcExpressRoutePathDataRouteArray.bind(this, routes, []));
		return routes;
	}


	calcExpressRoutePathDataRouteArray(routes, routepath, layer) {
		if (layer.route) {
			layer.route.stack.forEach(this.calcExpressRoutePathDataRouteArray.bind(this, routes, routepath.concat(this.calcExpressRoutePathDataSplit(layer.route.path))));
		} else if (layer.name === "router" && layer.handle.stack) {
			routes.push("");
			layer.handle.stack.forEach(this.calcExpressRoutePathDataRouteArray.bind(this, routes, routepath.concat(this.calcExpressRoutePathDataSplit(layer.regexp))));
		} else if (layer.method) {
			var pathstr = layer.method.toUpperCase() + " /" + routepath.concat(this.calcExpressRoutePathDataSplit(layer.regexp)).filter(Boolean).join("/");
			routes.push(pathstr);
		}
	}

	calcExpressRoutePathDataSplit(thing) {
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
	// ASYNC wrapper around passport.authenticate
	//
	async asyncPasswordAuthenticate(authOptions, provider, providerNiceLabel, req, res, next, jrResult) {
		// first we make a promise out of passport.authenticate then await on it
		// see https://github.com/jaredhanson/passport/issues/605

		var userPassport;

		// create promise wrapper around passport.authenticate
		const passportPromiseAuth = (ireq, ires, inext) => new Promise((resolve, reject) => {
			passport.authenticate(provider, authOptions, async (err, inuserPassport, info) => {
				if (err || !inuserPassport) {
					// add error
					jrResult.pushError("error authenticating " + providerNiceLabel + ": " + JrResult.passportErrorAsString(info) + ".");
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
	//
	async asyncPasswordReqLogin(userPassport, errorMessage, req, jrResult) {
		// first we make a promise out of passport.authenticate then await on it
		// see https://github.com/jaredhanson/passport/issues/605

		// again create promise for passport req.login
		const passportPromiseReqLogin = (ireq) => new Promise((resolve, reject) => {
			// actually login the user
			ireq.logIn(userPassport, async (ierr) => {
				if (ierr) {
					// error (exception) logging them in
					jrResult.pushError(errorMessage + ": " + JrResult.passportErrorAsString(ierr));
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









}



// export the class as the sole export
module.exports = JrHelpersExpress.getSingleton();
