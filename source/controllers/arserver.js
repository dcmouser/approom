/**
 * @module controllers/arserver
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 5/1/19 - 3/31/20
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
const favicon = require("serve-favicon");

// json web tokens
const jsonwebtoken = require("jsonwebtoken");

// passport authentication stuff
const passport = require("passport");
const passportLocal = require("passport-local");
const passportFacebook = require("passport-facebook");
const passportTwitter = require("passport-twitter");
const passportGoogle = require("passport-google-oauth20");
const passportJwt = require("passport-jwt");

// misc node core modules
const path = require("path");
const fs = require("fs");
const assert = require("assert");
const util = require("util");

// misc 3rd party modules
const gravatar = require("gravatar");

// profiler (only used when PROFILE option set)
let profiler; // = require("v8-profiler-next");

// requirement service locator
const jrequire = require("../helpers/jrequire");

// our helper modules
const jrhMisc = require("../helpers/jrh_misc");
const jrhMongo = require("../helpers/jrh_mongo");
const jrhExpress = require("../helpers/jrh_express");
const jrlog = require("../helpers/jrlog");
const jrdebug = require("../helpers/jrdebug");
const jrconfig = require("../helpers/jrconfig");
const JrContext = require("../helpers/jrcontext");
const JrResult = require("../helpers/jrresult");
const jrhHandlebars = require("../helpers/jrh_handlebars");
const jrhText = require("../helpers/jrh_text");
const jrhRateLimiter = require("../helpers/jrh_ratelimiter");


// constants
const appdef = jrequire("appdef");













/**
 * The main class representing the server system that sets up the web server and handles all requests.
 *
 * @class AppRoomServer
 */
class AppRoomServer {








	//---------------------------------------------------------------------------
	// constructor
	constructor() {
		// set flag
		this.didSetup = false;
		// csrf
		this.csrfInstance = undefined;
		this.gravatarOptions = undefined;
		//
		this.serverHttps = undefined;
		this.serverHttp = undefined;
		//
		this.needsShutdown = false;
		//
		this.models = {};
		//
		this.procesData = {};
		//
		this.appInfo = {};
	}
	//---------------------------------------------------------------------------








	//---------------------------------------------------------------------------
	// accessors, directory

	setAppInfo(val) {
		this.appInfo = val;
	}

	getAppinfo() {
		return this.appInfo;
	}

	getSourceDir() {
		return path.resolve(__dirname, "..");
	}

	getSourceSubDir(relpath) {
		return path.join(this.getSourceDir(), relpath);
	}

	getInstallDir() {
		return path.resolve(__dirname, "../..");
	}

	getInstallSubDir(relpath) {
		return path.join(this.getInstallDir(), relpath);
	}

	getLogDir() {
		// default is in the parent folder of source dir in /local/logs subdir
		const dir = this.getConfigValDefault(appdef.DefConfigKeyLoggingDirectory, "./local/logs");
		return jrhMisc.resolvePossiblyRelativeDirectory(dir, this.getInstallDir());
	}

	getNormalConfigDir() {
		// default is in the parent folder of source dir in /config subdir
		return this.getInstallSubDir("local/config");
	}

	getSourceConfigDir() {
		// default is in the parent folder of source dir in /config subdir
		return this.getSourceSubDir("config");
	}


	getVersionLib() {
		return appdef.DefLibVersion;
	}

	getVersionApi() {
		return appdef.DefApiVersion;
	}

	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	// accessors,  continued

	getNeedsShutdown() {
		return this.needsShutdown;
	}

	setNeedsShutdown(val) {
		this.needsShutdown = val;
	}

	getModels() {
		return this.models;
	}
	//---------------------------------------------------------------------------

	//---------------------------------------------------------------------------
	// getting options via jrconfig
	//

	getOptionHttp() { return this.getConfigVal(appdef.DefConfigKeyServerHttp); }

	getOptionHttpPort() { return this.getConfigVal(appdef.DefConfigKeyServerHttpPort); }

	getOptionHttps() { return this.getConfigVal(appdef.DefConfigKeyServerHttps); }

	getOptionHttpsKey() { return this.getConfigVal(appdef.DefConfigKeyServerHttpsKey); }

	getOptionHttpsCert() { return this.getConfigVal(appdef.DefConfigKeyServerHttpsCert); }

	getOptionHttpsPort() { return this.getConfigVal(appdef.DefConfigKeyServerHttpsPort); }

	getOptionSiteDomain() { return this.getConfigVal(appdef.DefConfigKeyServerSiteDomain); }

	getOptionDebugTagEnabledList() { return this.getConfigVal(appdef.DefConfigKeyDebugTags); }

	getOptionProfileEnabled() { return this.getConfigVal(appdef.DefConfigKeyProfile); }

	getOptionUseFullRegistrationForm() { return this.getConfigVal(appdef.DefConfigKeyAccountSignupFullRegForm); }

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
	getOptionsGravatar() { return this.getConfigVal(appdef.DefConfigKeyAccountGravatarOptions); }

	getEmergencyAlertContactsPrimary() { return this.getConfigVal(appdef.DefConfigKeyEmergencyAlertPrimaryEmails); }

	getEmergencyAlertContactsSecondary() { return this.getConfigVal(appdef.DefConfigKeyEmergencyAlertSecondaryEmails); }

	getLoggingAnnouncement() { return this.getConfigVal(appdef.DefConfigLoggingAnnouncement); }
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	getExpressApp() { return this.expressApp; }

	getJrConfig() { return jrconfig; }

	getConfigVal(...args) { return jrconfig.getVal(...args); }

	getConfigValDefault(arg, defaultVal) { return jrconfig.getValDefault(arg, defaultVal); }
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	getModelClassAclName(modelClassName) {
		return this.models[modelClassName].getAclName();
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	getServerIp() {
		return jrhMisc.getServerIpAddress();
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	getDebugKeyName() {
		// what to use for debug word, and log filename, profile output filename, etc.
		return appdef.DefDebugbKeyName;
	}

	getLogFileBaseName() {
		// for log files
		return this.getConfigVal(appdef.DefConfigKeyLogFileBaseName);
	}
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	calcFullDbUrl() {
		let url = this.getConfigVal(appdef.DefConfigKeyDbBaseUrl) + "/";

		// during testing the config might override this
		url += this.getConfigVal(appdef.DefConfigKeyDbName);

		return url;
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	getAboutInfo() {
		const appInfo = this.getAppinfo();
		const data = {
			appName: appInfo.programName,
			appVersion: appInfo.programVersion,
			appVersionDate: appInfo.programVersionDate,
			appAuthor: appInfo.programAuthor,
			appDescription: appInfo.programDescription,
			libName: appdef.DefLibName,
			libVersion: this.getVersionLib(),
			libVersionDate: appdef.DefLibVersionDate,
			libAuthor: appdef.DefLibAuthor,
			libDescription: appdef.DefLibDescription,
		};
		return data;
	}

	getMiscInfo() {
		const data = {
			database: this.calcFullDbUrl(),
			loggingPath: this.getLogDir() + "/" + this.getLogFileBaseName() + ".log",
			LoggingAnnouncement: this.getLoggingAnnouncement(),
			serverIp: this.getServerIp(),
			developmentMode: this.isDevelopmentMode(),
		};
		return data;
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	getBaseServerIpHttp() {
		return this.getBaseServerUrl("http", this.serverHttp);
	}

	getBaseServerIpHttps() {
		return this.getBaseServerUrl("https", this.serverHttps);
	}


	getBaseServerUrl(protocolStr, server) {
		if (server == null) {
			return null;
		}
		let serverIp = this.getServerIp();
		const addr = server.address();
		if (typeof addr === "string") {
			serverIp += ":" + addr;
		} else {
			serverIp += ":" + addr.port;
		}

		const url = protocolStr + "://" + serverIp;
		return url;
	}
	//---------------------------------------------------------------------------

















	//---------------------------------------------------------------------------
	setup() {
		if (this.didSetup) {
			// jrdebug.debug("Ignoring additional call to arserver.setup().");
			return;
		}

		// set flag
		this.didSetup = true;

		// do one-time setup
		this.setupPreConfig();
		this.processConfig();
		this.setupPostConfig();

		// Display some starting info
		this.announceStartingStuff();
	}



	setupPreConfig() {
		// perform global configuration actions that are shared and should be run regardless of the cli app or unit tests
		// this happens BEFORE processing config file, so no config info is known yet

		// save info about startup time
		this.procesData.started = Date.now();

		// load up requirements that avoid circular dependencies
		this.setupLateRequires();

		// setup debugger
		jrdebug.setup(this.getDebugKeyName());

		// show some info about app
		const appInfo = this.getAppinfo();
		jrdebug.debugf("%s v%s (%s) by %s", appInfo.programName, appInfo.programVersion, appInfo.programVersionDate, appInfo.programAuthor);
		jrdebug.debugf("%s v%s (%s) by %s", appdef.DefLibName, this.getVersionLib(), appdef.DefLibVersionDate, appdef.DefLibAuthor);

		// try to get server ip
		const serverIp = this.getServerIp();
		jrconfig.setServerFilenamePrefixFromServerIp(serverIp);

		// Set base directory to look for config files -- caller can modify this, and discover them
		jrconfig.setConfigDirs(this.getSourceConfigDir(), this.getNormalConfigDir());
	}


	processConfig() {
		// now parse commandline/config/env/ etc.
		jrconfig.parse();

		// set any values based on config

		// enable debugging based on DEBUG tags field
		jrdebug.setDebugTagEnabledList(this.getOptionDebugTagEnabledList());

		// discover addon plugins, must be done after processing config file
		this.discoverAndInitializeAddonPlugins();

		// discover addon appEngines
		this.discoverAndInitializeAddonAppEngines();
	}


	async setupPostConfig() {
		// setup done AFTER config is loaded

		// setup loggers -- can we wait until after config so that config can tell us log dir?
		if (true) {
			this.setupLoggers();
		}

		// view/template extra stuff
		this.setupViewTemplateExtras();

		// cache any options for faster access
		this.cacheMiscOptions();

		// misc global hooks
		this.setupGlobalNodeHooks();
	}


	announceStartingStuff() {
		jrdebug.debugf("%s.", this.getLoggingAnnouncement());
		jrdebug.debugf("Using database %s.", this.calcFullDbUrl());
		jrdebug.debugf("Logging to %s.", this.getLogFileBaseName() + ".log");
		jrdebug.debugf("Running on server: %s.", this.getServerIp());
		// tell user if we are running in development mode
		if (this.isDevelopmentMode()) {
			jrdebug.debug("Running in development mode (verbose errors shown).");
		}
		const debugTagString = jrdebug.getDebugTagEnabledListAsNiceString();
		if (debugTagString) {
			jrdebug.debug("Debug log tags: " + debugTagString);
		}
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	// just pass along to jrconfig
	// this should be called BEFORE arserver.setup()
	addEarlyConfigFileSet(filename) {
		jrconfig.addEarlyConfigFileSet(filename);
	}
	//---------------------------------------------------------------------------


























	//---------------------------------------------------------------------------
	registerModel(modelRequireClassName, modelClass) {
		this[modelRequireClassName] = modelClass;
		this.models[modelRequireClassName] = modelClass;
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	setupLateRequires() {
		// controllers
		this.crudAid = jrequire("crudaid");

		this.aclAid = jrequire("aclaid");
		this.sendAid = jrequire("sendaid");
		this.setupAid = jrequire("setupaid");

		// model requires
		this.registerModel("AppModel", jrequire("models/app"));
		this.registerModel("ConnectionModel", jrequire("models/connection"));
		this.registerModel("FileModel", jrequire("models/file"));
		this.registerModel("LogModel", jrequire("models/log"));
		this.registerModel("LoginModel", jrequire("models/login"));
		this.registerModel("RoleModel", jrequire("models/role"));
		this.registerModel("OptionModel", jrequire("models/option"));
		this.registerModel("RoleModel", jrequire("models/role"));
		this.registerModel("RoomModel", jrequire("models/room"));
		this.registerModel("RoomdataModel", jrequire("models/roomdata"));
		this.registerModel("SessionModel", jrequire("models/session"));
		this.registerModel("UserModel", jrequire("models/user"));
		this.registerModel("VerificationModel", jrequire("models/verification"));
		this.registerModel("SubscriptionModel", jrequire("models/subscription"));
		this.registerModel("ModQueueModel", jrequire("models/modqueue"));

		this.registerModel("ModQueueModel", jrequire("models/modqueue"));
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	setupLoggers() {
		// setup singleton loggers
		jrlog.setup(this.getLogFileBaseName(), this.getLogDir());

		// winston logger files
		jrlog.setupWinstonLogger(appdef.DefLogCategoryError, appdef.DefLogCategoryError);
		jrlog.setupWinstonLogger(appdef.DefLogCategoryError404, appdef.DefLogCategoryError404);
		jrlog.setupWinstonLogger(appdef.DefLogCategoryDebug, appdef.DefLogCategoryDebug);
		jrlog.setupWinstonLogger(appdef.DefLogCategory, appdef.DefLogCategory);
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	setupExpress() {
		// create this.express
		const expressApp = express();
		// save expressApp for easier referencing later
		this.expressApp = expressApp;

		// early injection of pointer to this server into request
		this.setupExpressEarlyInjections(expressApp);

		// favicon
		this.setupExpressFavIcon(expressApp);

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

		// now any plugins and addons get a chance to register with expressApp
		this.hookAddons(appdef.DefHookSetupExpressRoutes, expressApp);

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


	setupExpressFavIcon(expressApp) {
		// see https://github.com/expressjs/serve-favicon
		const staticAbsoluteDir = this.getSourceSubDir("static");
		const faviconObj = favicon(path.join(staticAbsoluteDir, "favicon.ico"));
		expressApp.use(faviconObj);
	}


	setupExpressViews(expressApp) {
		// view file engine setup
		expressApp.set("views", this.getSourceSubDir("views"));

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
		// ATTN: 4/8/20 - cookie stuff locks server listener so we dont exit cleanly??

		// cookie support
		expressApp.use(cookieParser());

		// session store
		// db session backend storage (we avoid file in case future cloud operation)
		// connect-mongo see https://www.npmjs.com/package/connect-mongo
		// ATTN: we could try to share the mongod connection instead of re-specifying it here; not clear what performance implications are
		const mongoStoreOptions = {
			url: this.calcFullDbUrl(),
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
		const asession = session({
			name: this.getConfigVal(appdef.DefConfigKeySessionIdName),
			secret: this.getConfigVal(appdef.DefConfigKeySessionSecret),
			resave: false,
			cookie: cookieOptions,
			saveUninitialized: false,
			store: sessionStore,
		});
		expressApp.use(asession);

		// ATTN: We need to remember this sessionStore so we can close it down on exit gracefully
		this.rememberedSessionStore = sessionStore;
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
		const staticAbsoluteDir = this.getSourceSubDir("static");
		const staticUrl = "/static";
		expressApp.use(staticUrl, express.static(staticAbsoluteDir));
		jrdebug.cdebugf("misc", "Serving static files from '%s' at '%s", staticAbsoluteDir, staticUrl);

		// setup bootstrap, jquery, etc.
		const jsurl = staticUrl + "/js";
		const cssurl = staticUrl + "/css";
		const nodemodulespath = path.join(__dirname, "..", "node_modules");
		this.setupExpressStaticRoute(expressApp, jsurl + "/bootstrap", path.join(nodemodulespath, "bootstrap", "dist", "js"));
		this.setupExpressStaticRoute(expressApp, cssurl + "/bootstrap", path.join(nodemodulespath, "bootstrap", "dist", "css"));
		this.setupExpressStaticRoute(expressApp, jsurl + "/jquery", path.join(nodemodulespath, "jquery", "dist"));
	}


	setupExpressStaticRoute(expressApp, urlPath, dirPath) {
		const route = express.static(dirPath);
		this.useExpressRoute(expressApp, urlPath, route, dirPath);
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
		this.setupRouteRelative(expressApp, "/", "index");

		// register/signup
		this.setupRouteRelative(expressApp, "/register", "register");

		// login
		this.setupRouteRelative(expressApp, "/login", "login");
		// logout
		this.setupRouteRelative(expressApp, "/logout", "logout");

		// verifications
		this.setupRouteRelative(expressApp, "/verify", "verify");

		// profile
		this.setupRouteRelative(expressApp, "/profile", "profile");

		// admin
		this.setupRouteRelative(expressApp, "/admin", "admin");
		// internals
		this.setupRouteRelative(expressApp, "/internals", "internals");
		// analytics
		this.setupRouteRelative(expressApp, "/analytics", "analytics");
		// testing
		this.setupRouteRelative(expressApp, "/test", "test");
		// help/about
		this.setupRouteRelative(expressApp, "/help", "help");

		// crud routes
		const crudUrlBase = "/crud";
		this.setupRouteGenericCrud(expressApp, crudUrlBase + "/user", this.UserModel);
		this.setupRouteGenericCrud(expressApp, crudUrlBase + "/login", this.LoginModel);
		this.setupRouteGenericCrud(expressApp, crudUrlBase + "/verification", this.VerificationModel);
		this.setupRouteGenericCrud(expressApp, crudUrlBase + "/connection", this.ConnectionModel);
		this.setupRouteGenericCrud(expressApp, crudUrlBase + "/role", this.RoleModel);
		this.setupRouteGenericCrud(expressApp, crudUrlBase + "/option", this.OptionModel);
		this.setupRouteGenericCrud(expressApp, crudUrlBase + "/log", this.LogModel);
		this.setupRouteGenericCrud(expressApp, crudUrlBase + "/session", this.SessionModel);
		this.setupRouteGenericCrud(expressApp, crudUrlBase + "/modqueue", this.ModQueueModel);
		this.setupRouteGenericCrud(expressApp, crudUrlBase + "/subscription", this.SubscriptionModel);
	}



	setupExpressRoutesSpecialized(expressApp) {
		// add routes to express app

		// app routes
		this.setupRouteRelative(expressApp, "/app", "app");
		// room routes
		this.setupRouteRelative(expressApp, "/room", "room");

		// api routes
		this.setupRouteRelative(expressApp, "/api", "api/api");
		this.setupRouteRelative(expressApp, "/api/app", "api/app");
		this.setupRouteRelative(expressApp, "/api/room", "api/room");
		this.setupRouteRelative(expressApp, "/api/roomdata", "api/roomdata");

		// test stuff
		this.setupRouteRelative(expressApp, "/membersonly", "membersonly");

		// crud routes
		const crudUrlBase = "/crud";
		this.setupRouteGenericCrud(expressApp, crudUrlBase + "/app", this.AppModel);
		this.setupRouteGenericCrud(expressApp, crudUrlBase + "/room", this.RoomModel);
		this.setupRouteGenericCrud(expressApp, crudUrlBase + "/file", this.FileModel);
		this.setupRouteGenericCrud(expressApp, crudUrlBase + "/roomdata", this.RoomdataModel);
	}
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	setupRouteRelative(expressApp, urlPath, routeFilename) {
		// require in the file in the routes directory so we can discover its functions
		const requireRouteFileName = "../routes/" + routeFilename;
		const route = require(requireRouteFileName);
		return this.setupRouteModule(expressApp, urlPath, route, requireRouteFileName);
	}


	setupRouteModule(expressApp, urlPath, route, routePath) {
		// ok there are two ways that our route files can be written
		// the first is by exporting a setupRouter function, in which case we call it with urlPath and it returns the router
		// the older method just exports default router
		//
		if (route.setupRouter) {
			const expressRouter = route.setupRouter(urlPath);
			assert(expressRouter);
			this.useExpressRoute(expressApp, urlPath, expressRouter, routePath);
		} else {
			this.useExpressRoute(expressApp, urlPath, route, routePath);
		}
	}


	setupRouteGenericCrud(expressApp, urlPath, modelClass) {
		// function to set up crud paths for a model
		// create router using express
		const router = express.Router();
		// setup paths on it
		this.crudAid.setupRouter(router, modelClass, urlPath);
		// register it
		this.useExpressRoute(expressApp, urlPath, router, "../controllers/crudaid");

		// let app model know about its crud path
		modelClass.setCrudBaseUrl(urlPath);
		// now return the router for further work
		return router;
	}


	useExpressRoute(expressApp, urlPath, route, dirPath) {
		// register it with the express App
		expressApp.use(urlPath, route);
		// attempt to inject some internal debug helping info -- this is displayed when doing site internals web server info (see jrh_express.js function calcExpressMiddleWare())
		route.appRoomDebugInfo = {
			urlPath,
			dirPath,
		};
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
			jrdebug.cdebugObj("misc", profile, "serializeUser profile");
			const userProfileObj = profile;
			// call passport callback
			done(null, userProfileObj);
		});

		// provide callback function to help passport deserialize a user
		passport.deserializeUser((profile, done) => {
			// we are now called with user being the minimum USER object we passed to passport earlier, which was saved in user's session data
			// should we now find this user in the database and return the full user model? if so we will be fetching user database model on every request.
			// the idea here is that our session data contains only the minimalist data returned by serializeUser()
			// and this function gives us a chance to fully load a full user object on each page load, which passport will stick into req.user
			// but we may not want to actually use this function to help passport load up a full user object from the db, because of the overhead and cost of doing
			// that when it's not needed.  So we are converting from the SESSION userdata to possibly FULLER userdata
			// however, remember that we might want to check that the user is STILL allowed into our site, etc.
			jrdebug.cdebugObj("misc", profile, "deserializeUser user");
			const userProfileObj = profile;
			// call passport callback
			done(null, userProfileObj);
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
		this.setupPassportStrategyTwitter();
		this.setupPassportStrategyGoogle();
		this.setupPassportJwt();
	}


	setupPassportStrategyLocal() {
		// local username and password strategy
		// see https://www.sitepoint.com/local-authentication-using-passport-node-js/
		const Strategy = passportLocal.Strategy;

		const strategyOptions = {
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

				// make jrContext with only req since we don't have access to the others
				const jrContext = JrContext.makeNew(req, null, null);
				jrdebug.cdebugf("misc", "In passport local strategy test with username=%s and password=%s", usernameEmail, password);

				const user = await this.UserModel.mFindUserByUsernameEmail(usernameEmail);
				if (!user) {
					// not found
					jrContext.pushFieldError("usernameEmail", "Username/Email-address not found");
					return done(null, false, jrContext.result);
				}
				// ok we found the user, now check their password
				const bretv = await user.testPlaintextPassword(password);
				if (!bretv) {
					// password doesn't match
					jrContext.pushFieldError("password", "Password does not match");
					return done(null, false, jrContext.result);
				}
				// password matches!
				// update last login time
				await user.updateLastLoginDate(jrContext, true);
				// set cached user so we don't have to reload them
				this.setCachedLoggedInUserManually(jrContext, user);
				// return the minimal user info needed
				// IMP NOTE: the profile object we return here is precisely what gets passed to the serializeUser function above
				const userProfile = user.getMinimalPassportProfile();
				// set virtual token of profile so observers can see HOW (and when) the user logged in
				userProfile.token = this.makeVirtualLoginToken("usernamePassword");
				// return it
				return done(null, userProfile, jrContext.result);
			},
		));
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	setupPassportJwt() {
		// here we actually register 2 nearly identical jwt token passport strategies
		// the first ("jwtHeader") is the real one used to access resources, by passing an access token in the auth header of a request
		// the second ("jwtManualQueryOrPostBody") is used when we want to parse a token passed as a field in a form, for processing (for example when user wants to ask us to create a new access token from a refresh token)
		//
		// ExtractJwt lets us set priority for multiple ways to get the jwt from URL or from post body or from ath header; earlier takes higher priority
		// see http://www.passportjs.org/packages/passport-jwt/#extracting-the-jwt-from-the-request
		//
		const ExtractJwt = passportJwt.ExtractJwt;
		// the auth header one is the one we check on almost all requests, so we want it to validate the token and throw a complaint at autho time if something it wrong with it (expired, etc.)
		this.setupPassportJwtNamedWithExtractors("jwtHeader", [ExtractJwt.fromAuthHeaderAsBearerToken()], (jrResult, tokenObj) => { return this.validateSecureTokenAccess(jrResult, tokenObj); });
		// the manual body one is what we use when we want to let the user give us a token that we ourselves will validate and process
		this.setupPassportJwtNamedWithExtractors("jwtManualQueryOrPostBody", [ExtractJwt.fromUrlQueryParameter("token"), ExtractJwt.fromBodyField("token")], null);
	}



	setupPassportJwtNamedWithExtractors(jwtStrategyName, extractorList, tokenValidationFunction) {
		// see http://www.passportjs.org/packages/passport-jwt/
		// for passport named strategies see: https://github.com/jaredhanson/passport/issues/412

		const Strategy = passportJwt.Strategy;
		const ExtractJwt = passportJwt.ExtractJwt;

		const strategyOptions = {
			secretOrKey: this.getConfigVal(appdef.DefConfigKeyTokenCryptoKey),
			jwtFromRequest: ExtractJwt.fromExtractors(extractorList),
			// we ignore expiration auto handling; we will check it ourselves
			ignoreExpiration: true,
		};

		// debug info
		jrdebug.cdebugObj("misc", strategyOptions, "setupPassportJwt strategyOptions");

		passport.use(jwtStrategyName, new Strategy(
			strategyOptions,
			async (payload, done) => {
				if (tokenValidationFunction) {
					// validate the token
					const jrResult = JrResult.makeNew();
					tokenValidationFunction(jrResult, payload);
					if (jrResult.isError()) {
						const errorstr = "Error with authorization token. " + jrResult.getErrorsAsString();
						return done(errorstr);
					}
				}
				// get the user payload from the token; we make a shallow copy for the userProfile we are going to return so that we don't get circular reference when we add token data
				const userProfile = jrhMisc.shallowCopy(payload.user);
				if (!userProfile) {
					const errorstr = "Error decoding user data from access token";
					return done(errorstr);
				}
				// BUT we'd really like to pass on some extra token info.. so we add full token to user profile object
				userProfile.token = payload;
				// Add some stuff to the auth token like date of the token use?
				this.decorateAuthLoginToken(userProfile.token);
				// return success
				return done(null, userProfile);
			},
		));
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	setupPassportStrategyFacebook() {
		// see http://www.passportjs.org/packages/passport-facebook/
		const Strategy = passportFacebook.Strategy;

		const strategyOptions = {
			clientID: this.getConfigVal(appdef.DefConfigKeyPassportFacebookAppId),
			clientSecret: this.getConfigVal(appdef.DefConfigKeyPassportFacebookAppSecret),
			callbackURL: this.calcAbsoluteSiteUrlPreferHttps("/login/facebook/auth"),
			passReqToCallback: true,
		};

		// debug info
		jrdebug.cdebugObj("misc", strategyOptions, "setupPassportStrategyFacebook options");

		passport.use(new Strategy(
			strategyOptions,
			async (req, token, tokenSecret, profile, done) => {
				jrdebug.cdebugObj("misc", token, "facebook token");
				jrdebug.cdebugObj("misc", tokenSecret, "facebook tokenSecret");
				jrdebug.cdebugObj("misc", profile, "facebook profile");
				// get user associated with this facebook profile, OR create one, etc.
				const bridgedLoginObj = {
					provider: profile.provider,
					providerUserId: profile.id,
					extraData: {
						realName: profile.displayName,
					},
				};
				// make or connect account to bridge
				return await this.lookupOrCreateBridgedLoginForPassport(req, bridgedLoginObj, done);
			},
		));
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	setupPassportStrategyTwitter() {
		// see http://www.passportjs.org/packages/passport-twitter/
		const Strategy = passportTwitter.Strategy;

		const strategyOptions = {
			consumerKey: this.getConfigVal(appdef.DefConfigKeyPassportTwitterConsumerKey),
			consumerSecret: this.getConfigVal(appdef.DefConfigKeyPassportTwitterConsumerSecret),
			callbackURL: this.calcAbsoluteSiteUrlPreferHttps("/login/twitter/auth"),
			passReqToCallback: true,
		};

		// debug info
		jrdebug.cdebugObj("misc", strategyOptions, "setupPassportStrategyTwitter options");

		passport.use(new Strategy(
			strategyOptions,
			async (req, token, tokenSecret, profile, done) => {
				jrdebug.cdebugObj("misc", token, "twitter token");
				jrdebug.cdebugObj("misc", tokenSecret, "twitter tokenSecret");
				jrdebug.cdebugObj("misc", profile, "twitter profile");
				// get user associated with this twitter profile, OR create one, etc.
				const bridgedLoginObj = {
					provider: profile.provider,
					providerUserId: profile.id,
					extraData: {
						realName: profile.displayName,
					},
				};
				// make or connect account to bridge
				return await this.lookupOrCreateBridgedLoginForPassport(req, bridgedLoginObj, done);
			},
		));
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	setupPassportStrategyGoogle() {
		// see http://www.passportjs.org/packages/passport-google-oauth20/
		const Strategy = passportGoogle.Strategy;

		const strategyOptions = {
			clientID: this.getConfigVal(appdef.DefConfigKeyPassportGoogleClientId),
			clientSecret: this.getConfigVal(appdef.DefConfigKeyPassportGoogleClientSecret),
			callbackURL: this.calcAbsoluteSiteUrlPreferHttps("/login/google/auth"),
			passReqToCallback: true,
		};

		// debug info
		jrdebug.cdebugObj("misc", strategyOptions, "setupPassportStrategyTwitter options");

		passport.use(new Strategy(
			strategyOptions,
			async (req, token, tokenSecret, profile, done) => {
				jrdebug.cdebugObj("misc", token, "google token");
				jrdebug.cdebugObj("misc", tokenSecret, "google tokenSecret");
				jrdebug.cdebugObj("misc", profile, "google profile");
				// get user associated with this profile, OR create one, etc.
				const bridgedLoginObj = {
					provider: profile.provider,
					providerUserId: profile.id,
					extraData: {
						realName: profile.displayName,
					},
				};
				// make or connect account to bridge
				return await this.lookupOrCreateBridgedLoginForPassport(req, bridgedLoginObj, done);
			},
		));
	}
	//---------------------------------------------------------------------------





	//---------------------------------------------------------------------------
	// bridge helper for facebook, twitter, etc.
	async lookupOrCreateBridgedLoginForPassport(req, bridgedLoginObj, done) {
		// ersatz jrContext
		const jrContext = JrContext.makeNew(req); // NOTE NOTE THE NORMAL JrContext.makeNew(req, res, next)
		// lookup bridged user if this already exists, or create user (or proxy user) for the bridge; if user could not be created, it's an error
		const user = await this.LoginModel.processBridgedLoginGetOrCreateUserOrProxy(jrContext, bridgedLoginObj);
		// add jrResult to session (error OR success), in case we did extra stuff and info to show the user
		if (!jrContext.isResultEmpty()) {
			jrContext.addToThisSession();
		}
		// otherwise log in the user -- either with a REAL user account, OR if user is a just a namless proxy for the bridged login, with that
		let userProfile;
		if (user) {
			userProfile = user.getMinimalPassportProfile();
			// ATTN: NOTE - that this may be a proxy user not yet saved to database..
			if (user.isRealObjectInDatabase()) {
				// add virtual token to passport userProfile?
				userProfile.token = this.makeVirtualLoginToken("bridged." + bridgedLoginObj.provider);
				// update login date and save it
				await user.updateLastLoginDate(jrContext, true);
				// set cached user so we don't have to reload them?
				this.setCachedLoggedInUserManually(jrContext, user);
			}
		} else {
			userProfile = null;
		}
		// return calling done of the passport strategy
		return done(null, userProfile);
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
		let expressServer;

		const normalizedPort = jrhExpress.normalizePort(port);

		if (flagHttps) {
			expressServer = https.createServer(options, this.expressApp);
		} else {
			expressServer = http.createServer(options, this.expressApp);
		}

		// start listening
		const listener = expressServer.listen(normalizedPort);

		// add event handlers (after server is listening)
		// expressServer.on("error", (...args) => { this.onErrorEs(listener, expressServer, flagHttps, ...args); });
		expressServer.on("error", async (...args) => { await this.onErrorEs(listener, expressServer, flagHttps, ...args); });
		expressServer.on("listening", (...args) => { this.onListeningEs(listener, expressServer, flagHttps, ...args); });

		return expressServer;
	}

	//---------------------------------------------------------------------------








































































	//---------------------------------------------------------------------------
	// the core minimal passport function that the below functions rely on ultimately
	getLoggedInPassportUsr(jrContext) {
		// this should not be called until we check for auth token log in
		return jrhExpress.getReqPassportUsr(jrContext);
	}

	getLoggedInPassportUsrToken(jrContext) {
		const passportUsr = this.getLoggedInPassportUsr(jrContext);
		if (passportUsr && passportUsr.token) {
			return passportUsr.token;
		}
		return undefined;
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	async lookupLoggedInUser(jrContext) {
		// get the userid in the session cookie, OR referenced by valid auth header JWT token
		// and use it to look up the logged in user -- and LOAD the user data AND cache it
		// ATTN: TODO: return errors on token error or user lookup error

		// first check if we've CACHED this info in the req
		let user = this.getCachedLoggedInUser(jrContext);
		if (user) {
			return user;
		}

		// not cached, fetch it

		// new, first grab any auth token user and log them into session
		// ATTN: NOTE this will actually overwrite any existing info found in session if auth token found
		await this.autoLoginUserViaAuthHeaderToken(jrContext);
		if (jrContext.isError()) {
			// error getting user from auth header, means NO user logged in
			user = null;
		} else {
			// get the userid from session cookie -- note that we don't yet know if this user has been banned or still exists, etc.
			const userId = this.getUntrustedLoggedInUserIdFromSession(jrContext);
			if (!userId) {
				user = null;
			} else {
				// now we get the real user
				user = await this.UserModel.mFindOneById(userId);

				if (!user) {
					// error looking up user
					jrContext.pushError("Failed to retrieve data for authenticated/logged-in user.");
				} else {
					// ATTN: TODO: this is where we could check if they were banned, deleted, etc.
					const passportUsr = this.getLoggedInPassportUsr(jrContext);
					if (!this.deepCheckUserValidity(jrContext, user, passportUsr)) {
						// failed deep checking validity, we need to clear user so they are not considered logged in
						user = null;
						// should we now explicitly log them OUT of the session?
						if (true) {
							jrContext.req.logout();
						}
					}
				}
			}
		}

		// update last access occasionally -- this is as good a place as any
		if (user) {
			// occasionally update (and save) user access date
			await user.updateLastAccessDateOccasionally(jrContext);
		}

		// cache it
		this.setCachedLoggedInUser(jrContext, user);

		// return it
		return user;
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	deepCheckUserValidity(jrContext, user, passportUsr) {
		// here we want to do some checks like whether the user is BANNED
		// return TRUE if they are ok to proceeed, or push error into jrContext and return false if not
		// NOTE: passportUsr may be blank, but if it is provided, we check if the passportUsr has anything in it that would contradict it authenticating the user, like the apiRevoke code
		// ATTN: TODO UNFINISED
		let retv = true;

		// check revoke code
		if (passportUsr && passportUsr.token && "apiRevoke" in passportUsr.token) {
			const tokenApiRevoke = passportUsr.token.apiRevoke;
			if (!user.verifyApiRevoke(tokenApiRevoke)) {
				jrContext.pushError("The authentication token has been revoked; a new one is needed.");
				retv = false;
			}
		}

		// let's check if they are disabled or banned?
		if (!user.getIsEnabled()) {
			jrContext.pushError("The user account has been " + user.getEnabledStateAsString() + ".");
			retv = false;
		}

		return retv;
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	getLoggedInPassportUsrField(jrContext, providerField) {
		const PassportUsr = this.getLoggedInPassportUsr(jrContext);
		if (!PassportUsr) {
			return undefined;
		}
		if (providerField === "localUserId") {
			return PassportUsr.userId;
		}
		if (providerField === "localLoginId") {
			return PassportUsr.loginId;
		}

		throw (new Error("Unknown providerField (" + providerField + ") requested in getLoggedInPassportUsrField"));
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	async getSessionedBridgedLogin(jrContext) {
		// first check if we've CACHED this info in the req
		let login = this.getCachedBridgeLogin(jrContext);
		if (login !== undefined) {
			return login;
		}
		// not cached
		const loginId = this.getSessionedBridgedLoginId(jrContext);
		if (!loginId) {
			login = null;
		} else {
			login = await this.LoginModel.mFindOneById(loginId);
		}
		// cache it
		this.setCachedBridgeLogin(jrContext, login);
		// return it
		return login;
	}


	// helper function to get logged in local Login model id
	getSessionedBridgedLoginId(jrContext) {
		return this.getLoggedInPassportUsrField(jrContext, "localLoginId");
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	// just shortcuts to verifcationModel statics
	async getLastSessionedVerification(jrContext) {
		// The idea here is that:
		// 1. A user may hit the registration page (for example), providing a plaintext verification code (to confirm their newly provided email address)
		// 2. At which point, rather than CONSUMING the verification code, we want to ask them for additional information before we create their account
		// 2b. [To see example of this option try registering an account but not providing a password -- you will be asked for one after you confirm your email]
		// 3. This creates a dilema, as we have tested the verification code and found it valid, but we need to EITHER remember it in session (makes most sense?)
		// 4. Or pass it along with the follow up form...

		// first check if we've CACHED this info in the req
		let verification = this.getCachedVerification(jrContext);
		if (verification !== undefined) {
			return verification;
		}

		// not cached
		const verificationId = this.getLastSessionedVerificationId(jrContext);
		if (!verificationId) {
			verification = null;
		} else {
			verification = await this.VerificationModel.mFindOneById(verificationId);
			if (verification) {
				// add back the plaintext unique code that we saved in session into the object
				// in this way, we make it possible to re-process this verification code, and find it in the database, as if user was providing it
				// ATTN: TODO: this seems wasteful; obviously if we have it in session we shouldnt need to "find" it again; if we trust it can we just save the id#
				verification.setUniqueCode(this.getLastSessionedVerificationCodePlaintext(jrContext));
			}
		}

		// cache it
		this.setCachedVerification(jrContext, verification);

		// return it
		return verification;
	}
	//---------------------------------------------------------------------------












	//---------------------------------------------------------------------------
	// helper function to get last verification id
	// see VerificationModel code for where this is set
	// see VerificationModel code for where this is set
	getCachedVerification(jrContext) {
		return jrContext.arCachedLastVerification;
	}

	setCachedVerification(jrContext, verification) {
		jrContext.arCachedLastVerification = verification;
	}

	clearCachedVerification(jrContext) {
		delete jrContext.arCachedLastVerification;
	}


	getCachedBridgeLogin(jrContext) {
		return jrContext.arCachedLogin;
	}

	setCachedBridgeLogin(jrContext, bridgedLogin) {
		jrContext.arCachedLogin = bridgedLogin;
	}

	clearCachedBridgeLogin(jrContext) {
		delete jrContext.arCachedLogin;
	}


	setCachedLoggedInUser(jrContext, user) {
		// note that user COULD be null/undefined
		// cache it for subsequent call
		jrContext.arCachedUser = user;
	}

	setCachedLoggedInUserManually(jrContext, user) {
		// this is called by login helpers so we can avoid re-looking up users
		// ATTN: but we need to be careful that we check them for banning, etc.
		if (user && user.isRealObjectInDatabase()) {
			this.setCachedLoggedInUser(jrContext, user);
		} else {
			if (true) {
			// ATTN: TODO: should we clear any saved logged in user?
				this.clearCachedLoggedInUser();
			}
		}
	}

	getCachedLoggedInUser(jrContext) {
		return jrContext.arCachedUser;
	}

	clearCachedLoggedInUser(jrContext) {
		delete jrContext.arCachedUser;
	}


	getCachedFlagAuthHeaderChecked(jrContext) {
		return jrContext.arCachedFlagAuthHeaderChecked;
	}

	setCachedFlagAuthHeaderChecked(jrContext, val) {
		jrContext.arCachedFlagAuthHeaderChecked = val;
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	setLastSessionedVerificationId(jrContext, verifcationId) {
		jrContext.req.session.arLastVerificationId = verifcationId;
	}

	getLastSessionedVerificationId(jrContext) {
		return jrContext.req.session.arLastVerificationId;
	}

	clearLastSessionedVerificationId(jrContext) {
		delete jrContext.req.session.arLastVerificationId;
	}


	setLastSessionedVerificationCodePlaintext(jrContext, verificationCodePlaintext) {
		jrContext.req.session.arLastVerificationCodePlaintext = verificationCodePlaintext;
	}

	getLastSessionedVerificationCodePlaintext(jrContext) {
		return jrContext.req.session.arLastVerificationCodePlaintext;
	}

	clearLastSessionedVerificationCodePlaintext(jrContext) {
		delete jrContext.req.session.arLastVerificationCodePlaintext;
	}


	setLastSessionedVerificationDate(jrContext, verificationDate) {
		jrContext.req.session.arLastVerificationDate = verificationDate;
	}

	getLastSessionedVerificationDate(jrContext) {
		return jrContext.req.session.arLastVerificationDate;
	}

	clearLastSessionedVerificationDate(jrContext) {
		delete jrContext.req.session.arLastVerificationDate;
	}

	clearLastSessionVerificationAll(jrContext) {
		this.clearLastSessionedVerificationId(jrContext);
		this.clearLastSessionedVerificationCodePlaintext(jrContext);
		this.clearLastSessionedVerificationDate(jrContext);
		/*
		jrhExpress.forgetSessionVar(jrContext, "lastVerificationId");
		jrhExpress.forgetSessionVar(jrContext, "lastVerificationCodePlaintext");
		jrhExpress.forgetSessionVar(jrContext, "lastVerificationDate");
		*/
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	setLastSessionedDivertedUrl(jrContext, divertedUrl) {
		jrContext.req.session.arLastDivertedUrl = divertedUrl;
	}

	getLastSessionedDivertedUrl(jrContext) {
		return jrContext.req.session.arLastDivertedUrl;
	}

	clearLastSessionedDivertedUrl(jrContext) {
		delete jrContext.req.session.arLastDivertedUrl;
	}

	setLastSessionedCsrfSecret(jrContext, csrfSecret) {
		jrContext.req.session.arLastCsrfSecret = csrfSecret;
	}

	getLastSessionedCsrfSecret(jrContext) {
		return jrContext.req.session.arLastCsrfSecret;
	}

	clearLastSessionedCsrfSecret(jrContext) {
		delete jrContext.req.session.arLastCsrfSecret;
		// in this case, force save of session right away, so that if app crashes, it's still consumed
		jrContext.req.session.save();
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	clearSessionDataForUserOnLogout(jrContext, flagClearAll) {
		// logout the user from passport
		jrContext.req.logout();

		if (flagClearAll) {
			// forcefully forget EVERYTHING?
			jrContext.req.session.destroy();
		} else {
			// ignore any previous login diversions
			this.clearLastSessionedDivertedUrl(jrContext);
			// forget remembered verification codes, etc.
			this.clearLastSessionVerificationAll(jrContext);
			// csrf?
			this.clearLastSessionedCsrfSecret(jrContext);
		}
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	// ATTN: For another session variable we use see JrResult.setSessionedJrResult
	//---------------------------------------------------------------------------














	//---------------------------------------------------------------------------
	// helper function to get logged in local User model id
	// ATTN: this function is called quite a bit from different places, and I'm not sure that is smart.. It's not a trustworthy value since it just session saved user id.. we haven't yet fetched the user to make sure its still good (not banned, etc.)
	getUntrustedLoggedInUserIdFromSession(jrContext) {
		return this.getLoggedInPassportUsrField(jrContext, "localUserId");
	}


	clearSessionedUser(jrContext) {
		if (jrContext.req) {
			delete jrContext.req.user;
			if (jrContext.req.session && jrContext.req.session.passport) {
				delete jrContext.req.session.passport.user;
			}
		}
		// caches
		this.clearCachedVerification(jrContext);
		this.clearCachedBridgeLogin(jrContext);
		this.clearCachedLoggedInUser(jrContext);
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	isSessionLoggedIn(jrContext) {
		// just return true if they are logged in user
		// NOTE: this will not be true for a user who has provided an AUTH token with non session login
		if (this.getLoggedInPassportUsr(jrContext)) {
			return true;
		}
		return false;
	}
	//---------------------------------------------------------------------------

















































	//---------------------------------------------------------------------------
	async loadUserFromMinimalPassportUsrData(jrContext, userMinimalPassportProfile, flagCheckAccessCode) {

		// load full user model given a minimal (passport) profile with just the id field
		if (!userMinimalPassportProfile) {
			jrContext.pushError("Invalid login; error code 2.");
			return null;
		}

		const userId = userMinimalPassportProfile.userId;
		if (!userId) {
			jrContext.pushError("Invalid login; error code 3.");
			return null;
		}

		const user = await this.UserModel.mFindOneById(userId);
		if (!user) {
			jrContext.pushError("Invalid login; error code 4 (user not found in database).");
		}

		if (flagCheckAccessCode) {
			if (!userMinimalPassportProfile.token) {
				jrContext.pushError("Invalid login; error code 5b (missing accesstoken data).");
			}
			if (!user.verifyApiRevoke(userMinimalPassportProfile.token.apiRevoke)) {
				jrContext.pushError("Invalid login; error code 5 (found user and access token is valid but token has been revoked).");
				// ATTN: TODO - SECURITY - should we clear user variable so it's not used by mistake by some caller function that doesnt check for error? or leave it so caller can refer to user
			}
		}

		return user;
	}
	//---------------------------------------------------------------------------









	//---------------------------------------------------------------------------
	calcAbsoluteSiteUrlPreferHttps(relativePath) {
		// build an absolute url
		let protocol;
		let port;

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
		let url = protocol + "://" + this.getOptionSiteDomain() + ":" + port;

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
	async asyncRoutePassportAuthenticate(jrContext, provider, providerNiceLabel, flagRememberUserInSessionCookie, flagAutoRedirectSuccess, flagAutoRedirectError, flagAddResultMessageToSession) {
		// "manual" authenticate via passport (as opposed to middleware auto); allows us to get richer info about error, and better decide what to do

		// ATTN: note that res may be null; if so make sure flagAutoRedirectSuccess and flagAutoRedirectError are false
		assert(jrContext.res || (!flagAutoRedirectSuccess && !flagAutoRedirectError));

		// but before we authenticate and log in the user lets see if they are already "logged in" using a Login object
		const previousLoginId = this.getSessionedBridgedLoginId(jrContext);
		const thisArserver = this;

		// options
		const authOptions = {};
		const loginOptions = {};
		if (!flagRememberUserInSessionCookie) {
			authOptions.session = false;
			loginOptions.session = false;
		}

		//
		let successMessage;

		// run and wait for passport.authenticate async
		const userPassport = await jrhExpress.asyncPassportAuthenticate(jrContext, authOptions, provider, providerNiceLabel);

		// now actually log them in to the req.user etc.
		if (!jrContext.isError()) {
			await jrhExpress.asyncPassportReqLogin(jrContext, loginOptions, userPassport, "Error while authenticating user " + providerNiceLabel);
		}

		if (!jrContext.isError()) {
			// success
			try {
				// userId we JUST signed in as -- NOTE: this could be null if its a local bridged login short of a full user account
				const newlyLoggedInUserId = thisArserver.getUntrustedLoggedInUserIdFromSession(jrContext);

				// announce success
				if (flagRememberUserInSessionCookie) {
					if (newlyLoggedInUserId) {
						successMessage = "You have successfully logged in " + providerNiceLabel + ".";
					} else {
						successMessage = "You have successfully connected " + providerNiceLabel + ".";
					}
				} else {
					// some other message if we don't want to remember them but they have logged in for THIS REQUEST ONLY
					successMessage = "You have successfully authenticated " + providerNiceLabel + ".";
				}

				// and NOW if they were previously sessioned with a pre-account Login object, we can connect that to this account
				if (newlyLoggedInUserId && previousLoginId) {
					// try to connect
					await this.LoginModel.connectUserToLogin(jrContext, newlyLoggedInUserId, previousLoginId, false);
				}

				// success
				if (successMessage) {
					jrContext.pushSuccess(successMessage);
				}

				// add message to session?
				if (flagAddResultMessageToSession) {
					jrContext.addToThisSession(true);
				}

				if (!jrContext.isError()) {
					if (flagAutoRedirectSuccess) {
						// do some redirections..

						// check if they were waiting to go to another page
						if (newlyLoggedInUserId && thisArserver.userLogsInCheckDiverted(jrContext)) {
							return;
						}

						// new full account connected?
						if (newlyLoggedInUserId) {
							jrContext.res.redirect("/profile");
							return;
						}
						// no user account made yet, default send them to full account fill int
						jrContext.res.redirect("/register");
					}
				}
			} catch (err) {
				// unexpected error
				jrContext.pushError(err.message);
			}
		}

		// errors? if so return or redirect
		if (jrContext.isError()) {
			if (flagAutoRedirectError) {
				// if caller wants us to handle error case of redirect we will
				// save error to session (flash) and redirect to login
				jrContext.addToThisSession();
				jrContext.res.redirect("/login");
			}
		}

	}
	//---------------------------------------------------------------------------
















	//---------------------------------------------------------------------------
	// jwt token access for api access; credential passed in via access token
	// 3 ways to call depending on which data you want
	// see also setupPassportJwt() where the jwt stuff is set up
	// NOTE that these nonSession functions do NOT log in the user or set req.user -- they are ways to test the authentication WITHOUT doing so

	async asyncInternalUntrustedPassportManualNonSessionAuthenticateFromTokenInRequestGetMinimalPassportUsrData(jrContext, next, requiredTokenType) {
		// force passport authentication from request, looking for jwt token

		// generic call to passport, with jwt type
		// note we ask the function to not lookup full user since we dont need it (last false parameter)
		const passportUsrData = await this.asyncInternalUntrustedPassportManualNonSessionAuthenticateGetMinimalPassportUsrData(jrContext, "jwtManualQueryOrPostBody", "using jwt", next);
		if (!jrContext.isError()) {
			// let's check token validity (expiration, etc.); this may push an error into jrResult
			// ATTN: TODO: SECURITY - This does NOT check user.apiRevoke, which can be used to revoke api keys
			// BUT this should be done after we load the users full profile, which the CALLER of our function does
			// I believe this function is never called EXCEPT inside that one, so it will always be performed
			// jrlog.debugObj(passportUsrData.token, "access token pre validate.");
			this.validateSecureToken(jrContext.result, passportUsrData.token, requiredTokenType);
		} else {
			// change error code from generic to token specific or add?
			jrContext.pushErrorOnTop("Invalid access token");
			jrContext.setExtraData("tokenError", true);
		}

		// return fale or null
		return passportUsrData;
	}



	async asyncPassportManualNonSessionAuthenticateFromTokenInRequestGetPassportProfileAndUser(jrContext, next, requiredTokenType) {
		// force passport authentication from request, looking for jwt token
		const passportUsr = await this.asyncInternalUntrustedPassportManualNonSessionAuthenticateFromTokenInRequestGetMinimalPassportUsrData(jrContext, next, requiredTokenType);

		if (jrContext.isError()) {
			return [passportUsr, null];
		}

		// load full profile from minimal -- this should check apiRevoke because of the final true parameter for flagCheckAccessCode
		// in this way we will record an error if the token has been revoked (apiRevoke does not match)
		let user = await this.loadUserFromMinimalPassportUsrData(jrContext, passportUsr, true);

		// deep check user validity (ban, disabled, etc.)
		const bretv = this.deepCheckUserValidity(jrContext, user, passportUsr);
		if (!bretv) {
			user = null;
		}

		// return it
		return [passportUsr, user];
	}
	//---------------------------------------------------------------------------





	//---------------------------------------------------------------------------
	// wrappers around passport.authenticate,
	//  which convert(wrap) the non-promise non-async function passport.authenticate into an sync function that uses a promise
	//  and do other stuff

	// generic passport route login helper function, invoked from login routes
	// this will end up calling a passport STRATEGY

	async asyncInternalUntrustedPassportManualNonSessionAuthenticateGetMinimalPassportUsrData(jrContext, provider, providerNiceLabel) {
		// "manual" authenticate via passport (as opposed to middleware auto); allows us to get richer info about error, and better decide what to do
		// return passportUsr

		// run and wait for passport.authenticate async
		const passportUsr = await jrhExpress.asyncPassportAuthenticate(jrContext, { session: false }, provider, providerNiceLabel);

		// error?
		if (jrContext.isError()) {
			jrdebug.cdebug("misc", "In asyncInternalUntrustedPassportManualNonSessionAuthenticateGetMinimalPassportUsrData 2 error from passportUsr :" + jrContext.getErrorsAsString());
			return null;
		}

		// return it
		return passportUsr;
	}



	async asyncPassportManualNonSessionAuthenticateGetUser(jrContext, provider, providerNiceLabel) {
		// "manual" authenticate via passport (as opposed to middleware auto); allows us to get richer info about error, and better decide what to do
		// return user

		// get minimal userPassport data
		const passportUsr = await this.asyncInternalUntrustedPassportManualNonSessionAuthenticateGetMinimalPassportUsrData(jrContext, provider, providerNiceLabel);
		if (!passportUsr) {
			// error will have already been set
			return null;
		}

		let user;
		try {
			// now get user
			user = await this.loadUserFromMinimalPassportUsrData(jrContext, passportUsr, false);
			if (!user) {
				jrContext.pushError("Error authenticating " + providerNiceLabel + ": could not locate user in database.");
				return null;
			}
			// deep check user validity (ban, disabled, etc.)
			const bretv = this.deepCheckUserValidity(jrContext, user, passportUsr);
			if (!bretv) {
				return null;
			}
		} catch (err) {
			// unexpected error
			jrContext.pushError(err.message);
			return null;
		}

		// return it
		return user;
	}
	//---------------------------------------------------------------------------

























	//---------------------------------------------------------------------------
	async asyncManuallyLoginUserToSessionThroughPassport(jrContext, user, loginMethod) {
		// ATTN: this may be called via onetime email login, etc
		const userProfile = user.getMinimalPassportProfile();
		// set virtual token of profile so observers can see HOW (and when) the user logged in
		userProfile.token = this.makeVirtualLoginToken(loginMethod);

		// can be used to disable session saving, etc.
		const loginOptions = {};

		try {
			// run login using async function wrapper
			await jrhExpress.asyncPassportReqLogin(jrContext, loginOptions, userProfile, "Authentication login error");

			if (!jrContext.isError()) {
				// update login date and save it
				await user.updateLastLoginDate(jrContext, true);
				// set cached user so we don't have to reload them
				this.setCachedLoggedInUserManually(jrContext, user);
			}

		} catch (err) {
			// unexpected error
			jrContext.pushError(err.message);
		}
	}
	//---------------------------------------------------------------------------






















































	//---------------------------------------------------------------------------
	setupViewTemplateExtras() {
		// handlebar stuff

		// create general purpose handlebar helper functions we can call
		jrhHandlebars.setupJrHandlebarHelpers();

		// parse and make available partials from files
		jrhHandlebars.loadPartialFiles(this.getSourceSubDir("views/partials"), "");
	}

	getViewPath() {
		// return absolute path of view files
		// this is used by crud aid class so it knows how to check for existence of certain view files
		return this.getSourceSubDir("views");
	}

	getViewExt() {
		// return extension of view files with . prefix
		// this is used by crud aid class so it knows how to check for existence of certain view files
		return ".hbs";
	}
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	async sendMail(jrContext, mailobj) {
		// just pass on request to sendAid module
		this.sendAid.sendMail(jrContext, mailobj);
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
	async onErrorEs(listener, expressServer, flagHttps, error) {
		// called not on 404 errors but other internal errors?
		let msg;

		if (error.syscall !== "listen") {
			throw error;
		}

		// dummy jrContext since we don't know any other way to get req/res
		const jrContext = JrContext.makeNew();

		// ATTN: not clear why this uses different method than OnListeningEs to get port info, etc.
		const addr = listener.address();
		let bind;
		if (addr === null) {
			msg = "Could not bind server listener, got null return from listener.address paramater.  Is server already running (in debugger) ?";
			jrdebug.debug(msg);
			await this.logr(jrContext, appdef.DefLogTypeErrorServer, msg);
			process.exit(1);
		} else if (typeof addr === "string") {
			bind = "pipe " + addr;
		} else if (addr.port) {
			bind = "port " + addr.port;
		} else {
			msg = "Could not bind server listener, the listener.address paramater was not understood: " + addr;
			jrdebug.debug(msg);
			await this.logr(jrContext, appdef.DefLogTypeErrorServer, msg);
			process.exit(1);
		}

		// handle specific listen errors with friendly messages
		switch (error.code) {
			case "EACCES":
				await this.logr(jrContext, appdef.DefLogTypeErrorServer, bind + " requires elevated privileges");
				process.exit(1);
				break;
			case "EADDRINUSE":
				await this.logr(jrContext, appdef.DefLogTypeErrorServer, bind + " is already in use");
				process.exit(1);
				break;
			default:
				throw error;
		}
	}


	// Event listener for HTTP server "listening" event.
	onListeningEs(listener, expressServer, flagHttps) {
		const server = expressServer;
		const addr = server.address();
		const bind = (typeof addr === "string")
			? "pipe " + addr
			: "port " + addr.port;

		// show some info
		const serverTypestr = flagHttps ? "https" : "http";
		jrdebug.debug("Server (" + serverTypestr + ") started, listening on " + bind);
	}
	//---------------------------------------------------------------------------





	//---------------------------------------------------------------------------
	async runServer() {
		// run the server -- this is called AFTER other setup stuff

		// we need to shutdown
		this.setNeedsShutdown(true);

		// setup express stuff
		this.setupExpress();

		// postsetup used to happen here
		// setup mail/messaging helper
		await this.setupSendAid();

		// other model stuff
		await this.setupAcl();

		// rate limiter
		await this.setupRateLimiters();


		// now make the express servers (http AND/OR https)
		this.createExpressServersAndListen();

		// now create a log entry about the server starting up
		await this.logStartup();

		// check at the end for any failed requires due to circular reference
		// jrequire.checkCircularRequireFailures();

		// done setup
		return true;
	}
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	async setupSendAid() {
		const mailTransportConfigObj = {
			host: this.getConfigVal(appdef.DefConfigKeyMailerHost),
			port: this.getConfigVal(appdef.DefConfigKeyMailerPort),
			secure: this.getConfigVal(appdef.DefConfigKeyMailerSecure),
			auth: {
				user: this.getConfigVal(appdef.DefConfigKeyMailerUsername),
				pass: this.getConfigVal(appdef.DefConfigKeyMailerPassword),
			},
		};
		//
		const defaultFrom = this.getConfigVal(appdef.DefConfigKeyMailerFrom);
		const flagDebugMode = this.getConfigValDefault(appdef.DefConfigKeyMailerDebug, false);
		//
		await this.sendAid.setupMailer(mailTransportConfigObj, defaultFrom, flagDebugMode);
	}
	//---------------------------------------------------------------------------








	//---------------------------------------------------------------------------
	async startUp(flagRunServer) {

		// start profiling?
		this.engageProfilerIfAppropriate();

		// create database structure and connect
		let bretv = await this.createAndConnectToDatabase();

		if (bretv) {
			// set up initial (admin etc) users if needed
			bretv = await this.setupAid.createDefaultUsers();
		}

		if (bretv && flagRunServer) {
			// actually run the server and start listening
			bretv = await this.runServer();
		}


		/*
		if (!bretv) {
			throw new Error("Failure to startup.");
		}
		*/


		return bretv;
	}


	async createAndConnectToDatabase() {
		// setup database stuff (create and connect to models -- callable whether db is already created or not)
		let bretv = false;

		// set mongo timeout.. should be less than mocha test limit
		const DefConnectTimeoutMs = 5000;

		// we need to shutdown
		this.setNeedsShutdown(true);

		const mongooseOptions = {
			useNewUrlParser: true,
			// see https://github.com/Automattic/mongoose/issues/8156
			useUnifiedTopology: true,
			useCreateIndex: true,
			// timeouts to throw error during tests
			connectTimeoutMS: DefConnectTimeoutMs,
			serverSelectionTimeoutMS: DefConnectTimeoutMs,
		};

		// ATTN: 5/12/20 trying this to figure out why we can't catch mongoose exceptions on save
		// see https://stackoverflow.com/questions/31396021/mongoose-save-using-native-promise-how-to-catch-errors
		mongoose.Promise = Promise;

		try {
			// connect to db
			const mongoUrl = this.calcFullDbUrl();
			jrdebug.cdebug("misc", "Connecting to mongoose-mongodb: " + mongoUrl);


			// try to connect
			// await mongoose.connect(mongoUrl, mongooseOptions);

			await mongoose.connect(mongoUrl, mongooseOptions, (error) => {
				// console.log("IN mongoose connect error.");
			});

			// alternate connect with setTimeout?
			/*
			setTimeout(async () => {
				await mongoose.connect(mongoUrl, mongooseOptions);
			}, DefConnectTimeoutMs);
			*/


			// check if connected
			if (!this.isConnectedToDatabase()) {
				jrdebug.debug("Failure while trying to connect to mongoose database at " + mongoUrl + " (connection timed out?).");
				return false;
			}


			// set up schemas for all models
			await jrhMisc.asyncAwaitForEachObjectKeyFunctionCall(this.models, async (key, val) => {
				await this.setupModelSchema(mongoose, val);
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


	isConnectedToDatabase() {
		// see https://mongoosejs.com/docs/api/connection.html#connection_Connection-readyState
		const readyState = mongoose.connection.readyState;
		return (readyState === 1);
	}


	async setupModelSchema(mongooser, modelClass) {
		// just ask the base model class to do the work
		await modelClass.setupModelSchema(mongooser);
	}


	async shutDown() {
		// close down the server

		// do we need to shutdown
		if (!this.getNeedsShutdown()) {
			// already called
			return;
		}

		// clear flag
		this.setNeedsShutdown(false);

		jrdebug.debug("Server shutting down..");

		// now create a log entry about the server starting up
		await this.logShutdown();

		// close the listeners
		if (this.serverHttps) {
			this.serverHttps.close(() => {
			});
			this.serverHttps = undefined;
		}
		if (this.serverHttp) {
			this.serverHttp.close(() => {
			});
			this.serverHttp = undefined;
		}

		// now disconnect the database connections
		await this.dbDisconnect();

		jrdebug.debug("Server shutdown complete.");

		// shutdown profiler?
		this.disEngageProfilerIfAppropriate();
	}


	async dbDisconnect() {
		// disconnect from mongoose/mongodb
		if (this.isConnectedToDatabase()) {
			// connected so shutdown
			jrdebug.debug("Closing mongoose-mongodb connection.");
			await mongoose.disconnect();
			await mongoose.connection.close();
		}


		// ATTN: took several hours to track this down why mocha tests could not shut down server
		// session store needs explicit close to exit gracefully
		if (this.rememberedSessionStore) {
			await this.rememberedSessionStore.close();
		}
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	async setupAcl() {
		await this.aclAid.setupAclPermissions();
	}
	//---------------------------------------------------------------------------


	/**
	 * Set up and configure the rate limiters that we use
 	 *
 	 * ATTN: TODO: This should be modified to support configuration options for the parameters
	 *
	 * @memberof AppRoomServer
	 */
	async setupRateLimiters() {
		//
		jrhRateLimiter.setupRateLimiter(appdef.DefRateLimiterBasic, { points: 5, duration: 10, blockDuration: 10 });
		jrhRateLimiter.setupRateLimiter(appdef.DefRateLimiterApi, { points: 5, duration: 30, blockDuration: 30 });
		jrhRateLimiter.setupRateLimiter(appdef.DefRateLimiterEmergencyAlert, { points: 5, duration: 60, blockDuration: 30 });
		jrhRateLimiter.setupRateLimiter(appdef.DefRateLimiterTest, { points: 5, duration: 2, blockDuration: 2 });
	}

	getRateLimiterBasic() {
		return jrhRateLimiter.getRateLimiter(appdef.DefRateLimiterBasic);
	}

	getRateLimiterApi() {
		return jrhRateLimiter.getRateLimiter(appdef.DefRateLimiterApi);
	}

	getRateLimiterEmergencyAlert() {
		return jrhRateLimiter.getRateLimiter(appdef.DefRateLimiterEmergencyAlert);
	}

	getRateLimiterTest() {
		return jrhRateLimiter.getRateLimiter(appdef.DefRateLimiterTest);
	}
	//---------------------------------------------------------------------------





	//---------------------------------------------------------------------------
	async logStartup() {
		// log the startup event
		let msg = "Starting up on " + jrhMisc.getNiceNowString() + ".\n";
		msg += " " + this.getLoggingAnnouncement() + ".\n";
		msg += " Logging to " + this.getLogFileBaseName() + ".log.\n";
		msg += " Running on server " + this.getServerIp() + ".\n";
		if (this.isDevelopmentMode()) {
			msg += " Development mode enabled.\n";
		}

		// dummy jrContext since we don't know any other way to get req/res
		const jrContext = JrContext.makeNew();
		await this.logr(jrContext, appdef.DefLogTypeInfoServer, msg);

		/*
		const debugTagString = jrdebug.getDebugTagEnabledListAsNiceString();
		if (debugTagString) {
			await this.logr(jrContext, appdef.DefLogTypeDebug, "Debug log tags: " + debugTagString);
		}
		*/
	}


	async logShutdown() {
		// log the shutdown event
		const msg = util.format("Shutting down server on %s.", jrhMisc.getNiceNowString());

		// dummy jrContext since we don't know any other way to get req/res
		const jrContext = JrContext.makeNew();
		await this.logr(jrContext, appdef.DefLogTypeInfoServer, msg);
	}
	//---------------------------------------------------------------------------





















































	//---------------------------------------------------------------------------
	async logr(jrContext, type, message, extraData, user) {
		// create log obj
		let userid, ip, requrl;

		const req = jrContext.req;
		if (!req) {
			// ip = undefined;
			// requrl = undefined;
		} else {
			ip = jrhText.cleanIp(req.ip);
			requrl = jrhExpress.reqOriginalUrl(jrContext.req);
		}

		if (user) {
			userid = user.id;
		} else if (req && req.user) {
			userid = this.getUntrustedLoggedInUserIdFromSession(jrContext);
		} else {
			userid = undefined;
		}

		// make mergeData -- these are fields that have actual dedicated explicit log database table properies
		const mergeData = {
			userid,
			ip,
			url: requrl,
		};

		// hand off to more generic function
		await this.internalLogm(jrContext, type, message, extraData, mergeData);
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	async internalLogm(jrContext, type, message, extraData, mergeData) {
		// we now want to hand off the job of logging this item to any registered file and/or db loggers
		let flagLogToDb = true;
		const flagLogToFile = true;

		// extra data fixups
		let extraDataPlus;
		// if its an error object it doesnt handle properly to mongoose hash or log merge
		if (extraData instanceof Error) {
			extraDataPlus = jrhMisc.ErrorToHashableMapObject(extraData);
		} else {
			extraDataPlus = extraData;
		}

		if (!this.isConnectedToDatabase()) {
			// disable this since we are not connected to database
			flagLogToDb = false;
		}

		// don't log critical db errors to database?
		if (type === appdef.DefLogTypeErrorCriticalDb) {
			flagLogToDb = false;
		}

		// save to db
		if (flagLogToDb) {
			const logModelClass = this.calcLoggingCategoryModelFromLogMessageType(type);
			await this.logmToDbModelClass(jrContext, logModelClass, type, message, extraDataPlus, mergeData);
		}

		// save to file
		if (flagLogToFile) {
			const category = this.calcLoggingCategoryFromLogMessageType(type);
			jrlog.logMessage(category, type, message, extraDataPlus, mergeData);
		}

		// some errors we should trigger emergency alert
		if (this.shouldAlertOnLogMessageType(type)) {
			// trigger emegency alert
			await this.emergencyAlert(jrContext, type, "Critical error logged on " + jrhMisc.getNiceNowString(), message, extraDataPlus, false);
		}
	}


	async logmToDbModelClass(jrContext, logModelClass, type, message, extraData, mergeData) {
		try {
			await logModelClass.createLogDbModelInstanceFromLogDataAndSave(jrContext, type, message, extraData, mergeData);
			// uncomment to test fallback error logging
			// throw Error("logmToDbModelClass exception test.");
		} catch (err) {
			// error while logging to db.
			// log EXCEPTION message (INCLUDES original) to file; note we may still try to log the original cleanly to file below
			jrdebug.debug("Logging fatal exception to error log file:");
			jrdebug.debugObj(err, "Error");
			jrlog.logExceptionErrorWithMessage(appdef.DefLogCategoryError, err, type, message, extraData, mergeData);
		}
	}
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	calcLoggingCategoryFromLogMessageType(type) {
		// we want to decide which logging category (file) to put this logg message in
		// ATTN: we might replace this with something that loops through an array of prefixes associated with categories to make it easier and less hard coded

		// 404s go in their own file
		if (type.startsWith(appdef.DefLogTypeError404)) {
			return appdef.DefLogCategoryError404;
		}

		if (type.startsWith(appdef.DefLogTypeError)) {
			return appdef.DefLogCategoryError;
		}

		if (type.startsWith(appdef.DefLogTypeDebug)) {
			return appdef.DefLogCategoryDebug;
		}

		// fallback to default
		return appdef.DefLogCategory;
	}


	calcLoggingCategoryModelFromLogMessageType(type) {
		// decide which log model class (db table) to use for this log message

		// currently there is only the one
		return this.LogModel;
	}


	shouldAlertOnLogMessageType(type) {
		if (type.startsWith(appdef.DefLogTypeErrorCritical)) {
			return true;
		}
		return false;
	}
	//---------------------------------------------------------------------------
















































































	//---------------------------------------------------------------------------
	async aclRequireLoggedInSitePermissionRenderErrorPageOrRedirect(jrContext, permission, goalRelUrl) {
		return await this.aclRequireLoggedInPermissionRenderErrorPageOrRedirect(jrContext, permission, appdef.DefAclObjectTypeSite, null, goalRelUrl);
	}

	async aclRequireLoggedInPermissionRenderErrorPageOrRedirect(jrContext, permission, permissionObjType, permissionObjId, goalRelUrl) {
		const user = await this.lookupLoggedInUser(jrContext);
		// we just need to check if the user is non-empty
		if (!user) {
			// user is not logged in
			this.handleRequireLoginFailure(jrContext, user, goalRelUrl, null, appdef.DefRequiredLoginMessage);
			return false;
		}

		// they are logged in, but do they have permission required
		const hasPermission = await user.aclHasPermission(jrContext, permission, permissionObjType, permissionObjId);
		if (!hasPermission) {
			this.handleRequireLoginFailure(jrContext, user, goalRelUrl, null, "You do not have sufficient permission to accesss that page.");
			return false;
		}

		// they are good, so forget any previously remembered login diversions
		this.clearLastSessionedDivertedUrl(jrContext);
		return true;
	}
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	async requireLoggedIn(jrContext) {
		const user = await this.lookupLoggedInUser(jrContext);
		return this.requireUserIsLoggedInRenderErrorPageOrRedirect(jrContext, user, null);
	}

	requireUserIsLoggedInRenderErrorPageOrRedirect(jrContext, user, goalRelUrl, failureRelUrl) {
		// if user fails permission, remember the goalRelUrl in session and temporarily redirect to failureRelUrl and return false
		// otherwise return true

		if (!user) {
			this.handleRequireLoginFailure(jrContext, user, goalRelUrl, failureRelUrl, appdef.DefRequiredLoginMessage);
			return false;
		}

		// they are good, so forget any previously remembered login diversions
		this.clearLastSessionedDivertedUrl(jrContext);
		return true;
	}
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	handleRequireLoginFailure(jrContext, user, goalRelUrl, failureRelUrl, errorMsg) {
		// set failureRelUrl default
		if (!failureRelUrl) {
			failureRelUrl = "/login";
		}

		// ok this is failure, save rediret goal url
		this.rememberDivertedRelUrlAndGo(jrContext, goalRelUrl, failureRelUrl, errorMsg);
	}




	divertToLoginPageThenBackToCurrentUrl(jrContext, emsg) {
		// redirect them to login page and then back to their currently requested page
		const failureRelUrl = "/login";
		this.rememberDivertedRelUrlAndGo(jrContext, null, failureRelUrl, emsg);
	}


	rememberDivertedRelUrlAndGo(jrContext, goalRelUrl, failureRelUrl, msg) {
		this.rememberDivertedRelUrl(jrContext, goalRelUrl, msg);
		// now redirect
		if (failureRelUrl) {
			jrContext.res.redirect(failureRelUrl);
		}
	}


	rememberDivertedRelUrl(jrContext, goalRelUrl, msg) {
		// if no goal url passed, then use current request url
		if (!goalRelUrl) {
			goalRelUrl = jrhExpress.reqOriginalUrl(jrContext.req);
		}

		// remember where they were trying to go when we diverted them, so we can go BACK there after they log in
		jrContext.req.session.divertedUrl = goalRelUrl;
		if (msg) {
			jrContext.pushError(msg);
		}
		jrContext.addToThisSession();
	}


	userLogsInCheckDiverted(jrContext) {
		// check if user should be diverted to another page, for example after logging in
		// return true if we divert them, meaning the caller should not do any rendering of the page, etc.

		if (!jrContext.req.session || !jrContext.req.session.divertedUrl) {
			return false;
		}

		// ok we got one
		const divertedUrl = jrContext.req.session.divertedUrl;
		// forget it
		this.clearLastSessionedDivertedUrl(jrContext);

		// now send them there!
		jrContext.res.redirect(divertedUrl);
		return true;
	}
	//---------------------------------------------------------------------------


















	//---------------------------------------------------------------------------
	// present user with new account create form they can submit to ACTUALLY create their new account
	// this would typically be called AFTER the user has verified their email with verification model
	presentNewAccountRegisterForm(jrContext, userObj, verification) {
		// ATTN: is this ever called
		throw (new Error("presentNewAccountRegisterForm not implemented yet."));
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	sendLoggedInUsersElsewhere(jrContext) {
		// if they are logged in with a real user account already, just redirect them to their profile and return true
		// otherwise return false;
		const userId = this.getUntrustedLoggedInUserIdFromSession(jrContext);
		if (userId) {
			jrContext.res.redirect("profile");
			return true;
		}
		return false;
	}
	//---------------------------------------------------------------------------






















	//---------------------------------------------------------------------------
	// csrf helpers -- so we dont have to install as ever-present middleware
	makeCsrf(jrContext) {
		// in this case we pass next() function which just returns value passed to it
		if (jrContext.req.csrfToken) {
			// already in req, just return it
			return jrContext.req.csrfToken();
		}
		return this.csrfInstance(jrContext.req, jrContext.res, (err) => {
			if (err === undefined || err.code === "EBADCSRFTOKEN") {
				// no error, or csrf bad-token error, which we dont care about since we've just been asked to make one
				return jrContext.req.csrfToken();
			}
			// pass the error back
			return err;
		});
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	/**
	 * Test the csrf
	 * This is more useful for re-presenting a form.
	 * ATTN: We had some real problems with this new function returning undefined on successful csrf when I tried to simply return jrResult from inside the callback.. I'm still not sure I understand why; it may be that on non-error it was async executed
	 * ATTN Security: make sure this always works as expected
	 *
	 * @param {*} req
	 * @param {*} res
	 * @returns success jrResult if no error in csrf; otherwise a jrResult that is an error
	 * @memberof AppRoomServer
	 */
	testCsrf(jrContext) {
		// let csrf throw the error to next, ONLY if there is an error, otherwise just return and dont call next

		// Useful for testing csrf, make it fail
		const forceFail = this.getConfigValDefault(appdef.DefConfigKeyTestingForceCsrfFail, false);
		if (forceFail) {
			jrContext.pushError("Forcing csrf test to return false for testing purposes; to disable see option '" + appdef.DefConfigKeyTestingForceCsrfFail + "'.");
		}

		const retv = this.csrfInstance(jrContext.req, jrContext.res, (err) => {
			if (err) {
				jrContext.pushError(err.toString());
			} else {
				// forget it so it can't be used twice?
				if (true) {
					this.clearLastSessionedCsrfSecret(jrContext);
				}
			}
		});

		// return true on success
		if (!jrContext.isError()) {
			return true;
		}
		return false;
	}


	testCsrfRedirectToOriginalUrl(jrContext) {
		this.testCsrf(jrContext);
		if (jrContext.isError()) {
			// add error to session
			jrContext.addToThisSession();
			// redirect to same url
			// jrdebug.debug("req.route.path: " + req.route.path + ", req.baseUrl: " + req.baseUrl + ", req.originalUrl: " + req.originalUrl + ", req.url:" + req.url);
			jrContext.res.redirect(jrhExpress.reqOriginalUrl(jrContext.req));
			return false;
		}
		// success
		return true;
	}
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	getCsrf() {
		return this.csrfInstance;
	}
	//---------------------------------------------------------------------------





	//---------------------------------------------------------------------------
	// user avatars
	calcAvatarHtmlImgForUser(obj) {
		let rethtml;
		if (obj) {
			const avatarUrl = this.calcAvatarUrlForUser(obj);
			rethtml = `<img src="${avatarUrl}">`;
		} else {
			rethtml = "&nbsp;";
		}
		return rethtml;
	}

	calcAvatarUrlForUser(obj) {
		// ATTN: cache this somewhere to improve the speed of this function
		const id = obj.email;
		const url = gravatar.url(id, this.gravatarOptions);
		return url;
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	makeAlinkHtmlToAclModel(objType, objId) {
		// get nice linked html text for an object from acl object types
		const label = objType + " #" + objId;
		let modelClass;
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
			const alink = modelClass.getCrudUrlBase("view", objId);
			const htmlText = "<a href=" + alink + ">" + label + "</a>";
			return htmlText;
		}
		return label;
	}
	//---------------------------------------------------------------------------







	//---------------------------------------------------------------------------
	async isLoggedInUserSiteAdmin(jrContext) {
		const loggedInUser = await this.lookupLoggedInUser(jrContext);
		if (loggedInUser) {
			const bretv = await loggedInUser.isSiteAdmin(jrContext);
			return bretv;
		}
		return false;
	}
	//---------------------------------------------------------------------------



















	//---------------------------------------------------------------------------
	async aclRequireModelAccessRenderErrorPageOrRedirect(jrContext, user, modelClass, accessTypeStr, modelId) {
		// called by generic crud functions
		// return FALSE if we are denying user access
		// and in that case WE should redirect them or render the output
		// return TRUE if we should let them continue

		if (!user) {
			user = await this.lookupLoggedInUser(jrContext);
			if (!user) {
				// ok if we denied them access and they are not logged in, make them log in -- after that they may have permission
				this.divertToLoginPageThenBackToCurrentUrl(jrContext, appdef.DefRequiredLoginMessage);
				return false;
			}
		}

		// ok they are logged in, now check their permission

		// conversions from model info to acl info
		const permission = accessTypeStr;
		const permissionObjType = modelClass.getAclName();
		let permissionObjId = modelId;
		if (permissionObjId === undefined) {
			permissionObjId = null;
		}

		// check permission
		const hasPermission = await user.aclHasPermission(jrContext, permission, permissionObjType, permissionObjId);

		if (!hasPermission) {
			// tell them they don't have access
			this.renderAclAccessError(jrContext, modelClass, "You do not have permission to access this resource/page.");
			return false;
		}

		// granted access
		return true;
	}


	renderAclAccessError(jrContext, modelClass, errorMessage) {
		jrContext.pushError(errorMessage);
		// render
		jrContext.res.render("acldeny", {
			jrResult: jrContext.mergeSessionMessages(),
		});
	}

	renderAclAccessErrorResult(jrContext, modelClass) {
		// render
		jrContext.res.render("acldeny", {
			jrResult: jrContext.mergeSessionMessages(),
		});
	}
	//---------------------------------------------------------------------------











	//---------------------------------------------------------------------------
	// internal debugging info for internals admin

	calcExpressRoutePathData() {
		return jrhExpress.calcExpressRoutePathData(this.getExpressApp());
	}


	async calcWebServerInformation() {
		// return info about web server
		const serverInfo = {
			runtime: {
				started: jrhMisc.getNiceDateValString(this.procesData.started),
				uptime: jrhMisc.getNiceDurationTimeMs(Date.now() - this.procesData.started),
			},
			setup: this.getMiscInfo(),
		};

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




	async calcDatabaseInfo() {
		// return info about the database structure
		const dbStrcuture = await jrhMongo.calcDatabaseInfo();
		return dbStrcuture;
	}


	calcAclStructure() {
		const aclStructure = this.aclAid.calcAclStructure();
		return aclStructure;
	}



	calcNodeJsInfo() {
		// Getting commandline
		let comlinestr = process.execPath;
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
			processPid: process.pid,
		};

		return nodeJsInfo;
	}


	calcDependencyInfo() {
		const rawData = {
			jrequire: jrequire.calcDebugInfo(),
		};

		return rawData;
	}


	calcAppInfo() {
		// info about the app (version, author, etc.)

		const rawData = {
			about: this.getAboutInfo(),
		};

		return rawData;
	}


	calcAddonCollectionInfoPlugins() {
		return this.calcAddonCollectionInfo(this.getAddonCollectionNamePlugins());
	}

	calcAddonCollectionInfoAppEngines() {
		return this.calcAddonCollectionInfo(this.getAddonCollectionNameAppEngines());
	}


	calcAddonCollectionInfo(collectionName) {
		let category, addonModule;
		const addons = jrequire.getAllAddonCategoriesForCollectionName(collectionName);

		// iterate all categories and get category data
		const loadedAddonDataByCategory = {};
		Object.keys(addons).forEach((categoryKey) => {
			// iterate all modules in this category
			category = addons[categoryKey];
			Object.keys(category).forEach((name) => {
				// load the module
				addonModule = jrequire.requireAddonModule(collectionName, name);
				// add it to the tree under this category
				if (loadedAddonDataByCategory[categoryKey] === undefined) {
					loadedAddonDataByCategory[categoryKey] = {};
				}
				loadedAddonDataByCategory[categoryKey][name] = addonModule.getInfo(this);
			});
		});

		const configKey = this.calcCollectionConfigKey(collectionName);
		const rawData = {
			foundInConfiguration: this.getConfigVal(configKey),
			enabledByCategory: loadedAddonDataByCategory,
		};

		return rawData;
	}
	//---------------------------------------------------------------------------















































	//---------------------------------------------------------------------------

	/**
	 * Helper function to make a secure access token from a refresh token
	 *
	 * @param {Object} userPassport - minimal object with properties of the user
	 * @param {UserModel} user - full model object of User class
	 * @param {String} refreshToken - the refresh token object to use to generate access token
	 * @returns a token object.
	 */
	async makeSecureTokenAccessFromRefreshToken(jrContext, user, refreshToken) {
		// make an access token with SAME scope as refresh token
		return await this.makeSecureTokenAccess(jrContext, user, refreshToken.scope);
	}


	/**
	 * Helper function to make a Refresh token
	 *
	 * @param {Object} userPassport - minimal object with properties of the user
	 * @param {UserModel} user - full model object of User class
	 * @returns a token object
	 */
	async makeSecureTokenRefresh(jrContext, user) {
		const payload = {
			type: "refresh",
			scope: "api",
			apiRevoke: await user.getApiRevokeEnsureValid(jrContext),
			user: user.getMinimalPassportProfile(),
		};
		// create secure toke
		const expirationSeconds = this.getConfigVal(appdef.DefConfigKeyTokenExpirationSecsRefresh);
		const secureToken = this.createSecureToken(payload, expirationSeconds);
		return secureToken;
	}


	/**
	 * Helper function to make a generic secure token
	 *
	 * @param {Object} userPassport - minimal object with properties of the user
	 * @param {UserModel} user - full model object of User class
	 * @param {String} scope - the refresh token object to use to generate access token
	 * @returns a token object
	 */
	async makeSecureTokenAccess(jrContext, user, scope) {
		const payload = {
			type: "access",
			scope,
			apiRevoke: await user.getApiRevokeEnsureValid(jrContext),
			user: user.getMinimalPassportProfile(),
		};
		// add accessId -- the idea here is for every user object in database to ahve an accessId (either sequential or random); that can be changed to invalidate all previously issues access tokens
		const expirationSeconds = this.getConfigVal(appdef.DefConfigKeyTokenExpirationSecsAccess);
		const secureToken = this.createSecureToken(payload, expirationSeconds);
		return secureToken;
	}



	createSecureToken(payload, expirationSeconds) {
		// add stuff to payload
		payload.iat = Math.floor(Date.now() / 1000);
		payload.iss = this.getConfigVal(appdef.DefConfigKeyTokenIssuer);
		// expiration?
		if (expirationSeconds > 0) {
			payload.exp = Math.floor(Date.now() / 1000) + expirationSeconds;
		}
		// make it
		const serverJwtCryptoKey = this.getConfigVal(appdef.DefConfigKeyTokenCryptoKey);
		const tokenval = jsonwebtoken.sign(payload, serverJwtCryptoKey);
		// return an object that contains both the (encrypted) packed token string, but also the expiration date in plain text
		const tokenObj = {
			token: {
				val: tokenval,
				type: payload.type,
				exp: payload.exp,
				scope: payload.scope,
			},
		};
		return tokenObj;
	}
	//---------------------------------------------------------------------------






	//---------------------------------------------------------------------------
	isDevelopmentMode() {
		return (this.getConfigVal(appdef.DefConfigKeyNodeEnv) === "development");
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	shouldIgnoreError(err) {
		if (err === "IGNORE_EXCEPTION") {
			// ATTN: purposeful ignorable exception; its used in jrh_express to trick the system into throwing an exception
			return true;
		}

		return false;
	}


	shouldLogError(err) {
		if (err !== undefined && err.status !== undefined) {
			if (err.status === 404) {
				return false;
			}
		}

		if (err !== undefined && err.code === "EBADCSRFTOKEN") {
			// thrown by csrf
			return false;
		}

		return true;
	}
	//---------------------------------------------------------------------------































	//---------------------------------------------------------------------------
	// ATTN: 4/2/20 -- these are really confusing and seem to be overlapping
	// and confusion seems greater than when initially coded.. I think they need to be reorganized..

	setupExpressErrorHandlers(expressApp) {

		// catch 404 and forward to error handler
		const mythis = this;
		expressApp.use(async function myCustomErrorHandler404(req, res, next) {
			const jrContext = JrContext.makeNew(req, res, next);
			// if we get here, nothing else has caught the request, so WE push on a 404 error for the next handler

			// ATTN: 3/31/20 -- this is newly trapping here other exceptions, such as  on calcExpressMiddlewareGetFileLine in jrh_express with a deliberately thrown exception
			// so now we check to make sure we don't handle the stuff we shouldn't

			if (mythis.shouldIgnoreError(req)) {
				return;
			}

			const handled = false;
			if (req !== undefined) {
				// this doesn't display anything, just handled preliminary recording, etc.

				if (req.url !== undefined) {
					await mythis.handle404Error(jrContext);
				} else {
					// this isn't really a 404 error??! for example can get triggered on a generic exception thrown..
				}
			}

			// ATTN: should this be done even if its not a real 404 error?? (i.e. no req.url)
			// then this gets called even if its a 404
			if (next !== undefined) {
				next(httpErrors(404));
			}
		});



		// and then this is the fall through NEXT handler, which gets called when an error is unhandled by previous use() or pushed on with next(httperrors())
		// NOTE that this will also be called by a 404 error
		// this can get called for example on a passport error
		// error handler
		expressApp.use(async function myFallbackErrorHandle(err, req, res, next) {
			const jrContext = JrContext.makeNew(req, res, next);
			// decide whether to show full error info

			if (mythis.shouldIgnoreError(err)) {
				return;
			}

			if (err === undefined || err.status === undefined) {
				const stack = new Error().stack;
				const fullerError = {
					message: "Uncaught error",
					status: 0,
					stack,
					err,
				};
				err = fullerError;
			}

			// error message (e.g. "NOT FOUND")
			const errorMessage = err.message;

			// error status (e.g. 404)
			const errorStatus = err.status;

			// error details
			let errorDetails = "";
			// add url to display
			if (jrContext.req !== undefined && jrContext.req.url !== undefined) {
				errorDetails += "\nRequested url: " + jrContext.req.url;
				const originalUrl = jrhExpress.reqOriginalUrl(jrContext.req);
				if (req.url !== originalUrl) {
					errorDetails += " (" + originalUrl + ")";
				}
			}

			// extra details if in development mode
			let errorDebugDetails = "";
			if (mythis.isDevelopmentMode() && err.status !== 404) {
				errorDebugDetails = mythis.isDevelopmentMode() ? err.stack : "";
			}

			// extra (session) error info
			let jrResultError;
			if (req !== undefined) {
				jrResultError = jrContext.mergeSessionMessages();
			} else {
				jrResultError = new JrResult();
			}


			// ATTN: 4/2/20 is this a serious error? if so, log (and possibly email) it
			if (mythis.shouldLogError(err)) {
				// log the actual exception error plus extra
				let errorLog = err;
				if (jrResultError && jrResultError.isError()) {
					errorLog += "\n" + jrResultError.getErrorsAsString();
				}
				await mythis.handleUncaughtError(errorLog);
			}


			// render the error page
			if (jrContext.res !== undefined) {
				jrContext.res.status(err.status || 500);
				jrContext.res.render("error", {
					errorStatus,
					errorMessage,
					errorDetails,
					errorDebugDetails,
					jrResult: jrResultError,
				});
			} else {
				// only thing to do is exit?
				if (true) {
					process.exitCode = 2;
					process.exit();
				}
			}

		});






		// set up some fatal exception catchers, so we can log these things


		// most of our exceptions trigger this because they happen in an await aync with no catch block..
		process.on("unhandledRejection", (reason, promise) => {

			if (true && reason !== undefined) {
				// just throw it to get app to crash exit
				// console.log("In unhandledRejection rethrowing reason:");
				// console.log(reason);
				// console.log("promise");
				// console.log(promise);
				throw reason;
			}

			// handle it specifically

			// is there a way for us to get the current request being processes
			fs.writeSync(
				process.stderr.fd,
				`unhandledRejection: ${reason}\n promise: ${promise}`,
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





		process.on("uncaughtException", async (err, origin) => {
			// the problem here is that nodejs does not want us calling await inside here and making this async
			// @see https://stackoverflow.com/questions/51660355/async-code-inside-node-uncaughtexception-handler
			// but that makes it difficult to log fatal errors, etc. since our logging functions are async.
			// SO we kludge around this by using an async handler here, which nodejs does not officially support
			// the side effect of doing so is that nodejs keeps rethrowing our error and never exists
			// our solution is to set a flag and force a manual exit when it recurses

			if (err.escapeLoops) {
				console.log("\n\n----------------------------------------------------------------------");
				console.log("Encountered UncaughtException forcing process exit, error:");
				console.log(err);
				console.log("----------------------------------------------------------------------\n\n");

				// shutdown profiler?
				this.disEngageProfilerIfAppropriate();

				process.exit();
				return;
			}

			console.log("Encountered UncaughtException, logging.");

			// add flag to it to prevent infinite loops
			err.escapeLoops = true;

			// handle the fatal error (by logging it presumably)
			await this.handleFatalError(err);

			// wrap error for re-throwing so we don't recursively loop
			const reerr = {
				err,
				escapeLoops: true,
				origin,
			};


			const flagExit = this.getConfigVal(appdef.DefConfigKeyExitOnFatalError);
			if (flagExit) {
				// shutdown profiler early, in case we crash trying to shutdown server
				this.disEngageProfilerIfAppropriate();
				// attempt to try to shutdown
				// ATTN: THIS DOES NOT WORK CLEANLY -- AFTER THIS UNCAUGHT EXCEPTION I CAN'T GET APP TO CLEANLY RUN SHUTDOWN STUFF -- it seems to balk
				await this.shutDown();
				// throw it up, this will display it on console and crash out of node
				throw reerr;
			} else {
				console.log("\n\n--- Not exiting despite fatal error, because config value of EXIT_ON_FATAL_ERROR = false. ---\n\n");
			}
		});
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	async handleUncaughtError(err) {

		console.log("Encountered UncaughtError, logging.");

		const errString = "Uncaught error occurred on " + jrhMisc.getNiceNowString() + ":\n\n" + jrhMisc.objToString(err, false);

		// dummy jrContext since we don't know any other way to get req/res
		const jrContext = JrContext.makeNew();

		if (true) {
			// log the critical error to file and database
			try {
				await this.logr(jrContext, appdef.DefLogTypeErrorCriticalException, errString);
			} catch (exceptionError) {
				err.loggingException = exceptionError;
				jrdebug.debugObj(err, "Exception while trying to log uncaught error");
			}
		}

		if (true) {
			// let's log it on screen:
			console.error(errString);
		}
	}

	async handleFatalError(err) {
		// ATTN: test
		if (true) {
			// log the critical error to file and database
			try {
				const errString = "Fatal/critical error occurred on " + jrhMisc.getNiceNowString() + ":\n\n" + jrhMisc.objToString(err, false);
				// dummy jrContext since we don't know any other way to get req/res
				const jrContext = JrContext.makeNew();
				await this.logr(jrContext, appdef.DefLogTypeErrorCriticalException, errString);
			} catch (exceptionError) {
				err.loggingException = exceptionError;
				jrdebug.debugObj(err, "Exception while trying to log fatal error");
			}
		}
		process.exitCode = 2;
	}


	async handle404Error(jrContext) {
		// caller will pass this along to show 404 error to user; we can do extra stuff here
		if (true) {
			const msg = {
				url: jrContext.req.url,
			};
			await this.logr(jrContext, appdef.DefLogTypeError404, msg);
		}
	}
	//---------------------------------------------------------------------------





























	//---------------------------------------------------------------------------
	/**
	 * This may be called on serious errors (server down, database offline, unexpected exception, etc.), when we want to alert admin(s) immediately via email or sms
	 * It does some rate-limiting to prevent generating too many messages, etc.
	 *
	 * @param {string} eventType
	 * @param {string} subject
	 * @param {string} message
	 * @param {req} express request (or null if not part of one)
	 * @param {object} extraData
	 * @param {boolean} flagAlsoSendToSecondaries - if false, only the main admin is notified; if true then the primary AND secondary list of emails, etc. is notified
	 * @returns number of messages sent
	 */

	async emergencyAlert(jrContext, eventType, subject, message, req, extraData, flagAlsoSendToSecondaries, flagOverrideRateLimiter) {
		// first we check rate limiting
		let messageSentCount = 0;

		if (!flagOverrideRateLimiter) {
			const rateLimiter = this.getRateLimiterEmergencyAlert();
			// ATTN: with rateLimiterKey == "" it means that we share a single rate limter for all emergencyAlerts
			const rateLimiterKey = "";
			//
			try {
				// consume a point of action
				await rateLimiter.consume(rateLimiterKey, 1);
			} catch (rateLimiterRes) {
				// rate limiter triggered; if this is not our FIRST trigger of the emergency alert rate limiter within this time period, then just silently return
				if (!rateLimiterRes.isFirstInDuration) {
					return 0;
				}
				// otherwise we will not send the alert but we will send a message about turning off emergency alerts

				// send them a message saying emergency alerts are disabled for X amount of time
				const blockTime = rateLimiterRes.msBeforeNext / 1000.0;
				// send a message saying we are disabling emergency alerts
				const esubject = util.format("Emergency alerts temporarily disabled for %d seconds", blockTime);
				const emessage = util.format("Due to rate limiting, no further alerts will be sent for %d seconds.", blockTime);
				await this.emergencyAlert(jrContext, "ratelimit.emergency", esubject, emessage, req, {}, false, true);

				// now return saying we did not send the alert
				return 0;
			}
		}

		// ok send the message

		// who gets it?
		let recipients = this.getEmergencyAlertContactsPrimary();
		if (flagAlsoSendToSecondaries) {
			recipients = jrhMisc.mergeArraysDedupe(recipients, this.getEmergencyAlertContactsSecondary());
		}

		// add req info to extra data of message
		let extraDataPlus;
		if (req) {
			// add req info
			const ip = (req.ip && req.ip.length > 7 && req.ip.substr(0, 7) === "::ffff:") ? req.ip.substr(7) : req.ip;
			extraDataPlus = {
				...extraData,
				req_userid: this.getUntrustedLoggedInUserIdFromSession(jrContext),
				req_ip: ip,
			};
		} else {
			extraDataPlus = extraData;
		}


		// announce on console
		jrdebug.debug("Emergency error alert triggered (see error log): " + subject);


		// loop and send to all recipients
		await jrhMisc.asyncAwaitForEachFunctionCall(recipients, async (recipient) => {
			// do something
			await this.sendAid.sendMessage(jrContext, recipient, subject, message, extraDataPlus, true);
			++messageSentCount;
		});

		// done
		return messageSentCount;
	}
	//---------------------------------------------------------------------------





	//---------------------------------------------------------------------------
	/**
	 * Setup any global hooks not covered by express
	 *
	 * @memberof AppRoomServer
	 */
	setupGlobalNodeHooks() {
		process.on("exit", async () => {
			// try to shutdown, if not already done, on exit
			// console.log("Exiting application.");
			await this.shutDown();
		});
	}
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	/**
	 * Helper function used by some simple test pages (see admin/test), where we just want to check user's access, then show user a message and have them CONFIRM that they really do want to perform a given action
	 *
	 * @param {*} req
	 * @param {*} res
	 * @param {*} permission
	 * @param {*} headline
	 * @param {*} message
	 * @returns false if permission fails and displaying error message (caller needs do nothing); actually it should throw an error and not return on failure to meet permission
	 * @memberof AppRoomServer
	 */
	async confirmUrlPost(jrContext, permission, headline, message) {

		if (!await this.aclRequireLoggedInSitePermissionRenderErrorPageOrRedirect(jrContext, permission)) {
			// all done
			return false;
		}
		jrContext.res.render("generic/confirmpage", {
			jrResult: jrContext.mergeSessionMessages(),
			csrfToken: this.makeCsrf(jrContext),
			headline,
			message,
			formExtraSafeHtml: "",
		});
		return true;
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	engageProfilerIfAppropriate() {
		// see https://npmdoc.github.io/node-npmdoc-v8-profiler/build/apidoc.html#apidoc.element.v8-profiler.startProfiling
		if (this.getOptionProfileEnabled()) {
			profiler = require("v8-profiler-next");
			jrdebug.debug("Engaging v8 profiler.");
			profiler.startProfiling("", true);
		}
	}


	disEngageProfilerIfAppropriate() {
		if (this.getOptionProfileEnabled() && profiler !== undefined) {
			const profileResult = profiler.stopProfiling("");
			const profileOutputPath = this.getProfileOutputFile();
			profileResult.export().pipe(fs.createWriteStream(profileOutputPath)).on("finish", () => {
				profileResult.delete();
				const errmsg = "Wrote profile data to " + profileOutputPath + ".";
				jrdebug.debug(errmsg);
			});
			profiler = undefined;
		}
	}

	getProfileOutputFile() {
		return this.getLogDir() + "/" + this.getLogFileBaseName() + "_" + jrhMisc.getCompactNowString() + ".cpuprofile";
	}
	//---------------------------------------------------------------------------















	//---------------------------------------------------------------------------
	async autoLoginUserViaAuthHeaderToken(jrContext) {
		// see https://stackoverflow.com/questions/46094417/authenticating-the-request-header-with-express
		// ATTN: the only problem here is that the caller is responsible for showing any error to user since

		// check cache so we only do this once
		if (this.getCachedFlagAuthHeaderChecked(jrContext)) {
			return;
		}
		this.setCachedFlagAuthHeaderChecked(jrContext, true);

		// first check if authorization info passed in header, if not just return false
		if (!jrContext.req.headers || !jrContext.req.headers.authorization) {
			// no auth headers so no point checking
			return;
		}

		// QUESTION: Should we store user in session when they use autho token?
		// Answer: NO. In general if user is using auth bearer token in header, we want them to do so on EVERY request (presumably using a tool); rather than doing so once and remembering them in session.
		const flagRememberUserInSessionCookie = false;

		// ok we think there is authorization header (jwt)
		// note we do not pass a result res reference in, and askk passport authenticate to not add any error info or reroute, etc. this is less than ieal in some cases
		await this.asyncRoutePassportAuthenticate(jrContext, "jwtHeader", "via jwt authorization header token", flagRememberUserInSessionCookie, false, false, false);

		if (jrContext.isError()) {
			// clear sessioned user
			this.clearSessionedUser(jrContext.req);
			// drop down to return it
		} else {
			// no point pushing success message on
			// jrContext.pushSuccess("JWT Authentication token accepted.");
		}
	}
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	validateSecureToken(jrResult, tokenObj, requiredTokenType) {
		// check type
		const tokenType = tokenObj.type;
		if (requiredTokenType && tokenType !== requiredTokenType) {
			jrResult.pushErrorOnTop("Error code B1: expected token type [" + requiredTokenType + "] but received type [" + tokenType + "]");
		}

		// check expiration
		if (this.isSecureTokenExpired(tokenObj.exp)) {
			if (tokenObj.exp) {
				const expirationdatestr = new Date(tokenObj.exp * 1000).toLocaleString();
				jrResult.pushError("Error code B2: token expired on " + expirationdatestr + ".");
			} else {
				jrResult.pushError("Error code B3: token missing expiration date.");
			}
		}

		// check issuer
		const expectedIssuer = this.getConfigVal(appdef.DefConfigKeyTokenIssuer);
		if (tokenObj.iss !== expectedIssuer) {
			// wrong issues
			jrResult.pushError("Error code B4: expected issuer [" + expectedIssuer + "] but received [" + tokenObj.iss + "]");
		}

		// check other stuff
		if (!tokenObj.type) {
			// missing token type
			jrResult.pushError("Error code B5: token missing type tag.");
		}
	}


	isSecureTokenExpired(exp) {
		// ATTN: TODO: Do we need to worry about local vs gmt/etc time?
		if (!exp) {
			// what to do in this case? no expiration date?
			// ATTN:TODO: SECURITY - for now we treat it as expired if it has no date
			return true;
		}
		if (exp <= Math.floor(Date.now() / 1000)) {
			// it's expired
			return true;
		}
		// its not expired
		return false;
	}


	validateSecureTokenAccess(jrResult, tokenObj) {
		// here we check that the token is an access type and other details of it
		// see also validateSecureToken()
		this.validateSecureToken(jrResult, tokenObj, "access");
		return jrResult;
	}
	//---------------------------------------------------------------------------






	//---------------------------------------------------------------------------
	renderError(jrContext, errorStatusCode, renderFormat) {
		if (renderFormat === "json") {
			if (jrContext.getExtraData("tokenError")) {
				// specialty token error
				jrhExpress.sendJsonErrorAuthToken(jrContext);
			} else {
				// generic error
				jrhExpress.sendJsonResult(jrContext, errorStatusCode);
			}
		} else if (renderFormat === "html") {
			// send html result
			throw new Error("Don't know how to show html renderFormat errors yet in arserver.renderError.");
		} else {
			throw new Error("Unknow renderFormat in arserver.renderError: " + renderFormat);
		}
	}

	renderErrorJson(jrContext, errorStatusCode) {
		return this.renderError(jrContext, errorStatusCode, "json");
	}

	renderErrorHtml(jrContext, errorStatusCode) {
		return this.renderError(jrContext, errorStatusCode, "html");
	}
	//---------------------------------------------------------------------------







	//---------------------------------------------------------------------------
	getUpdateAccessDateFrequencyInMs() {
		return this.getConfigVal(appdef.DefConfigKeyLastAccessUpdateFrequencyMs);
	}
	//---------------------------------------------------------------------------






	//---------------------------------------------------------------------------
	makeVirtualLoginToken(loginMethod) {
		// create a login token like a jwt auth token to make it easier to check stuff
		const token = {
			type: "login",
			subtype: loginMethod,
		};
		this.decorateAuthLoginToken(token);
		return token;
	}

	decorateAuthLoginToken(token) {
		token.proofDate = Date.now();
	}
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	getTimeSinceLoggedInUserLastLoggedInMs(jrContext) {
		// ATTN: because we are checking loggedin passport data, this will NOT catch an auth token logged in user; to catch them we must call lookupLoggedInUser first
		const profile = this.getLoggedInPassportUsr(jrContext);
		if (!profile || !profile.token || !profile.token.proofDate) {
			// not available, return null
			return null;
		}
		return Date.now() - profile.token.proofDate;
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	async requireRecentLoggedIn(jrContext, recencyMs) {
		// We want to do this first for 2 reasons:
		//  1. error message saying they need to log in
		//  2. the request here will log in user via auth header token if provided, wheras the thin call to getTimeSinceLoggedInUserLastLoggedInMs() will not
		if (!await this.requireLoggedIn(jrContext)) {
			// all done
			return false;
		}

		// see how long it's been since they last logged in / proved their identity
		const timeSinceLastLogin = this.getTimeSinceLoggedInUserLastLoggedInMs(jrContext);

		if (timeSinceLastLogin === null || timeSinceLastLogin > recencyMs) {
			jrContext.pushMessage("You need to re-login more recently before you can proceed.");
			this.divertToLoginPageThenBackToCurrentUrl(jrContext, null);
			return false;
		}

		// all good
		return true;
	}
	//---------------------------------------------------------------------------





















	//---------------------------------------------------------------------------
	discoverAddonsByCollectionName(collectionName) {
		// get the plugin config object
		const configKey = this.calcCollectionConfigKey(collectionName);
		const allObjs = this.getConfigVal(configKey);
		// now iterate over it and register the plugins
		let obj;
		Object.keys(allObjs).forEach((name) => {
			obj = allObjs[name];
			if (obj.enabled !== false) {
				jrequire.registerAddonModule(collectionName, name, obj);
			}
		});
	}

	async discoverAndInitializeAddonPlugins() {
		await this.discoverAndInitializeAddonsByCollectionName(this.getAddonCollectionNamePlugins());
	}

	async discoverAndInitializeAddonAppEngines() {
		await this.discoverAndInitializeAddonsByCollectionName(this.getAddonCollectionNameAppEngines());
	}

	async discoverAndInitializeAddonsByCollectionName(collectionName) {
		// discover the addons
		this.discoverAddonsByCollectionName(collectionName);
		// now call the hookInitialize(arserver) funciton for them
		await this.hookAddonsByCollectionName(appdef.DefHookInitialize, collectionName);
	}

	getAddonCollectionNamePlugins() {
		return "plugins";
	}

	getAddonCollectionNameAppEngines() {
		return "appEngines";
	}

	calcCollectionConfigKey(collectionName) {
		return appdef.DefConfigKeyCollections[collectionName];
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	async hookPlugins(functionName, ...functionArgs) {
		const retv = await this.hookAddonsByCollectionName(functionName, this.getAddonCollectionNamePlugins(), ...functionArgs);
		return retv;
	}

	async hookAppEngines(functionName, ...functionArgs) {
		const retv = await this.hookAddonsByCollectionName(functionName, this.getAddonCollectionNameAppEngines(), ...functionArgs);
		return retv;
	}

	async hookAddons(functionName, ...functionArgs) {
		let retv;
		retv = await this.hookPlugins(functionName, ...functionArgs);
		if (!retv) {
			retv = await this.hookAppEngines(functionName, ...functionArgs);
		}
		return retv;
	}


	async hookAddonsByCollectionName(functionName, collectionName, ...functionArgs) {
		// if a hook call returns anything that evaluates to true (ie anything other than false, null, "", or undefined, then we stop and return that
		let retv;
		// add "hook" prefix for function names, all hook callbacks must begin with "hook" + the appdef.DefHook constant
		const functionNameFull = "hook" + functionName;
		// walk addon modules
		let addonModule;
		const allAddons = jrequire.getAllAddonModulesForCollectionName(collectionName);
		if (allAddons) {
			const keys = Object.keys(allAddons);
			// console.log(keys);
			for (const key of keys) {
				// console.log(key);
				addonModule = jrequire.requireAddonModule(collectionName, key);
				// if the module has the function, invoke it
				if (addonModule && addonModule[functionNameFull]) {
					retv = await addonModule[functionNameFull](this, ...functionArgs);
					if (retv) {
						return retv;
					}
				}
			}
		}

		// return false by default; if any hooked function returned non-false then we stop and return that instead
		return false;
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	getAppEngineChoices() {
		if (this.cachedAppEngineChoices === undefined) {
			// calc and cache them
			let label;
			this.cachedAppEngineChoices = {};
			const allObjs = jrequire.getAllAddonModulesForCollectionName(this.getAddonCollectionNameAppEngines());
			Object.keys(allObjs).forEach((name) => {
				label = allObjs[name].label ? allObjs[name].label : name;
				this.cachedAppEngineChoices[name] = label;
			});
		}

		// return it
		return this.cachedAppEngineChoices;
	}
	//---------------------------------------------------------------------------














}













//---------------------------------------------------------------------------
// export A SINGLETON INSTANCE of the class as the sole export
module.exports = new AppRoomServer();
//---------------------------------------------------------------------------
