// approom
// login model
// v1.0.0 on 5/15/19 by mouser@donationcoder.com
//
// Handles bridged login data (e.g. facebook login, etc.)

"use strict";

// modules
const ModelBaseMongoose = require("./modelBaseMongoose");
const UserModel = require("./user");
//
const jrlog = require("../helpers/jrlog");



class LoginModel extends ModelBaseMongoose {

	// global static version info
	static getVersion() { return 1; }

	// collection name for this model
	static getCollectionName() {
		return "logins";
	}

	// User model mongoose db schema
	static buildSchema(mongooser) {
		this.schema = new mongooser.Schema({
			...(this.getUniversalSchemaObj()),
			provider: {type: String},
			provider_userid: {type: String},
			userid: {type: String},
			extraData: {type: String},
			lastLoginDate: {type: Date},
		}, {collection: this.getCollectionName()});
		return this.schema;
	};




	static async processBridgedLoginGetOrCreateUser(bridgedLoginObj, existingUserId) {
		// a successful bridged login has happened.
		// bridgedLoginObj has properties: provider, id
		//
		// we should first lookup the bridged login; if found, load that user and return it; they will be logged in.
		// if none is found, create a new bridged login
		//
		// then assuming this is a new bridged login without an associated user,
		// if existingUserId is null then create a new user and connect them to the new bridged login
		// if existingUserId is not null, then connect the new bridge to the existing (already logged in user)
		// return the user

		var user;

		// ok first let's see if we can find an existing bridged login
		jrlog.cdebugObj(bridgedLoginObj, "Looking for existing bridged login.");
		// find it and ALSO atomically at same time update date of login
		var login = await this.mongooseModel.findOneAndUpdate({provider:bridgedLoginObj.provider, provider_userid:bridgedLoginObj.provider_userid},{$set:{lastLoginDate:new Date}}).exec();
		if (login !== null) {
			// we found the bridged login, so just grab the associated user and return them
			jrlog.cdebugObj(login,"FOUND A MATCHING LOGIN");
			//
			user = await UserModel.findOneById(login.userid);
			jrlog.cdebugObj(user,"FOUND A MATCHING LOGIN USER");
		} else {

			// ok bridged login does not exist, so we will have to create one

			// but first, let's ask -- is there a user already logged in that we want to connect? if not, we should create one
			if (existingUserId != null) {
				// there is already a user logged in, so just load this user so we can grab their id, etc.
				user = await UserModel.findOneById(existingUserId);
			} else {
				// we want to create a new user associated with this bridged login
				user = await UserModel.createUniqueUserFromBridgedLogin(bridgedLoginObj);
			}

			// record their user id
			jrlog.cdebugObj(user,"User object before getid");
			existingUserId = user.getId();

			// now we have a userid so we can create our bridged login entry
			var loginObj = {
				provider: bridgedLoginObj.provider,
				provider_userid: bridgedLoginObj.provider_userid,
				userid: existingUserId,
				extraData: JSON.stringify(bridgedLoginObj.data),
				lastLoginDate: new Date,
			};
			// create model (this will also add default properties to it)
			login = this.createModel(loginObj);
			// and save it
			var logindoc = await login.save();
		}

		// now return the associated user we found (or created above)
		return user;
	}



}


// export the class as the sole export
module.exports = LoginModel;
