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
const jrhelpers = require("../helpers/jrhelpers");
const JrResult = require("../helpers/jrresult");



class LoginModel extends ModelBaseMongoose {

	// global static version info
	static getVersion() { return 1; }

	// accessors
	getIdAsString() { return this._id.toString(); }

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
			loginDate: {type: Date},
		}, {collection: this.getCollectionName()});
		return this.schema;
	};



	// lookup user by their id
	static async findOneByProviderInfo(provider, provider_userid, flag_updateLoginDate) {
		// return null if not found
		if (jrhelpers.isEmpty(provider_userid)) {
			return null;
		}
		//
		var login;
		if (flag_updateLoginDate) {
			login = await this.mongooseModel.findOneAndUpdate( {provider:provider, provider_userid:provider_userid}, {$set:{loginDate:new Date}}).exec();
		} else {
			login = await this.mongooseModel.findOne({provider:provider, provider_userid:provider_userid}).exec();
		}
		//
		return login;
	}



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
		// potential result to return with extra messages
		var jrResult = JrResult.makeNew();

		// ATTN: we have a choice to make when someone performs a bridged login, we can EITHER create a real User object now, but perhaps without good final info about their desired username, etc
		// OR we can defer creating a new full User object at this point
		// regardless we will create a Login object so we can uniquely identify this visitor and remember their details for a subsequent deferred User account creation; but a Login object does not have a username or email
		//
		const flagMakeNewUser = true;
		//
		var eventAddedNewUser = false;
		var eventNewlyLinked = false;


		// ok first let's see if we can find an existing bridged login
		jrlog.cdebugObj(bridgedLoginObj, "Looking for existing bridged login.");
		// find it and ALSO atomically at same time update date of login
		var login = await this.findOneByProviderInfo(bridgedLoginObj.provider, bridgedLoginObj.provider_userid, true);
		if (login !== null) {
			// we found the bridged login, so just grab the associated user and return them
			jrlog.cdebugObj(login,"Found a matching login.");
			//
			if (!jrhelpers.isEmpty(login.userid)) {
				user = await UserModel.findOneById(login.userid, true);
				if (user!=null) {
					jrlog.cdebugObj(user,"Found a matching user.");
				} else {
					jrlog.cdebugObj(user,"Failed to find a matching user login even though login had a userid.");
				}
			}
		}


		if (user==null || user==undefined) {
			// either user not found or login not found
			// but first, let's ask -- is there a user already logged in that we want to connect? if not, we should create one
			if (existingUserId != null) {
				// there is already a user logged in, so just load this user
				user = await UserModel.findOneById(existingUserId, true);
			} else {
				// we want to create a new user associated with this bridged login
				if (flagMakeNewUser) {
					// make a new user object
					user = await UserModel.createUniqueUserFromBridgedLogin(bridgedLoginObj, true);
					if (!jrhelpers.isEmpty(user)) {
						eventAddedNewUser = true;
						jrResult.pushSuccess("A new user account has been created and assoicated with this "+bridgedLoginObj.provider+" login.");
					}
				} else {
					// create empty user object which is not saved to db
					user = new UserModel;
				}
			}
		}

		var userid = user.getIdAsString();

		// create Login if it's not been created yet; saving userId with it
		if (login==null || login==undefined) {
			// now we have a userid so we can create our bridged login entry
			var loginObj = {
				provider: bridgedLoginObj.provider,
				provider_userid: bridgedLoginObj.provider_userid,
				userid: userid,
				extraData: JSON.stringify(bridgedLoginObj.extraData),
				loginDate: new Date,
			};
			// create model (this will also add default properties to it)
			login = this.createModel(loginObj);
			await login.save();
			eventNewlyLinked = true;
		} else {
			// login already existed -- but did it have the right userid already?
			if (login.userid !== userid && userid !== null && userid !== undefined) {
				// ok we need to update login data to point to the new user
				// ATTN: We expect this case to happen login.userid is empty;
				// but is it possible for us to get here with login.userid with a real user? i think the only way would be if the user was not actually found; that would be the only way to make a new user with a different id and get to here.
				login.userid = userid;
				await login.save();
				eventNewlyLinked = true;
			}
		}

		if (eventNewlyLinked && !eventAddedNewUser && userid !== null && userid !== undefined) {
			// an existing user was either NEWLY linked to this existing login object, or with a newly created login object
			jrResult.pushSuccess("The "+bridgedLoginObj.provider+" login has now been linked with your existing user account.");
		}


		// NEW - ADD login id to user id -- this (may not) be saved to database, since that's not important, but WILL be carried around with session data after a user does a bridged login
		// this is most important if in this function we decide we do want to actually create a full user object here
		user.loginId = login.getIdAsString();

		// now return the associated user we found (or created above)
		return {
			user: user,
			jrResult: jrResult.undefinedIfBlank(),
		};
	}



}


// export the class as the sole export
module.exports = LoginModel;
