/**
 * @module controllers/setupaid
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 5/15/20
 * @description
 * This module defines the SetupAid class, which provides support for server setup stuff
 */

"use strict";


// requirement service locator
const jrequire = require("../helpers/jrequire");

// our helper modules
const jrhMisc = require("../helpers/jrh_misc");
const JrContext = require("../helpers/jrcontext");
const JrResult = require("../helpers/jrresult");
const jrdebug = require("../helpers/jrdebug");
const jrhCrypto = require("../helpers/jrh_crypto");

// models
const UserModel = jrequire("models/user");

// controllers
const arserver = jrequire("arserver");

// constants
const appdef = jrequire("appdef");





/**
 * Provides support for backend setup activities
 *
 * @class SetupAid
 */
class SetupAid {

	//---------------------------------------------------------------------------
	// constructor
	constructor() {
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	async createDefaultUsers() {
		jrdebug.cdebug("Inside setup aid createDefaultUsers()");

		// dummy jrContext since we don't know any other way to get req/res
		const jrContext = JrContext.makeNew();

		let bretv = true;
		const userArray = arserver.getConfigValDefault(appdef.DefConfigKeySetupUserArray, null);
		if (userArray) {
			for (const userObj of userArray) {
				bretv = bretv && await UserModel.setupCreateUser(jrContext, userObj);
			}
		}
		return bretv;
	}
	//---------------------------------------------------------------------------


}



// export the class as the sole export
module.exports = new SetupAid();
