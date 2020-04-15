/**
 * @module client/arclient
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 4/14/20
 * @description
 * This module defines a sample js client that can be used to connect to the approom service
 */

"use strict";

// modules
const axios = require("axios");
const https = require("https");

// helper modules
const jrhAxios = require("../helpers/jrh_axios");


/**
 * Class implementing a sample client that can connect to a running AppRoomServer
 *
 * @class AppRoomClient
 */
class AppRoomClient {


	//---------------------------------------------------------------------------
	// constructor
	constructor() {
		this.status = {
			lastError: "",
			success: true,
			connected: false,
		};
		//
		this.options = {
			serverUrlBase: null,
			refreshToken: null,
			accessToken: null,
			getCredentialsFunction: null,
			errorFunction: null,
			debugFunction: null,
		};
		//
		this.cache = {
			refreshToken: null,
			accessToken: null,
		};

		//
		this.pathRefreshTokenRequest = "/api/reqrefresh";
		this.pathAccessTokenRequest = "/api/refreshaccess?token=";
		this.pathTokenValidate = "/api/tokentest?token=";
	}



	/**
	 * Options are:
	 *  serverUrlBase - the base url for the server (with no path info)
	 *  refreshToken - refresh token (generated previously or this session)
	 *  accessToken - access token (generated previously or this sesssion)
	 *  getCredentialsFunction - async function that will be called if library needs a username/password to login
	 *  errorFunction - async function that will be called on all errors
	 *  debugFunction - async function called with a debug message
 	 *
 	 * @param {*} val
 	 * @memberof AppRoomClient
 	 */
	setOptions(val) {
		this.options = val;
	}


	/**
	 * Set one option
 	 * @param string key
 	 * @param {*} val
 	 * @memberof AppRoomClient
 	 */
	setOption(key, val) {
		this.options[key] = val;
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	getOptionServerUrlBase() {
		return this.options.serverUrlBase;
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	/**
	 * Returns the status of the connection, an object with the following values:
	 *  lastError - string with the last error from the last call
	 *  success - true if last api call was a success
	 *  connected - true if we successfully connected
	 *
	 * @memberof AppRoomClient
	 */
	getStatus() {
		return this.status;
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	/**
	 * This is the main async function that tried to connect to the server prior to being usable
	 * Note that this function will attempt to us an existing long-living access token,
	 * or if that expires, fall back on requesting a new access token if it has a stored refresh token
	 * or failing that, it may prompt user to log in to get a new refresh token, etc.
	 *
	 * @memberof AppRoomClient
	 */
	async connect(flagReconnect) {

		// clear any prior errors
		this.clearErrors();
		var hintMessage = "Your credentials are required in order to retrieve an API refresh key";
		var retvstatus;

		// ok now, we may have some information for the connection already stored (refreshToken, etc.)

		if (this.cache.accessToken && !flagReconnect) {
			// we already have an access token -- we just need to see if its stil VALID
			retvstatus = await this.validateAccessToken();
			if (retvstatus.success) {
				// all good
				this.status.connected = true;
				return retvstatus;
			}
			// access token is bad (expired, revoked, etc.)
			// drop down and try to get a new one
		}

		if (this.cache.refreshToken) {
			// we have a refresh token, now we need to try to use it to get an access token (which is either expired or bad or missing)
			retvstatus = await this.retrieveAccessTokenFromRefreshToken();
			if (retvstatus.success) {
				// all good
				return retvstatus;
			}
			// add to hint message for when we ask for username/pass
			hintMessage += "(" + this.status.lastError + ")";
			// refresh token is bad (expired, revoked, etc.)
			// drop down and try to get a new one
		}

		// we need a new refresh token
		retvstatus = await this.retrieveRefreshTokenUsingCredentials(hintMessage);
		if (!retvstatus.success) {
			// error, return it
			return retvstatus;
		}

		// we have a NEW refresh token, now we need to get access token from it
		retvstatus = await this.retrieveAccessTokenFromRefreshToken();

		if (retvstatus.success) {
			this.status.connected = true;
		}

		// error or success, return it
		return retvstatus;
	}
	//---------------------------------------------------------------------------









	//---------------------------------------------------------------------------
	/**
	 * We have an access token, ask server if its still valid
	 *
	 * @memberof AppRoomClient
	 */
	async validateAccessToken() {
		// ATTN: TODO - change this to a POST request with the acccess token as a post field
		var url = this.getOptionServerUrlBase() + this.pathTokenValidate + this.cache.accessToken;
		var responseData = await axios.get(url, { httpsAgent: jrhAxios.makeAgentHelper() });
		var data = responseData.data;
		await this.triggerDebugMessageWithData("Calling " + url, data);
		if (data.success) {
			this.status.success = true;
		} else {
			if (data.error) {
				this.triggerError("Error reply during validateAccessToken at " + url + ": " + data.error);
			} else {
				this.triggerError("Error reply during validateAccessToken at " + url + ": unexpected reply.");
			}
		}
		return this.status;
	}


	/**
	 * We have a refresh token, now try to get an access token from it (we may be told its a bad/expired refresh token)
	 *
	 * @memberof AppRoomClient
	 */
	async retrieveAccessTokenFromRefreshToken() {
		// ATTN: TODO - change this to a POST request with the acccess token as a post field
		var url = this.getOptionServerUrlBase() + this.pathAccessTokenRequest + this.cache.refreshToken;
		var responseData = await axios.get(url, { httpsAgent: jrhAxios.makeAgentHelper() });
		var data = responseData.data;
		await this.triggerDebugMessageWithData("Calling " + url, data);
		if (data.success && data.token) {
			this.status.success = true;
			this.cache.accessToken = data.token;
		} else {
			if (data.error) {
				this.triggerError("Error reply during retrieveAccessTokenFromRefreshToken at " + url + ": " + data.error);
			} else {
				this.triggerError("Error reply during retrieveAccessTokenFromRefreshToken at " + url + ": unexpected reply.");
			}
		}
		return this.status;

	}


	/**
	 * We need a new refresh token.
	 * This will require logging into the server, possibly asking user for username and password or sending them to the website
	 *
	 * @memberof AppRoomClient
	 */
	async retrieveRefreshTokenUsingCredentials(hintMessage) {
		var credentials = await this.triggerRequestCredentials(hintMessage);
		if (!credentials.usernameEmail || !credentials.password) {
			this.triggerError("Credentials missing; aborting request for refresh token.");
			return this.status;
		}

		// let's post it
		var url = this.getOptionServerUrlBase() + this.pathRefreshTokenRequest;
		var postData = {
			usernameEmail: credentials.usernameEmail,
			password: credentials.password,
		};

		var responseData;
		try {
			responseData = await axios.post(url, postData, { httpsAgent: jrhAxios.makeAgentHelper() });
		} catch (e) {
			responseData = {
				data: {
					error: "Exception: " + e.toString(),
				},
			};
		}

		// process reply
		var data = responseData.data;
		await this.triggerDebugMessageWithData("Calling " + url, data);

		if (data.success && data.token) {
			// ok we got success!
			this.status.success = true;
			this.cache.refreshToken = data.token;
		} else {
			if (data.error) {
				this.triggerError("Error reply during retrieveRefreshTokenUsingCredentials at " + url + ": " + data.error);
			} else {
				this.triggerError("Error reply during retrieveRefreshTokenUsingCredentials at " + url + ": unexpected reply.");
			}
		}
		return this.status;


		this.triggerError("retrieveRefreshTokenUsingCredentials failed.");
		return this.status;
	}
	//---------------------------------------------------------------------------












	//---------------------------------------------------------------------------
	async joinRoom(appId, roomId) {

	}


	async createRoom(appId, roomOptions) {

	}


	async uploadDataToRoom(roomId, data) {

	}


	async downloadDataFromRoom(roomId, filter) {

	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	debugToConsole() {
		console.log("Debugging arclient object.");
		console.log("Options:");
		console.log(this.options);
		console.log("Cache:");
		console.log(this.cache);
		console.log("Status:");
		console.log(this.status);
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	async triggerError(errorMessage) {
		// call error callback function if one is registered
		this.status.success = false;
		this.status.lastError = errorMessage;
		if (this.options.errorFunction) {
			await this.options.errorFunction(this, errorMessage);
		}
	}


	async triggerRequestCredentials(hintMessage) {
		// call error callback function if one is registered
		if (this.options.getCredentialsFunction) {
			var credentials = await this.options.getCredentialsFunction(this, hintMessage);
			return credentials;
		}
		// no credentials available
		return {};
	}

	async triggerDebugMessage(debugMessage) {
		if (this.options.debugFunction) {
			await this.options.debugFunction(this, debugMessage);
		}
	}


	async triggerDebugMessageWithData(debugMessage, data) {
		if (this.options.debugFunction) {
			if (data && data.toString) {
				await this.options.debugFunction(this, debugMessage + ": " + data.toString());
			} else {
				await this.options.debugFunction(this, debugMessage);
			}
		}
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	clearErrors() {
		this.success = true;
		this.lastError = "";
	}

	isError() {
		return this.success === true;
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	shutdown() {
		// shutdown client
		this.status.connected = false;
	}
	//---------------------------------------------------------------------------



}






//---------------------------------------------------------------------------
function makeNewAppRoomClient() {
	return new AppRoomClient();
}
//---------------------------------------------------------------------------



//---------------------------------------------------------------------------
// export function to create a new instance of class
module.exports = {
	makeNewAppRoomClient,
};
//---------------------------------------------------------------------------
