/**
 * @module helpers/jrh_axios
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 4/15/20

 * @description
 * Collection of helper functions for use with the nodejs axios module
*/

"use strict";

// modules
const https = require("https");


function makeAgentHelper() {
	// ignore cert expired
	// see https://github.com/axios/axios/issues/535
	const agent = new https.Agent({
		rejectUnauthorized: false,
	});
	return agent;
}






// export the class as the sole export
module.exports = {
	makeAgentHelper,
};
