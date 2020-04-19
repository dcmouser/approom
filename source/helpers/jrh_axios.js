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

const jrhMisc = require("./jrh_misc");







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
 * Post to the url and get the response.
 * Importantly, while axios throws errors when it gets a 403, 401, etc., we do not -- instead we catch the error and embed it in the {data.error} field of the response
 *
 * @param {*} url - url to post to
 * @param {*} postData - data to post
 * @returns the response object
 */
async function postCatchError(url, postData) {
	var response;
	try {
		response = await axios.post(url, postData, calcAxiosOptions());
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
 * Just wrap the axios get to catch errors and embed in response data
 *
 * @param {*} url
 * @returns response
 */
async function getCatchError(url) {
	var response;
	try {
		response = axios.get(url, calcAxiosOptions());
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
	postCatchError,
	getCatchError,
};
