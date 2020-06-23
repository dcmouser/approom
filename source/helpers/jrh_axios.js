/**
 * @module helpers/jrh_axios
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 4/15/20

 * @description
 * Collection of helper functions for use with the nodejs axios module which does web posts/gets
*/

"use strict";

// modules
const axios = require("axios");
const https = require("https");

const jrhMisc = require("./jrh_misc");







/**
 * Internal function we use when performing axios requests.  Currently we use this to bypass https errors on bad certificates
 *
 * @returns an object which options for Axios get/post
 */
function calcAxiosOptions(options) {
	if (true && options === undefined) {
		options = {};
	}
	// ignore cert expired
	// see https://github.com/axios/axios/issues/535
	return {
		httpsAgent: new https.Agent({ rejectUnauthorized: false }),
		...options,
	};
}
//---------------------------------------------------------------------------








//---------------------------------------------------------------------------
/**
 * Post to the url and get the response.
 * Importantly, while axios throws errors when it gets a 403, 401, etc., we do not -- instead we catch the error and embed it in the {data.error} field of the response
 *
 * @param {string} url - url to post to
 * @param {object} postData - data to post
 * @returns the response object
 */
async function postAxiosGetResponseDataCatchError(url, postData, options) {
	let response;
	try {
		response = await axios.post(url, postData, calcAxiosOptions(options));
	} catch (e) {
		response = e.response;
		// we expect the response to be a json object; if its not, we force response.data to be an object and inject an error into it
		// force a data.error in response
		if (!response) {
			// empty response failure to connect?
			response = {
				data: {},
			};
		} else if (!response.data || typeof response.data !== "object") {
			// add data field if not found
			response.data = {};
		}
		if (!response.data.error) {
			// store error type exception
			const status = e.response ? e.response.status : "unknown";
			response.data.error = "Error (status " + status + ") exception in request: " + e.toString();
			response.data.errorType = "exception";
			// console.log("ERROR in postAxiosGetResponseDataCatchError exception: " + response.data.error);
		}
	}
	return response;
}
//---------------------------------------------------------------------------


//---------------------------------------------------------------------------
/**
 * Perform a get and just wrap the axios get to catch errors and embed error in response data
 *
 * @param {string} url
 * @returns response
 */
async function getCatchError(url, options) {
	let response;
	try {
		response = axios.get(url, calcAxiosOptions(options));
	} catch (e) {
		response = e.response;
		if (!response.data.error) {
			response.data.error = "Error exception in request; status " + e.response.status;
		}
	}
	return response;
}
//---------------------------------------------------------------------------








// export the class as the sole export
module.exports = {
	calcAxiosOptions,
	postAxiosGetResponseDataCatchError,
	getCatchError,
};
