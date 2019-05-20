// approom
// user model
// v1.0.0 on 5/1/19 by mouser@donationcoder.com
//
// The User model handles the database of users (members) who can log into the system

"use strict";

// modules
const ModelBaseMongoose = require("./modelBaseMongoose");

// our helper modules
const jrhelpers = require("../helpers/jrhelpers");
const jrlog = require("../helpers/jrlog");
const jrcrypto = require("../helpers/jrcrypto");


// constants
const DEF_passwordAdminPlaintextDefault = "test";



class UserModel extends ModelBaseMongoose {

	// global static version info
	static getVersion() { return 1; }

	// collection name for this model
	static getCollectionName() {
		return "users";
	}


	// accessors
	getId() { return this._id; }


	// User model mongoose db schema
	static buildSchema(mongooser) {
		var objschema = 
		this.schema = new mongooser.Schema({
			...(this.getUniversalSchemaObj()),
			username: {type: String, unique: true, required: true},
			realname: {type: String},
			email: {type: String},
			passwordObj: {type: String},
			passwordVersion: {type: Number},
			passwordDate: {type: Date},
			loginDate: {type: Date},
			authenticationDate: {type: Date},
			// do we need to save this?
			//loginId : {type: String},
		}, {collection: this.getCollectionName()});
		return this.schema;
	};


	// database init
	static async dbInit(mongooser) {
		jrlog.cdebug("Inside User dbInit");

		// see if admin user exists, if not add it
		//var doc = await this.mongooseModel.findOne().where("username","admin").exec();
		var doc = await this.mongooseModel.findOne({username: "admin"}).exec();
		if (doc==undefined) {
			// create admin object
			jrlog.cdebug("  Creating admin user");
			// hash password
			var passwordObj = await this.hashPasswordToObj(this.getPasswordAdminPlaintextDefault());
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
		//jrlog.debugObj(bretv,"PASS COMPARISON BRETV");
		return bretv;
	}


	// static hash password helper
	static async hashPasswordToObj(passwordPlaintext) {
		var oretv = await jrcrypto.hashPlaintextPasswordToObj(passwordPlaintext);
		return oretv;
	}


	static getPasswordObjForFieldSaving(passwordObj) {
		// simple helper that returns a new object with the fields we save to our USER model
		var obj = {
			passwordObj: JSON.stringify(passwordObj),
			passwordVersion: passwordObj.ver,
			passwordDate: passwordObj.date,
		};
		return obj;
	}


	// test
	static getPasswordAdminPlaintextDefault() { return DEF_passwordAdminPlaintextDefault; }
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	// lookup user by their username
	static async findOneByUsername(username) {
		// find a user by their username and return the matching model
		// return null if not found
		if (jrhelpers.isEmpty(username)) {
			return null;
		}
		var user = await this.mongooseModel.findOne({username: username}).exec();
		jrlog.cdebugObj(user,"in findOneByUsername");
		return user;
	}

	// lookup user by their id
	static async findOneById(id, flag_updateLoginDate) {
		// return null if not found
		if (jrhelpers.isEmpty(id)) {
			return null;
		}
		//
		var user;
		if (flag_updateLoginDate) {
			user = await this.mongooseModel.findOneAndUpdate({_id: id}, {$set:{loginDate:new Date}}).exec();
		} else {
			user = await this.mongooseModel.findOne({_id: id}).exec();
		}
		//
		return user;
	}

	// fine user by email
	static async findOneByEmail(email) {
		if (jrhelpers.isEmpty(email)) {
			return null;
		}
		// ask user model to find user by email
		// return null if not found
		var user = await this.mongooseModel.findOne({email: email}).exec();
		return user;
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	// validate email
	static async validateEmail(email, flag_mustBeUnique, flag_canBeBlank) {
		// return true if valid, or text of error if not
		// ATTN: unfinished

		if (jrhelpers.isEmpty(email)) {
			if (flag_canBeBlank) {
				return true;
			}
			return "Email cannot be blank";
		}

		// check if used by someone already
		if (flag_mustBeUnique) {
			var user = await this.findOneByEmail(email);
			if (user!==null) {
				return "Email already in use";
			}
		}

		// it's good
		return true;
	}


	// validate email
	static async validateUsername(username, flag_mustBeUnique, flag_canBeBlank) {
		// return true if valid, or text of error if not
		// ATTN: unfinished

		if (jrhelpers.isEmpty(username)) {
			if (flag_canBeBlank) {
				return true;
			}
			return "Username cannot be blank";
		}

		// check if used by someone already
		if (flag_mustBeUnique) {
			var user = await this.findOneByUsername(username);
			if (user!==null) {
				return "Username already in use";
			}
		}

		// it's good
		return true;
	}


	// validate email
	static async validatePassword(password, flag_canBeBlank) {
		// return true if valid, or text of error if not
		// ATTN: unfinished

		if (jrhelpers.isEmpty(password)) {
			if (flag_canBeBlank) {
				return true;
			}
			return "Password cannot be blank";
		}

		// check if used by someone already
		if (password.length<3) {
			return "Password is too short";
		}

		// it's good
		return true;
	}
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	getMinimalPassportProfile() {
		// return identifier for passport to track to know what user is logged in
		var profile = {
			// any time we are getting passport profile from a USER, it is local
			provider: this.id ? "localUser" : "localLogin",
			id: this.id,
			username: this.username,
			loginId: this.loginId,
		};

		return profile;
	}



	// create a unique user based on bridged login info
	static async createUniqueUserFromBridgedLogin(bridgedLoginObj, flag_updateLoginDate) {
		// this could be tricky because we may have collisions in our desired username, email, etc.
		var userObj = {
			username: jrhelpers.getNonEmptyPropertyOrDefault(bridgedLoginObj.extraData.userName, null),
			realname: jrhelpers.getNonEmptyPropertyOrDefault(bridgedLoginObj.extraData.realName, null),
			email: jrhelpers.getNonEmptyPropertyOrDefault(bridgedLoginObj.extraData.email, null),
			passwordHashed: null,
			passwordDate: null,
		};
		// modify or tweak username if its not unique
		await this.uniqueifyUserObj(userObj, bridgedLoginObj.provider_name+"_"+bridgedLoginObj.provider_id );
		// now create model (this will also add default properties to it)
		var user = UserModel.createModel(userObj);
		// set login date to now?
		if (flag_updateLoginDate) {
			user.loginDate = new Date;
		}
		// and save it
		var userdoc = await user.save();
		//
		return user;
	}


	static async uniqueifyUserObj(userObj, providerUniqueUserName) {
		// ensure userObj has a unique username (and any other fields? modifying properties as needed)
		const MAXTRIES = 100;
		const DEFAULT_USERNAME = "Usr";

		// first initialize username
		var username = userObj.username;
		if (jrhelpers.isEmpty(username)) {
			username = userObj.realname;
		}
		if (jrhelpers.isEmpty(username)) {
			username = providerUniqueUserName;
		}
		if (jrhelpers.isEmpty(username)) {
			username = DEFAULT_USERNAME;
		}
		// base name we will add random stuff to
		var baseUsername = username;
		// default username always gets random suffix
		if (username == DEFAULT_USERNAME) {
			username = baseUsername + "_" + this.randomUsernameSuffix();
		}
		// ok now loop trying to fix unique username by adding suffixes to uniqueify
		for (var i = 1; i<MAXTRIES; ++i) {
			// see if user with username already exists
			var user = await this.mongooseModel.findOne({username: username}).exec();
			if (user == null) {
				// ok no user by this name exists, so we can stop
				// save unique username found, and return
				userObj.username = username;
				return;
			}
			// already exists, so randomize and try again
			username = baseUsername + "_" + this.randomUsernameSuffix();
		}
		// we could not find a unique username (!?!?)
		throw("Could not create unique username.");
	}


	static randomUsernameSuffix() {
		// just return some random letters to add to a username that has a clash with an existing one
		const SUFFIXLEN = 4;
		return jrcrypto.genRandomString(SUFFIXLEN);
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	static async createUserFromObj(userObj) {
		// create a new user account
			var passwordObjForFieldSaving = this.getPasswordObjForFieldSaving(userObj.passwordHashedObj);
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
			jrlog.cdebugObj(userdoc,"new user");
			return userdoc;
	}


}





// export the class as the sole export
module.exports = UserModel;
