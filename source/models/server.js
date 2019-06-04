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
const connectMongo = require("connect-mongo");
const morgan = require("morgan");
const http = require("http");
const bodyParser = require("body-parser");
const https = require("https");

// passport authentication stuff
const passport = require("passport");
const passportLocal = require("passport-local");
const passportFacebook = require("passport-facebook");

// misc modules
const path = require("path");
const fs = require("fs");

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

// model imports
const AclModel = require("./acl");
const AppModel = require("./app");
const ConnectionModel = require("./connection");
const FileModel = require("./file");
const RoomModel = require("./room");
const UserModel = require("./user");
const LoginModel = require("./login");
const LogModel = require("./log");
const OptionModel = require("./option");

// ATTN: circular reference problem? so we require this only when we need it below
// const VerificationModel = require("./verification");
// may have to do this with other models that also bring in require("server")




class AppRoomServer {

	// global static version info
	static getVersion() { return 1; }


	// global singleton request
	static getSingleton(...args) {
		// we could do this more simply by just exporting a new instance as module export, but we wrap a function for more flexibility
		if (this.globalSingleton === undefined) {
			this.globalSingleton = new AppRoomServer(...args);
		}
		return this.globalSingleton;
	}


	constructor() {
		this.valtest = 1;
	}


	//---------------------------------------------------------------------------
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
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	setupExpress() {
		// create this.express
		var expressApp = express();

		// view file engine setup
		expressApp.set("views", this.getBaseSubDir("views"));

		// handlebar template ending
		expressApp.set("view engine", "hbs");

		// setup logging stuff
		this.setupExpressLogging(expressApp);

		// other stuff?
		expressApp.use(express.json());
		expressApp.use(bodyParser.urlencoded({ extended: true }));

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

		// parse query parameters automatically
		expressApp.use(express.query());

		// static resources serving
		// setup a virtual path that looks like it is at staticUrl and it is served from staticAbsoluteDir
		const staticAbsoluteDir = this.getBaseSubDir("static");
		const staticUrl = "/static";
		expressApp.use(staticUrl, express.static(staticAbsoluteDir));
		jrlog.cdebugf("Serving static files from '%s' at '%s", staticAbsoluteDir, staticUrl);

		// save expressApp for easier referencing later
		this.expressApp = expressApp;
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


	setupExpressErrorHandlers() {
		// catch 404 and forward to error handler
		this.expressApp.use((req, res, next) => {
			// so i think what this says is that if we get to this use handler,
			//  nothing else has caught it, so WE push on a 404 error for the next handler
			next(httpErrors(404));
		});

		// and then this is the fall through NEXT handler, which gets called when an error is unhandled by previous use() or pushed on with next(httperrors())
		// error handler
		this.expressApp.use((err, req, res, next) => {
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


	setupExpressCustomMiddleware() {
		// setup any custom middleware

		// see our documentation in JrResult, we have decided to not use automatic injection of JrResult data
		// auto inject into render any saves session jrResult
		// this.expressApp.use(JrResult.expressMiddlewareInjectSessionResult());
	}





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
	setupExpressRoutes() {
		// add routes to express app

		// home page
		this.setupRoute("/", "index");

		// register/signup
		this.setupRoute("/register", "register");

		// login
		this.setupRoute("/login", "login");
		// logout
		this.setupRoute("/logout", "logout");

		// verifications
		this.setupRoute("/verify", "verify");

		// profile
		this.setupRoute("/profile", "profile");

		// test stuff
		this.setupRoute("/membersonly", "membersonly");
	}


	setupRoute(urlPath, routeFilename) {
		this.expressApp.use(urlPath, require("../routes/" + routeFilename));
	}
	//---------------------------------------------------------------------------






















	//---------------------------------------------------------------------------
	setupExpressPassport() {
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
		this.expressApp.use(passport.initialize());
		this.expressApp.use(passport.session());
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
				var user = await UserModel.findOneByUsernameEmail(usernameEmail);
				if (!user) {
					// not found
					jrResult = JrResult.makeNew("UsernameNotFound").pushFieldError("usernameEmail", "Username/Email-address not found");
					return done(null, false, jrResult);
				}
				// ok we found the user, now check their password
				var bretv = await user.testPassword(password);
				if (!bretv) {
					// password doesn't match
					jrResult = JrResult.makeNew("PasswordMismatch").pushFieldError("password", "Password does not match");
					return done(null, false, jrResult);
				}
				// password matches!
				// update last login time
				// return the minimal user info needed
				// IMP NOTE: the profile object we return here is precisely what gets passed to the serializeUser function above
				const userProfile = user.getMinimalPassportProfile();
				return done(null, userProfile);
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
				var { user, jrResult } = await LoginModel.processBridgedLoginGetOrCreateUserOrProxy(bridgedLoginObj, req);
				// if user could not be created, it's an error
				// add jrResult to session in case we did extra stuff and info to show the user
				if (jrResult !== undefined) {
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
		if (provider === "localVerification") {
			return passportUser.verificationId;
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
		var userId = this.getLoggedInLocalUserIdFromSession(req);
		if (!userId) {
			return null;
		}
		var user = await UserModel.findOneById(userId);
		return user;
	}

	async getLoggedInLogin(req) {
		var loginId = this.getLoggedInLocalLoginIdFromSession(req);
		if (!loginId) {
			return null;
		}
		var login = await LoginModel.findOneById(loginId);
		return login;
	}

	async getLoggedInVerification(req) {
		var verificationId = this.getLoggedInLocalVerificationIdFromSession(req);
		if (!verificationId) {
			return null;
		}
		const VerificationModel = require("./verification");
		var verification = await VerificationModel.findOneById(verificationId);
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

	// helper function to get logged in local Login model id
	getLoggedInLocalVerificationIdFromSession(req) {
		return this.getLoggedInPassportUserOfProvider(req, "localVerification");
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
				jrResult.pushSuccess("You have successfully logged in " + providerNiceLabel + ".");
				// userId we JUST signed in as -- NOTE: this could be null if its a local bridged login short of a full user account
				var newlyLoggedInUserId = thisArserver.getLoggedInLocalUserIdFromSession(req);
				// and NOW if they were previously sessioned with a pre-account Login object, we can connect that to this account
				if (newlyLoggedInUserId && previousLoginId) {
					// try to connect
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
		const hbs = require("hbs");

		// create general purpose handlebar helper functions we can call
		jrhandlebars.setupJrHandlebarHelpers(hbs);

		// parse and make available partials from files
		jrhandlebars.loadPartialFiles(hbs, this.getBaseSubDir("views/partials"));
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
	// Event listener for HTTP server "error" event.
	onErrorEs(listener, expressServer, flagHttps, error) {
		if (error.syscall !== "listen") {
			throw error;
		}

		// ATTN: not clear why this uses different method than OnListeningEs to get port info, etc.
		var port = listener.address().port;
		var bind = typeof port === "string"
			? "Pipe " + port
			: "Port " + port;

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
		this.setupExpressCustomMiddleware();
		this.setupExpressPassport();
		this.setupExpressRoutes();
		this.setupExpressErrorHandlers();


		// view/template stuff
		this.setupViewTemplateExtras();

		// other stuff
		await this.setupMailer();

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

		// try moving this here
		const VerificationModel = require("./verification");

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
			//
			// to skip some deprecation warnigns; see https://github.com/Automattic/mongoose/issues/6880 and https://mongoosejs.com/docs/deprecations.html
			await mongoose.set("useFindAndModify", false);

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
	async log(type, message, severity) {
		// create a new log entry and save it to the log

		// ATTN: should we async and await here or let it just run?
		var log = await LogModel.createModel({
			type,
			message,
			severity,
		}).save();

		// also log it using our normal system that makes us log to file?
		jrlog.dblog(type, message, severity);
	}
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	requireUserIsLoggedIn(req, res, user, goalRelUrl, failureRelUrl) {
		// if user fails permission, remember the goalRelUrl in session and temporarily redirect to failureRelUrl and return false
		// otherwise return true

		// we just need to check if the user is non-empty
		if (!user) {
			// ok this is failure, save rediret goal url
			this.rememberDivertedRelUrlAndGo(req, res, goalRelUrl, failureRelUrl, "You need to log in before you can access that page.");
			return false;
		}

		return true;
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
		if (!req.session || !req.session.divertedUrl) {
			return;
		}
		delete req.session.divertedUrl;
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







}






//---------------------------------------------------------------------------
// export A SINGLETON INSTANCE of the class as the sole export
module.exports = AppRoomServer.getSingleton();
//---------------------------------------------------------------------------
