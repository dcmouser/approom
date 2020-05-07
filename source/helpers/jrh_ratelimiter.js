/**
 * @module helpers/jrh_ratelimiter
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 11/4/19
 * @description
 * This module defines rate limiter helper, which provides support functions for rate limiting activities
 * @see <a href="https://www.npmjs.com/package/rate-limiter-flexible"></a>
 */

"use strict";


// rate limiter module
const ratelimiter = require("rate-limiter-flexible");

// helper modules
const jrhMisc = require("./jrh_misc");





//---------------------------------------------------------------------------
// module global
var rateLimiters = {};
//---------------------------------------------------------------------------



//---------------------------------------------------------------------------
function setupRateLimiter(name, options) {
	// make it
	var rlimiter = new ratelimiter.RateLimiterMemory({
		keyPrefix: "rlflx_" + name,
		...options,
	});
	// store it
	rateLimiters[name] = rlimiter;
	// return it
	return rlimiter;
}

function getRateLimiter(name) {
	return rateLimiters[name];
}

function getRateLimiterInfo(rlimiter) {
	// just return a nice string with debug info for the rate limiter
	return jrhMisc.objToString(rlimiter, true);
}
//---------------------------------------------------------------------------





//---------------------------------------------------------------------------
// exported functions
module.exports = {
	setupRateLimiter,
	getRateLimiter,
	getRateLimiterInfo,
};
//---------------------------------------------------------------------------
