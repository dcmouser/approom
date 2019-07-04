// approom
// server model
// v1.0.0 on 5/1/19 by mouser@donationcoder.com
//
// The Server model is a singleton object that manages general settings for the server system

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
const morgan = require("morgan");
const http = require("http");
const bodyParser = require("body-parser");
const https = require("https");


// passport authentication stuff
const passport = require("passport");
const passportLocal = require("passport-local");
const passportFacebook = require("passport-facebook");

// misc node core modules
const path = require("path");
const fs = require("fs");
const assert = require("assert");

// misc 3rd party modules
const gravatar = require("gravatar");

// mail
const nodemailer = require("nodemailer");

// our helper modules
const jrhelpers = require("../helpers/jrhelpers");
const jrlog = require("../helpers/jrlog");
const jrconfig = require("../helpers/jrconfig");
const JrResult = require("../helpers/jrresult");
const jrhandlebars = require("../helpers/jrhandlebars");

// approomserver globals
const arGlobals = require("../approomglobals");

// models (we require most locally to avoid circular requires)
const LogModel = require("../models/log");



// ATTN: circular reference problem? so we require this only when we need it below?
// may have to do this with other models that also bring in require("server")




class AppRoomServer {


	//---------------------------------------------------------------------------
	// constructor
	constructor() {
		// csrf
		this.csrfInstance = undefined;
		this.gravatarOptions = undefined;
	}

	// global singleton request
	static getSingleton(...args) {
		// we could do this more simply by just exporting a new instance as module export, but we wrap a function for more flexibility
		if (this.globalSingleton === undefined) {
			this.globalSingleton = new AppRoomServer(...args);
		}
		return this.globalSingleton;
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
	getOptionDbUrl() { return jrconfig.get("server:DB_URL"); }

	getOptionHttp() { return jrconfig.get("server:HTTP"); }

	getOptionHttpPort() { return jrconfig.get("server:HTTP_PORT"); }

	getOptionHttps() { return jrconfig.get("server:HTTPS"); }

	getOptionHttpsKey() { return jrconfig.get("server:HTTPS_KEY"); }

	getOptionHttpsCert() { return jrconfig.get("server:HTTPS_CERT"); }

	getOptionHttpsPort() { return jrconfig.get("server:HTTPS_PORT"); }

	getOptionSiteDomain() { return jrconfig.get("server:SITE_DOMAIN"); }

	getOptionDebugEnabled() { return jrconfig.getDefault("DEBUG", false); }

	getOptionUseFullRegistrationForm() { return jrconfig.getDefault("options:SIGNUP_FULLREGISTRATIONFORM", false); }

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
	getOptionsGravatar() { return jrconfig.getDefault("options:GRAVATAR_OPTIONS", {}); }
	//---------------------------------------------------------------------------






	//---------------------------------------------------------------------------
	setupConfigAndLoggingEnvironment() {
		// perform global configuration actions that are shared and should be run regardless of the cli app or unit tests

		// setup singleton loggers
		jrlog.setup(arGlobals.programName, this.getLogDir());

		// show some info about app
		jrlog.debugf("%s v%s (%s) by %s", arGlobals.programName, arGlobals.programVersion, arGlobals.programDate, arGlobals.programAuthor);

		jrlog.info("this is info");
		jrlog.error("this is error");

		// setup singleton jrconfig from options
		jrconfig.setDefaultOptions(arGlobals.defaultOptions);
		jrconfig.setOverrideOptions(arGlobals.overrideOptions);
		jrconfig.setEnvList(arGlobals.envListOptions);

		// DEFAULT base directory to look for config files -- caller can modify this
		jrconfig.setConfigDir(this.getBaseDir());
	}


	configFromJrConfig(ajrconfig) {
		// now parse commandline/config/env/ etc.
		ajrconfig.parseIfNotYetParsed();

		// enable debugging based on DEBUG field
		jrlog.setDebugEnable(this.getOptionDebugEnabled());
	}
	//---------------------------------------------------------------------------






	//---------------------------------------------------------------------------
	setupExpress() {
		// create this.express
		var expressApp = express();
		// save expressApp for easier referencing later
		this.expressApp = expressApp;

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
		this.setupExpressRoutes(expressApp);

		// fallback error handlers
		this.setupExpressErrorHandlers(expressApp);
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
		const morganMode = "combined";
		const morganOutputAbsoluteFilePath = jrlog.calcLogFilePath("access");
		var morganOutput = {
			stream: fs.createWriteStream(morganOutputAbsoluteFilePath, { flags: "a" }),
		};
		expressApp.use(morgan(morganMode, morganOutput));
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
			name: "approomconnect.sid",
			secret: "approomsecret",
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
		jrlog.cdebugf("Serving static files from '%s' at '%s", staticAbsoluteDir, staticUrl);

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
	setupExpressErrorHandlers(expressApp) {
		// catch 404 and forward to error handler
		expressApp.use((req, res, next) => {
			// so i think what this says is that if we get to this use handler,
			//  nothing else has caught it, so WE push on a 404 error for the next handler
			next(httpErrors(404));
		});

		// and then this is the fall through NEXT handler, which gets called when an error is unhandled by previous use() or pushed on with next(httperrors())
		// error handler
		expressApp.use((err, req, res, next) => {
			// set locals, only providing error in development
			res.locals.message = err.message;
			res.locals.error = req.app.get("env") === "development" ? err : {};
			// render the error page
			res.status(err.status || 500);
			res.render("error", {
				jrResult: JrResult.sessionRenderResult(req, res),
			});
		});
	}


	setupExpressCustomMiddleware(expressApp) {
		// setup any custom middleware

		// see our documentation in JrResult, we have decided to not use automatic injection of JrResult data
		// auto inject into render any saves session jrResult
		// expressApp.use(JrResult.expressMiddlewareInjectSessionResult());
	}
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	setupExpressRoutes(expressApp) {
		// add routes to express app

		// model requires
		const RoomModel = require("../models/room");
		const AclModel = require("../models/acl");
		const AppModel = require("../models/app");
		const ConnectionModel = require("../models/connection");
		const FileModel = require("../models/file");

		const OptionModel = require("../models/option");
		const UserModel = require("../models/user");
		const VerificationModel = require("../models/verification");
		const LoginModel = require("../models/login");

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

		// test stuff
		this.setupRoute(expressApp, "/membersonly", "membersonly");

		// crud stuff
		var crudUrlBase = "/admin";
		this.setupRouteGenericCrud(expressApp, crudUrlBase + "/app", AppModel);
		this.setupRouteGenericCrud(expressApp, crudUrlBase + "/room", RoomModel);
		this.setupRouteGenericCrud(expressApp, crudUrlBase + "/user", UserModel);
		this.setupRouteGenericCrud(expressApp, crudUrlBase + "/bridge", LoginModel);
		this.setupRouteGenericCrud(expressApp, crudUrlBase + "/verification", VerificationModel);
		this.setupRouteGenericCrud(expressApp, crudUrlBase + "/connection", ConnectionModel);
		this.setupRouteGenericCrud(expressApp, crudUrlBase + "/file", FileModel);
		this.setupRouteGenericCrud(expressApp, crudUrlBase + "/acl", AclModel);
		this.setupRouteGenericCrud(expressApp, crudUrlBase + "/option", OptionModel);
		this.setupRouteGenericCrud(expressApp, crudUrlBase + "/log", LogModel);

		// admin
		this.setupRoute(expressApp, "/admin", "admin");
	}


	setupRoute(expressApp, urlPath, routeFilename) {
		var route = require("../routes/" + routeFilename);

		// ok there are two ways that our route files can be written
		// the first is by exporting a setupRouter function, in which case we call it with urlPath and it returns the router
		// the older method just exports default router
		//
		if (route.setupRouter) {
			var expressRouter = route.setupRouter(urlPath);
			assert(expressRouter);
			expressApp.use(urlPath, expressRouter);
		} else {
			expressApp.use(urlPath, route);
		}
	}


	setupRouteGenericCrud(expressApp, urlPath, modelClass) {
		// function to set up crud paths for a model
		const CrudAid = require("../controllers/crudaid");
		// create router using express
		const router = express.Router();
		// setup paths on it
		CrudAid.setupRouter(router, modelClass, urlPath);
		// register it
		expressApp.use(urlPath, router);
		// let app model know about its crud path
		modelClass.setCrudBaseUrl(urlPath);
		// now return the router for further work
		return router;
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
			jrlog.cdebugObj(profile, "serializeUser profile");
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
			jrlog.cdebugObj(user, "deserializeUser user");
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
				jrlog.cdebugf("In passport local strategy test with username=%s and password=%s", usernameEmail, password);
				const UserModel = require("../models/user");
				var user = await UserModel.findOneByUsernameEmail(usernameEmail);
				if (!user) {
					// not found
					jrResult = JrResult.makeNew("UsernameNotFound").pushFieldError("usernameEmail", "Username/Email-address not found");
					return done(null, false, jrResult);
				}
				// ok we found the user, now check their password
				var bretv = await user.testPlaintextPassword(password);
				if (!bretv) {
					// password doesn't match
					jrResult = JrResult.makeNew("PasswordMismatch").pushFieldError("password", "Password does not match");
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
			clientID: jrconfig.get("passport:FACEBOOK_APP_ID"),
			clientSecret: jrconfig.get("passport:FACEBOOK_APP_SECRET"),
			callbackURL: this.calcAbsoluteSiteUrlPreferHttps("/login/facebook/auth"),
			passReqToCallback: true,
		};

		// debug info
		jrlog.cdebugObj(strategyOptions, "setupPassportStrategyFacebook options");

		passport.use(new Strategy(
			strategyOptions,
			async (req, accessToken, refreshToken, profile, done) => {
				jrlog.cdebugObj(accessToken, "facebook accessToken");
				jrlog.cdebugObj(refreshToken, "facebook refreshToken");
				jrlog.cdebugObj(profile, "facebook profile");
				// get user associated with this facebook profile, OR create one, etc.
				var bridgedLoginObj = {
					provider: profile.provider,
					providerUserId: profile.id,
					extraData: {
						realName: profile.displayName,
					},
				};
				// created bridged user
				const LoginModel = require("../models/login");
				var { user, jrResult } = await LoginModel.processBridgedLoginGetOrCreateUserOrProxy(bridgedLoginObj, req);
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
			this.createOneExpressServerAndListen(true, port, options);
		}

		if (this.getOptionHttp()) {
			// http server
			const options = {};
			const port = this.getOptionHttpPort();
			this.createOneExpressServerAndListen(false, port, options);
		}

	}



	createOneExpressServerAndListen(flagHttps, port, options) {
		// create an http or https server and listen
		var expressServer;

		var normalizedPort = this.normalizePort(port);

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
	}



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

		throw ("Unknown provider requested in getLoggedInPassportUserOfProvider");
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
			const UserModel = require("../models/user");
			user = await UserModel.findOneById(userId);
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
			const LoginModel = require("../models/login");
			login = await LoginModel.findOneById(loginId);
		}
		// cache it
		req.arCachedLogin = login;
		// return it
		return login;
	}


	// just shortcuts to verifcationModel statics
	async getLastSessionedVerification(req) {
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
			const VerificationModel = require("../models/verification");
			verification = await VerificationModel.findOneById(verificationId);
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

	forgetLastSessionVerification(req) {
		jrhelpers.forgetSessionVar(req, "lastVerificationId");
		jrhelpers.forgetSessionVar(req, "lastVerificationDate");
		/*
		if (req.session && req.session.lastVerificationId) {
			delete req.session.lastVerificationId;
			delete req.session.lastVerificationDate;
		}
		*/
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
	// generic passport route login helper function, invoked from login routes
	// this will end up calling a passport STRATEGY above
	// @param errorCallback is a function that takes (req,res,jrinfo) for custom error handling,
	//  where jrinfo is the JrResult style error message created from the passport error;
	//  normally you would use this to RE-RENDER a form from a post submission, overriding the
	//  default behavior to redirect to the login page with flash error message
	async routePassportAuthenticate(provider, req, res, next, providerNiceLabel, errorCallback) {
		// "manual" authenticate via passport (as opposed to middleware auto); allows us to get richer info about error, and better decide what to do

		// but before we authenticate and log in the user lets see if they are already "logged in" using a Login object
		var previousLoginId = this.getLoggedInLocalLoginIdFromSession(req);

		var thisArserver = this;
		await passport.authenticate(provider, async (err, user, info) => {
			if (err) {
				next(err);
				return;
			}
			if (!user) {
				// sometimes passport returns error info instead of us, when credentials are missing; this ensures we have error in format we like
				var jrinfo = JrResult.passportInfoAsJrResult(info);
				if (!errorCallback) {
					// save error to session (flash) and redirect to login
					jrinfo.addToSession(req);
					res.redirect("/login");
					return;
				}
				errorCallback(req, res, jrinfo);
				return;
			}

			// actually login the user
			var unusableLoginResult = await req.logIn(user, async (ierr) => {
				if (ierr) {
					// error (exception) logging them in
					// ATTN: are we sure we want to call next on ierr?
					next(ierr);
					return;
				}
				// success
				var jrResult = JrResult.makeNew("info");
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
					const LoginModel = require("../models/login");
					var jrResult2 = await LoginModel.connectUserToLogin(newlyLoggedInUserId, previousLoginId, false);
					if (jrResult2) {
						jrResult.mergeIn(jrResult2);
					}
				}
				// add message to session.
				jrResult.addToSession(req, true);

				// check if they were waiting to go to another page
				if (newlyLoggedInUserId && thisArserver.userLogsInCheckDiverted(req, res)) {
					return;
				}

				// new full account connected?
				if (newlyLoggedInUserId) {
					res.redirect("/profile");
					return;
				}
				// no user account made yet, default send them to full account fill int
				res.redirect("/register");
			});
		// ATTN: if we get here, we are back from failed login attempt?
		})(req, res, next);
	}
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	setupViewTemplateExtras() {
		// handlebar stuff

		// create general purpose handlebar helper functions we can call
		jrhandlebars.setupJrHandlebarHelpers();

		// parse and make available partials from files
		jrhandlebars.loadPartialFiles(this.getBaseSubDir("views/partials"), "");
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
			host: jrconfig.get("mailer:HOST"),
			port: jrconfig.get("mailer:PORT"),
			secure: jrconfig.get("mailer:SECURE"),
			auth: {
				user: jrconfig.get("mailer:USERNAME"),
				pass: jrconfig.get("mailer:PASSWORD"),
			},
		});

		jrlog.cdebugf("Setting up mail transport through %s.", jrconfig.get("mailer:HOST"));

		// verify it?
		if (jrconfig.get("DEBUG")) {
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
			mailobj.from = jrconfig.get("mailer:FROM");
		}

		var result = await this.mailTransport.sendMail(mailobj);
		jrlog.cdebugObj(result, "Result from sendMail.");
		var jrResult = this.makeJrResultFromSendmailRetv(result, mailobj);
		return jrResult;
	}


	makeJrResultFromSendmailRetv(retv, mailobj) {
		var msg;
		if (retv.rejected.length === 0) {
			// success!
			if (mailobj.revealEmail) {
				msg = "Mail sent to " + jrhelpers.stringArrayToNiceString(retv.accepted) + ".";
			} else {
				msg = "Mail sent.";
			}
			return JrResult.makeNew("SendmailSucccess").pushSuccess(msg);
		}
		// error
		if (mailobj.revealEmail) {
			msg = "Failed to send email to " + jrhelpers.stringArrayToNiceString(retv.rejected) + ".";
		} else {
			msg = "Failed to send email.";
		}
		return JrResult.makeNew("SendmailError").pushError(msg);
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

		if (error.syscall !== "listen") {
			throw error;
		}

		// ATTN: not clear why this uses different method than OnListeningEs to get port info, etc.
		var addr = listener.address();
		var bind = (typeof addr === "string")
			? "pipe " + addr
			: "port " + addr.port;

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
		jrlog.debug("Server (" + serverTypestr + ") started, listening on " + bind);
	}
	//---------------------------------------------------------------------------





	//---------------------------------------------------------------------------
	async runServer() {
		// run the server

		// setup express stuff
		this.setupExpress();

		// view/template extra stuff
		this.setupViewTemplateExtras();

		// other helper stuff
		await this.setupMailer();

		// other model stuff
		await this.setupAcl();

		// cache any options for faster access
		this.cacheMiscOptions();

		// now make the express servers (http AND/OR https)
		this.createExpressServersAndListen();

		// done setup
		return true;
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	async createAndConnectToDatabase() {
		// setup database stuff (create and connect to models -- callable whether db is already created or not)
		var bretv = false;

		// model requires
		const RoomModel = require("../models/room");
		const AclModel = require("../models/acl");
		const AppModel = require("../models/app");
		const ConnectionModel = require("../models/connection");
		const FileModel = require("../models/file");
		const OptionModel = require("../models/option");
		const UserModel = require("../models/user");
		const VerificationModel = require("../models/verification");
		const LoginModel = require("../models/login");

		try {
			// connect to db
			const mongoUrl = this.getOptionDbUrl();
			jrlog.cdebug("Connecting to mongoose-mongodb: " + mongoUrl);
			await mongoose.connect(mongoUrl, { useNewUrlParser: true, useCreateIndex: true });

			// setup the model databases
			await this.setupModelSchema(mongoose, AclModel);
			await this.setupModelSchema(mongoose, AppModel);
			await this.setupModelSchema(mongoose, ConnectionModel);
			await this.setupModelSchema(mongoose, FileModel);
			await this.setupModelSchema(mongoose, RoomModel);
			await this.setupModelSchema(mongoose, UserModel);
			//
			await this.setupModelSchema(mongoose, LoginModel);
			await this.setupModelSchema(mongoose, LogModel);
			await this.setupModelSchema(mongoose, OptionModel);
			await this.setupModelSchema(mongoose, VerificationModel);

			// display a list of all collections?
			if (false) {
				var collections = await mongoose.connection.db.listCollections().toArray();
				jrlog.debug("Collections:");
				jrlog.debug(collections);
				jrlog.debug("");
			}

			// set some options for mongoose/mongodb

			// to skip some deprecation warnigns; see https://github.com/Automattic/mongoose/issues/6880 and https://mongoosejs.com/docs/deprecations.html
			await mongoose.set("useFindAndModify", false);

			// deprecation warnings triggered by acl module
			mongoose.set("useCreateIndex", true);

			// save a log entry to db
			await this.log("db", "setup database", 1);

			// success return value -- if we got this far it"s a success; drop down
			bretv = true;
		} catch (err) {
			jrlog.debug("Exception while trying to setup database:");
			jrlog.debug(err);
			bretv = false;
		}

		return bretv;
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
		jrlog.debug("Closing mongoose-mongodb connection.");
		mongoose.disconnect();
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	async setupAcl() {
		const AclModel = require("../models/acl");
		await AclModel.setupAcl(mongoose.connection.db, "acl_");
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	async log(type, message, severity) {
		// create a new log entry and save it to the log

		// ATTN: should we async and await here or let it just run?
		var log = LogModel.createModel({
			type,
			message,
			severity,
		});
		await log.dbSave();

		// also log it using our normal system that makes us log to file?
		jrlog.dblog(type, message, severity);
	}
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	async requireLoggedIn(req, res, goalRelUrl) {
		var user = await this.getLoggedInUser(req);
		return this.requireUserIsLoggedIn(req, res, user, goalRelUrl);
	}

	requireUserIsLoggedIn(req, res, user, goalRelUrl, failureRelUrl) {
		// if user fails permission, remember the goalRelUrl in session and temporarily redirect to failureRelUrl and return false
		// otherwise return true

		// set failureRelUrl default
		if (!failureRelUrl) {
			failureRelUrl = "/login";
		}

		// we just need to check if the user is non-empty
		if (!user) {
			// ok this is failure, save rediret goal url
			this.rememberDivertedRelUrlAndGo(req, res, goalRelUrl, failureRelUrl, "You need to log in before you can access that page.");
			return false;
		}

		// they are good, so forget any previously remembered login diversions
		this.forgetLoginDiversions(req);

		return true;
	}


	divertToLoginPageThenBackToCurrentUrl(req, res) {
		// redirect them to login page and then back to their currently requested page
		var failureRelUrl = "/login";
		var goalRelUrl = req.originalUrl;
		this.rememberDivertedRelUrlAndGo(req, res, goalRelUrl, failureRelUrl, "You need to login before you can access that page.");
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
			JrResult.makeError("acl", msg).addToSession(req);
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
		jrhelpers.forgetSessionVar(req, "divertedUrl");
		/*
		if (req.session && req.session.divertedUrl) {
			delete req.session.divertedUrl;
		}
		*/
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	async loginUserThroughPassport(req, user) {
		var jrResult;
		var success = false;

		var userPassport = user.getMinimalPassportProfile();

		var unusableLoginResult = await req.login(userPassport, (err) => {
			if (err) {
				jrResult = JrResult.makeError("VerificationError", JrResult.passportErrorAsString(err));
			} else {
				success = true;
			}
			// note that if we try to handle success actions in here that have to async await, like a model save,
			//  we wind up in trouble for some reason -- weird things happen that i don't understand
			//  so instead we drop down on success and can check jrResult
		});

		if (success) {
			jrResult = JrResult.makeSuccess();
			// update login date and save it
			await user.updateloginDateAndSave(jrResult);
		} else if (!jrResult) {
			// unknown exception error that happened in passport login attempt?
			jrResult = JrResult.makeError("VerificationError", "Unknown passport login error in useNowOneTimeLogin.");
		}

		return jrResult;
	}
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	// present user with new account create form they can submit to ACTUALLY create their new account
	// this would typically be called AFTER the user has verified their email with verification model
	presentNewAccountRegisterForm(userObj, verification, req, res) {
		// ATTN: is this ever called
		throw ("presentNewAccountRegisterForm not implemented yet.");
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
	async aclRequireModelAccess(user, req, res, modelClass, accessTypeStr, modelId) {
		// return FALSE if we are denying user access
		// and in that case WE should redirect them or render the output
		// return TRUE if we should let them continue
		var access = false;

		if (!user) {
			user = await this.getLoggedInUser(req);
		}

		// ATTN: TEST - let's just fail them if they are not logged in
		if (!user) {
			access = false;
		} else {
			access = true;
		}

		// if we granted them access, just return true
		if (access) {
			return true;
		}

		// deny them access?

		if (!user) {
			// ok if we denied them access and they are not logged in, make them log in -- after that they may have permission
			this.divertToLoginPageThenBackToCurrentUrl(req, res);
		} else {
			// just tell them they don't have access
			this.renderAclAccessError(req, res, modelClass, "You do not have permissions to access this resource/page.");
		}

		return false;
	}


	renderAclAccessError(req, res, modelClass, errorMessage) {
		var jrError = JrResult.makeError("ACL", errorMessage);
		// render
		res.render("acldeny", {
			jrResult: JrResult.sessionRenderResult(req, res, jrError),
		});
	}

	renderAclAccessErrorResult(req, res, modelClass, jrResult) {
		// render
		res.render("acldeny", {
			jrResult: JrResult.sessionRenderResult(req, res, jrResult),
		});
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
		return this.csrfInstance(req, res, err => err);
	}


	getCsrf() {
		return this.csrfInstance;
	}

	forgetCsrfToken(req) {
		jrhelpers.forgetSessionVar(req, "csrfSecret");
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
			jrhelpers.forgetSessionVar(req, "views");
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
	async isLoggedInUserSuperAdmin(req) {
		var loggedInUser = await this.getLoggedInUser(req);
		if (loggedInUser) {
			return loggedInUser.isSuperAdmin();
		}
		return false;
	}
	//---------------------------------------------------------------------------



}






//---------------------------------------------------------------------------
// export A SINGLETON INSTANCE of the class as the sole export
module.exports = AppRoomServer.getSingleton();
//---------------------------------------------------------------------------
