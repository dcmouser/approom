// jrhelpersmdb
// v1.0.0 on 5/7/19 by mouser@donationcoder.com
//
// mongo db helper functions

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
			throw (new Error("Bad check of mongoIdSame on not objectId object"));
		}

		// not equal
		return false;
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	async calcDatabaseStructure() {
		// return info about the database structure
		const dbStrcuture = await mongoose.connection.db.listCollections().toArray();
		return dbStrcuture;
	}


	async calcDatabaseResourceUse() {
		// get overall db memory use (in kb)
		const statsOptions = {
			scale: 1024,
		};
		var dbStats = await mongoose.connection.db.stats(statsOptions);

		// get database structure
		var dbStructure = await this.calcDatabaseStructure();
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



}


// export the class as the sole export
module.exports = JrHelpersMdb.getSingleton();
