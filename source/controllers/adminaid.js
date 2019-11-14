// approom
// admin aid class
// v1.0.0 on 5/1/19 by mouser@donationcoder.com
//
// Helps out with registration processing

"use strict";

// our helper modules
const jrhMisc = require("../helpers/jrh_misc");
const JrResult = require("../helpers/jrresult");

// models
const arserver = require("./server");
const AppModel = require("../models/app");
const RoomModel = require("../models/room");


class AdminAid {

	//---------------------------------------------------------------------------
	// constructor
	constructor() {
	}

	// global singleton request
	static getSingleton(...args) {
		// we could do this more simply by just exporting a new instance as module export, but we wrap a function for more flexibility
		if (this.globalSingleton === undefined) {
			this.globalSingleton = new AdminAid(...args);
		}
		return this.globalSingleton;
	}
	//---------------------------------------------------------------------------


	async addTestAppsAndRooms(req, addCountApps, addCountRooms) {
		// add some test apps and rooms
		var successMessage1, successMessage2;
		var app, room;
		var appindexString, roomindexString;
		var appid;
		var appindexStart = 1;
		var roomindexStart = 1;
		var appsAdded = 0;
		var roomsAdded = 0;

		for (var appindex = 0; appindex < addCountApps; appindex += 1) {

			// create an app
			appindexString = (appindexStart + appsAdded).toString();
			app = AppModel.createModel({
				shortcode: "A" + appindexString,
				name: "App" + appindexString,
				label: "Application # " + appindexString,
				description: "Test App generated by administration backend on " + jrhMisc.getNiceNowString(),
			});

			// save it
			await app.dbSave();
			appsAdded += 1;
			appid = app.getId();

			// now create some rooms attached to the app
			for (var roomindex = 0; roomindex < addCountRooms; roomindex += 1) {
				roomindexString = (roomindexStart + roomsAdded).toString();
				room = RoomModel.createModel({
					appid,
					shortcode: "R" + roomindexString + "A" + appindexString,
					name: "Room" + roomindexString + "A" + appindexString,
					label: "Room # " + roomindexString + " for App # " + appindexString,
					description: "Test Room generated by administration backend on " + jrhMisc.getNiceNowString() + " for App " + appindexString,
				});

				// save it
				await room.dbSave();
				roomsAdded += 1;
			}
		}

		successMessage1 = "Created " + appsAdded.toString() + " Apps.";
		successMessage2 = "Created " + roomsAdded.toString() + " Rooms.";

		// success
		// push message on session
		var jrResult = JrResult.makeSuccess(successMessage1);
		jrResult.pushSuccess(successMessage2);
		jrResult.addToSession(req);
		// return success
		return true;
	}

}







// export the class as the sole export
module.exports = AdminAid.getSingleton();
