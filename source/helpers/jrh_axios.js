/**
 * @module helpers/jrh_axios
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 4/15/20

 * @description
 * Collection of helper functions for use with the nodejs axios module
*/

"use strict";

// modules
const axios = require("axios");
const https = require("https");







//---------------------------------------------------------------------------
function calcAxiosOptions() {
	// ignore cert expired
	// see https://github.com/axios/axios/issues/535
	return {
		httpsAgent: new https.Agent({ rejectUnauthorized: false }),
	};
}
//---------------------------------------------------------------------------








//---------------------------------------------------------------------------
/**
 * Post to the url and get the responseData.
 * Importantly, while axios throws errors when it gets a 403, 401, etc., we do not -- instead we catch the error and embed it in the {data.error} field of the responseData
 *
 * @param {*} url - url to post to
 * @param {*} postData - data to post
 * @returns the responseData object
 */
async function postCatchError(url, postData) {
	var responseData;
	try {
		responseData = await axios.post(url, postData, calcAxiosOptions());
	} catch (e) {
		responseData = {
			data: {
				error: "Exception: " + e.toString(),
			},
		};
	}
	return responseData;
}
//---------------------------------------------------------------------------


//---------------------------------------------------------------------------
/**
 * Just wrap the axios get to catch errors and embed in response data
 *
 * @param {*} url
 * @returns responseData
 */
async function getCatchError(url) {
	var responseData;
	try {
		responseData = axios.get(url, calcAxiosOptions());
	} catch (e) {
		responseData = {
			data: {
				error: "Exception: " + e.toString(),
			},
		};
	}
	return responseData;
}
//---------------------------------------------------------------------------








// export the class as the sole export
module.exports = {
	calcAxiosOptions,
	postCatchError,
	getCatchError,
};
