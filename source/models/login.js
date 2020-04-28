/**
 * @module models/login
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 5/15/19
 * @description
 * The database object that represents information about bridged (facebook, etc.) logins
 */

"use strict";


// modules
const mongoose = require("mongoose");


// requirement service locator
const jrequire = require("../helpers/jrequire");

// models
const ModelBaseMongoose = jrequire("models/model_base_mongoose");
const UserModel = jrequire("models/user");

// helpers
const jrdebug = require("../helpers/jrdebug");
const JrResult = require("../helpers/jrresult");
const jrhMongo = require("../helpers/jrh_mongo");



/**
 * The database object that represents information about bridged (facebook, etc.) logins
 *
 * @class LoginModel
 * @extends {ModelBaseMongoose}
 */
class LoginModel extends ModelBaseMongoose {

	//---------------------------------------------------------------------------
	getModelClass() {
		// subclass overriding function that returns class instance (each subclass MUST implement this)
		return LoginModel;
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	// global static version info
	static getVersion() { return 1; }

	// collection name for this model
	static getCollectionName() {
		return "logins";
	}

	static getNiceName() {
		return "Bridged Login";
	}

	// name for acl lookup
	static getAclName() {
		return "login";
	}

	// name for logging
	static getLoggingString() {
		return "Login";
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	static calcSchemaDefinition() {
		return {
			...(this.getBaseSchemaDefinition()),
			//
			provider: {
				label: "3rd party provider",
				mongoose: {
					type: String,
				},
			},
			providerUserId: {
				label: "User id on provider network",
				mongoose: {
					type: String,
				},
			},
			userId: {
				label: "Local user id",
				crudLink: UserModel.getCrudUrlBase(),
				mongoose: {
					type: mongoose.Schema.ObjectId,
				},
			},
			loginDate: {
				label: "Date of last login",
				mongoose: {
					type: Date,
				},
			},
		};
	}
	//---------------------------------------------------------------------------





	//---------------------------------------------------------------------------
	// accessors
	getUserIdAsM() {
		return this.userId;
	}

	getUserIdAsString() {
		if (!this.userId) {
			return "";
		}
		return this.userId.toString();
	}

	getProviderLabel() {
		return this.provider;
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	// lookup user by their id
	static async findLoginByProviderInfo(provider, providerUserId, flagUpdateLoginDate) {
		// return null if not found
		if (!providerUserId) {
			return null;
		}
		//
		var login;
		if (flagUpdateLoginDate) {
			login = await this.findOneAndUpdateExec({ provider, providerUserId }, { $set: { loginDate: new Date() } });
		} else {
			login = await this.findOneExec({ provider, providerUserId });
		}
		//
		return login;
	}
	//---------------------------------------------------------------------------



	static async processBridgedLoginGetOrCreateUserOrProxy(bridgedLoginObj, req) {
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
		var eventAddedNewUser = false;
		var eventNewlyLinked = false;


		// ATTN: we have a choice to make when someone performs a bridged login, we can EITHER create a real User object now,
		//  but perhaps without good final info about their desired username, etc
		// OR we can defer creating a new full User object at this point
		// regardless we will create a Login object so we can uniquely identify this visitor and remember their details for
		//  a subsequent deferred User account creation; but a Login object does not have a username or email
		const flagMakeNewUser = false;


		// is there already a user logged into this section? if so we will bridge the new login bridge to the existing logged in user
		const arserver = jrequire("arserver");

		var existingUserId = arserver.getLoggedInLocalUserIdFromSession(req);

		// ok first let's see if we can find an existing bridged login
		jrdebug.cdebugObj(bridgedLoginObj, "Looking for existing bridged login.");
		// find it and ALSO atomically at same time update date of login
		var login = await this.findLoginByProviderInfo(bridgedLoginObj.provider, bridgedLoginObj.providerUserId, true);
		if (login !== null) {
			// we found the bridged login, so just grab the associated user and return them
			jrdebug.cdebugObj(login, "Found a matching login.");
			//
			if (login.userId) {
				user = await UserModel.findUserByIdAndUpdateLoginDate(login.userId);
				if (user) {
					jrdebug.cdebugObj(user, "Found a matching user.");
				} else {
					jrdebug.cdebugObj(user, "Failed to find a matching user login even though login had a user id.");
				}
			}
		}


		if (!user) {
			// either user not found or login not found
			// but first, let's ask -- is there a user already logged in that we want to connect? if not, we should create one
			if (existingUserId != null) {
				// there is already a user logged in, so just load this user
				user = await UserModel.findUserByIdAndUpdateLoginDate(existingUserId);
			}

			if (!user) {
				// IMPORTANT: DO WE want to create a new user associated with this bridged login?
				if (flagMakeNewUser) {
					// make a new user object, this WILL find and assign a UNIQUE username (based on their real name), and leave the account without a password
					user = await UserModel.createUniqueUserFromBridgedLogin(bridgedLoginObj, true);
					if (user) {
						eventAddedNewUser = true;
						jrResult.pushSuccess("A new user account has been created and assoicated with this " + bridgedLoginObj.provider + " login.");
					}
				} else {
					// create a proxy empty user object which is not saved to db
					// in this formulation, we are NOT saving a user to the database
					// note: if an attempt is made to save this to database it will fail, as it has no username, etc.
					user = new UserModel();
				}
			}
		}

		var userId = user.getIdAsM();

		// create Login if it's not been created yet; saving userId with it
		if (!login) {
			// now we have a userId so we can create our bridged login entry
			var loginObj = {
				provider: bridgedLoginObj.provider,
				providerUserId: bridgedLoginObj.providerUserId,
				userId,
				extraData: bridgedLoginObj.extraData,
				loginDate: new Date(),
			};
			// create model (this will also add default properties to it)
			login = this.createModel(loginObj);
			await login.dbSave();
			eventNewlyLinked = true;
		} else {
			// login already existed -- but did it have the right userId already?
			if (userId && !jrhMongo.mongoIdEqual(login.getUserIdAsM(), userId)) {
				// ok we need to update login data to point to the new user
				// ATTN: We expect this case to happen when login.userId is empty;
				// but is it possible for us to get here with login.userId with a real user?
				//  i think the only way would be if the user was not actually found; that would be the only way to make a new user with a different id and get to here.
				login.userId = userId;
				await login.dbSave();
				eventNewlyLinked = true;
			}
		}

		if (eventNewlyLinked && !eventAddedNewUser && userId) {
			// an existing user was either NEWLY linked to this existing login object, or with a newly created login object
			jrResult.pushSuccess("The " + bridgedLoginObj.provider + " login has been linked with your existing user account.");
		}


		// NEW - ADD login id to user id -- this (may not) be saved to database,
		//  since that's not important, but WILL be carried around with session data after a user does a bridged login
		// this is most important if in this function we decide we do want to actually create a full user object here
		user.loginId = login.getIdAsM();

		// now return the associated user we found (or created above)
		return {
			user,
			jrResult: jrResult.undefinedIfBlank(),
		};
	}



	static async connectUserToLogin(existingUserId, existingLoginId, flagConnectEvenIfLoginHasUser) {
		// potentially set the userId of a login object -- useful if user logs in when they are already logged in with a Login objjet
		if (!existingUserId || !existingLoginId) {
			return null;
		}

		var user;
		var login;

		// shortcuts for calling with already resolved user
		if (existingUserId instanceof UserModel) {
			user = existingUserId;
		} else {
			user = await UserModel.findOneById(existingUserId);
		}
		if (existingLoginId instanceof LoginModel) {
			login = existingLoginId;
		} else {
			login = await LoginModel.findOneById(existingLoginId);
		}

		if (!user || !login) {
			return null;
		}

		// should we connect (note that userId comparison is not !== because im not sure if .userId is a string natively)
		if (login.userId && login.getUserIdAsM() !== user.getIdAsM() && !flagConnectEvenIfLoginHasUser) {
			// mismatch, dont connect them
			return null;
		}

		// connect them!
		login.userId = user.getIdAsM();
		await login.dbSave();
		var jrResult = JrResult.makeSuccess("Connected your " + login.provider + " login with this user account.");
		return jrResult;
	}










}


// export the class as the sole export
module.exports = LoginModel;
