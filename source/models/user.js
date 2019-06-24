// approom
// user model
// v1.0.0 on 5/1/19 by mouser@donationcoder.com
//
// The User model handles the database of users (members) who can log into the system

"use strict";

// models
const ModelBaseMongoose = require("./modelBaseMongoose");
const RegistrationAid = require("../controllers/registrationaid");

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

	//---------------------------------------------------------------------------
	// global static version info
	static getVersion() { return 1; }

	// collection name for this model
	static getCollectionName() {
		return "users";
	}

	// nice name for display
	static getNiceName() {
		return "User";
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	static getSchemaDefinition() {
		return {
			...(this.getBaseSchemaDefinition()),
			username: {
				type: String,
				unique: true,
				required: true,
				jr: {
					label: "Username",
				},
			},
			realname: {
				type: String,
				jr: {
					label: "Real name",
				},
			},
			email: {
				type: String,
				jr: {
					label: "Email",
				},
			},
			passwordObj: {
				type: String,
				jr: {
					label: "Password",
				},
			},
			passwordVersion: {
				type: Number,
				jr: {
					label: "Password version",
				},
			},
			passwordDate: {
				type: Date,
				jr: {
					label: "Date password was last changed/set",
				},
			},
			loginDate: {
				type: Date,
				jr: {
					label: "Date user last logged in",
				},
			},
			// additional fields we may add dynamically for in-memory use, but not saved to db
			// loginId : { type: ObjectId },
		};
	}

	static getSchemaDefinitionExtra() {
		return {
			...(this.getBaseSchemaDefinitionExtra()),
			username: {
				label: "Username",
			},
			realname: {
				label: "Real name",
			},
			email: {
				label: "Email",
			},
			passwordObj: {
				label: "Password",
				format: "password",
			},
			passwordVersion: {
				label: "Password version",
			},
			passwordDate: {
				label: "Date password set/modified",
			},
			loginDate: {
				label: "Date of last login",
			},
		};
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
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
			var userdoc = await user.dbSave();
			//
			jrlog.cdebugObj(userdoc, "  userAdmin");
		} else {
			jrlog.cdebug("  Found admin user.");
		}
	}
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	// accessors
	getUsername() {
		return this.username;
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

		if (errorStr) {
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
		}
		var profile = {
			// any time we are getting passport profile from a USER, it is local
			provider,
			id: this.id,
			username: this.username,
			loginId: this.loginId,
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
		await user.dbSave();
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
		var userdoc = await user.dbSave();
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




















}





// export the class as the sole export
module.exports = UserModel;
