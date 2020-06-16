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
async function postAxiosCatchError(url, postData, options) {
	let response;
	try {
		response = await axios.post(url, postData, calcAxiosOptions(options));
	} catch (e) {
		response = e.response;
		if (!response.data.error) {
			response.data.error = "Error exception in request; status " + e.response.status;
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
	postAxiosCatchError,
	getCatchError,
};
