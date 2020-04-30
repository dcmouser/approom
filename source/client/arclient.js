/**
 * @module client/arclient
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 4/14/20
 * @description
 * This module defines a sample js client that can be used to connect to the approom service
 */

"use strict";


// modules
const assert = require("assert");

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

		// clear last error (this is also how the client knows whether it is in an error state)
		this.lastError = "";

		// set flag saying we dont yet have api access
		this.validApiAccess = false;

		// default options
		this.options = {
			serverUrlBase: null,
			getCredentialsFunction: null,
			errorFunction: null,
			debugFunction: null,
		};

		// initial cache
		this.cache = {
			refreshToken: null,
			accessToken: null,
		};

		// uri paths for basic api functions
		this.pathRefreshTokenRequest = "/api/reqrefresh";
		this.pathAccessTokenRequest = "/api/refreshaccess";
		this.pathTokenValidate = "/api/tokentest";
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	/**
	 * Accessor, set the options object en masse
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
	 * Accessor short cut.
	 * Set one option
 	 * @param string key
 	 * @param {*} val
 	 * @memberof AppRoomClient
 	 */
	setOption(key, val) {
		this.options[key] = val;
	}


	/**
	 * Accessor
	 *
	 * @returns the serverUrlBase option (see above)
	 * @memberof AppRoomClient
	 */
	getOptionServerUrlBase() {
		return this.options.serverUrlBase;
	}


	/**
	 * Accessor
	 * Use this to set the refresh token value, which should be long lasting
	 * @param {*} val
	 * @memberof AppRoomClient
	 */
	setCacheRefreshToken(val) {
		this.cache.refreshToken = val;
	}

	/**
	 * Accessor
	 *
	 * @returns the stored refreshToken which is long lasting; serialize this and restore it on program shutdown and restart to avoid user having to put their username/password in
	 * @memberof AppRoomClient
	 */
	getCacheRefreshToken() {
		return this.cache.refreshToken;
	}


	/**
	 * Accessor
	 * Sets flag tracking whether we are connected with valid api access
	 * @param {*} val
	 * @memberof AppRoomClient
	 */
	setValidApiAccess(val) {
		this.validApiAccess = val;
	}

	/**
	 * Accessor
	 * Note that our functions do not require that this be checked before invoking, they will attempt to reconnect if needed.
	 * Furthermore, even if one has exchanged api token that is valid, it may expire at any time.
	 *
	 * @returns true if we have a valid api access connection
	 * @memberof AppRoomClient
	 */
	getValidApiAccess() {
		return this.validApiAccess;
	}


	/**
	 * Clear error state and last error
	 * This is called internally within functions that can set errors, prior to running
	 *
	 * @memberof AppRoomClient
	 */
	clearErrors() {
		this.lastError = "";
	}


	/**
	 * Get last error
	 *
	 * @returns last error as string
	 * @memberof AppRoomClient
	 */
	getLastError() {
		return this.lastError;
	}

	/**
	 * set last error
	 * Only call this with non blank error; use clearErrors() to clear error
	 *
	 * @memberof AppRoomClient
	 */
	setLastError(errorMessage, flagTriggerListener) {
		assert(errorMessage !== "");
		// set the last error -- which in and of itself will mark the last operation as a failure
		this.lastError = errorMessage;
		// should we tell our listener about this error?
		if (flagTriggerListener) {
			this.triggerErrorListener(errorMessage);
		}
	}


	/**
	 * Accessor
	 *
	 * @returns a cached api access token
	 * @memberof AppRoomClient
	 */
	getAccessToken() {
		return this.cache.accessToken;
	}

	/**
	 * Accessor
	 * Set the cached api access token
	 *
	 * @param {*} val
	 * @memberof AppRoomClient
	 */
	setAccessToken(val) {
		this.cache.accessToken = val;
	}


	/**
	 * Accessor
	 *
	 * @returns true if the last operation encountered an error
	 * @memberof AppRoomClient
	 */
	isError() {
		return (this.lastError !== "");
	}
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	/**
	 * This is the main async function that tries to connect to the server prior to being usable
	 * Note that this function will attempt to us an existing long-living access token,
	 * or if that expires, fall back on requesting a new access token if it has a stored refresh token
	 * or failing that, it may prompt user to log in to get a new refresh token, etc.
	 * On success the getValidApiAcces() will be true; on failure it will be false and lastError will be non-blank
	 *
	 * @memberof AppRoomClient
	 * @returns true on success
	 */
	async connect(flagForceAcquireNewAccessToken) {

		// clear any prior errors
		this.clearErrors();

		// reset connected state
		this.setValidApiAccess(false);

		// hint for prompt
		var credentialsPromptMessage = "Your credentials are required in order to retrieve an API refresh key";

		// ok now, we may have some information for the connection already stored (refreshToken, etc.)

		if (this.getAccessToken() && !flagForceAcquireNewAccessToken) {
			// we already have an access token -- we just need to see if its stil VALID
			if (await this.validateAccessToken()) {
				// all good
				this.setValidApiAccess(true);
				return true;
			}
			// access token is bad (expired, revoked, etc.)
			// drop down and try to get a new one
		}

		if (this.cache.refreshToken) {
			// we have a refresh token, now we need to try to use it to get an access token (our current one must be expired or bad or missing or caller just wants us to get a new one)
			if (await this.retrieveAccessTokenFromRefreshToken()) {
				// all good
				this.setValidApiAccess(true);
				return true;
			}
			// refresh token is bad (expired, revoked, etc.)
			// add to hint message for when we ask for username/pass
			credentialsPromptMessage += "(" + this.getLastError() + ")";
			// drop down and try to get a new one
		}

		// we need a new refresh token
		if (!await this.retrieveRefreshTokenUsingCredentials(credentialsPromptMessage)) {
			// error, nothing more we can do; return (lastError will have the error from this last function call that caller can check)
			return false;
		}

		// we have a NEW refresh token, now we need to get access token from it
		if (await this.retrieveAccessTokenFromRefreshToken()) {
			// success!
			this.setValidApiAccess(true);
			return true;
		}

		// error getting access token; return (lastError will have the error from this last function call that caller can check)
		return false;
	}
	//---------------------------------------------------------------------------











	//---------------------------------------------------------------------------
	/**
	 * Extract the data field from the response.
	 * Set this.lastError and data.error, which we check for in a variety of ways.  We expect all api calls should have a success = true in the reply, but we might also check for presence of a key-value pair
	 * To check for an error, check returned data.error is non-blank (you could also check this.isError since lastError will be set as well)
	 *
	 * @param {*} response - the object returned from a post/get
	 * @param {*} url - url string that fetched the data, for debugging purposes only
	 * @param {*} hintActionString - for debugging purposes
	 * @param {*} expectedKey - if this key is not in the response data then the response is an error
	 * @returns response.data
	 * @memberof AppRoomClient
	 */
	async extractDataTriggerError(response, url, hintActionString, expectedKey) {

		// get data from response
		var data = response.data;

		// clear any existing error
		this.clearErrors();

		// debug message
		await this.triggerDebugMessageWithData("Performed " + hintActionString + " on " + url + ", with result: ", data);

		// check for success, and trigger error if error
		if (data.success && (!expectedKey || data[expectedKey] !== undefined)) {
			// success just drop down
		} else {
			// Error
			// check if there is already an error in the reply; if not, we add one, so that caller can always look at data.error
			// note that the data.success might still be true, as this could be an error based on missing expectedKey
			if (!data.error) {
				if (expectedKey && data[expectedKey] === undefined) {
					data.error = "unexpected reply; missing key value in reply [" + expectedKey + "]";
				} else {
					data.error = "unexpected reply";
				}
			}
			this.setLastError("Error reply during " + hintActionString + " at " + url + ": " + data.error, true);
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
	 * @returns true on success
	 */
	async validateAccessToken() {
		// post data
		var url = this.getOptionServerUrlBase() + this.pathTokenValidate;
		var postData = {
			token: this.getAccessToken(),
		};
		var response = await jrhAxios.postCatchError(url, postData);

		// extract data, check for error, set succsss status, last error, etc.
		var data = await this.extractDataTriggerError(response, url, "validateAccessToken", null);
		// return true if no error
		return (!data.error);
	}



	/**
	 * We have a refresh token, now try to get an access token from it (we may be told its a bad/expired refresh token)
	 *
	 * @memberof AppRoomClient
	 * @returns true on success
	 */
	async retrieveAccessTokenFromRefreshToken() {
		// post data
		var url = this.getOptionServerUrlBase() + this.pathAccessTokenRequest;
		var postData = {
			token: this.cache.refreshToken,
		};
		var responseData = await jrhAxios.postCatchError(url, postData);

		// extract data, check for error, set last error on error, etc.
		var data = await this.extractDataTriggerError(responseData, url, "retrieveAccessTokenFromRefreshToken", "token");
		if (!data.error) {
			this.setAccessToken(data.token);
			return true;
		}

		// failed
		return false;
	}


	/**
	 * We need a new refresh token.
	 * This will require logging into the server, possibly asking user for username and password or sending them to the website
	 *
	 * @memberof AppRoomClient
	 * @returns true on success
	 */
	async retrieveRefreshTokenUsingCredentials(hintMessage) {

		// clear any exisitng error
		this.clearErrors();

		// get login credentials
		var credentials = await this.triggerRequestCredentials(hintMessage);
		if (!credentials.usernameEmail || !credentials.password) {
			this.setLastError("Credentials missing; aborting request for refresh token.", true);
			return false;
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
			return true;
		}

		// failed (lastError will have been set by extractDataTriggerError)
		return false;
	}
	//---------------------------------------------------------------------------






















































	//---------------------------------------------------------------------------
	// the trigger functions are callbacks that make calls into callback functions set in options


	/**
	 * Signal the last error to a registered callback function
	 *
	 * @memberof AppRoomClient
	 */
	async triggerErrorListener(errorMessage) {
		// call error callback function if one is registered
		if (this.options.errorFunction) {
			await this.options.errorFunction(this, errorMessage);
		}
	}


	/**
	 * This callback is triggered when we need to log into the system with user credentials
	 * The returned object should be in the form: { usernameEmail: VALUE, password: VALUE }
	 *
	 * @param {*} hintMessage - a text string describing why the credentials are needed (typically expired refresh token or initial login)
	 * @returns credentials object with two fields (usernameEmail, password)
	 * @memberof AppRoomClient
	 */
	async triggerRequestCredentials(hintMessage) {
		// call error callback function if one is registered
		if (this.options.getCredentialsFunction) {
			var credentials = await this.options.getCredentialsFunction(this, hintMessage);
			return credentials;
		}
		// no credentials available
		return {};
	}


	/**
	 * Optional callback to display debug information useful for troubleshooting
	 * A registered debugging message would normally just display info on console if in debug mode
	 *
	 * @param {string} debugMessage
	 * @memberof AppRoomClient
	 */
	async triggerDebugMessage(debugMessage) {
		if (this.options.debugFunction) {
			await this.options.debugFunction(this, debugMessage);
		}
	}


	/**
	 * Optional callback to display debug information useful for troubleshooting
	 * A registered debugging message would normally just display info on console if in debug mode
	 * @param {string} debugMessage
	 * @param {object} data
	 * @memberof AppRoomClient
	 */
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
	/**
	 * Post a request to an api endpoint return the json result
	 * The key purpose of this function is to provide a more reliable wrapper around peforming an api post to the server
	 * It will attempt to retrieve a valid access token if it is needed (current one missing or expired)
	 * It will ensure that data.error is set when there is an error, as well as triggering a callback to any error listener
	 * On error, the error field of data will be non-empty
	 *
	 * @param {*} urlEndpoint - url string relative path to base
	 * @param {*} query - json object containing query to be passed in post variable "query"
	 * @returns = json object with repl data
	 * @memberof AppRoomClient
	 */
	async invoke(urlEndpoint, query) {

		// url to hit
		var url = this.getOptionServerUrlBase() + urlEndpoint;

		// data to post (we will add token later)
		var postData = {
			query,
		};

		// now a small loop to post the data and get a reply;
		// we loop so that we can try our existing access token first, and request a new one and retry if it fails.
		// ATTN: TODO - check out own expiration date for our access token and proactively get a new one when we think it's near expiration.
		var responseData;
		var data;
		for (var tryCount = 0; tryCount < 2; tryCount += 1) {
			tryCount += 1;
			// if not connected (which may be case after our first fail or initially), lets try to connect
			if (!this.getValidApiAccess()) {
				// try to reconnect and then try again
				if (!await this.connect(true)) {
					// failed to connect; make error object and return it
					data = {
						error: this.getLastError(),
						tokenError: true,
					};
					return data;
				}
			}

			// set token (which may be newly gotten from our connect attempt above
			postData.token = this.getAccessToken();

			// post and get response
			responseData = await jrhAxios.postCatchError(url, postData);
			// extract data, check for error, set succsss status, last error, etc.
			data = await this.extractDataTriggerError(responseData, url, "invoking " + urlEndpoint, null);

			// IFF we dont get a tokenError then we can break and return the error
			if (!data.tokenError) {
				break;
			}

			// we got a tokenError, meaning we should try to get a new api token
			// clear valid api access flag which will try to reaquire api access token, and either reloop and try to get access again
			this.setValidApiAccess(false);
		}

		// ok we have the reply data object (where data.error is non empty string if there was an error); data.tokenError will be true if the problem was related to bad api token
		return data;
	}
	//---------------------------------------------------------------------------









	//---------------------------------------------------------------------------
	/**
	 * Any last minute shutdown stuff.
	 * Currently just marks the client as not having api access, so it would have to re-get it
	 *
	 * @memberof AppRoomClient
	 */
	shutDown() {
		// shutdown client
		this.setValidApiAccess(false);
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	/**
	 * Just a debug helper function to display the state of the client to the console
	 *
	 * @memberof AppRoomClient
	 */
	debugToConsole() {
		console.log("Debugging arclient object.");
		console.log("Options:");
		console.log(this.options);
		console.log("Cache:");
		console.log(this.cache);
		console.log("Last error: " + this.getLastError());
		console.log("Valid API access: " + this.getValidApiAccess());
	}
	//---------------------------------------------------------------------------


}


















//---------------------------------------------------------------------------
/**
 * The exported module function used to create a new client.
 *
 * @returns a new instance of the AppRoomClient object
 */
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
