/**
 * @module models/user
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 5/1/19
 * @description
 * The User model handles the database of users (members) who can log into the system
 */

"use strict";


// validation helper
const validator = require("validator");


// requirement service locator
const jrequire = require("../helpers/jrequire");

// models
const ModelBaseMongoose = jrequire("models/model_base_mongoose");
// const VerificationModel = jrequire("models/verification");


// our helper modules
const jrhMisc = require("../helpers/jrh_misc");
const jrdebug = require("../helpers/jrdebug");
const jrhCrypto = require("../helpers/jrh_crypto");
const JrResult = require("../helpers/jrresult");
const jrhValidate = require("../helpers/jrh_validate");
const jrhMongo = require("../helpers/jrh_mongo");
const jrhText = require("../helpers/jrh_text");

// controllers
const arserver = jrequire("arserver");
const aclAid = jrequire("aclaid");

// constants
const appdef = jrequire("appdef");






//---------------------------------------------------------------------------
// ATTN: Note that these constants may be hard to use outside of this module; we could move them to appdef instead for more global use
// constants
const DefDefaultUsername = "Usr";
const DefRandomUsernameRandomSuffixLength = 4;
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









/**
 * The User model handles the database of users (members) who can log into the system
 *
 * @class UserModel
 * @extends {ModelBaseMongoose}
 */
class UserModel extends ModelBaseMongoose {

	//---------------------------------------------------------------------------
	getModelClass() {
		// subclass overriding function that returns class instance (each subclass MUST implement this)
		return UserModel;
	}
	//---------------------------------------------------------------------------

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

	// name for acl lookup
	static getAclName() {
		return "user";
	}

	// name for logging
	static getLoggingString() {
		return "User";
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	static calcSchemaDefinition() {
		return {
			// we start with id, its contents will be overwritten by the getBaseSchemaDefinition call below, but this allows ut to put avatar below it but at the top, even though other inherited baseSchema fields come earlier
			_id: {},
			avatar: {
				label: "Avatar",
				valueFunction: async (jrContext, viewType, fieldName, obj, editData, helperData) => { return arserver.calcAvatarHtmlImgForUser(obj); },
				filterSize: 0,
			},
			//
			...(this.getBaseSchemaDefinition()),
			//
			username: {
				label: "Username",
				mongoose: {
					type: String,
					unique: true,
					required: true,
				},
			},
			realName: {
				label: "Real name",
				mongoose: {
					type: String,
				},
			},
			email: {
				label: "Email",
				mongoose: {
					type: String,
				},
			},
			emailBypassVerify: {
				label: "Bypass change verification email?",
				format: "checkbox",
				visibleFunction: async (jrContext, viewType, fieldName, obj, editData, helperData) => {
					if (viewType === "add" || viewType === "edit") {
						const bretv = await arserver.isLoggedInUserSiteAdmin(jrContext);
						return bretv;
					}
					return false;
				},
				// this is not a model field, but crud editor will remember whatever edit value is
			},
			emailPending: {
				// readonly display of pending change to email
				label: "Pending email change",
				readOnly: true,
				filterSize: 0,
				valueFunction: async (jrContext, viewType, fieldName, obj, editData, helperData) => { if (!obj) return undefined; return await obj.calcPendingEmailChange(jrContext); },
			},
			passwordHashed: {
				label: "Password",
				format: "password",
				valueFunction: this.makeModelValueFunctionPasswordAdminEyesOnly(false),
				filterSize: 0,
				mongoose: {
					type: String,
				},
			},
			apiCode: {
				label: "Api Code",
				mongoose: {
					type: String,
				},
			},
			roles: {
				label: "Roles",
				readOnly: true,
				valueFunction: async (jrContext, viewType, fieldName, obj, editData, helperData) => { return await this.roleDisplayValueFunction(jrContext, viewType, fieldName, obj, editData, helperData); },
				filterSize: 0,
			},

			//
			lastLoginDate: {
				label: "Date of last login",
				readOnly: true,
				mongoose: {
					type: Date,
				},
			},
			lastLoginIp: {
				label: "IP of last login",
				readOnly: true,
				mongoose: {
					type: String,
				},
			},
			lastAccessDate: {
				label: "Date of last access",
				readOnly: true,
				mongoose: {
					type: Date,
				},
			},
			lastAccessIp: {
				label: "IP of last access",
				readOnly: true,
				mongoose: {
					type: String,
				},
			},


			// additional fields we may add dynamically for in-memory use, but not saved to db
			// loginId : { type: ObjectId },
		};
	}





	static safeDisplayPasswordInfoFromPasswordHashed(passwordHashed) {
		// regex way
		if (true) {
			if (!passwordHashed) {
				return "";
			}
			const regexCensor = /"hash":"[^"]*"/;
			const safeStr = passwordHashed.replace(regexCensor, "\"hash\":[HIDDEN]");
			return safeStr;
		}

		// old way, dejson then rejson
		const passwordObj = this.passwordHashToObj(passwordHashed);
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
	// create new user obj
	static createModel(inobj) {
		return super.createModel(inobj);
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	// database init
	static async dbInit(mongooser) {
	}
	//---------------------------------------------------------------------------

	//---------------------------------------------------------------------------
	// accessors
	getUsername() {
		return this.username;
	}

	getExtRoles() {
		return this.extRoles;
	}
	//---------------------------------------------------------------------------





	//---------------------------------------------------------------------------
	// test password on a LOADED user object
	async testPlaintextPassword(passwordPlaintext) {
		// return true if password matches, false if not or if any error
		const passwordObj = this.getPasswordObj();
		const bretv = await jrhCrypto.testPlaintextPassword(passwordPlaintext, passwordObj);
		return bretv;
	}


	// static hash password helper
	static async hashPlaintextPasswordToObj(passwordPlaintext) {
		const oretv = await jrhCrypto.hashPlaintextPasswordToObj(passwordPlaintext);
		return oretv;
	}


	static passwordObjToHash(passwordObj) {
		if (!passwordObj) {
			return undefined;
		}
		return JSON.stringify(passwordObj);
	}

	static passwordHashToObj(passwordHashed) {
		const passwordObj = jrhMisc.createObjectFromJsonParse(passwordHashed, {});
		return passwordObj;
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	getPasswordObj() {
		// helper to get unstringified password obj from hash
		return UserModel.passwordHashToObj(this.passwordHashed);
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	static async mFindUserByUsernameEmailOrId(usernameEmailId) {
		// find a user by their username and return the matching model
		// return null if not found
		// ATTN: Note that it is very important that our syntax forbids anyone having a username formatted like an email, or an email formatted like a username, otherwise
		// we will have 2 users with different info.
		if (!usernameEmailId) {
			return null;
		}

		let user;

		// if it starts with # its a user id
		if (usernameEmailId.startsWith("#")) {
			const uid = usernameEmailId.substring(1, usernameEmailId.length);
			if (!jrhMongo.isValidMongooseObjectId(uid)) {
				user = null;
			} else {
				user = await this.mFindOneById(uid);
			}
		} else {
			user = await this.mFindUserByUsernameEmail(usernameEmailId);
		}

		return user;
	}


	static async mFindUserByUsernameEmail(usernameEmail) {
		// find a user by their username and return the matching model
		// return null if not found
		// ATTN: Note that it is very important that our syntax forbids anyone having a username formatted like an email, or an email formatted like a username, otherwise
		// we will have 2 users with different info.
		if (!usernameEmail) {
			return null;
		}
		const user = await this.mFindOne({
			$or: [
				{ username: usernameEmail },
				{ email: usernameEmail },
			],
		});

		return user;
	}


	// lookup user by their username
	static async mFindUserByUsername(username) {
		// find a user by their username and return the matching model
		// return null if not found
		if (!username) {
			return null;
		}
		const user = await this.mFindOne({ username });
		jrdebug.cdebugObj(user, "in findUserByUsername");
		return user;
	}

	// lookup user by their id
	static async mFindUserByIdAndUpdateLastLoginDate(id) {
		// return null if not found
		if (!id) {
			return null;
		}
		//
		const user = await this.mFindOneAndUpdate({ _id: id }, { $set: { lastLoginDate: new Date() } });
		//
		return user;
	}

	// fine user by email
	static async mFindUserByEmail(email) {
		if (!email) {
			return null;
		}
		// ask user model to find user by email
		// return null if not found
		const user = await this.mFindOne({ email });
		return user;
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	// validate email
	static async validateEmail(jrResult, email, flagMustBeUnique, flagRequired, existingUser) {
		// existingUser can be passed to avoid complaint about flagMustBeUnique
		// return JrResult with error set if error, or blank one on success

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
			const user = await this.mFindUserByEmail(email);
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
			const user = await this.mFindUserByUsername(username);
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
		let errorStr;
		for (let word of DefDisallowedUsernameList) {
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
	static async validatePlaintextPasswordConvertToHash(jrResult, passwordPlaintext, flagRequired, flagAllowClearDash) {
		// return JrResult with error set if error, or blank one on success
		// ATTN: unfinished

		if (!passwordPlaintext) {
			if (flagRequired) {
				jrResult.pushFieldError("password", "Password cannot be blank.");
			}
			return undefined;
		}

		// they can specify - as password which is a special meaning that we should CLEAR the password to "" which is ONLY legal if we are passed flagAllowClearDash
		if (flagAllowClearDash && passwordPlaintext === "-") {
			return null;
		}

		// valid syntax?
		// see https://github.com/chriso/validator.js
		if (!validator.matches(passwordPlaintext, DefRegexPasswordPattern)) {
			jrResult.pushBiFieldError("password", "Not a legal password.", "Not a legal password: " + DefRegexPasswordExplanation);
		}

		// it's good
		const passwordObj = await UserModel.hashPlaintextPasswordToObj(passwordPlaintext);
		const passwordHashed = this.passwordObjToHash(passwordObj);
		return passwordHashed;
	}
	//---------------------------------------------------------------------------














	//---------------------------------------------------------------------------
	getMinimalPassportProfile() {
		// return identifier for passport to track to know what user is logged in
		// if user is a real db model, then provider is "localUser"; otherwise it
		//  can be a minimal proxy for a bridged login or a verification based id, which is more like a pre-account login
		let provider;
		if (this.id) {
			provider = "localUser";
		} else if (this.loginId) {
			provider = "localLogin";
		}
		const profile = {
			// any time we are getting passport profile from a USER, it is local
			provider,
			userId: this.id,
			username: this.username,
			loginId: this.loginId,
		};

		return profile;
	}



	// create a unique user based on bridged login info
	static async createUniqueUserFromBridgedLogin(bridgedLoginObj, flagUpdateLastLoginDate) {
		// this could be tricky because we may have collisions in our desired username, email, etc.
		const userObj = {
			username: jrhMisc.getNonFalseValueOrDefault(bridgedLoginObj.getExtraDataField("username"), undefined),
			realName: jrhMisc.getNonFalseValueOrDefault(bridgedLoginObj.getExtraDataField("realName"), undefined),
			email: jrhMisc.getNonFalseValueOrDefault(bridgedLoginObj.getExtraDataField("email"), undefined),
			passwordHashed: undefined,
		};
		// modify or tweak username if its not unique
		await this.uniqueifyUserObj(userObj, bridgedLoginObj.providerName + "_" + bridgedLoginObj.providerId);
		// now create model (this will also add default properties to it)
		const user = UserModel.createModel(userObj);
		// set login date to now?
		if (flagUpdateLastLoginDate) {
			user.lastLoginDate = new Date();
		}
		// and save it
		await user.dbSave();
		//
		return user;
	}


	static async uniqueifyUserObj(userObj, providerUniqueUserName) {
		// ensure userObj has a unique username (and any other fields? modifying properties as needed)

		// first initialize username
		let username = userObj.username;
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
		const jrResult = JrResult.makeNew();

		const flagCheckDisallowedUsername = true;

		// part 1 is getting a syntax conforming username, short enough for us to add random suffix
		username = await this.fixImportedUsernameSyntaxLength(username);

		// remember name so we can add suffix if we need to in order to make unique
		let baseUsername = username;
		if (baseUsername.length + 1 + DefRandomUsernameRandomSuffixLength > DefUsernameMaxLength) {
			baseUsername = baseUsername.substring(0, DefUsernameMaxLength - (1 + DefRandomUsernameRandomSuffixLength));
		}

		// part 2 will be to add random suffixes if needed, until we get a unique one

		// ok now loop trying to fix unique username by adding suffixes to uniqueify
		for (let i = 1; i < MAXTRIES; ++i) {
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
		throw (new Error("Could not create unique username."));
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

		const flagCheckDisallowedUsername = true;

		// REMOVE bad characters

		// loop through the username
		let c;
		const allowedStartChars = DefUsernameAllowedStartingCharacters;
		const allowedChars = DefUsernameAllowedCharacters;
		for (let i = 0; i < username.length; ++i) {
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
		const jrResult = JrResult.makeNew();
		await this.validateUsername(jrResult, username, false, false, flagCheckDisallowedUsername, null);
		if (!jrResult.isError()) {
			// good!
			return username;
		}

		jrdebug.debugObj(jrResult, "username validate result");

		// we got an error, it's not valid syntax.. but we removed all bad characters, corrected length, etc.
		throw (new Error("Failed to fix imported username to comply with username syntax."));
	}


	static randomUsernameSuffix() {
		// just return some random letters to add to a username that has a clash with an existing one
		let str = jrhCrypto.genRandomStringHumanEasy(DefRandomUsernameRandomSuffixLength);
		if (DefUsernameAlwaysLowercase) {
			str = str.toLowerCase();
		}
		return str;
	}
	//---------------------------------------------------------------------------








	//---------------------------------------------------------------------------
	// error helper
	static addErrorNoUserFromField(jrContext, key, value) {
		let msgShort, msgLong;
		const keylabel = (key === "usernameEmail") ? "username or email" : key;
		if (!value) {
			msgShort = "Specify " + keylabel;
			msgLong = "No " + keylabel + " specified to search for.";
		} else {
			msgShort = "User not found.";
			msgLong = "No user found with user " + keylabel + " matching " + value + ".";
		}
		jrContext.pushBiFieldError(key, msgShort, msgLong);
	}
	//---------------------------------------------------------------------------























	//---------------------------------------------------------------------------
	static getSaveFields(operationType) {
		// operationType is commonly "crudAdd", "crudEdit"
		// return an array of field names that the user can modify when saving an object
		// this is a safety check to allow us to handle form data submitted flexibly and still keep tight control over what data submitted is used
		// subclasses implement; by default we return empty array
		// NOTE: this list can be generated dynamically based on logged in user
		let reta = [];
		if (operationType === "crudAdd" || operationType === "crudEdit" || operationType === "add") {
			reta = ["username", "realName", "email", "password", "passwordHashed", "apiCode", "disabled", "notes", "extraData"];
		}
		return reta;
	}



	// crud add/edit
	static async doValidateAndSave(jrContext, options, flagSave, user, source, saveFields, preValidatedFields, ignoreFields, obj) {
		// parse form and extrace validated object properies; return if error
		// obj will either be a loaded object if we are editing, or a new as-yet-unsaved model object if adding
		// ATTN: TODO there is duplication with code in registrationaid.js currently, because we are trying to decide where best to do these things - ELIMINATE
		let objdoc;
		//
		let flagCheckDisallowedUsername = true;
		let flagTrustEmailChange = false;
		const flagRrequiredEmail = false;
		const flagUserIsSiteAdmin = user && (await user.isSiteAdmin(jrContext));
		const flagIsNew = obj.getIsNew();

		// super users can do some things others cannot
		if (flagUserIsSiteAdmin) {
			flagCheckDisallowedUsername = false;
		}

		// REMEMBER old email addresss
		const emailAddressOld = obj.email;

		// set fields from form and validate
		await this.validateMergeAsync(jrContext, "username", "", source, saveFields, preValidatedFields, obj, true, async (jrr, keyname, inVal, flagRequired) => await UserModel.validateUsername(jrr, inVal, true, flagRequired, flagCheckDisallowedUsername, obj));

		// note that when validate password, we ALLOW it to be provided blank, BUT we tell validateMergeAsync that it is required field FOR THE OBJECT; normally flagRequired is passed from validateMergeAsync to form validate function, but in this case it's different since we don't want user to be able to REMOVE password
		await this.validateMergeAsync(jrContext, "password", "passwordHashed", source, saveFields, preValidatedFields, obj, true, async (jrr, keyname, inVal, flagRequired) => await UserModel.validatePlaintextPasswordConvertToHash(jrr, inVal, false, true));

		await this.validateMergeAsync(jrContext, "realName", "", source, saveFields, preValidatedFields, obj, false, (jrr, keyname, inVal, flagRequired) => jrhValidate.validateRealName(jrr, keyname, inVal, flagRequired));
		await this.validateMergeAsync(jrContext, "email", "", source, saveFields, preValidatedFields, obj, true, async (jrr, keyname, inVal, flagRequired) => this.validateEmail(jrr, inVal, true, flagRrequiredEmail, obj));
		await this.validateMergeAsync(jrContext, "apiCode", "", source, saveFields, preValidatedFields, obj, false, async (jrr, keyname, inVal, flagRequired) => jrhValidate.validateString(jrr, keyname, inVal, flagRequired));

		// base fields shared between all? (notes, etc.)
		await this.validateMergeAsyncBaseFields(jrContext, options, flagSave, source, saveFields, preValidatedFields, obj);

		// complain about fields in source that we aren't allowed to save
		await this.validateComplainExtraFields(jrContext, options, source, saveFields, preValidatedFields, ignoreFields);

		// can we trust them to bypass verification email
		if (options.flagTrustEmailChange) {
			flagTrustEmailChange = true;
		} else if (flagUserIsSiteAdmin) {
			const keynameEmailBypass = "emailBypassVerify";
			flagTrustEmailChange = jrhValidate.validateTrueFalse(jrContext.result, keynameEmailBypass, source[keynameEmailBypass], false);
		}

		if (flagIsNew && !flagTrustEmailChange) {
			jrContext.pushError("When creating a new user object directly, you *must* bypass the email verification setting.");
		}

		// any validation errors?
		if (jrContext.isError()) {
			return null;
		}

		// new email address we are about to save
		const emailAddressNew = obj.email;


		// do this last because it may send a verification email
		if (flagTrustEmailChange || emailAddressNew === "") {
			// nothing special to do, drop down to save new object with new email address
		} else {
			// we do NOT auto merge in an email change, instead send them a change of email address
			if (!jrContext.isError() && emailAddressNew !== emailAddressOld) {
				// they want to change their email address, dont do it yet; instead put it back to what it was
				obj.email = emailAddressOld;
				// send them a change of email verification
				await obj.createAndSendVerificationEmailChange(jrContext, emailAddressNew);
				if (user && obj.getIdAsM() === user.getIdAsM()) {
					jrContext.pushSuccess(`Your new email address is pending.  Please check ${emailAddressNew} for a verification link.  Your new email address will only take effect after you confirm it.`);
				} else {
					jrContext.pushSuccess(`The email address for user ${obj.username} will need to be verified before it is accepted; the user should check ${emailAddressNew} for a verification link.`);
				}
			}
		}

		// ATTN: unfinished - need to verify email changes
		// ATTN: unfinished - complains about reserved usernames for admin-only-usernames
		// ATTN: duslicateive code found in registrationaid and related files

		// any errors saving?
		if (jrContext.isError()) {
			return null;
		}

		// validated successfully

		if (flagSave) {
			// save it
			objdoc = await obj.dbSave(jrContext);
		}

		// return the saved object
		return objdoc;
	}
	//---------------------------------------------------------------------------





	//---------------------------------------------------------------------------
	async createAndSendVerificationEmailChange(jrContext, emailAddressNew) {
		const VerificationModel = jrequire("models/verification");
		const emailAddressOld = this.email;
		const userId = this.getIdAsM();
		return await VerificationModel.createAndSendVerificationEmailChange(jrContext, emailAddressOld, emailAddressNew, userId);
	}
	//---------------------------------------------------------------------------





	//---------------------------------------------------------------------------
	async getApiCodeEnsureValid() {
		// if user has a valid apiCode, just return it
		// if not, create and save one then return it
		// this will not CHANGE a valid one
		if (!this.apiCode) {
			await this.resetUpdateApiCode();
		}
		return this.apiCode;
	}

	async resetUpdateApiCode() {
		// update the apicode which will invalidate any previously issues api access tokens for user
		this.apiCode = jrhMisc.getPreciseNowString();
		// save it to database
		const userdoc = await this.dbSave();
		if (userdoc) {
			// return it
			return this.apiCode;
		}
		// error
		return null;
	}

	verifyApiCode(tokenApiCode) {
		// check if token api code matches user's latest apicode
		if (this.apiCode === tokenApiCode) {
			return true;
		}
		return false;
	}
	//---------------------------------------------------------------------------





































	//---------------------------------------------------------------------------
	/**
	 * Check if user has the permission on the object (or all objects of this type)
	 *
	 * @param {string} permission
	 * @param {string} [objectType=null]
	 * @param {string} [objectId=null]
	 * @returns true if they have permission
	 */
	async aclHasPermission(jrContext, permission, objectType = null, objectId = null) {
		// ATTN: TODO -- 11/20/19 - CACHE this answers to this function (with short duration), to save computation time (though it currently does not require db access)
		// return true if user has permission on (optional) objectId
		// permissions are derived from roles
		// by checking nonObjectSpecificRoles it means if the user is a GlobalModerator with no specific object, we will check permissions for that role too

		// ATTN:TODO we might also check if the arserver.getLoggedInPassportUsrToken(req) restricts access to this user..

		// get roles held on the object in question (optional)
		const flagAddNoneRole = true;
		const objectRoles = await this.getThisUsersRolesOnObject(objectType, objectId, flagAddNoneRole);

		jrdebug.cdebugObj(objectRoles, "ObjectRoles for user on object type " + objectType);

		// now ask if any of these rules imply the permission
		return await aclAid.anyRolesImplyPermission(jrContext, objectRoles, permission, objectType);
	}
	//---------------------------------------------------------------------------







	//---------------------------------------------------------------------------
	/**
	 * Check if user has permission to do the operation on ALL ids in the objectIdList
	 *
	 * @param {string} permission
	 * @param {string} objectType
	 * @param {array} objectIdList
	 * @returns true if they have permission
	 */
	async aclHasPermissionOnAll(jrContext, permission, objectType, objectIdList) {
		if (!this.aclHasPermission(jrContext, permission, objectType, appdef.DefAclObjectIdAll)) {
			// they don't have blanket permission, so we have to check each one
			for (let i = 0; i < objectIdList.length; ++i) {
				if (!this.aclHasPermission(jrContext, permission, objectType, objectIdList[i])) {
					return false;
				}
			}
		}

		// success!
		return true;
	}


	/**
	 * Return true if user has permission to see virtually deleted items on a model
	 *
	 * @param {*} modelClass
	 * @returns true if they have permission
	 */
	async aclHasPermissionSeeVDeletes(jrContext, modelClass) {
		return await this.aclHasPermission(jrContext, appdef.DefAclActionSeeVdeletes, modelClass.getAclName(), null);
	}





	//---------------------------------------------------------------------------





	//---------------------------------------------------------------------------
	async isSiteAdmin(jrContext) {
		// just check if user has permission to admin the site
		return await this.aclHasPermission(jrContext, appdef.DefAclActionAdminister, "site");
	}
	//---------------------------------------------------------------------------
























	//---------------------------------------------------------------------------
	async addOwnerCreatorRolesForNewObject(jrContext, obj, flagSaveUser) {
		// add owner role
		await this.addRole(jrContext, appdef.DefAclRoleOwner, obj.getModelClass().getAclName(), obj.getIdAsString());
		await this.addRole(jrContext, appdef.DefAclRoleCreator, obj.getModelClass().getAclName(), obj.getIdAsString());
		// save user
		if (flagSaveUser) {
			await this.dbSave(jrContext);
		}
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	static async setupCreateUser(jrContext, userObj) {
		let doc = await this.mFindOne({ username: userObj.username });
		if (!doc && userObj.email) {
			doc = await this.mFindOne({ email: userObj.email });
		}
		if (doc) {
			// user already exists
			jrdebug.cdebug(" SetupAid user already exists: " + userObj.username + ".");
			return true;
		}

		// announce
		jrdebug.debugObj(userObj, "Setup creating user");

		// does not exist, create it
		// ATTN: note that we do not validate it
		// ATTN: TODO - validate the user object?
		if (userObj.passwordPlaintext) {
			// convert plaintext password to hashed
			const passwordObj = await this.hashPlaintextPasswordToObj(userObj.passwordPlaintext);
			userObj.passwordHashed = this.passwordObjToHash(passwordObj);
			// clear plaintext password
			delete userObj.passwordPlaintext;
		}
		// create the user account
		const user = this.createModel(userObj);
		// add acl roles, if any
		if (userObj.setupRoles) {
			for (const role of userObj.setupRoles) {
				await user.addRole(jrContext, role.role, role.objectType, role.objectId);
			}
		}

		// save it
		const userdoc = await user.dbSave();

		// success
		return true;
	}
	//---------------------------------------------------------------------------







	//---------------------------------------------------------------------------
	async makeRoleAclChange(jrContext, operation, role, object) {
		// make a role change; the permissions have already been checked to make sure this is legal
		if (operation === "add") {
			if (!object) {
				await this.addRole(jrContext, role);
			} else {
				await this.addRole(jrContext, role, object.getModelClass().getAclName(), object.getIdAsString());
			}
		} else if (operation === "remove") {
			if (!object) {
				await this.deleteRole(jrContext, role);
			} else {
				await this.deleteRole(jrContext, role, object.getModelClass().getAclName(), object.getIdAsString());
			}
		} else {
			jrContext.pushFieldError("operation", "makeRoleAclChange operation must be from 'add' or 'remove'");
		}
	}
	//---------------------------------------------------------------------------




































	// new role (extRole) helpers


	//---------------------------------------------------------------------------
	static async roleDisplayValueFunction(jrContext, viewType, fieldName, obj, editData, helperData) {
		if (editData && fieldName in editData) {
			// no way to edit this
		}

		// can't get roles?
		if (!obj || (!obj.getAllRolesOnThisObject && !obj._id)) {
			return "n/a";
		}

		// get roles
		const RoleModel = jrequire("models/role");
		let roles;
		if (obj.loadRolesForUserIfNeeded) {
			// obj is a full user model obj
			roles = await obj.loadRolesForUserIfNeeded();
		} else if (obj._id) {
			// obj is a simple json object we need to look up roles by id
			roles = await RoleModel.loadRolesForUserById(obj._id);
		}

		// stringify them for nice display
		return RoleModel.stringifyRoles(roles, false, true);
	}
	//---------------------------------------------------------------------------

	//---------------------------------------------------------------------------
	// ATTN: these don't work quite as expected because we live in hell where everything is magic
	// we can set the property but it will be invisible in any console log, or object copy, json stringificationm, etc. FUCK YOU MONGOOSE
	// https://stackoverflow.com/questions/31534534/add-a-new-property-to-mongoose-document-after-fetch
	// https://stackoverflow.com/questions/14504385/why-cant-you-modify-the-data-returned-by-a-mongoose-query-ex-findbyid
	//
	async loadRolesForUserIfNeeded() {
		if (this.extRoles === undefined) {
			await this.reloadRolesForUser();
		}
		// return roles
		return this.extRoles;
	}

	async reloadRolesForUser() {
		// load all roles related to the user, and then add them to the user (at .extRoles)
		const RoleModel = jrequire("models/role");
		const roleList = await RoleModel.loadRolesForUserById(this.getIdAsM());
		// store it
		this.extRoles = roleList;
		// return it
		return this.extRoles;
	}
	//---------------------------------------------------------------------------























	//---------------------------------------------------------------------------
	// ACL stuff
	async getThisUsersRolesOnObject(objectType, objectId, flagAddNoneRole) {
		// get any roles the user is assigned to this ojbectId
		// if objectId is null then get roles unrelated to object
		// this will also return roles that match this objectType but have no objectId (meaning they are global)
		// this will also return roles that have no objectType or the "all" object type, i.e. global roles that MIGHT be relevant for this object
		// e.g. a site admin will always return the role "admin->site" when check if it has permission on a specific object

		// load roles for this users
		const roles = await this.loadRolesForUserIfNeeded();

		/*
		if (objectId && typeof objectId !== "string") {
			// mongo object ids are not strings
			objectId = objectId.toString();
		}
		*/

		// make sure objectId is null if not passed
		if (objectId === undefined) {
			objectId = null;
		}

		const rolesFound = [];

		jrdebug.cdebug("Asking for roles on objectType = " + objectType + " and objectid = " + objectId);

		// simple walk of roles array
		let matchesRole;
		let robjectType, robjectId;
		for (let i = 0; i < roles.length; i++) {
			matchesRole = false;
			// check if this role is relevant
			robjectType = roles[i].objectType;
			robjectId = roles[i].objectId;
			// jrdebug.cdebugObj(this.roles[key], "Examining roles " + key);
			if (robjectType === objectType && (robjectId === appdef.DefAclObjectIdAll || jrhMongo.equalIds(robjectId, objectId))) {
				// user has this permission on this object, or has this permission on ALL objects of this type (indicated by this.roles[key].i === appdef.DefAclObjectIdAll)
				matchesRole = true;
				// jrdebug.cdebug("Matches 1.");
			} else {
				// do we want roles not specifically related to this object type (for example if they are site admin)
				if ((robjectType === appdef.DefAclObjectTypeSite || robjectType === null) && (robjectId === appdef.DefAclObjectIdAll || robjectId === null)) {
					// here we have matched a global site role, or a role without a type, and there is no object id associated with it
					matchesRole = true;
					// jrdebug.cdebug("Matches 2.");
				}
			}

			if (matchesRole) {
				// found a role on this object, OR found a role that doesnt refer to an object but with flagCheckNonObjectSpecificRoles set
				// jrdebug.cdebug("We got a match for role " + key);
				rolesFound.push(roles[i].role);
			} else {
				// jrdebug.cdebug("We did NOT get a match for role " + key);
			}
		}

		if (flagAddNoneRole) {
			// add 'none' role, to help when looking for permissions related when we have no role on this object
			rolesFound.push(appdef.DefAclRoleNone);
		}

		return rolesFound;
	}



	async hasExplicitRole(role, objectType = null, objectId = null) {
		// return true if user has an explicit role on (optional) objectId

		// load roles for this users
		const roles = await this.loadRolesForUserIfNeeded();

		// simple walk of roles array
		for (let i = 0; i < roles.length; i++) {
			if (roles[i].role === role && roles[i].objectType === objectType && jrhMongo.equalIds(roles[i].objectId, objectId)) {
				// found it
				return true;
			}
		}
		// not found
		return false;
	}


	async addRole(jrContext, role, objectType = null, objectId = null) {
		// add that the user has role on objectId

		// first check if it already exists
		if (await this.hasExplicitRole(role, objectType, objectId)) {
			// already set
			return;
		}

		// add it
		const RoleModel = jrequire("models/role");
		await RoleModel.addRole(jrContext, this, role, objectType, objectId);
	}


	async deleteRole(jrContext, role, objectType = null, objectId = null) {
		// remove any record that user has role on objectId

		const cond = {
			userId: this.getIdAsM(),
			role,
			objectType,
			objectId,
		};

		const RoleModel = jrequire("models/role");
		await RoleModel.deleteRolesForUserByCondition(jrContext, this, cond);
	}
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	async updateLastLoginDate(jrContext, flagDoSave) {
		// update login date
		this.lastLoginDate = new Date();
		this.lastLoginIp = jrContext.getReqIpClean();
		// Always update access date when loggging in
		await this.updateLastAccessDate(jrContext, false);
		// Save changes (we might be passed 'false' if we plan to save later in request)
		if (flagDoSave) {
			await this.dbSave(jrContext);
		}
	}


	async updateLastAccessDateOccasionally(jrContext) {
		// the idea here would be to only do this one every X minutes
		if (!this.lastAccessDate || (Date.now() - this.lastAccessDate > arserver.getUpdateAccessDateFrequencyInMs())) {
			await this.updateLastAccessDate(jrContext, true);
		}
	}


	async updateLastAccessDate(jrContext, flagDoSave) {
		// update login date
		this.lastAccessDate = new Date();
		this.lastAccessIp = jrContext.getReqIpClean();
		if (flagDoSave) {
			await this.dbSave(jrContext);
		}
	}
	//---------------------------------------------------------------------------






	//---------------------------------------------------------------------------
	async calcPendingEmailChange(jrContext) {
		// look for a (still valid pending email change for user)
		const VerificationModel = jrequire("models/verification");
		const verifications = await VerificationModel.findAllVerificationsChangeEmail(jrContext, true, this.getIdAsM());
		if (!verifications) {
			return undefined;
		}

		// found some!
		let str = "";
		for (const verification of verifications) {
			if (str) {
				str += "\n<br/>";
			}
			str += verification.getValEnsureKey("email") + " (requested " + jrhText.formatDateNicely(verification.getCreationDate(), true) + ")";
		}
		return str;
	}
	//---------------------------------------------------------------------------



















}





// export the class as the sole export
module.exports = UserModel;
