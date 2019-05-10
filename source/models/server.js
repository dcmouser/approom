// approom
// server model
// v1.0.0 on 5/1/19 by mouser@donationcoder.com
//
// The Server model is a singleton object that manages general settings for the server system

"use strict";


// database imports
const mongoose = require("mongoose");

// model imports
const AclModel = require("./acl");
const AppModel = require("./app");
const ConnectionModel = require("./connection");
const FileModel = require("./file");
const RoomModel = require("./room");
const UserModel = require("./user");


// global singleton
var globalSingletonServerInstance = undefined;


class AppRoomServer {

	// static class properties
	// this.globalSingletonServerInstance

	// global static version info
	static getVersion() { return 1; }

	// global singleton request
	static getSingleton() {
		// because most of the use of this system will be as a single global instance, we provide a helper singleton for this with a hardcoded database name.
		// But the code supports multiple servers running off of multiple databases, by creating your own new AppRoomServer objects
		if (this.globalSingletonServerInstance === undefined) {
			this.globalSingletonServerInstance = new AppRoomServer("mongodb://localhost/approomdb");
		}
		return this.globalSingletonServerInstance;
	}


	constructor(dburl) {
		// constructor for object
		this.dburl = dburl;
	}

	getDbUrl() {
		return this.dburl;
	}



	async runServer() {
		// run the server
		// ATTN: 5/7/19 - not implemented yet
		console.log("Starting server.. not implemented yet.");
		return true;
	};


	async dbSetup() {
		// setup database and acl stuff
		// ATTN: this code is faulty because it can throw an error without closing db because of async promise calls
		var bretv = false;

		try {
			// connect to db
			const mongoUrl = this.getDbUrl();
			console.log ("Connecting to mongoose-mongodb: " + mongoUrl);
			await mongoose.connect(mongoUrl, { useNewUrlParser: true, useCreateIndex: true });

			// setup the model databases
			await this.setupModelSchema(mongoose, AclModel);
			await this.setupModelSchema(mongoose, AppModel);
			await this.setupModelSchema(mongoose, ConnectionModel);
			await this.setupModelSchema(mongoose, FileModel);
			await this.setupModelSchema(mongoose, RoomModel);
			await this.setupModelSchema(mongoose, UserModel);

			// display a list of all collections?
			if (false) {
				var collections = await mongoose.connection.db.listCollections().toArray();
				console.log("Collections:");
				console.log(collections);
				console.log("");
			}

			// success return value -- if we got this far it"s a success; drop down
			bretv = true;
		}
		catch (err) {
			console.log("Exception while trying to setup database:")
			console.log(err);
			bretv = false;
		}

		return bretv;
	};


	async setupModelSchema(mongooser, modelClass) {
		// just ask the base model class to do the work
		await modelClass.setupModelSchema(mongooser);
	}


	closeDown() {
		// close down the server
		this.disconnect();
	}

	disconnect() {
		// disconnect from mongoose/mongodb
		console.log("Closing mongoose-mongodb connection.");
		mongoose.disconnect();
	}



}
//---------------------------------------------------------------------------



//---------------------------------------------------------------------------
// export not the CLASS; callers should use getInstance() to get a singleton shared instance of the server
module.exports = AppRoomServer;
//---------------------------------------------------------------------------
