/**
 * @module client/arclient
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 4/14/20
 * @description
 * This module defines a sample js client that can be used to connect to the approom service
 */

"use strict";



// helper modules
const jrhAxios = require("../helpers/jrh_axios");
const jrhMisc = require("../helpers/jrh_misc");



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
			validApiAccess: false,
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
		this.pathAccessTokenRequest = "/api/refreshaccess";
		this.pathTokenValidate = "/api/tokentest";
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
	 *  validApiAccess - true if we successfully gotten an api access key that works
	 *
	 * @memberof AppRoomClient
	 */
	getStatus() {
		return this.status;
	}

	getStatusSuccess() {
		return this.status.success;
	}

	setStatusSuccess(val) {
		this.status.success = val;
	}

	setValidApiAccess(val) {
		this.status.validApiAccess = val;
	}

	getValidApiAccess() {
		return this.status.validApiAccess;
	}

	getLastError() {
		return this.status.lastError;
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
		// reset connected state
		this.setValidApiAccess(false);
		//
		var hintMessage = "Your credentials are required in order to retrieve an API refresh key";

		// ok now, we may have some information for the connection already stored (refreshToken, etc.)

		if (this.cache.accessToken && !flagReconnect) {
			// we already have an access token -- we just need to see if its stil VALID
			await this.validateAccessToken();
			if (this.getStatusSuccess()) {
				// all good
				this.setValidApiAccess(true);
				return;
			}
			// access token is bad (expired, revoked, etc.)
			// drop down and try to get a new one
		}

		if (this.cache.refreshToken) {
			// we have a refresh token, now we need to try to use it to get an access token (which is either expired or bad or missing)
			await this.retrieveAccessTokenFromRefreshToken();
			if (this.getStatusSuccess()) {
				// all good
				this.setValidApiAccess(true);
				return;
			}
			// add to hint message for when we ask for username/pass
			hintMessage += "(" + this.status.lastError + ")";
			// refresh token is bad (expired, revoked, etc.)
			// drop down and try to get a new one
		}

		// we need a new refresh token
		await this.retrieveRefreshTokenUsingCredentials(hintMessage);
		if (!this.getStatusSuccess()) {
			// error, return
			return;
		}

		// we have a NEW refresh token, now we need to get access token from it
		await this.retrieveAccessTokenFromRefreshToken();
		if (this.getStatusSuccess()) {
			// success!
			this.setValidApiAccess(true);
		}
	}
	//---------------------------------------------------------------------------











	//---------------------------------------------------------------------------
	/**
	 * Extra the data field from the response.
	 * Set this.status.success and data.error, which we check for in a variety of ways.  We expect all api calls should have a success = true in the reply, but we might also check for presence of a key-value pair
	 *
	 * @param {*} responseData - the object returned from a post/get
	 * @param {*} url - url string that fetched the data, for debugging purposes only
	 * @param {*} hintActionString - for debugging purposes
	 * @param {*} expectedKey - if this key is not in the response data then the response is an error
	 * @returns responseData.data
	 * @memberof AppRoomClient
	 */
	async extractDataTriggerError(responseData, url, hintActionString, expectedKey) {

		// get data from response
		var data = responseData.data;

		// debug message
		await this.triggerDebugMessageWithData("Performed " + hintActionString + " on " + url + ", with result: ", data);

		// check for success, and trigger error if error
		if (data.success && (!expectedKey || expectedKey === "" || data[expectedKey] !== undefined)) {
			// set success true
			this.setStatusSuccess(true);
		} else {
			// set success false
			this.setStatusSuccess(false);
			// make sure it has an error and trigger it
			if (!data.error) {
				if (expectedKey && expectedKey !== "" && data[expectedKey] === undefined) {
					data.error = "unexpected reply; missing key value in reply [" + expectedKey + "]";
				} else {
					data.error = "unexpected reply";
				}
			}
			this.triggerError("Error reply during " + hintActionString + " at " + url + ": " + data.error);
		}

		// return data
		return data;
	}
	//---------------------------------------------------------------------------











	//---------------------------------------------------------------------------
	/**
	 * We have an access token, ask server if its still valid
	 * NOTE: this actually will return true even if its a REFRESH token not an access token
	 *
	 * @memberof AppRoomClient
	 */
	async validateAccessToken() {
		// post data
		var url = this.getOptionServerUrlBase() + this.pathTokenValidate;
		var postData = {
			token: this.cache.accessToken,
		};
		var responseData = await jrhAxios.postCatchError(url, postData);

		// extract data, check for error, set succsss status, last error, etc.
		var data = await this.extractDataTriggerError(responseData, url, "validateAccessToken", "");
	}




	/**
	 * We have a refresh token, now try to get an access token from it (we may be told its a bad/expired refresh token)
	 *
	 * @memberof AppRoomClient
	 */
	async retrieveAccessTokenFromRefreshToken() {
		// post data
		var url = this.getOptionServerUrlBase() + this.pathAccessTokenRequest;
		var postData = {
			token: this.cache.refreshToken,
		};
		var responseData = await jrhAxios.postCatchError(url, postData);

		// extract data, check for error, set succsss status, last error, etc.
		var data = await this.extractDataTriggerError(responseData, url, "retrieveAccessTokenFromRefreshToken", "token");
		if (!data.error) {
			this.cache.accessToken = data.token;
		}
	}


	/**
	 * We need a new refresh token.
	 * This will require logging into the server, possibly asking user for username and password or sending them to the website
	 *
	 * @memberof AppRoomClient
	 */
	async retrieveRefreshTokenUsingCredentials(hintMessage) {
		// get login credentials
		var credentials = await this.triggerRequestCredentials(hintMessage);
		if (!credentials.usernameEmail || !credentials.password) {
			this.triggerError("Credentials missing; aborting request for refresh token.");
			this.setStatusSuccess(false);
		}

		// post data
		var url = this.getOptionServerUrlBase() + this.pathRefreshTokenRequest;
		var postData = {
			usernameEmail: credentials.usernameEmail,
			password: credentials.password,
		};
		var responseData = await jrhAxios.postCatchError(url, postData);

		// extract data, check for error, set succsss status, last error, etc.
		var data = await this.extractDataTriggerError(responseData, url, "retrieveRefreshTokenUsingCredentials", "token");
		if (!data.error) {
			this.cache.refreshToken = data.token;
		}
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
		this.setStatusSuccess(false);
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
				await this.options.debugFunction(this, debugMessage + ": " + jrhMisc.objToString(data, true));
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
		return (this.success === true);
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	shutdown() {
		// shutdown client
		this.status.validApiAccess = false;
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
