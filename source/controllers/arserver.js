/**
 * @module controllers/arserver
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 5/1/19
 * @description
 * This module defines the main class representing the server system that sets up the web server and handles all requests.
 * It is the central object in the project.
 */

"use strict";


// database imports
const mongoose = require("mongoose");

// express related modules
const httpErrors = require("http-errors");
const express = require("express");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const csurf = require("csurf");
const connectMongo = require("connect-mongo");
const http = require("http");
const bodyParser = require("body-parser");
const https = require("https");

// json web tokens
const jsonwebtoken = require("jsonwebtoken");

// passport authentication stuff
const passport = require("passport");
const passportLocal = require("passport-local");
const passportFacebook = require("passport-facebook");
const passportJwt = require("passport-jwt");

// misc node core modules
const path = require("path");
const fs = require("fs");
const assert = require("assert");
const util = require("util");

// misc 3rd party modules
const gravatar = require("gravatar");

// mail
const nodemailer = require("nodemailer");


// requirement service locator
const jrequire = require("../helpers/jrequire");

// our helper modules
const jrhMisc = require("../helpers/jrh_misc");
const jrhMongo = require("../helpers/jrh_mongo");
const jrhExpress = require("../helpers/jrh_express");
const jrlog = require("../helpers/jrlog");
const jrdebug = require("../helpers/jrdebug");
const jrconfig = require("../helpers/jrconfig");
const JrResult = require("../helpers/jrresult");
const jrhHandlebars = require("../helpers/jrh_handlebars");

// approomserver globals
const arGlobals = require("../approomglobals");







//---------------------------------------------------------------------------
// global constants
const DefRequiredLoginMessage = "You need to log in before you can access the requested page.";
// log categories
const DefLoggingCategoryError = "error";
const DefLoggingCategoryError404 = "404";
const DefLoggingCategory = "";
// log types
const DefLogMessageTypeError404 = "error.404";
//---------------------------------------------------------------------------








/**
 * The main class representing the server system that sets up the web server and handles all requests.
 *
 * @class AppRoomServer
 */
class AppRoomServer {


	//---------------------------------------------------------------------------
	// constructor
	constructor() {
		// csrf
		this.csrfInstance = undefined;
		this.gravatarOptions = undefined;
		//
		this.serverHttps = undefined;
		this.serverHttp = undefined;
	}
	//---------------------------------------------------------------------------





	//---------------------------------------------------------------------------
	// accessors
	//
	getBaseDir() {
		return path.resolve(__dirname, "..");
	}

	getBaseSubDir(relpath) {
		return path.join(this.getBaseDir(), relpath);
	}

	getLogDir() {
		return this.getBaseSubDir("logs");
	}
	//---------------------------------------------------------------------------

	//---------------------------------------------------------------------------
	// getting options via jrconfig
	//
	getOptionDbUrl() { return jrconfig.getVal("server:DB_URL"); }

	getOptionHttp() { return jrconfig.getVal("server:HTTP"); }

	getOptionHttpPort() { return jrconfig.getVal("server:HTTP_PORT"); }

	getOptionHttps() { return jrconfig.getVal("server:HTTPS"); }

	getOptionHttpsKey() { return jrconfig.getVal("server:HTTPS_KEY"); }

	getOptionHttpsCert() { return jrconfig.getVal("server:HTTPS_CERT"); }

	getOptionHttpsPort() { return jrconfig.getVal("server:HTTPS_PORT"); }

	getOptionSiteDomain() { return jrconfig.getVal("server:SITE_DOMAIN"); }

	getOptionDebugEnabled() { return jrconfig.getValDefault("DEBUG", false); }

	getOptionUseFullRegistrationForm() { return jrconfig.getValDefault("options:SIGNUP_FULLREGISTRATIONFORM", false); }

	// see https://stackoverflow.com/questions/2683803/gravatar-is-there-a-default-image
	/*
		404: do not load any image if none is associated with the email hash, instead return an HTTP 404 (File Not Found) response
		mm: (mystery-man) a simple, cartoon-style silhouetted outline of a person (does not vary by email hash)
		identicon: a geometric pattern based on an email hash
		monsterid: a generated 'monster' with different colors, faces, etc
		wavatar: generated faces with differing features and backgrounds
		retro: awesome generated, 8-bit arcade-style pixelated faces
		blank: a transparent PNG image (border added to HTML below for demonstration purposes)
	*/
	getOptionsGravatar() { return jrconfig.getValDefault("options:GRAVATAR_OPTIONS", {}); }
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	getExpressApp() { return this.expressApp; }

	getJrConfig() { return jrconfig; }

	getConfigVal(...args) { return jrconfig.getVal(...args); }
	//---------------------------------------------------------------------------





	//---------------------------------------------------------------------------
	setup() {
		// perform global configuration actions that are shared and should be run regardless of the cli app or unit tests

		// load up requirements that avoid circular dependencies
		this.setupLateRequires();

		// setup debugger
		jrdebug.setup(arGlobals.programName, true);

		// setup loggers
		this.setupLoggers();

		// show some info about app
		jrdebug.debugf("%s v%s (%s) by %s", arGlobals.programName, arGlobals.programVersion, arGlobals.programDate, arGlobals.programAuthor);

		// try to get server ip
		var serverIp = jrhMisc.getServerIpAddress();
		jrconfig.setServerFilenamePrefixFromServerIp(serverIp);
		jrdebug.debugf("Running on server: %s", serverIp);

		// setup singleton jrconfig from options
		jrconfig.setDefaultOptions(arGlobals.defaultOptions);
		jrconfig.setOverrideOptions(arGlobals.overrideOptions);
		jrconfig.setEnvList(arGlobals.envListOptions);

		// Set base directory to look for config files -- caller can modify this, and discover them
		jrconfig.setConfigDirAndDiscoverConfigFiles(this.getBaseDir());
	}


	processConfig() {
		// now parse commandline/config/env/ etc.
		jrconfig.parse();

		// set any values based on config

		// enable debugging based on DEBUG field
		jrdebug.setDebugEnabled(this.getOptionDebugEnabled());

		// discover plugins, must be done after processing config file
		this.discoverPlugins();
		this.initializePlugins();
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	discoverPlugins() {
		// get the plugin config object
		const pluginConfig = this.getConfigVal("plugins");
		// now iterate over it and register the plugins
		var pluginObj;
		Object.keys(pluginConfig).forEach((name) => {
			pluginObj = pluginConfig[name];
			if (pluginObj.enabled !== false) {
				jrequire.registerPluginPath(pluginObj.category, name, pluginObj.path);
			}
		});
	}


	initializePlugins() {
		// get list of all registered plugins
		var category, pluginmodule;
		const plugins = jrequire.getAllPlugins();
		// iterate all categories
		Object.keys(plugins).forEach((categoryKey) => {
			// iterate all modules in this category
			category = plugins[categoryKey];
			Object.keys(category).forEach((name) => {
				pluginmodule = jrequire.plugin(name);
				pluginmodule.initialize(this);
			});
		});
	}
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	setupLateRequires() {
		// controllers
		this.rateLimiterAid = jrequire("ratelimiteraid");
		this.crudAid = jrequire("crudaid");
		this.aclAid = jrequire("aclaid");

		// model requires
		this.AppModel = jrequire("models/app");
		this.ConnectionModel = jrequire("models/connection");
		this.FileModel = jrequire("models/file");
		this.LogModel = jrequire("models/log");
		this.LoginModel = jrequire("models/login");
		this.OptionModel = jrequire("models/option");
		this.RoomModel = jrequire("models/room");
		this.RoomdataModel = jrequire("models/roomdata");
		this.SessionModel = jrequire("models/session");
		this.UserModel = jrequire("models/user");
		this.VerificationModel = jrequire("models/verification");
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	setupLoggers() {
		// setup singleton loggers
		jrlog.setup(arGlobals.programName, this.getLogDir());

		// winston logger files
		jrlog.setupWinstonLogger(DefLoggingCategoryError, DefLoggingCategoryError);
		jrlog.setupWinstonLogger(DefLoggingCategoryError404, DefLoggingCategoryError404);
		jrlog.setupWinstonLogger(DefLoggingCategory, DefLoggingCategory);
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	setupExpress() {
		// create this.express
		var expressApp = express();
		// save expressApp for easier referencing later
		this.expressApp = expressApp;

		// early injection of pointer to this server into request
		this.setupExpressEarlyInjections(expressApp);

		// view and template stuff
		this.setupExpressViews(expressApp);

		// setup logging stuff
		this.setupExpressLogging(expressApp);

		// setup misc., parsers, etc.
		this.setupExpressMiscParsers(expressApp);

		// session, cookies, etc.
		this.setupExpressSessionCookieStuff(expressApp);

		// security stuff
		this.setupExpressSecurity(expressApp);

		// setup static file and bootstrap, jquery, etc.
		this.setupExpressStatics(expressApp);

		// any custom middleware?
		this.setupExpressCustomMiddleware(expressApp);

		// passport login system
		this.setupExpressPassport(expressApp);

		// routes
		this.setupExpressRoutesCore(expressApp);
		this.setupExpressRoutesSpecialized(expressApp);

		// fallback error handlers
		this.setupExpressErrorHandlers(expressApp);
	}


	setupExpressEarlyInjections(expressApp) {

		// we are deciding whether we want this
		if (false) {
			expressApp.use((req, res, next) => {
				// add pointer to us in the request?
				req.arserver = this;
				return next();
			});
		}
	}


	setupExpressViews(expressApp) {
		// view file engine setup
		expressApp.set("views", this.getBaseSubDir("views"));

		// handlebar template ending
		expressApp.set("view engine", "hbs");
	}


	setupExpressLogging(expressApp) {
		// logging system for express httpd server - see https://github.com/expressjs/morgan
		// by default this is displaying to screen
		// see https://github.com/expressjs/morgan
		const morganMiddleware = jrlog.setupMorganMiddlewareForExpressWebAccessLogging();
		expressApp.use(morganMiddleware);
	}


	setupExpressMiscParsers(expressApp) {
		// misc stuff
		expressApp.use(express.json());
		expressApp.use(bodyParser.urlencoded({ extended: true }));
		// parse query parameters automatically
		expressApp.use(express.query());
	}


	setupExpressSessionCookieStuff(expressApp) {
		// cookie support
		expressApp.use(cookieParser());

		// session store
		// db session backend storage (we avoid file in case future cloud operation)
		// connect-mongo see https://www.npmjs.com/package/connect-mongo
		// ATTN: we could try to share the mongood connection instead of re-specifying it here; not clear what performance implications are
		const mongoStoreOptions = {
			url: this.getOptionDbUrl(),
			autoRemove: "interval",
			autoRemoveInterval: 600, // minutes
		};
		const MonstStore = connectMongo(session);
		const sessionStore = new MonstStore(mongoStoreOptions);

		// cookie options
		const cookieOptions = {
			secure: false,
		};

		// sesssion support
		// see https://github.com/expressjs/session
		expressApp.use(session({
			name: this.getConfigVal("session:SESSIONIDNAME"),
			secret: this.getConfigVal("session:SESSIONSECRET"),
			resave: false,
			cookie: cookieOptions,
			saveUninitialized: false,
			store: sessionStore,
		}));
	}


	setupExpressSecurity(expressApp) {
		// setup csrf, etc.
		// see https://github.com/expressjs/csurf
		this.csrfInstance = csurf({
			cookie: false,
			ignoreMethods: [],	// we pass in empty array here because we are not using csurf as middleware and explicitly calling when we want it
		});
		// ATTN: we do NOT install it as middleware, we will use it explicitly only when we want it
		// by calling some support functions we have written
	}


	setupExpressStatics(expressApp) {
		// static resources serving
		// setup a virtual path that looks like it is at staticUrl and it is served from staticAbsoluteDir
		const staticAbsoluteDir = this.getBaseSubDir("static");
		const staticUrl = "/static";
		expressApp.use(staticUrl, express.static(staticAbsoluteDir));
		jrdebug.cdebugf("Serving static files from '%s' at '%s", staticAbsoluteDir, staticUrl);

		// setup bootstrap, jquery, etc.
		const jsurl = staticUrl + "/js";
		const cssurl = staticUrl + "/css";
		const nodemodulespath = path.join(__dirname, "..", "node_modules");
		expressApp.use(jsurl + "/bootstrap", express.static(path.join(nodemodulespath, "bootstrap", "dist", "js")));
		expressApp.use(cssurl + "/bootstrap", express.static(path.join(nodemodulespath, "bootstrap", "dist", "css")));
		expressApp.use(jsurl + "/jquery", express.static(path.join(nodemodulespath, "jquery", "dist")));
	}
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	setupExpressCustomMiddleware(expressApp) {
		// setup any custom middleware

		// see our documentation in JrResult, we have decided to not use automatic injection of JrResult data
		// auto inject into render any saves session jrResult
		// expressApp.use(JrResult.expressMiddlewareInjectSessionResult());
	}
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	setupExpressRoutesCore(expressApp) {
		// add routes to express app

		// home page
		this.setupRoute(expressApp, "/", "index");

		// register/signup
		this.setupRoute(expressApp, "/register", "register");

		// login
		this.setupRoute(expressApp, "/login", "login");
		// logout
		this.setupRoute(expressApp, "/logout", "logout");

		// verifications
		this.setupRoute(expressApp, "/verify", "verify");

		// profile
		this.setupRoute(expressApp, "/profile", "profile");

		// admin
		this.setupRoute(expressApp, "/admin", "admin");
		// internals
		this.setupRoute(expressApp, "/internals", "internals");
		// analytics
		this.setupRoute(expressApp, "/analytics", "analytics");


		// crud routes
		var crudUrlBase = "/crud";
		this.setupRouteGenericCrud(expressApp, crudUrlBase + "/user", this.UserModel);
		this.setupRouteGenericCrud(expressApp, crudUrlBase + "/login", this.LoginModel);
		this.setupRouteGenericCrud(expressApp, crudUrlBase + "/verification", this.VerificationModel);
		this.setupRouteGenericCrud(expressApp, crudUrlBase + "/connection", this.ConnectionModel);
		this.setupRouteGenericCrud(expressApp, crudUrlBase + "/option", this.OptionModel);
		this.setupRouteGenericCrud(expressApp, crudUrlBase + "/log", this.LogModel);
		this.setupRouteGenericCrud(expressApp, crudUrlBase + "/session", this.SessionModel);
	}



	setupExpressRoutesSpecialized(expressApp) {
		// add routes to express app

		// app routes
		this.setupRoute(expressApp, "/app", "app");
		// room routes
		this.setupRoute(expressApp, "/room", "room");

		// api routes
		this.setupRoute(expressApp, "/api", "api");

		// test stuff
		this.setupRoute(expressApp, "/membersonly", "membersonly");

		// crud routes
		var crudUrlBase = "/crud";
		this.setupRouteGenericCrud(expressApp, crudUrlBase + "/app", this.AppModel);
		this.setupRouteGenericCrud(expressApp, crudUrlBase + "/room", this.RoomModel);
		this.setupRouteGenericCrud(expressApp, crudUrlBase + "/file", this.FileModel);
		this.setupRouteGenericCrud(expressApp, crudUrlBase + "/roomdata", this.RoomdataModel);
	}
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	setupRoute(expressApp, urlPath, routeFilename) {
		// require in the file in the routes directory so we can discover its functions
		var route = require("../routes/" + routeFilename);

		// ok there are two ways that our route files can be written
		// the first is by exporting a setupRouter function, in which case we call it with urlPath and it returns the router
		// the older method just exports default router
		//
		if (route.setupRouter) {
			var expressRouter = route.setupRouter(urlPath);
			assert(expressRouter);
			this.useExpressRoute(expressApp, urlPath, expressRouter);
		} else {
			this.useExpressRoute(expressApp, urlPath, route);
		}
	}


	setupRouteGenericCrud(expressApp, urlPath, modelClass) {
		// function to set up crud paths for a model
		// create router using express
		const router = express.Router();
		// setup paths on it
		this.crudAid.setupRouter(router, modelClass, urlPath);
		// register it
		this.useExpressRoute(expressApp, urlPath, router);

		// let app model know about its crud path
		modelClass.setCrudBaseUrl(urlPath);
		// now return the router for further work
		return router;
	}


	useExpressRoute(expressApp, urlPath, route) {
		// register it with the express App
		expressApp.use(urlPath, route);
	}
	//---------------------------------------------------------------------------









	//---------------------------------------------------------------------------
	setupExpressPassport(expressApp) {
		// setup passport module for login authentication, etc.

		// provide callback function to help passport serialize a user
		passport.serializeUser((profile, done) => {
			// here we are converting from the profile object returned by the strategy, to the minimal user data stored in the SESSION object
			// so we want this to be just enough to uniquely identify the user.
			// profile is the user profile object returned by the passport strategy callback below, so we can decide what to return from that
			// so in this case, we just return the profile object
			jrdebug.cdebugObj(profile, "serializeUser profile");
			var userProfileObj = profile;
			// call passport callback
			done(null, userProfileObj);
		});

		// provide callback function to help passport deserialize a user
		passport.deserializeUser((user, done) => {
			// we are now called with user being the minimum USER object we passed to passport earlier, which was saved in user's session data
			// we should now find this user in the database and return the full user model?
			// the idea here is that our session data contains only the minimalist data returned by serializeUser()
			// and this function gives us a chance to fully load a full user object on each page load, which passport will stick into req.user
			// but we may not want to actually use this function to help passport load up a full user object from the db, because of the overhead and cost of doing
			// that when it's not needed.  So we are converting from the SESSION userdata to possibly FULLER userdata
			// however, remember that we might want to check that the user is STILL allowed into our site, etc.
			jrdebug.cdebugObj(user, "deserializeUser user");
			// build full user ?
			var userFull = user;
			// call passport callback
			done(null, userFull);
		});

		// setup passport strategies
		this.setupPassportStrategies();

		// hand passport off to express
		expressApp.use(passport.initialize());
		expressApp.use(passport.session());
	}


	setupPassportStrategies() {
		// setup any login/auth strategies
		this.setupPassportStrategyLocal();
		this.setupPassportStrategyFacebook();
		this.setupPassportJwt();
	}


	setupPassportStrategyLocal() {
		// local username and password strategy
		// see https://www.sitepoint.com/local-authentication-using-passport-node-js/
		const Strategy = passportLocal.Strategy;

		var strategyOptions = {
			passReqToCallback: true,
			usernameField: "usernameEmail",
		};

		// see http://www.passportjs.org/docs/configure/
		passport.use(new Strategy(
			strategyOptions,
			async (req, usernameEmail, password, done) => {
				// this is the function called when user tries to login
				// so we check their username and password and return either FALSE or the user
				// first, find the user via their password
				var jrResult;
				jrdebug.cdebugf("In passport local strategy test with username=%s and password=%s", usernameEmail, password);

				var user = await this.UserModel.findOneByUsernameEmail(usernameEmail);
				if (!user) {
					// not found
					jrResult = JrResult.makeNew().pushFieldError("usernameEmail", "Username/Email-address not found");
					return done(null, false, jrResult);
				}
				// ok we found the user, now check their password
				var bretv = await user.testPlaintextPassword(password);
				if (!bretv) {
					// password doesn't match
					jrResult = JrResult.makeNew().pushFieldError("password", "Password does not match");
					return done(null, false, jrResult);
				}
				// password matches!
				// update last login time
				jrResult = JrResult.makeNew();
				await user.updateloginDateAndSave(jrResult);
				// return the minimal user info needed
				// IMP NOTE: the profile object we return here is precisely what gets passed to the serializeUser function above
				const userProfile = user.getMinimalPassportProfile();
				return done(null, userProfile, jrResult);
			},
		));
	}



	setupPassportStrategyFacebook() {
		// see http://www.passportjs.org/packages/passport-facebook/
		const Strategy = passportFacebook.Strategy;

		var strategyOptions = {
			clientID: jrconfig.getVal("passport:FACEBOOK_APP_ID"),
			clientSecret: jrconfig.getVal("passport:FACEBOOK_APP_SECRET"),
			callbackURL: this.calcAbsoluteSiteUrlPreferHttps("/login/facebook/auth"),
			passReqToCallback: true,
		};

		// debug info
		jrdebug.cdebugObj(strategyOptions, "setupPassportStrategyFacebook options");

		passport.use(new Strategy(
			strategyOptions,
			async (req, accessToken, refreshToken, profile, done) => {
				jrdebug.cdebugObj(accessToken, "facebook accessToken");
				jrdebug.cdebugObj(refreshToken, "facebook refreshToken");
				jrdebug.cdebugObj(profile, "facebook profile");
				// get user associated with this facebook profile, OR create one, etc.
				var bridgedLoginObj = {
					provider: profile.provider,
					providerUserId: profile.id,
					extraData: {
						realName: profile.displayName,
					},
				};
				// created bridged user
				var { user, jrResult } = await this.LoginModel.processBridgedLoginGetOrCreateUserOrProxy(bridgedLoginObj, req);
				// if user could not be created, it's an error
				// add jrResult to session in case we did extra stuff and info to show the user
				if (jrResult) {
					jrResult.addToSession(req);
				}
				// otherwise log in the user -- either with a REAL user account, OR if user is a just a namless proxy for the bridged login, with that
				var userProfile;
				if (user) {
					userProfile = user.getMinimalPassportProfile();
				} else {
					userProfile = null;
				}
				// return success
				return done(null, userProfile);
			},
		));
	}



	setupPassportJwt() {
		// see http://www.passportjs.org/packages/passport-facebook/
		const Strategy = passportJwt.Strategy;
		const ExtractJwt = passportJwt.ExtractJwt;

		var strategyOptions = {
			secretOrKey: jrconfig.getVal("token:CRYPTOKEY"),
			jwtFromRequest: ExtractJwt.fromUrlQueryParameter("token"),
			// we ignore expiration auto handling; we will check it ourselves
			ignoreExpiration: true,
		};

		// debug info
		jrdebug.cdebugObj(strategyOptions, "setupPassportJwt strategyOptions");

		passport.use(new Strategy(
			strategyOptions,
			async (payload, done) => {
				// get the user payload from the token
				// jrlog.debugObj(payload, "API TOKEN PAYLOAD DEBUG");
				var userProfile = payload.user;
				if (!userProfile) {
					const errorstr = "Error decoding user data from access token";
					return done(errorstr);
				}
				// BUT we'd really like to pass on some extra token info.. so we add it to user profile object
				userProfile.token = {
					// see createSecureToken() for fields found here
					type: payload.type,
					scope: payload.scope,
					apiCode: payload.apiCode,
					iat: payload.iat,
					iss: payload.iss,
					exp: payload.exp,
				};
				// return success
				return done(null, userProfile);
			},
		));
	}
	//---------------------------------------------------------------------------






















	//---------------------------------------------------------------------------
	createExpressServersAndListen() {
		// create server
		// see https://timonweb.com/posts/running-expressjs-server-over-https/

		if (this.getOptionHttps()) {
			// https server
			const options = {
				key: fs.readFileSync(this.getOptionHttpsKey()),
				cert: fs.readFileSync(this.getOptionHttpsCert()),
			};
			const port = this.getOptionHttpsPort();
			this.serverHttps = this.createOneExpressServerAndListen(true, port, options);
		}

		if (this.getOptionHttp()) {
			// http server
			const options = {};
			const port = this.getOptionHttpPort();
			this.serverHttp = this.createOneExpressServerAndListen(false, port, options);
		}

	}



	createOneExpressServerAndListen(flagHttps, port, options) {
		// create an http or https server and listen
		var expressServer;

		var normalizedPort = jrhExpress.normalizePort(port);

		if (flagHttps) {
			expressServer = https.createServer(options, this.expressApp);
		} else {
			expressServer = http.createServer(options, this.expressApp);
		}

		// start listening
		var listener = expressServer.listen(normalizedPort);

		// add event handlers (after server is listening)
		expressServer.on("error", (...args) => { this.onErrorEs(listener, expressServer, flagHttps, ...args); });
		expressServer.on("listening", (...args) => { this.onListeningEs(listener, expressServer, flagHttps, ...args); });

		return expressServer;
	}

	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	getLoggedInPassportUserOfProvider(req, provider) {
		var passportUser = this.getLoggedInPassportUser(req);
		if (!passportUser) {
			return undefined;
		}
		if (provider === "localUser") {
			return passportUser.id;
		}
		if (provider === "localLogin") {
			return passportUser.loginId;
		}

		throw (new Error("Unknown provider requested in getLoggedInPassportUserOfProvider"));
	}

	getLoggedInPassportUser(req) {
		if (!req.session || !req.session.passport || !req.session.passport.user) {
			return undefined;
		}
		return req.session.passport.user;
	}

	async getLoggedInUser(req) {
		// first check if we've CACHED this info in the req
		if (req.arCachedUser !== undefined) {
			return req.arCachedUser;
		}
		// not cached
		var user;
		const userId = this.getLoggedInLocalUserIdFromSession(req);
		if (!userId) {
			user = null;
		} else {
			user = await this.UserModel.findOneById(userId);
		}
		// cache it
		req.arCachedUser = user;
		// return it
		return user;
	}

	async getLoggedInLogin(req) {
		// first check if we've CACHED this info in the req
		if (req.arCachedLogin !== undefined) {
			return req.arCachedLogin;
		}
		// not cached
		var login;
		const loginId = this.getLoggedInLocalLoginIdFromSession(req);
		if (!loginId) {
			login = null;
		} else {
			login = await this.LoginModel.findOneById(loginId);
		}
		// cache it
		req.arCachedLogin = login;
		// return it
		return login;
	}


	// just shortcuts to verifcationModel statics
	async getLastSessionedVerification(req) {
		// The idea here is that:
		// 1. A user may hit the registration page (for example), providing a plaintext verification code (to confirm their newly provided email address)
		// 2. At which point, rather than CONSUMING the verification code, we want to ask them for additional information before we create their account
		// 2b. [To see example of this option try registering an account but not providing a password -- you will be asked for one after you confirm your email]
		// 3. This creates a dilema, as we have tested the verification code and found it valid, but we need to EITHER remember it in session (makes most sense?)
		// 4. Or pass it along with the follow up form...

		// first check if we've CACHED this info in the req
		if (req.arCachedLastVerification !== undefined) {
			return req.arCachedLastVerification;
		}
		// not cached
		var verification;
		const verificationId = this.getLastSessionedVerificationId(req);
		if (!verificationId) {
			verification = null;
		} else {
			verification = await this.VerificationModel.findOneById(verificationId);
			if (verification) {
				// add back the plaintext unique code that we saved in session into the object
				// in this way, we make it possible to re-process this verification code, and find it in the database, as if user was providing it
				// ATTN:TODO - this seems wasteful; obviously if we have it in session we shouldnt need to "find" it again.
				verification.setUniqueCode(this.getLastSessionedVerificationCodePlaintext(req));
			}
		}
		// cache it
		req.arCachedLastVerification = verification;
		// return it
		return verification;
	}


	// helper function to get logged in local User model id
	getLoggedInLocalUserIdFromSession(req) {
		return this.getLoggedInPassportUserOfProvider(req, "localUser");
	}

	// helper function to get logged in local Login model id
	getLoggedInLocalLoginIdFromSession(req) {
		return this.getLoggedInPassportUserOfProvider(req, "localLogin");
	}

	// helper function to get last verification id
	// see VerificationModel code for where this is set
	getLastSessionedVerificationId(req) {
		return req.session.lastVerificationId;
	}

	getLastSessionedVerificationCodePlaintext(req) {
		return req.session.lastVerificationCodePlaintext;
	}

	forgetLastSessionVerification(req) {
		jrhExpress.forgetSessionVar(req, "lastVerificationId");
		jrhExpress.forgetSessionVar(req, "lastVerificationCodePlaintext");
		jrhExpress.forgetSessionVar(req, "lastVerificationDate");
	}
	//---------------------------------------------------------------------------







	//---------------------------------------------------------------------------
	// jwt token access for api access; credential passed in via access token
	// 3 ways to call depending on which data you want

	async asyncRoutePassportAuthenticateFromTokenNonSessionGetMinimalPassportUserData(req, res, next, jrResult) {
		// force passport authentication from request, looking for jwt token

		var [userMinimalProfile, dummyNullUser] = await this.asyncRoutePassportAuthenticateNonSessionGetUserTuple("jwt", "using jwt", req, res, next, jrResult, false);

		if (!jrResult.isError()) {
			// let's check token validity (expiration, etc.); this may push an error into jrResult
			// note that this does NOT check user.apiCode, that is done later
			// jrlog.debugObj(userMinimalProfile.token, "access token pre validate.");
			this.validateSecureTokenGeneric(userMinimalProfile.token, jrResult);
		} else {
			// change error code from generic to token specific or add?
			jrResult.pushErrorOnTop("Invalid access token");
			// jrResult.setError("Invalid access token");
		}

		// return fale or null
		return userMinimalProfile;
	}


	async asyncRoutePassportAuthenticateFromTokenNonSessionGetFullUserObject(req, res, next, jrResult) {
		var [userMinimalProfile, user] = this.asyncRoutePassportAuthenticateFromTokenNonSessionGetPassportProfileAndUser(req, res, next, jrResult);
		return user;
	}


	async asyncRoutePassportAuthenticateFromTokenNonSessionGetPassportProfileAndUser(req, res, next, jrResult) {
		// force passport authentication from request, looking for jwt token
		var userMinimalProfile = await this.asyncRoutePassportAuthenticateFromTokenNonSessionGetMinimalPassportUserData(req, res, next, jrResult);

		if (jrResult.isError()) {
			return [userMinimalProfile, null];
		}

		const user = await this.loadUserFromMinimalPassportUserData(userMinimalProfile, jrResult, true);
		return [userMinimalProfile, user];
	}
	//---------------------------------------------------------------------------





	//---------------------------------------------------------------------------
	async loadUserFromMinimalPassportUserData(userMinimalPassportProfile, jrResult, flagCheckAccessCode) {

		// load full user model given a minimal (passport) profile with just the id field
		if (!userMinimalPassportProfile) {
			jrResult.pushError("Invalid access token; error code 2.");
			return null;
		}

		const userId = userMinimalPassportProfile.id;
		if (!userId) {
			jrResult.pushError("Invalid access token; error code 3.");
			return null;
		}

		const user = await this.UserModel.findOneById(userId);
		if (!user) {
			jrResult.pushError("Invalid access token; error code 4 (user not found in database).");
		}

		if (flagCheckAccessCode) {
			if (!userMinimalPassportProfile.token) {
				jrResult.pushError("Invalid access token; error code 5b (missing accesstoken data).");
			}
			if (!user.verifyApiCode(userMinimalPassportProfile.token.apiCode)) {
				jrResult.pushError("Invalid access token; error code 5 (found user and access token is valid but apiCode revision has been revoked).");
			}
		}

		return user;
	}
	//---------------------------------------------------------------------------









	//---------------------------------------------------------------------------
	calcAbsoluteSiteUrlPreferHttps(relativePath) {
		// build an absolute url
		var protocol;
		var port;

		// get protocol and port (unless default port)
		if (this.getOptionHttps()) {
			// ok we are running an https server
			protocol = "https";
			port = this.getOptionHttpsPort();
			if (String(port) === "443") {
				port = "";
			}
		} else {
			protocol = "http";
			port = this.getOptionHttpPort();
			if (String(port) === "80") {
				port = "";
			}
		}

		// add full protocol
		var url = protocol + "://" + this.getOptionSiteDomain() + ":" + port;

		// add relative path
		if (relativePath !== "") {
			if (relativePath[0] !== "/") {
				url += "/";
			}
			url += relativePath;
		}

		return url;
	}
	//---------------------------------------------------------------------------





















































	//---------------------------------------------------------------------------
	// wrappers around passport.authenticate,
	//  which convert(wrap) the non-promise non-async function passport.authenticate into an sync function that uses a promise
	//  and do other stuff

	// this will end up calling a passport STRATEGY above
	// @param errorCallback is a function that takes (req,res,jrinfo) for custom error handling,
	//  where jrinfo is the JrResult style error message created from the passport error;
	//  normally you would use this to RE-RENDER a form from a post submission, overriding the
	//  default behavior to redirect to the login page with flash error message
	async asyncRoutePassportAuthenticate(provider, providerNiceLabel, req, res, next, jrResult, flagAutoRedirectSuccess, flagAutoRedirectError) {
		// "manual" authenticate via passport (as opposed to middleware auto); allows us to get richer info about error, and better decide what to do

		// create jrResult if not passed in; we return it
		if (!jrResult) {
			jrResult = JrResult.makeNew();
		}

		// but before we authenticate and log in the user lets see if they are already "logged in" using a Login object
		var previousLoginId = this.getLoggedInLocalLoginIdFromSession(req);
		const thisArserver = this;

		// run and wait for passport.authenticate async
		var userPassport = await jrhExpress.asyncPasswordAuthenticate({}, provider, providerNiceLabel, req, res, next, jrResult);

		// run and wait for passport.login async
		if (!jrResult.isError()) {
			await jrhExpress.asyncPasswordReqLogin(userPassport, "Error while authenticating user " + providerNiceLabel, req, jrResult);
		}


		if (!jrResult.isError()) {
			// success
			try {
				// userId we JUST signed in as -- NOTE: this could be null if its a local bridged login short of a full user account
				var newlyLoggedInUserId = thisArserver.getLoggedInLocalUserIdFromSession(req);
				// announce info
				if (newlyLoggedInUserId) {
					jrResult.pushSuccess("You have successfully logged in " + providerNiceLabel + ".");
				} else {
					jrResult.pushSuccess("You have successfully connected " + providerNiceLabel + ".");
				}

				// and NOW if they were previously sessioned with a pre-account Login object, we can connect that to this account
				if (newlyLoggedInUserId && previousLoginId) {
					// try to connect
					var jrResult2 = await this.LoginModel.connectUserToLogin(newlyLoggedInUserId, previousLoginId, false);
					if (jrResult2) {
						jrResult.mergeIn(jrResult2);
					}
				}

				// add message to session.
				jrResult.addToSession(req, true);

				if (flagAutoRedirectSuccess) {
					// do some redirections..

					// check if they were waiting to go to another page
					if (newlyLoggedInUserId && thisArserver.userLogsInCheckDiverted(req, res)) {
						return jrResult;
					}

					// new full account connected?
					if (newlyLoggedInUserId) {
						res.redirect("/profile");
						return jrResult;
					}
					// no user account made yet, default send them to full account fill int
					res.redirect("/register");
				}
			} catch (err) {
				// unexpected error
				jrResult.pushError(err.message);
			}
		}

		// errors? if so return or redirect
		if (jrResult.isError()) {
			if (flagAutoRedirectError) {
				// if caller wants us to handle error case of redirect we will
				// save error to session (flash) and redirect to login
				jrResult.addToSession(req);
				res.redirect("/login");
			}
		}

		return jrResult;
	}
	//---------------------------------------------------------------------------






	//---------------------------------------------------------------------------
	// wrappers around passport.authenticate,
	//  which convert(wrap) the non-promise non-async function passport.authenticate into an sync function that uses a promise
	//  and do other stuff

	// generic passport route login helper function, invoked from login routes
	// this will end up calling a passport STRATEGY

	async asyncRoutePassportAuthenticateNonSessionGetUserTuple(provider, providerNiceLabel, req, res, next, jrResult, flagLookupFullUser) {
		// "manual" authenticate via passport (as opposed to middleware auto); allows us to get richer info about error, and better decide what to do
		// return [userPassport, user] tuple

		// create jrResult if not passed in; we return it
		if (!jrResult) {
			jrResult = JrResult.makeNew();
		}

		const thisArserver = this;
		var user;

		// run and wait for passport.authenticate async
		var userPassport = await jrhExpress.asyncPasswordAuthenticate({ session: false }, provider, providerNiceLabel, req, res, next, jrResult);

		// error?
		if (jrResult.isError()) {
			return [null, null];
		}

		if (flagLookupFullUser) {
			try {
				// now get user
				user = await thisArserver.loadUserFromMinimalPassportUserData(userPassport, jrResult, false);
				if (!user) {
					jrResult.pushError("error authenticating " + providerNiceLabel + ": could not locate user in database.");
					return [null, null];
				}
			} catch (err) {
				// unexpected error
				jrResult.pushError(err.message);
				return [null, null];
			}
		}

		return [userPassport, user];
	}
	//---------------------------------------------------------------------------









	//---------------------------------------------------------------------------
	async asyncLoginUserToSessionThroughPassport(req, user) {
		var jrResult = JrResult.makeNew();

		var userPassport = user.getMinimalPassportProfile();

		try {
			// run login using async function wrapper
			await jrhExpress.asyncPasswordReqLogin(userPassport, "Authentication login error", req, jrResult);

			if (!jrResult.isError()) {
				// update login date and save it
				await user.updateloginDateAndSave(jrResult);
			}
		} catch (err) {
			// unexpected error
			jrResult.pushError(err.message);
		}

		return jrResult;
	}
	//---------------------------------------------------------------------------






















































	//---------------------------------------------------------------------------
	setupViewTemplateExtras() {
		// handlebar stuff

		// create general purpose handlebar helper functions we can call
		jrhHandlebars.setupJrHandlebarHelpers();

		// parse and make available partials from files
		jrhHandlebars.loadPartialFiles(this.getBaseSubDir("views/partials"), "");
	}

	getViewPath() {
		// return absolute path of view files
		// this is used by crud aid class so it knows how to check for existence of certain view files
		return this.getBaseSubDir("views");
	}

	getViewExt() {
		// return extension of view files with . prefix
		// this is used by crud aid class so it knows how to check for existence of certain view files
		return ".hbs";
	}
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	async setupMailer() {
		// setup the mailer system
		// see https://nodemailer.com/about/
		// see https://medium.com/@SeanChenU/send-mail-using-node-js-with-nodemailer-in-2-mins-c3f3e23f4a1
		this.mailTransport = nodemailer.createTransport({
			host: jrconfig.getVal("mailer:HOST"),
			port: jrconfig.getVal("mailer:PORT"),
			secure: jrconfig.getVal("mailer:SECURE"),
			auth: {
				user: jrconfig.getVal("mailer:USERNAME"),
				pass: jrconfig.getVal("mailer:PASSWORD"),
			},
		});

		jrdebug.cdebugf("Setting up mail transport through %s.", jrconfig.getVal("mailer:HOST"));

		// verify it?
		if (this.getOptionDebugEnabled()) {
			await this.mailTransport.verify();
		}
	}


	getMailTransport() {
		// return previously created transport
		return this.mailTransport;
	}


	async sendMail(mailobj) {
		// add from field
		if (!mailobj.from) {
			mailobj.from = jrconfig.getVal("mailer:FROM");
		}

		var result = await this.mailTransport.sendMail(mailobj);
		jrdebug.cdebugObj(result, "Result from sendMail.");
		var jrResult = this.makeJrResultFromSendmailRetv(result, mailobj);
		return jrResult;
	}


	makeJrResultFromSendmailRetv(retv, mailobj) {
		var msg;
		if (retv.rejected.length === 0) {
			// success!
			if (mailobj.revealEmail) {
				msg = "Mail sent to " + jrhMisc.stringArrayToNiceString(retv.accepted) + ".";
			} else {
				msg = "Mail sent.";
			}
			return JrResult.makeSuccess(msg);
		}
		// error
		if (mailobj.revealEmail) {
			msg = "Failed to send email to " + jrhMisc.stringArrayToNiceString(retv.rejected) + ".";
		} else {
			msg = "Failed to send email.";
		}
		return JrResult.makeError(msg);
	}
	//---------------------------------------------------------------------------









	//---------------------------------------------------------------------------
	cacheMiscOptions() {
		// cache some options for quicker access
		// note that we might have to call this whenever options change
		this.gravatarOptions = this.getOptionsGravatar();
	}
	//---------------------------------------------------------------------------








	//---------------------------------------------------------------------------
	// Event listener for HTTP server "error" event.
	onErrorEs(listener, expressServer, flagHttps, error) {
		// called not on 404 errors but other internal errors?
		var msg;

		if (error.syscall !== "listen") {
			throw error;
		}

		// ATTN: not clear why this uses different method than OnListeningEs to get port info, etc.
		var addr = listener.address();
		var bind;
		if (addr === null) {
			msg = "Could not bind server listener, got null return from listener.address paramater.  Is server already running (in debugger) ?";
			jrdebug.debug(msg);
			jrlog.error(msg);
			process.exit(1);
		} else if (typeof addr === "string") {
			bind = "pipe " + addr;
		} else if (addr.port) {
			bind = "port " + addr.port;
		} else {
			msg = "Could not bind server listener, the listener.address paramater was not understood: " + addr;
			jrdebug.debug(msg);
			jrlog.error(msg);
			process.exit(1);
		}

		// handle specific listen errors with friendly messages
		switch (error.code) {
			case "EACCES":
				jrlog.error(bind + " requires elevated privileges");
				process.exit(1);
				break;
			case "EADDRINUSE":
				jrlog.error(bind + " is already in use");
				process.exit(1);
				break;
			default:
				throw error;
		}
	}


	// Event listener for HTTP server "listening" event.
	onListeningEs(listener, expressServer, flagHttps) {
		var server = expressServer;
		var addr = server.address();
		var bind = (typeof addr === "string")
			? "pipe " + addr
			: "port " + addr.port;

		// show some info
		var serverTypestr = flagHttps ? "https" : "http";
		jrdebug.debug("Server (" + serverTypestr + ") started, listening on " + bind);
	}
	//---------------------------------------------------------------------------





	//---------------------------------------------------------------------------
	async runServer() {
		// run the server

		// setup express stuff
		this.setupExpress();

		// tell user if we are running in development mode
		if (this.isDevelopmentMode()) {
			jrdebug.debug("Running in development mode (verbose errors shown to web client).");
		}

		// view/template extra stuff
		this.setupViewTemplateExtras();

		// other helper stuff
		await this.setupMailer();

		// other model stuff
		await this.setupAcl();

		// rate limiter
		await this.setupRateLimiters();

		// cache any options for faster access
		this.cacheMiscOptions();

		// now make the express servers (http AND/OR https)
		this.createExpressServersAndListen();

		// now create a log entry about the server starting up
		await this.logStartup();

		// done setup
		return true;
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	async createAndConnectToDatabase() {
		// setup database stuff (create and connect to models -- callable whether db is already created or not)
		var bretv = false;

		const mongooseOptions = {
			useNewUrlParser: true,
			// see https://github.com/Automattic/mongoose/issues/8156
			useUnifiedTopology: true,
			useCreateIndex: true,
		};

		try {
			// connect to db
			const mongoUrl = this.getOptionDbUrl();
			jrdebug.cdebug("Connecting to mongoose-mongodb: " + mongoUrl);
			await mongoose.connect(mongoUrl, mongooseOptions);

			// now setup each of the model schemas
			const modelClassList = this.getmodelClassList();
			await jrhMisc.asyncAwaitForEachFunctionCall(modelClassList, async (modelClass) => {
				await this.setupModelSchema(mongoose, modelClass);
			});

			// set some options for mongoose/mongodb

			// to skip some deprecation warnigns; see https://github.com/Automattic/mongoose/issues/6880 and https://mongoosejs.com/docs/deprecations.html
			await mongoose.set("useFindAndModify", false);

			// deprecation warnings triggered by acl module
			mongoose.set("useCreateIndex", true);

			// success return value -- if we got this far it"s a success; drop down
			bretv = true;
		} catch (err) {
			jrdebug.debug("Exception while trying to setup database:");
			jrdebug.debug(err);
			bretv = false;
		}

		return bretv;
	}


	getmodelClassList() {
		// get array of all required model modules
		const modelClassList = [
			// core models
			jrequire("models/connection"),
			jrequire("models/option"),
			jrequire("models/user"),
			jrequire("models/verification"),
			jrequire("models/log"),
			jrequire("models/login"),
			jrequire("models/session"),

			// specific models
			jrequire("models/file"),
			jrequire("models/room"),
			jrequire("models/app"),
			jrequire("models/roomdata"),
		];

		return modelClassList;
	}


	async setupModelSchema(mongooser, modelClass) {
		// just ask the base model class to do the work
		await modelClass.setupModelSchema(mongooser);
	}


	closeDown() {
		// close down the server
		this.dbDisconnect();
	}

	dbDisconnect() {
		// disconnect from mongoose/mongodb
		jrdebug.debug("Closing mongoose-mongodb connection.");
		mongoose.disconnect();
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	async setupAcl() {
		await this.aclAid.setupAclPermissions();
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	async setupRateLimiters() {
		await this.rateLimiterAid.setupRateLimiters();
	}

	getRateLimiterBasic() {
		return this.rateLimiterAid.getRateLimiterBasic();
	}

	getRateLimiterApi() {
		return this.rateLimiterAid.getRateLimiterApi();
	}
	//---------------------------------------------------------------------------





	//---------------------------------------------------------------------------
	async logStartup() {
		// log the startup event
		var msg = util.format("Starting up on %s.", jrhMisc.getNiceNowString());
		if (this.isDevelopmentMode()) {
			msg += "  Development mode enabled.";
		}
		await this.logm("info.server", msg);
	}
	//---------------------------------------------------------------------------





















































	//---------------------------------------------------------------------------
	async logr(req, type, message, extraData) {
		// create log obj
		var ip = (req.ip && req.ip.length > 7 && req.ip.substr(0, 7) === "::ffff:") ? req.ip.substr(7) : req.ip;
		const mergeData = {
			userid: (req.user ? req.user.id : undefined),
			ip,
		};
		// hand off to more generic function
		await this.logm(type, message, extraData, mergeData);
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	async logm(type, message, extraData, mergeData) {
		// we now want to hand off the job of logging this item to any registered file and/or db loggers
		var flagLogToDb = true;
		var flagLogToFile = true;

		// save to db
		if (flagLogToDb) {
			const logModelClass = this.calcLoggingCategoryModelFromLogMessageType(type);
			await this.logmToDbModelClass(logModelClass, type, message, extraData, mergeData);
		}

		// save to file
		if (flagLogToFile) {
			var category = this.calcLoggingCategoryFromLogMessageType(type);
			jrlog.logMessage(category, type, message, extraData, mergeData);
		}
	}


	async logmToDbModelClass(logModelClass, type, message, extraData, mergeData) {
		try {
			await logModelClass.createLogDbModelInstanceFromLogDataAndSave(type, message, extraData, mergeData);
			// uncomment to test fallback error logging
			// throw Error("logmToDbModelClass exception test.");
		} catch (err) {
			// error while logging to db.
			// log EXCEPTION message (INCLUDES original) to file; note we may still try to log the original cleanly to file below
			jrdebug.debug("Logging fatal exception to error log file..");
			jrlog.logExceptionErrorWithMessage(DefLoggingCategoryError, err, type, message, extraData, mergeData);
			// rethrow exception
			throw err;
		}
	}
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	calcLoggingCategoryFromLogMessageType(type) {
		// we want to decide which logging category (file) to put this logg message in

		// 404s go in their own file
		if (type.startsWith("error.404")) {
			return DefLoggingCategoryError404;
		}

		if (type.startsWith("error")) {
			return DefLoggingCategoryError;
		}

		// fallback to default
		return DefLoggingCategory;
	}


	calcLoggingCategoryModelFromLogMessageType(type) {
		// decide which log model class (db table) to use for this log message

		// currently there is only the one
		return this.LogModel;
	}
	//---------------------------------------------------------------------------


























































































	//---------------------------------------------------------------------------
	async requireLoggedIn(req, res, goalRelUrl) {
		var user = await this.getLoggedInUser(req);
		return this.requireUserIsLoggedIn(req, res, user, goalRelUrl);
	}
	//---------------------------------------------------------------------------







	//---------------------------------------------------------------------------
	async requireLoggedInSitePermission(permission, req, res, goalRelUrl) {
		return await this.requireLoggedInPermission(permission, "site", null, req, res, goalRelUrl);
	}

	async requireLoggedInPermission(permission, permissionObjType, permissionObjId, req, res, goalRelUrl) {
		var user = await this.getLoggedInUser(req);
		// we just need to check if the user is non-empty
		if (!user) {
			// user is not logged in
			this.handleRequireLoginFailure(req, res, user, goalRelUrl, null, DefRequiredLoginMessage);
			return false;
		}

		// they are logged in, but do they have permission required
		const hasPermission = await user.hasPermission(permission, permissionObjType, permissionObjId);
		if (!hasPermission) {
			this.handleRequireLoginFailure(req, res, user, goalRelUrl, null, "You do not have sufficient permission to accesss that page.");
			return false;
		}

		// they are good, so forget any previously remembered login diversions
		this.forgetLoginDiversions(req);
		return true;
	}
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	requireUserIsLoggedIn(req, res, user, goalRelUrl, failureRelUrl) {
		// if user fails permission, remember the goalRelUrl in session and temporarily redirect to failureRelUrl and return false
		// otherwise return true

		if (!user) {
			this.handleRequireLoginFailure(req, res, user, goalRelUrl, failureRelUrl, DefRequiredLoginMessage);
			return false;
		}

		// they are good, so forget any previously remembered login diversions
		this.forgetLoginDiversions(req);
		return true;
	}



	handleRequireLoginFailure(req, res, user, goalRelUrl, failureRelUrl, errorMsg) {
		// set failureRelUrl default
		if (!failureRelUrl) {
			failureRelUrl = "/login";
		}

		// ok this is failure, save rediret goal url
		this.rememberDivertedRelUrlAndGo(req, res, goalRelUrl, failureRelUrl, errorMsg);
	}




	divertToLoginPageThenBackToCurrentUrl(req, res) {
		// redirect them to login page and then back to their currently requested page
		var failureRelUrl = "/login";
		var goalRelUrl = req.originalUrl;
		this.rememberDivertedRelUrlAndGo(req, res, goalRelUrl, failureRelUrl, DefRequiredLoginMessage);
	}


	rememberDivertedRelUrlAndGo(req, res, goalRelUrl, failureRelUrl, msg) {
		this.rememberDivertedRelUrl(req, res, goalRelUrl, msg);
		// now redirect
		if (failureRelUrl) {
			res.redirect(failureRelUrl);
		}
	}


	rememberDivertedRelUrl(req, res, goalRelUrl, msg) {
		// remember where they were trying to go when we diverted them, so we can go BACK there after they log in
		req.session.divertedUrl = goalRelUrl;
		if (msg) {
			JrResult.makeError(msg).addToSession(req);
		}
	}


	userLogsInCheckDiverted(req, res) {
		// check if user should be diverted to another page, for example after logging in
		// return true if we divert them, meaning the caller should not do any rendering of the page, etc.

		if (!req.session || !req.session.divertedUrl) {
			return false;
		}

		// ok we got one
		var divertedUrl = req.session.divertedUrl;
		// forget it
		this.forgetLoginDiversions(req);

		// now send them there!
		res.redirect(divertedUrl);
		return true;
	}


	forgetLoginDiversions(req) {
		// call this to unset any session diversions -- this can be useful if the user tried to access a protected page but then left the login page and did other things
		// remove it from session
		jrhExpress.forgetSessionVar(req, "divertedUrl");
	}
	//---------------------------------------------------------------------------








	//---------------------------------------------------------------------------
	// present user with new account create form they can submit to ACTUALLY create their new account
	// this would typically be called AFTER the user has verified their email with verification model
	presentNewAccountRegisterForm(userObj, verification, req, res) {
		// ATTN: is this ever called
		throw (new Error("presentNewAccountRegisterForm not implemented yet."));
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	sendLoggedInUsersElsewhere(req, res) {
		// if they are logged in with a real user account already, just redirect them to their profile and return true
		// otherwise return false;
		var userId = this.getLoggedInLocalUserIdFromSession(req);
		if (userId) {
			res.redirect("profile");
			return true;
		}
		return false;
	}
	//---------------------------------------------------------------------------






















	//---------------------------------------------------------------------------
	// csrf helpers -- so we dont have to install as ever-present middleware
	makeCsrf(req, res) {
		// in this case we pass next() function which just returns value passed to it
		if (req.csrfToken) {
			// already in req, just return it
			return req.csrfToken();
		}
		return this.csrfInstance(req, res, (err) => {
			if (err === undefined || err.code === "EBADCSRFTOKEN") {
				// no error, or csrf bad-token error, which we dont care about since we've just been asked to make one
				return req.csrfToken();
			}
			// pass the error back
			return err;
		});
	}

	testCsrfThrowError(req, res, next) {
		// let csrf throw the error to next, ONLY if there is an error, otherwise just return and dont call next
		return this.csrfInstance(req, res, (err) => {
			if (err) {
				next(err);
				return err;
			}
			return undefined;
		});
	}

	testCsrfNoThrow(req, res) {
		// just return any error don't call next
		return this.csrfInstance(req, res, (err) => err);
	}


	getCsrf() {
		return this.csrfInstance;
	}

	forgetCsrfToken(req) {
		jrhExpress.forgetSessionVar(req, "csrfSecret");
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	logoutForgetSessionData(req, flagClearAll) {
		// logout the user from passport
		req.logout();

		if (flagClearAll) {
			// forcefully forget EVERYTHING?
			req.session.destroy();
		} else {
			// ignore any previous login diversions
			this.forgetLoginDiversions(req);
			// forget remembered verification codes, etc.
			this.forgetLastSessionVerification(req);
			// csrf?
			this.forgetCsrfToken(req);
		}
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	// user avatars
	calcAvatarHtmlImgForUser(obj) {
		var rethtml;
		if (obj) {
			var avatarUrl = this.calcAvatarUrlForUser(obj);
			rethtml = `<img src="${avatarUrl}">`;
		} else {
			rethtml = "&nbsp;";
		}
		return rethtml;
	}

	calcAvatarUrlForUser(obj) {
		// ATTN: cache this somewhere to improve the speed of this function
		var id = obj.email;
		var url = gravatar.url(id, this.gravatarOptions);
		return url;
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	makeAlinkHtmlToAclModel(objType, objId) {
		// get nice linked html text for an object from acl object types
		var label = objType + " #" + objId;
		var modelClass;
		if (objType === "app") {
			modelClass = this.appModel;
		} else if (objType === "room") {
			modelClass = this.roomModel;
		} else if (objType === "user") {
			modelClass = this.userModel;
		} else if (objType === "file") {
			modelClass = this.fileModel;
		}

		if (modelClass !== undefined) {
			var alink = modelClass.getCrudUrlBase("view", objId);
			var htmlText = "<a href=" + alink + ">" + label + "</a>";
			return htmlText;
		}
		return label;
	}
	//---------------------------------------------------------------------------







	//---------------------------------------------------------------------------
	async isLoggedInUserSiteAdmin(req) {
		var loggedInUser = await this.getLoggedInUser(req);
		if (loggedInUser) {
			return await loggedInUser.isSiteAdmin();
		}
		return false;
	}
	//---------------------------------------------------------------------------



















	//---------------------------------------------------------------------------
	async aclRequireModelAccessRenderErrorPageOrRedirect(user, req, res, modelClass, accessTypeStr, modelId) {
		// called by generic crud functions
		// return FALSE if we are denying user access
		// and in that case WE should redirect them or render the output
		// return TRUE if we should let them continue

		if (!user) {
			user = await this.getLoggedInUser(req);
			if (!user) {
				// ok if we denied them access and they are not logged in, make them log in -- after that they may have permission
				this.divertToLoginPageThenBackToCurrentUrl(req, res);
				return false;
			}
		}

		// ok they are logged in, now check their permission

		// conversions from model info to acl info
		var permission = accessTypeStr;
		var permissionObjType = modelClass.getAclName();
		var permissionObjId = modelId;
		if (permissionObjId === undefined) {
			permissionObjId = null;
		}

		// check permission
		const hasPermission = await user.hasPermission(permission, permissionObjType, permissionObjId);

		if (!hasPermission) {
			// tell them they don't have access
			this.renderAclAccessError(req, res, modelClass, "You do not have permission to access this resource/page.");
			return false;
		}

		// granted access
		return true;
	}


	renderAclAccessError(req, res, modelClass, errorMessage) {
		var jrError = JrResult.makeError(errorMessage);
		// render
		res.render("acldeny", {
			jrResult: JrResult.getMergeSessionResultAndClear(req, res, jrError),
		});
	}

	renderAclAccessErrorResult(req, res, modelClass, jrResult) {
		// render
		res.render("acldeny", {
			jrResult: JrResult.getMergeSessionResultAndClear(req, res, jrResult),
		});
	}
	//---------------------------------------------------------------------------











	//---------------------------------------------------------------------------
	// internal debugging info for internals admin

	calcExpressRoutePathData() {
		return jrhExpress.calcExpressRoutePathData(this.getExpressApp());
	}


	calcWebServerInformation() {
		// return info about web server
		const serverInfo = {};

		// add http and https server info
		if (this.serverHttp) {
			serverInfo.http = this.serverHttp.address();
		}
		if (this.serverHttps) {
			serverInfo.https = this.serverHttps.address();
		}

		// middleware
		serverInfo.expressMiddleware = jrhExpress.calcExpressMiddleWare(this.getExpressApp());

		return serverInfo;
	}


	async calcDatabaseResourceUse() {
		// return info about database memory and file use, etc.
		var retv = await jrhMongo.calcDatabaseResourceUse();
		return retv;
	}


	async calcDatabaseStructure() {
		// return info about the database structure
		const dbStrcuture = await jrhMongo.calcDatabaseResourceUse();
		return dbStrcuture;
	}


	calcAclInfo() {
		const aclInfo = this.aclAid.calcAclInfo();
		return aclInfo;
	}




	calcNodeJsInfo() {

		// Getting commandline
		var comlinestr = process.execPath;
		process.argv.forEach((val, index, array) => {
			if (index !== 0) {
				comlinestr += " '" + val + "'";
			}
		});

		const nodeJsInfo = {
			version: process.version,
			platform: process.platform,
			nodeExecPath: process.execPath,
			upTime: process.upTime,
			commandline: comlinestr,
			memoryUsage: process.memoryUsage(),
			resourceUsage: process.resourceUsage ? process.resourceUsage() : "Not supported by this version of nodeJs",
		};

		return nodeJsInfo;
	}


	calcDependencyInfo() {
		const rawInfo = {
			jrequire: jrequire.calcDebugInfo(),
		};

		return rawInfo;
	}
	//---------------------------------------------------------------------------






























	//---------------------------------------------------------------------------
	createSecureToken(payload, expirationSeconds) {
		// add stuff to payload
		payload.iat = Math.floor(Date.now() / 1000);
		payload.iss = jrconfig.getVal("token:ISSUER");
		// expiration?
		if (expirationSeconds > 0) {
			payload.exp = Math.floor(Date.now() / 1000) + expirationSeconds;
		}
		// make it
		const serverJwtCryptoKey = jrconfig.getVal("token:CRYPTOKEY");
		const token = jsonwebtoken.sign(payload, serverJwtCryptoKey);
		const tokenObj = {
			token,
		};
		return tokenObj;
	}



	validateSecureTokenGeneric(tokenObj, jrResult) {
		// check expiration
		if (this.isSecureTokenExpired(tokenObj.exp)) {
			if (tokenObj.exp) {
				const expirationdatestr = new Date(tokenObj.exp * 1000).toLocaleString();
				jrResult.pushError("Invalid access token; error code 6: token expired on " + expirationdatestr + ".");
			} else {
				jrResult.pushError("Invalid access token; error code 7: token missing expiration date.");
			}
		}

		// check issuer or other things?
		if (!tokenObj.type) {
			// missing token type
			jrResult.pushError("Invalid access token; error code 8: token missing type tag.");
		}
	}


	isSecureTokenExpired(exp) {
		if (!exp) {
			// what to do in this case? no expiration date?
			// ATTN:TODO - for now we treat it as ok
			return true;
		}
		if (exp <= Math.floor(Date.now() / 1000)) {
			// it's expired
			return true;
		}
		// its not expired
		return false;
	}
	//---------------------------------------------------------------------------






	//---------------------------------------------------------------------------
	isDevelopmentMode() {
		return (this.getConfigVal("NODE_ENV") === "development");
		// return (this.expressApp.get("env") === "development");
	}
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	setupExpressErrorHandlers(expressApp) {
		// catch 404 and forward to error handler
		expressApp.use((req, res, next) => {
			// if we get here, nothing else has caught the request, so WE push on a 404 error for the next handler
			this.handle404Error(req);
			next(httpErrors(404));
		});


		// and then this is the fall through NEXT handler, which gets called when an error is unhandled by previous use() or pushed on with next(httperrors())
		// error handler
		expressApp.use((err, req, res, next) => {
			// decide whether to show full error info
			var errorDisplay;
			if (this.isDevelopmentMode() && err.status !== 404) {
				errorDisplay = this.isDevelopmentMode() ? err : {};
			}
			// render the error page
			res.status(err.status || 500);
			res.render("error", {
				message: err.message,
				error: errorDisplay,
				status: err.status,
				jrResult: JrResult.getMergeSessionResultAndClear(req, res),
			});
		});




		// set up some fatal exception catchers, so we can log these things


		// most of our exceptions trigger this because they happen in an await aync with no catch block..
		process.on("unhandledRejection", (reason, promise) => {

			if (true) {
				// just throw it to get app to crash exit
				throw reason;
			}

			// handle it specifically

			// is there a way for us to get the current request being processes
			fs.writeSync(
				process.stderr.fd,
				`unhandledRejection: ${reason}\n promist: ${promise}`,
			);
			const err = {
				message: "unhandledRejection",
				reason,
				// promise,
			};

			// report it
			this.handleFatalError(err);

			// now throw it to get app to crash exit
			throw reason;
		});


		process.on("uncaughtException", (err, origin) => {
			err.origin = origin;
			this.handleFatalError(err);

			// tell stderr console that we have logged the error, before we re-throw it to display it
			fs.writeSync(
				process.stderr.fd,
				`\n\n\n\nFATAL ERROR: Terminating and logging uncaught exception from ${origin}:\n\n`,
			);

			// throw it up, this will display it on console and crash out of node
			throw err;
		});



	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	handleFatalError(err) {
		// ATTN: test
		if (true) {
			// log the critical error to file and database
			const errString = jrhMisc.objToString(err, false);
			this.logm("errorCrit", errString);
		}
		process.exitCode = 1;
	}


	handle404Error(req) {
		// caller will pass this along to show 404 error to user; we can do extra stuff here
		if (true) {
			const msg = {
				url: req.url,
			};
			this.logr(req, DefLogMessageTypeError404, msg);
		} else if (true) {
			const msg = {
				url: req.url,
			};
			const extraData = {
				more: "some more",
				smore: "still some more",
			};
			//
			this.logr(req, DefLogMessageTypeError404, msg, extraData);
		} else {
			const msg = "req.url: " + req.url;
			this.logr(req, DefLogMessageTypeError404, msg);
		}
	}
	//---------------------------------------------------------------------------




}













//---------------------------------------------------------------------------
// export A SINGLETON INSTANCE of the class as the sole export
module.exports = new AppRoomServer();
//---------------------------------------------------------------------------
