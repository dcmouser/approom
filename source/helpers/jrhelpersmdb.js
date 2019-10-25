// jrhelpersmdb
// v1.0.0 on 5/7/19 by mouser@donationcoder.com
//
// some of my generic helper functions

"use strict";

// modules
const mongoose = require("mongoose");

// our helper modules
const jrlog = require("../helpers/jrlog");





class JrHelpersMdb {

	//---------------------------------------------------------------------------
	constructor() {
	}

	// global singleton request
	static getSingleton(...args) {
		// we could do this more simply by just exporting a new instance as module export, but we wrap a function for more flexibility
		if (this.globalSingleton === undefined) {
			this.globalSingleton = new JrHelpersMdb(...args);
		}
		return this.globalSingleton;
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	mongoIdEqual(id1, id2) {

		// return false if either is null (even if both null)
		if (!id1 || !id2) {
			return false;
		}

		if (id1.equals(id2)) {
			return true;
		}

		// ATTN: sanity check might be nice here
		if (!(id1 instanceof mongoose.Schema.ObjectId)) {
			throw ("Bad check of mongoIdSame on not objectId object");
		}

		// not equal
		return false;
	}
	//---------------------------------------------------------------------------

}


// export the class as the sole export
module.exports = JrHelpersMdb.getSingleton();
