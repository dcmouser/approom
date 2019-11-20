/**
 * @module controllers/ratelimiteraid
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 11/4/19
 * @description
 * This module defines RateLimiterAid class, which provides support functions for rate limiting activities
 * @see <a href="https://www.npmjs.com/package/rate-limiter-flexible"></a>
 */

"use strict";


// rate limiter module
const ratelimiter = require("rate-limiter-flexible");

// misc node core modules
const assert = require("assert");

// requirement service locator
const jrequire = require("../helpers/jrservicelocator").require;








/**
 * Provides support functions for rate limiting activities
 *
 * @class RateLimiterAid
 */
class RateLimiterAid {

	//---------------------------------------------------------------------------
	// constructor
	constructor() {
		this.rateLimiterBasic = null;
	}

	// global singleton request
	static getSingleton(...args) {
		// we could do this more simply by just exporting a new instance as module export, but we wrap a function for more flexibility
		if (this.globalSingleton === undefined) {
			this.globalSingleton = new RateLimiterAid(...args);
		}
		return this.globalSingleton;
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	async setupRateLimiters() {
		// durations are in seconds

		this.rateLimiterBasic = new ratelimiter.RateLimiterMemory({
			keyPrefix: "rlflx_approom_basic",
			points: 5,
			duration: 10,
			blockDuration: 10,
		});

		this.rateLimiterApi = new ratelimiter.RateLimiterMemory({
			keyPrefix: "rlflx_approom_api",
			points: 5,
			duration: 30,
			blockDuration: 30,
		});
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	// accessors
	getRateLimiterBasic() {
		return this.rateLimiter_Basic;
	}

	getRateLimiterApi() {
		return this.rateLimiterApi;
	}
	//---------------------------------------------------------------------------

}







// export the class as the sole export
module.exports = RateLimiterAid.getSingleton();
