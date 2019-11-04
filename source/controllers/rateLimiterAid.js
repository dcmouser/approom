// approom
// rate limiter aid class
// v1.0.0 on 11/4/19 by mouser@donationcoder.com
//
// see https://www.npmjs.com/package/rate-limiter-flexible


"use strict";


// rate limiter module
const ratelimiter = require("rate-limiter-flexible");

// misc node core modules
const assert = require("assert");

// our helper modules
const jrlog = require("../helpers/jrlog");



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
