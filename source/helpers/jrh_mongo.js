/**
 * @module helpers/jrh_mongo
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 5/7/19

 * @description
 * Collection of helper functions for mongo and mongoose database framework
*/

"use strict";


// modules
const mongoose = require("mongoose");




/**
 * Check if two mongo object ids are identical, with support for ids being undefined/null.
 * ##### Note
 *  * returns false if EITHER id is undefined/null.
 *
 * @param {*} id1
 * @param {*} id2
 * @returns true if they are equal mongo ids, and neither is null or undefined
 */
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
/**
 * Helper function that generates an object with debug diagnostic info about mongoose/mongo database
 *
 * @returns object with diagnostic info
 */
async function calcDatabaseStructure() {
	// return info about the database structure
	const dbStrcuture = await mongoose.connection.db.listCollections().toArray();
	return dbStrcuture;
}


/**
 * Helper function that generates an object with debug diagnostic info about mongoose/mongo database resource use
 *
 * @returns object with diagnostic info
 */
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
/**
 * Checks if a mongo/mongoose id is valid.
 * @see <a href="https://github.com/Automattic/mongoose/issues/1959">github issue</a>
 * ##### Notes
 *  * It may be unwise to use this strict a function, because if mongo id syntax changes it will fail.
 *  * This function is used to check if a certain string referes to a valid mongo id
 *
 * @param {string} str
 * @returns true if the passed str is a string and matches mongoose/mongo id format
 */
function isValidMongooseObjectId(str) {
	if (typeof str !== "string") {
		// try converting it to a string
		try {
			str = str.toString();
			// ok so drop down and check it now
		} catch (e) {
			return false;
		}
	}
	return str.match(/^[a-f\d]{24}$/i);
}
//---------------------------------------------------------------------------



//---------------------------------------------------------------------------
/**
 * We are passed an array of objects, with _id being a field of each object.
 * We return an array of just the ids of each object
 * @todo this is probably a fancy js way to get these quickly
 * @see <a href="https://stackoverflow.com/questions/19590865/from-an-array-of-objects-extract-value-of-a-property-as-array"> stackoverflow </a>
 *
 * @param {array} objArray
 */
function convertArrayOfObjectIdsToIdArray(objArray) {
	const idArray = objArray.map((oneObj) => oneObj._id);
	return idArray;
}
//---------------------------------------------------------------------------




module.exports = {
	mongoIdEqual,
	calcDatabaseStructure,
	calcDatabaseResourceUse,
	isValidMongooseObjectId,
	convertArrayOfObjectIdsToIdArray,
};

