// approom
// user model
// v1.0.0 on 5/1/19 by mouser@donationcoder.com
//
// The User model handles the database of users (members) who can log into the system

"use strict";

// modules
const ModelBaseMongoose = require("./modelBaseMongoose");
const jrhelpers = require("../helpers/jrhelpers");


// constants
const passwordAlgorithmDefault = "sha512";
const passwordAdminPlaintextDefault = "test";



class UserModel extends ModelBaseMongoose {

	// global static version info
	static getVersion() { return 1; }

	// collection name for this model
	static getCollectionName() {
		return "users";
	}


	// User model mongoose db schema
	static buildSchema(mongooser) {
		var objschema = 
		this.schema = new mongooser.Schema({
			...(this.getUniversalSchemaObj()),
			username: {type: String, unique: true, required: true},
			realname: {type: String},
			email: {type: String},
			passwordHashed: {type: String},
			passwordDate: {type: Date},
		}, {collection: this.getCollectionName()});
		return this.schema;
	};


	// database init
	static async dbInit(mongooser) {
		console.log("Inside User dbInit");

		// see if admin user exists, if not add it
		var doc = await this.mongooseModel.findOne().where("username","admin").exec();
		if (doc==undefined) {
			// create admin object
			console.log("  Creating admin user");
			// create generic new object
			var userAdminObj = this.createNewObj();
			// add details
			userAdminObj.username = "admin";
			userAdminObj.realname = "jesse reichler";
			userAdminObj.email = "mouser@donationcoder.com";
			// hash password and add it
			var passwordObj = jrhelpers.createPasswordObj(passwordAdminPlaintextDefault, passwordAlgorithmDefault);
			userAdminObj = {...userAdminObj, ...passwordObj};
			// now save+add the doc to database
			var userAdmin = new UserModel.mongooseModel(userAdminObj);
			var doc = await userAdmin.save();
			//
			jrhelpers.consoleLogObj(doc, "  userAdmin");
		} else {
			console.log("  Found admin user.");
		}
	}


	// create new user
	static createNewObj() {
		var obj = super.createNewObj();
		return obj;
	}


	// test password on a LOADED user object
	testPassword(passwordPlaintext) {
		// return true if password matches, false if not or if any error
		var passwordHashStringFromDb = this.passwordHashed;
		//jrhelpers.consoleLogObj(passwordHashStringFromDb, "password from db");
		var bretv = jrhelpers.testPassword(passwordPlaintext, passwordHashStringFromDb);
		return bretv;
	}


	// test
	static getPasswordAdminPlaintextDefault() { return passwordAdminPlaintextDefault; }
}


// export the class as the sole export
module.exports = UserModel;
