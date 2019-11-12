// jrhelpersmdb
// v1.0.0 on 5/7/19 by mouser@donationcoder.com
//
// mongo db helper functions

"use strict";


// modules
const mongoose = require("mongoose");




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
		throw (new Error("Bad check of mongoIdSame on not objectId object"));
	}

	// not equal
	return false;
}
//---------------------------------------------------------------------------







//---------------------------------------------------------------------------
async function calcDatabaseStructure() {
	// return info about the database structure
	const dbStrcuture = await mongoose.connection.db.listCollections().toArray();
	return dbStrcuture;
}


async function calcDatabaseResourceUse() {
	// get overall db memory use (in kb)
	const statsOptions = {
		scale: 1024,
	};
	var dbStats = await mongoose.connection.db.stats(statsOptions);

	// get database structure
	var dbStructure = await calcDatabaseStructure();
	// add resource use for each collection
	var collection;
	var collectionName, collectionStats;
	var len = dbStructure.length;
	for (var i = 0; i < len; ++i) {
		collection = dbStructure[i];
		collectionName = collection.name;
		collectionStats = await mongoose.connection.db.command({ collstats: collectionName, scale: 1024 });
		// too much info for some fields
		delete collectionStats.wiredTiger;
		delete collectionStats.indexDetails;
		// add it
		collection.stats = collectionStats;
	}

	// build return structure
	var retv = {
		overall: dbStats,
		collections: dbStructure,
	};

	return retv;
}
//---------------------------------------------------------------------------



//---------------------------------------------------------------------------
// see https://github.com/Automattic/mongoose/issues/1959
function isValidMongooseObjectId(str) {
	if (typeof str !== "string") {
		return false;
	}
	return str.match(/^[a-f\d]{24}$/i);
}
//---------------------------------------------------------------------------







module.exports = {
	mongoIdEqual,
	calcDatabaseStructure,
	calcDatabaseResourceUse,
	isValidMongooseObjectId,
};

