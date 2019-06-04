// approom
// user model
// v1.0.0 on 5/1/19 by mouser@donationcoder.com
//
// The User model handles the database of users (members) who can log into the system

"use strict";

// models
const ModelBaseMongoose = require("./modelBaseMongoose");

// our helper modules
const jrhelpers = require("../helpers/jrhelpers");
const jrlog = require("../helpers/jrlog");
const jrcrypto = require("../helpers/jrcrypto");
const JrResult = require("../helpers/jrresult");


//---------------------------------------------------------------------------
// constants
const DefDefaultUsername = "Usr";
const DefRandomUsernameRandomSuffixLength = 4;
//
const DefPasswordAdminPlaintextDefault = "test";
//
const DefRegexUsernamePattern = /^[A-Za-z][A-Za-z0-9_-]{3,16}$/;
const DefRegexUsernameExplanation = "Must start with a letter (a-z), followed by a string of letters,"
	+ " digits, and the symbols _ and -, minimum length of 3, maximum length of 16 (no spaces).";

// username legal properties, which we use to help us FIX imported usernames or report errors, etc.
// these should coincide with the regex check above, but are used to explicitly FIX usernames
const DefUsernameMinLength = 3;
const DefUsernameMaxLength = 16;
const DefUsernameAlwaysLowercase = false;
const DefUsernameAllowedStartingCharacters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DefUsernameAllowedCharacters = DefUsernameAllowedStartingCharacters + "0123456789-_";
//
const DefRegexPasswordPattern = /^.{3,64}$/;
const DefRegexPasswordExplanation = "Must be a string of letters, numbers, and symbols, with a minimum length of 3, maximum length of 64.";
const DefDisallowedUsernameList = ["admin*", "root", "guest", "user", "moderator*"];
//---------------------------------------------------------------------------




class UserModel extends ModelBaseMongoose {

	// global static version info
	static getVersion() { return 1; }

	// collection name for this model
	static getCollectionName() {
		return "users";
	}


	// accessors
	getIdAsString() {
		if (!this._id) {
			return "";
		}
		return this._id.toString();
	}

	getUsername() {
		return this.username;
	}


	// User model mongoose db schema
	static buildSchema(mongooser) {
		this.schema = new mongooser.Schema({
			...(this.getUniversalSchemaObj()),
			username: { type: String, unique: true, required: true },
			realname: { type: String },
			email: { type: String },
			passwordObj: { type: String },
			passwordVersion: { type: Number },
			passwordDate: { type: Date },
			loginDate: { type: Date },
			authenticationDate: { type: Date },
			// we don't put these in the db, they are just fields for when we create small temporary proxy users
			// loginId : { type: String },
			// verificationId: { type: String },
		}, { collection: this.getCollectionName() });
		return this.schema;
	}


	// database init
	static async dbInit(mongooser) {
		jrlog.cdebug("Inside User dbInit");

		// see if admin user exists, if not add it
		var doc = await this.mongooseModel.findOne({ username: "admin" }).exec();
		if (!doc) {
			// create admin object
			jrlog.cdebug("  Creating admin user");
			// hash password
			var passwordObj = await this.hashPassword(this.getPasswordAdminPlaintextDefault());
			var passwordObjForFieldSaving = this.getPasswordObjForFieldSaving(passwordObj);
			// create generic new object
			var userAdminObj = {
				username: "admin",
				realname: "jesse reichler",
				email: "mouser@donationcoder.com",
				// merge in passwordObjForFieldSaving data
				...passwordObjForFieldSaving,

			};
			// now create model (this will also add default properties to it)
			var user = UserModel.createModel(userAdminObj);
			// and save it
			var userdoc = await user.save();
			//
			jrlog.cdebugObj(userdoc, "  userAdmin");
		} else {
			jrlog.cdebug("  Found admin user.");
		}
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	// test password on a LOADED user object
	async testPassword(passwordPlaintext) {
		// return true if password matches, false if not or if any error
		var passwordObjParsed = JSON.parse(this.passwordObj);
		jrlog.cdebugObj(passwordObjParsed, "passwordObjParsed");
		var bretv = await jrcrypto.testPassword(passwordPlaintext, passwordObjParsed);
		return bretv;
	}


	// static hash password helper
	static async hashPassword(passwordPlaintext) {
		var oretv = await jrcrypto.hashPlaintextPassword(passwordPlaintext);
		return oretv;
	}


	static getPasswordObjForFieldSaving(passwordObj) {
		// simple helper that returns a new object with the fields we save to our USER model
		if (!passwordObj) {
			return {};
		}
		//
		var obj = {
			passwordObj: JSON.stringify(passwordObj),
			passwordVersion: passwordObj.ver,
			passwordDate: passwordObj.date,
		};
		return obj;
	}


	// test
	static getPasswordAdminPlaintextDefault() { return DefPasswordAdminPlaintextDefault; }
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	static async findOneByUsernameEmail(usernameEmail) {
		// find a user by their username and return the matching model
		// return null if not found
		// ATTN: Note that it is very important that our syntax forbids anyone having a username formatted like an email, or an email formatted like a username, otherwise
		// we will have 2 users with different info.
		if (!usernameEmail) {
			return null;
		}
		var user = await this.mongooseModel.findOne({
			$or: [
				{ username: usernameEmail },
				{ email: usernameEmail },
			],
		}).exec();
		jrlog.cdebugObj(user, "in findOneByUsernameEmail");
		return user;
	}


	// lookup user by their username
	static async findOneByUsername(username) {
		// find a user by their username and return the matching model
		// return null if not found
		if (!username) {
			return null;
		}
		var user = await this.mongooseModel.findOne({ username }).exec();
		jrlog.cdebugObj(user, "in findOneByUsername");
		return user;
	}

	// lookup user by their id
	static async findOneById(id, flagUpdateLoginDate) {
		// return null if not found
		if (!id) {
			return null;
		}
		//
		var user;
		if (flagUpdateLoginDate) {
			user = await this.mongooseModel.findOneAndUpdate({ _id: id }, { $set: { loginDate: new Date() } }).exec();
		} else {
			user = await this.mongooseModel.findOne({ _id: id }).exec();
		}
		//
		return user;
	}

	// fine user by email
	static async findOneByEmail(email) {
		if (!email) {
			return null;
		}
		// ask user model to find user by email
		// return null if not found
		var user = await this.mongooseModel.findOne({ email }).exec();
		return user;
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	// validate email
	static async validateEmail(email, flagMustBeUnique, flagCanBeBlank) {
		// return JrResult with error set if error, or blank one on success
		// ATTN: unfinished

		// validation helper
		const validator = require("validator");

		if (!email) {
			if (flagCanBeBlank) {
				return JrResult.makeSuccess();
			}
			return JrResult.makeNew("EmailInvalid").pushFieldError("email", "Email cannot be blank.");
		}

		// valid syntax?
		// see https://github.com/chriso/validator.js
		const isEmailOptions = {};
		if (!validator.isEmail(email, isEmailOptions)) {
			return JrResult.makeNew("EmailInvalid").pushFieldError("email", "Not a properly formatted email address.");
		}

		// check if used by someone already
		if (flagMustBeUnique) {
			var user = await this.findOneByEmail(email);
			if (user) {
				return JrResult.makeNew("EmailInvalid").pushFieldError("email", "Email already in use.");
			}
		}

		// it's good
		return JrResult.makeSuccess();
	}


	// validate username
	static async validateUsername(username, flagMustBeUnique, flagCanBeBlank) {
		// return JrResult with error set if error, or blank one on success
		// ATTN: unfinished

		// validation helper
		const validator = require("validator");

		if (!username) {
			if (flagCanBeBlank) {
				return JrResult.makeSuccess();
			}
			return JrResult.makeNew("UsernameInvalid").pushFieldError("username", "Username cannot be blank.");
		}

		// valid syntax?
		// see https://github.com/chriso/validator.js
		if (!validator.matches(username, DefRegexUsernamePattern)) {
			return JrResult.makeNew("UsernameInvalid").pushBiFieldError("username", "Not a legal username.", "Not a legal username: " + DefRegexUsernameExplanation);
		}

		// check against some blacklisted username
		var result = this.isDisallowedNewUsername(username);
		if (result.isError()) {
			return result;
		}

		// check if used by someone already
		if (flagMustBeUnique) {
			var user = await this.findOneByUsername(username);
			if (user) {
				return JrResult.makeNew("UsernameInvalid").pushFieldError("username", "Username already in use.");
			}
		}

		// it's good
		return JrResult.makeSuccess();
	}

	static isDisallowedNewUsername(str) {
		// return true if the str is not allowed for new users
		// note that his may include usernames or emails that admins are allowed to set up, just not users
		var errorStr;
		for (var word of DefDisallowedUsernameList) {
			if (word[word.length - 1] === "*") {
				// match against it or prefix
				word = word.substring(0, word.length - 1);
				if (str.startsWith(word)) {
					errorStr = "Cannot start with the reserved word '" + word + "'";
					break;
				}
			} else {
				if (str === word) {
					errorStr = "Cannot use the reserved word '" + word + "'";
					break;
				}
			}
		}

		if (errorStr !== undefined) {
			// error
			return JrResult.makeNew("UsernameInvalid").pushBiFieldError("username", "Invalid username", "Invalid username: " + errorStr);
		}
		// success
		return JrResult.makeSuccess();
	}


	// validate password
	static async validatePassword(password, flagCanBeBlank) {
		// return JrResult with error set if error, or blank one on success
		// ATTN: unfinished

		// validation helper
		const validator = require("validator");

		if (!password) {
			if (flagCanBeBlank) {
				return JrResult.makeSuccess();
			}
			return JrResult.makeNew("PasswordInvalid").pushFieldError("password", "Password cannot be blank.");
		}

		// valid syntax?
		// see https://github.com/chriso/validator.js
		if (!validator.matches(password, DefRegexPasswordPattern)) {
			return JrResult.makeNew("PasswordInvalid").pushBiFieldError("password", "Not a legal password.", "Not a legal password: " + DefRegexPasswordExplanation);
		}

		// it's good
		return JrResult.makeSuccess();
	}
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	getMinimalPassportProfile() {
		// return identifier for passport to track to know what user is logged in
		// if user is a real db model, then provider is "localUser"; otherwise it
		//  can be a minimal proxy for a bridged login or a verification based id, which is more like a pre-account login
		var provider;
		if (this.id) {
			provider = "localUser";
		} else if (this.loginId) {
			provider = "localLogin";
		} else if (this.verificationId) {
			provider = "localVerification";
		}
		var profile = {
			// any time we are getting passport profile from a USER, it is local
			provider,
			id: this.id,
			username: this.username,
			loginId: this.loginId,
			verificationId: this.verificationId,
		};

		return profile;
	}



	// create a unique user based on bridged login info
	static async createUniqueUserFromBridgedLogin(bridgedLoginObj, flagUpdateLoginDate) {
		// this could be tricky because we may have collisions in our desired username, email, etc.
		var userObj = {
			username: jrhelpers.getNonEmptyPropertyOrDefault(bridgedLoginObj.extraData.userName, null),
			realname: jrhelpers.getNonEmptyPropertyOrDefault(bridgedLoginObj.extraData.realName, null),
			email: jrhelpers.getNonEmptyPropertyOrDefault(bridgedLoginObj.extraData.email, null),
			passwordHashed: null,
			passwordDate: null,
		};
		// modify or tweak username if its not unique
		await this.uniqueifyUserObj(userObj, bridgedLoginObj.providerName + "_" + bridgedLoginObj.providerId);
		// now create model (this will also add default properties to it)
		var user = UserModel.createModel(userObj);
		// set login date to now?
		if (flagUpdateLoginDate) {
			user.loginDate = new Date();
		}
		// and save it
		await user.save();
		//
		return user;
	}


	static async uniqueifyUserObj(userObj, providerUniqueUserName) {
		// ensure userObj has a unique username (and any other fields? modifying properties as needed)

		// first initialize username
		var username = userObj.username;
		if (!username) {
			// is there a real name for this person
			username = userObj.realname;
		}
		if (!username) {
			// maybe providername is something we can use
			username = providerUniqueUserName;
		}
		if (!username) {
			// fall back on default username
			username = DefDefaultUsername;
		}

		// get a unique version of this
		// exception will be thrown if we cannot
		username = await this.fixImportedUsername(username);

		// store it
		userObj.username = username;
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	static async fixImportedUsername(username) {
		// we may have cases where we are importing a username, or getting one from a bridged login
		// here we need to ensure it meets our rules
		const MAXTRIES = 100;
		var jrResult;

		// part 1 is getting a syntax conforming username, short enough for us to add random suffix
		username = await this.fixImportedUsernameSyntaxLength(username);

		// remember name so we can add suffix if we need to in order to make unique
		var baseUsername = username;
		if (baseUsername.length + 1 + DefRandomUsernameRandomSuffixLength > DefUsernameMaxLength) {
			baseUsername = baseUsername.substring(0, DefUsernameMaxLength - (1 + DefRandomUsernameRandomSuffixLength));
		}

		// part 2 will be to add random suffixes if needed, until we get a unique one

		// ok now loop trying to fix unique username by adding suffixes to uniqueify
		for (var i = 1; i < MAXTRIES; ++i) {
			// see if user with username already exists (or if this is base default username we are pretending already exists)
			jrResult = await this.validateUsername(username, true, false);
			if (!jrResult.isError()) {
				// got a good unique username, so return it
				return username;
			}
			// already exists or unacceptable name, so randomize suffic and try again
			username = baseUsername + "_" + this.randomUsernameSuffix();
		}

		// we could not find a unique username (!?!?)
		throw ("Could not create unique username.");
	}


	static async fixImportedUsernameSyntaxLength(username) {
		// needs to be a valid username
		// we don't care if it is unique, but it must be short enough to add random suffix to
		// we may have to be clever to automate the process of "fixing" an illegal username

		if (!username) {
			// fall back on default username
			username = DefDefaultUsername;
		}

		// force lowercase?
		if (DefUsernameAlwaysLowercase) {
			username = username.toLowerCase();
		}

		// REMOVE bad characters

		// loop through the username
		var c;
		const allowedStartChars = DefUsernameAllowedStartingCharacters;
		const allowedChars = DefUsernameAllowedCharacters;
		for (var i = 0; i < username.length; ++i) {
			c = username.charAt(i);
			if ((i === 0 && DefUsernameAllowedStartingCharacters.indexOf(c) === -1) || (i > 0 && DefUsernameAllowedCharacters.indexOf(c) === -1)) {
				// not in our list of allowed characters, so splice it out
				username = username.substring(0, i) + username.substring(i + 1);
				// backup i so we look at next char in this position and continue
				--i;
			}
		}

		// fix length
		if (username.length > DefUsernameMaxLength) {
			// too long
			username = username.substring(0, DefUsernameMaxLength);
		} else if (username.length < DefUsernameMinLength) {
			// just add random characters
			username += this.randomUsernameSuffix();
		}

		// ok let's take an early try at validating it -- IT SHOULD be good.
		var jrResult;
		jrResult = await this.validateUsername(username, false, false);
		if (!jrResult.isError()) {
			// good!
			return username;
		}

		jrlog.debugObj(jrResult, "username validate result");

		// we got an error, it's not valid syntax.. but we removed all bad characters, corrected length, etc.
		throw ("Failed to fix imported username to comply with username syntax.");
	}


	static randomUsernameSuffix() {
		// just return some random letters to add to a username that has a clash with an existing one
		var str = jrcrypto.genRandomStringHumanEasy(DefRandomUsernameRandomSuffixLength);
		if (DefUsernameAlwaysLowercase) {
			str = str.toLowerCase();
		}
		return str;
	}
	//---------------------------------------------------------------------------





	//---------------------------------------------------------------------------
	static async createUserFromObj(userObj) {
		// create a new user account
		var passwordObjForFieldSaving = this.getPasswordObjForFieldSaving(userObj.passwordHashed);
		// create generic new object
		var userObjFull = {
			username: userObj.username,
			email: userObj.email,
			// merge in passwordObjForFieldSaving data
			...passwordObjForFieldSaving,

		};
			// now create model (this will also add default properties to it)
		var user = UserModel.createModel(userObjFull);
		// and save it
		var userdoc = await user.save();
		//
		jrlog.cdebugObj(userdoc, "new user");
		return userdoc;
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	// error helper
	static makeJrResultErrorNoUserFromField(key, value) {
		var jrResult = JrResult.makeNew("UserNotFound");
		var msgShort = "User not found.";
		var keylabel = (key === "usernameEmail") ? "username or email" : key;
		var msgLong = "No user found with user " + keylabel + " matching " + value + ".";
		jrResult.pushBiFieldError(key, msgShort, msgLong);
		return jrResult;
	}
	//---------------------------------------------------------------------------

















	//---------------------------------------------------------------------------
	static async fillReqBodyWithSessionedFieldValues(req) {
		// option fields
		var username;
		var email;
		var extraData;

		// initial values for the form to present them with

		const arserver = require("./server");

		// ok now let's check if they are sessioned with a LoginId; if so we might get initial values from that
		var login = await arserver.getLoggedInLogin(req);
		if (login) {
			// bridged login, get their requested (or default) username
			extraData = login.getExtraData();
			if (extraData.username) {
				username = extraData.username;
			}
			if (extraData.email) {
				email = extraData.email;
			}
			//			if (extraData.passwordHashed) {
			//				passwordHashed = extraData.passwordHashed;
			//			}
			if (!username && extraData.realName) {
				username = extraData.realName;
			}
			if (username) {
				username = await UserModel.fixImportedUsername(username);
			}
		}

		// sessioned with a verificationId? if so we could get initial values from that
		var verification = await arserver.getLoggedInVerification(req);
		if (verification && verification.type === "newAccountEmail") {
			if (verification.key === "email") {
				email = verification.val;
			}
			extraData = verification.getExtraData();
			if (extraData.username) {
				username = extraData.username;
			}
			if (extraData.email) {
				email = extraData.email;
			}
		}

		// store initial values for form in req.body, just as they would be if were were re-presending a failed form
		req.body.username = username;
		req.body.email = email;
	}
	//---------------------------------------------------------------------------

























	//---------------------------------------------------------------------------
	// New all in one registration/account form helper
	static async processAccountAllInOneForm(req) {
		var jrResult = JrResult.makeNew();
		var retvResult;
		var successRedirectTo;
		var flagAllowedUsedExpiredVerifyCode = false;

		// require models
		const arserver = require("./server");
		const VerificationModel = require("./verification");


		// get any verification code associated with this registration, to prove they own the email
		// verifyCode can come explicitly from the form (takes priority) OR the session if not in the form
		var verification;
		var verifyCode;
		//
		var verifyCodeForm = req.body.verifyCode;
		var verifyIdSession = arserver.getLoggedInLocalVerificationIdFromSession(req);
		if (verifyCodeForm) {
			// verification vode was explicitly provided in the form, so get the information from that
			// and in THIS case we will allow an expired code to be used, since
			verification = await VerificationModel.findOneByCode(verifyCodeForm);
			if (verification && verification.getIdAsString() === verifyIdSession) {
				// they explicitly provided a verification code, and its the same as we have in session, so we can use it even if its expired
				flagAllowedUsedExpiredVerifyCode = true;
			}
		} else {
			verification = await arserver.getLoggedInVerification(req);
			if (verification) {
			// set flag saying whether we allow a "used" verification for their email; we do this only in the case where the code is remembered in the session
				flagAllowedUsedExpiredVerifyCode = true;
			}
		}
		//
		if (verification) {
			// check if it actually is a verification object RELEVANT to registration
			var verificationType = verification.getTypestr();
			if (verificationType !== "newAccountEmail") {
				// not relevant to us, clear it
				verification = null;
			}
		}
		// now we need to check if its valid and expired
		if (verification) {
			var verificationResult = verification.isStillValid(flagAllowedUsedExpiredVerifyCode);
			if (verificationResult.isError()) {
				return verificationResult;
			}
		}




		// depending on how we are invoked we may allow for missing fields
		var requiredFields;
		if (verification) {
			// when we are following up on a verification, then this is a final registration
			requiredFields = this.calcRequiredRegistrationFieldsFinal();
		} else {
			// new registration, we only need certain info
			requiredFields = this.calcRequiredRegistrationFieldsInitial();
		}
		var flagAllowBlankEmail = !requiredFields.includes("email");
		var flagAllowBlankUsername = !requiredFields.includes("username");
		var flagAllowBlankPassword = !requiredFields.includes("password");

		// ATTN: note that it may be the case that a field is REQUIRED, but does not have to be present
		//  on the form if it is present in the verification record (e.g. they have verified their email)


		// ---
		// VALIDATE FIELDS

		// values from form
		var email = req.body.email;
		var username = req.body.username;
		var password = req.body.password;
		var passwordHashed = null;
		var flagVerifiedEmail = false;

		// blank values can assume verification values
		if (verification) {
			if (!email) {
				email = verification.getVerifiedValue("email");
				flagVerifiedEmail = true;
			} else {
				// they have provided an email -- if it doesn't match verificaiton email, then the verification is moot
				if (email !== verification.getVerifiedValue("email")) {
					flagVerifiedEmail = false;
				} else {
					flagVerifiedEmail = true;
				}
			}
			if (!username) {
				username = verification.getExtraValue("username");
			}
			if (!password) {
				passwordHashed = verification.getExtraValue("passwordHashed");
			}
		}


		// valid email?
		retvResult = await UserModel.validateEmail(email, true, flagAllowBlankEmail);
		if (retvResult.isError()) {
			jrResult.mergeIn(retvResult);
		}

		// valid username?
		retvResult = await UserModel.validateUsername(username, true, flagAllowBlankUsername);
		if (retvResult.isError()) {
			jrResult.mergeIn(retvResult);
		}

		// valid password?
		if (passwordHashed) {
			// we already have a valid hashed password for them, previously calculated and stored in verification object (and no new password specified), so we'll use that
		} else {
			retvResult = await UserModel.validatePassword(password, flagAllowBlankPassword);
			if (retvResult.isError()) {
				jrResult.mergeIn(retvResult);
			} else {
				// hash password for storage
				if (password) {
					// hash their password
					passwordHashed = await UserModel.hashPassword(password);
				}
			}
		}

		if (jrResult.isError()) {
			// error case, we can return now
			return { jrResult, successRedirectTo };
		}
		// ---


		// user data object, used in both cases below
		var extraData = {
			email,
			username,
			passwordHashed,
		};
		// ATTN: IMPORTANT NOTE
		// There are 2 cases we need to deal with here
		// Case 1: We already have verified proof they own this email, because they got here with a verifyCode that proves it (either provided in the form, or in their session)
		//  in which case we can create the account
		// Case 2: They somehow are on this page requesting a new account, without proof of they own the email (maybe they lost the verification coder, etc.)
		//  in this case, it's identical to asking for a registration
		// in case 1 we will complain if they try to use an email address in extraData that does not match the one in the verification;
		//  but alternately we could take a mismatch of email as a sign of case 2, and rather than complaining, just begin the email verification process again.
		//
		if (verification && flagVerifiedEmail) {
			// case 1, we can create the full account
			jrResult = await this.createFullNewUserAccount(req, verification, extraData);
			if (!jrResult.isError()) {
				if (arserver.getLoggedInLocalUserIdFromSession(req)) {
					// they have been logged in after verifying, so send them to their profile.
					successRedirectTo = "/profile";
				} else {
					successRedirectTo = "/login";
				}
			}
		} else {
			// case 2, it's an initial registration attempt for which we need to send them a verification

			// session user data (userId should be blank, but loginId might not be if they are doing this after a bridged login)
			var userId = arserver.getLoggedInLocalUserIdFromSession(req);
			var loginId = arserver.getLoggedInLocalLoginIdFromSession(req);

			// create the email verification and mail it
			jrResult = await VerificationModel.createVerificationNewAccountEmail(email, userId, loginId, extraData);

			// add message on success
			if (!jrResult.isError()) {
				// success
				jrResult.pushSuccess("Please check for the verification email.  You will need to confirm that you have received it before your account can be created.");
				successRedirectTo = "/verify";
			}
		}


		// return tuple with result and suggested succes redirect
		return { jrResult, successRedirectTo };
	}
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	static calcRequiredRegistrationFieldsInitial() {
		var requiredFields = ["email"];
		return requiredFields;
	}

	static calcRequiredRegistrationFieldsFinal() {
		var requiredFields = ["email", "username", "password"];
		return requiredFields;
	}
	//---------------------------------------------------------------------------





	//---------------------------------------------------------------------------
	// this is the function called when user submits their username and password to create their account
	// AFTER they have confirmed their email address
	// it is called from the account route
	// there is very similar code elsewhere that we would like to combine
	//
	// ATTN: there is redundant code here; better would be to call the generic UseVerification process with the extra info
	// IMPORTANT: extraData may contain an email address -- if so it MUST match the one in the verification, otherwise it is an error to complain about
	// NOTE: verifyCode can optionally be an already resolved verification object
	//
	static async createFullNewUserAccount(req, verification, userObj) {
		var jrResult, jrResult2;

		// log them in automatically after we create their account?
		var flagLogInUserAfterAccountCreate = true;

		// require models
		const arserver = require("./server");
		const LoginModel = require("./login");

		// create user
		var user = await UserModel.createUserFromObj(userObj);

		// success?
		if (user) {
			// success
			jrResult = JrResult.makeSuccess("Your new account with username '" + user.username + "' has been created.");
			// mark that it is used
			await verification.useUpAndSave();
			// now, if they were sessioned-in with a Login, we want to connect that to the new user
			//
			var loginId = arserver.getLoggedInLocalLoginIdFromSession(req);
			if (loginId) {
				jrResult2 = await LoginModel.connectUserToLogin(user, loginId, false);
				jrResult.mergeIn(jrResult2);
			}
			// if successfullly created new account, should we actually log them in at this point?
			if (!jrResult.isError()) {
				if (flagLogInUserAfterAccountCreate) {
					jrResult2 = await arserver.loginUserThroughPassport(req, user);
					jrResult.mergeIn(jrResult2);
				}
			}
			return jrResult;
		}

		jrResult = JrResult.makeError("RegistrationError", "Failed to create new user account.");
		return jrResult;
	}
	//---------------------------------------------------------------------------








}





// export the class as the sole export
module.exports = UserModel;
