// jrhelpersmdb
// v1.0.0 on 5/7/19 by mouser@donationcoder.com
//
// some of my generic helper functions

"use strict";

// modules
const mongoose = require("mongoose");

// our helper modules
const jrlog = require("../helpers/jrlog");







//---------------------------------------------------------------------------
function mongoIdEqual(id1, id2) {

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





//---------------------------------------------------------------------------
module.exports = {
	mongoIdEqual,
};
//---------------------------------------------------------------------------
