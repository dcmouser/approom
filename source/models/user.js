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
const jrvalidators = require("../helpers/jrvalidators");
const jrhmisc = require("../helpers/jrhmisc");

// controllers
const arserver = require("../controllers/server");



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
			},
			realName: {
				type: String,
			},
			email: {
				type: String,
			},
			passwordHashed: {
				type: String,
			},
			loginDate: {
				type: Date,
			},
			// additional fields we may add dynamically for in-memory use, but not saved to db
			// loginId : { type: ObjectId },
		};
	}


	static getSchemaDefinitionExtra() {
		return {
			// we start with id, its contents will be overwritten by the getBaseSchemaDefinitionExtra call below, but this will enforce order at top
			_id: {},
			avatar: {
				label: "Avatar",
				valueFunction: async (viewType, req, obj, helperData) => { return arserver.calcAvatarHtmlImgForUser(obj); },
				filterSize: 0,
			},
			...(this.getBaseSchemaDefinitionExtra()),
			username: {
				label: "Username",
			},
			realName: {
				label: "Real name",
			},
			email: {
				label: "Email",
			},
			emailBypassVerify: {
				label: "Bypass change verification email?",
				// hide: ["view", "list"],
				format: "checkbox",
				visibleFunction: async (viewType, req, obj, helperData) => {
					if (viewType === "edit") {
						return await arserver.isLoggedInUserSuperAdmin(req);
					}
					return false;
				},
			},
			passwordHashed: {
				label: "Password",
				format: "password",
				valueFunction: async (viewType, req, obj, helperData) => {
					var isLoggedInUserSuperAdmin = await arserver.isLoggedInUserSuperAdmin(req);
					if (viewType === "view") {
						if (isLoggedInUserSuperAdmin) {
							// for debuging
							return obj.passwordHashed;
						}
						// safe
						return this.safeDisplayPasswordInfoFromPasswordHashed(obj.passwordHashed);
					}
					if (viewType === "edit") {
						var appid = obj ? obj.appid : null;
						return jrhmisc.jrHtmlFormInputPassword("password", obj);
					}
					if (viewType === "list") {
						if (isLoggedInUserSuperAdmin) {
							return obj.passwordHashed;
						}
						if (!obj.passwordHashed) {
							return "";
						}
						return "[CENSORED]";
					}
					return undefined;
				},
				filterSize: 0,
			},
			loginDate: {
				label: "Date of last login",
				hide: ["edit"],
			},
		};
	}


	static safeDisplayPasswordInfoFromPasswordHashed(passwordHashed) {
		// regex way
		if (true) {
			if (!passwordHashed) {
				return "";
			}
			const regexCensor = /"hash":"[^"]*"/;
			var safeStr = passwordHashed.replace(regexCensor, "\"hash\":[CENSORED]");
			return safeStr;
		}

		// old way, dejson then rejson
		var passwordObj = this.passwordHashToObj(passwordHashed);
		if (!passwordObj) {
			return "";
		}
		if (passwordObj.hash) {
			passwordObj.hash = "***";
		}
		return (JSON.stringify(passwordObj));
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
			var passwordObj = await this.hashPlaintextPasswordToObj(this.getPasswordAdminPlaintextDefault());
			var passwordHashed = this.passwordObjToHash(passwordObj);
			// create generic new object
			var userAdminObj = {
				username: "admin",
				realName: "jesse reichler",
				email: "mouser@donationcoder.com",
				passwordHashed,
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

	updateloginDate() {
		// update login date
		this.loginDate = new Date();
	}

	async updateloginDateAndSave(jrResult) {
		this.updateloginDate();
		await this.dbSave(jrResult);
	}
	//---------------------------------------------------------------------------





	//---------------------------------------------------------------------------
	// test password on a LOADED user object
	async testPlaintextPassword(passwordPlaintext) {
		// return true if password matches, false if not or if any error
		var passwordObj = this.getPasswordObj();
		var bretv = await jrcrypto.testPlaintextPassword(passwordPlaintext, passwordObj);
		return bretv;
	}


	// static hash password helper
	static async hashPlaintextPasswordToObj(passwordPlaintext) {
		var oretv = await jrcrypto.hashPlaintextPasswordToObj(passwordPlaintext);
		return oretv;
	}


	static passwordObjToHash(passwordObj) {
		if (!passwordObj) {
			return undefined;
		}
		return JSON.stringify(passwordObj);
	}

	static passwordHashToObj(passwordHashed) {
		var passwordObj = jrhelpers.parseJsonObj(passwordHashed, {});
		return passwordObj;
	}

	// test
	static getPasswordAdminPlaintextDefault() { return DefPasswordAdminPlaintextDefault; }
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	getPasswordObj() {
		// helper to get unstringified password obj from hash
		return UserModel.passwordHashToObj(this.passwordHashed);
	}
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
	static async validateEmail(jrResult, email, flagMustBeUnique, flagRequired, existingUser) {
		// existingUser can be passed to avoid complaint about flagMustBeUnique
		// return JrResult with error set if error, or blank one on success

		// validation helper
		const validator = require("validator");

		if (!email) {
			if (!flagRequired) {
				return email;
			}
			jrResult.pushFieldError("email", "Email cannot be blank.");
			return undefined;
		}

		// valid syntax?
		// see https://github.com/chriso/validator.js
		const isEmailOptions = {};
		if (!validator.isEmail(email, isEmailOptions)) {
			jrResult.pushFieldError("email", "Not a properly formatted email address.");
			return undefined;
		}

		// check if used by someone already
		if (flagMustBeUnique) {
			var user = await this.findOneByEmail(email);
			if (user && (!existingUser || existingUser.id !== user.id)) {
				jrResult.pushFieldError("email", "Email already in use (" + email + ").");
				return undefined;
			}
		}

		// it's good
		return email;
	}


	// validate username
	static async validateUsername(jrResult, username, flagMustBeUnique, flagRequired, flagCheckDisallowed, existingUser) {
		// return JrResult with error set if error, or blank one on success
		// ATTN: unfinished

		// validation helper
		const validator = require("validator");

		if (!username) {
			if (!flagRequired) {
				return username;
			}
			jrResult.pushFieldError("username", "Username cannot be blank.");
			return undefined;
		}

		// valid syntax?
		// see https://github.com/chriso/validator.js
		if (!validator.matches(username, DefRegexUsernamePattern)) {
			jrResult.pushBiFieldError("username", "Not a legal username.", "Not a legal username: " + DefRegexUsernameExplanation);
			return undefined;
		}

		// check against some blacklisted username
		if (flagCheckDisallowed) {
			this.checkDisallowedNewUsername(jrResult, username);
			if (jrResult.isError()) {
				return undefined;
			}
		}

		// check if used by someone already
		if (flagMustBeUnique) {
			var user = await this.findOneByUsername(username);
			if (user && (!existingUser || existingUser.id !== user.id)) {
				jrResult.pushFieldError("username", "Username already in use.");
				return undefined;
			}
		}

		// it's good
		return username;
	}

	static checkDisallowedNewUsername(jrResult, username) {
		// return true if the str is not allowed for new users
		// note that his may include usernames or emails that admins are allowed to set up, just not users
		var errorStr;
		for (var word of DefDisallowedUsernameList) {
			if (word[word.length - 1] === "*") {
				// match against it or prefix
				word = word.substring(0, word.length - 1);
				if (username.startsWith(word)) {
					errorStr = "Cannot start with the reserved word '" + word + "'";
					break;
				}
			} else {
				if (username === word) {
					errorStr = "Cannot use the reserved word '" + word + "'";
					break;
				}
			}
		}

		if (errorStr) {
			// error
			jrResult.pushBiFieldError("username", "Invalid username", "Invalid username: " + errorStr);
			return undefined;
		}
		// success
		return username;
	}


	// validate password
	static async validatePlaintextPasswordConvertToHash(jrResult, passwordPlaintext, flagRequired) {
		// return JrResult with error set if error, or blank one on success
		// ATTN: unfinished

		// validation helper
		const validator = require("validator");

		if (!passwordPlaintext) {
			if (flagRequired) {
				jrResult.pushFieldError("password", "Password cannot be blank.");
			}
			return undefined;
		}

		// valid syntax?
		// see https://github.com/chriso/validator.js
		if (!validator.matches(passwordPlaintext, DefRegexPasswordPattern)) {
			jrResult.pushBiFieldError("password", "Not a legal password.", "Not a legal password: " + DefRegexPasswordExplanation);
		}

		// it's good
		var passwordObj = await UserModel.hashPlaintextPasswordToObj(passwordPlaintext);
		var passwordHashed = this.passwordObjToHash(passwordObj);
		return passwordHashed;
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
			username: jrhelpers.getNonEmptyPropertyOrDefault(bridgedLoginObj.getExtraData("username"), undefined),
			realName: jrhelpers.getNonEmptyPropertyOrDefault(bridgedLoginObj.getExtraData("realName"), undefined),
			email: jrhelpers.getNonEmptyPropertyOrDefault(bridgedLoginObj.getExtraData("email"), undefined),
			passwordHashed: undefined,
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
			username = userObj.realName;
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
		var jrResult = JrResult.makeNew();

		var flagCheckDisallowedUsername = true;

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
			jrResult.clear();
			await this.validateUsername(jrResult, username, true, false, flagCheckDisallowedUsername, null);
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

		var flagCheckDisallowedUsername = true;

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
		var jrResult = JrResult.makeNew();
		await this.validateUsername(jrResult, username, false, false, flagCheckDisallowedUsername, null);
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
	// error helper
	static makeJrResultErrorNoUserFromField(key, value) {
		var msgShort, msgLong;
		var keylabel = (key === "usernameEmail") ? "username or email" : key;
		if (!value) {
			msgShort = "Specify " + keylabel;
			msgLong = "No " + keylabel + " specified to search for.";
		} else {
			msgShort = "User not found.";
			msgLong = "No user found with user " + keylabel + " matching " + value + ".";
		}
		var jrResult = JrResult.makeNew("UserNotFound");
		jrResult.pushBiFieldError(key, msgShort, msgLong);
		return jrResult;
	}
	//---------------------------------------------------------------------------























	//---------------------------------------------------------------------------
	static getSaveFields(req, operationType) {
		// operationType is commonly "crudAdd", "crudEdit"
		// return an array of field names that the user can modify when saving an object
		// this is a safety check to allow us to handle form data submitted flexibly and still keep tight control over what data submitted is used
		// subclasses implement; by default we return empty array
		// NOTE: this list can be generated dynamically based on logged in user
		var reta;
		if (operationType === "crudAdd" || operationType === "crudEdit") {
			reta = ["username", "realName", "email", "password", "passwordHashed", "disabled"];
		}
		return reta;
	}



	// crud add/edit
	static async validateAndSave(jrResult, options, flagSave, req, source, saveFields, preValidatedFields, obj) {
		// parse form and extrace validated object properies; return if error
		// obj will either be a loaded object if we are editing, or a new as-yet-unsaved model object if adding
		// ATTN: TODO there is duplication with code in registrationaid.js currently, because we are trying to decide where best to do these things - ELIMINATE
		var objdoc;
		//
		var flagCheckDisallowedUsername = true;
		var flagTrustEmailChange = false;
		var flagUserIsSuperAdmin = await arserver.isLoggedInUserSuperAdmin(req);

		// super users can do some things others cannot
		if (flagUserIsSuperAdmin) {
			flagCheckDisallowedUsername = false;
		}

		// set fields from form and validate
		await this.validateMergeAsync(jrResult, "username", "", source, saveFields, preValidatedFields, obj, true, async (jrr, keyname, inVal) => await UserModel.validateUsername(jrr, inVal, true, false, flagCheckDisallowedUsername, obj));
		await this.validateMergeAsync(jrResult, "password", "passwordHashed", source, saveFields, preValidatedFields, obj, true, async (jrr, keyname, inVal) => await UserModel.validatePlaintextPasswordConvertToHash(jrr, inVal, false));
		await this.validateMergeAsync(jrResult, "realName", "", source, saveFields, preValidatedFields, obj, false, (jrr, keyname, inVal) => jrvalidators.validateRealName(jrr, keyname, inVal, false));
		await this.validateMergeAsync(jrResult, "disabled", "", source, saveFields, preValidatedFields, obj, true, (jrr, keyname, inVal) => this.validateModelFielDisbled(jrr, keyname, inVal));

		// can we trust them to bypass verification email
		if (options.flagTrustEmailChange) {
			flagTrustEmailChange = true;
		} else if (flagUserIsSuperAdmin) {
			var keynameEmailBypass = "emailBypassVerify";
			flagTrustEmailChange = jrvalidators.validateCheckbox(jrResult, keynameEmailBypass, source[keynameEmailBypass], false);
		}

		// do this last because it may send a verification email
		if (flagTrustEmailChange) {
			// merge in new email without validating it
			await this.validateMergeAsync(jrResult, "email", "", source, saveFields, preValidatedFields, obj, true, async (jrr, keyname, inVal) => await UserModel.validateEmail(jrr, inVal, true, false, obj));
		} else {
			// we do NOT auto merge in an email change, instead send them a change of email address
			var emailAddressNew = await UserModel.validateEmail(jrResult, source.email, true, false, obj);
			if (!jrResult.isError() && emailAddressNew && emailAddressNew !== obj.email) {
				// they want to change their email address, send them a change of email verification
				await obj.createAndSendVerificationEmailChange(emailAddressNew);
				jrResult.pushSuccess("Your new E-mail address is pending.  Please check " + emailAddressNew + " for a confirmation link.  Your new email address will only take effect after you confirm it.");
			}
		}

		// ATTN: unfinished - need to verify email changes
		// ATTN: unfinished - complains about reserved usernames for admin-only-usernames
		// ATTN: duslicateive code found in registrationaid and related files

		// any validation errors?
		if (jrResult.isError()) {
			return null;
		}

		// validated successfully

		if (flagSave) {
			// save it (success message will be pushed onto jrResult)
			objdoc = await obj.dbSave(jrResult);
		}

		// return the saved object
		return objdoc;
	}
	//---------------------------------------------------------------------------





	//---------------------------------------------------------------------------
	async createAndSendVerificationEmailChange(emailAddressNew) {
		const VerificationModel = require("./verification");
		var emailAddressOld = this.email;
		var userId = this.getId();
		return await VerificationModel.createAndSendVerificationEmailChange(emailAddressOld, emailAddressNew, userId);
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	isSuperAdmin() {
		// ATTN: a temporary test function
		if (this.getUsername() === "admin") {
			return true;
		}
		return false;
	}
	//---------------------------------------------------------------------------







}





// export the class as the sole export
module.exports = UserModel;
