// approom
// server model
// mouser@donationcoder.com on 4/26/19
//
// The Server model is a singleton object that manages general settings for the server system

'use strict';

// database imports
const mongo = require('mongodb');
const mongoose = require('mongoose');



//---------------------------------------------------------------------------
module.exports.doDummyWork = async function () {
	// dummy work for testing
	console.log('Doing dummy work..');
	return true;
	};



module.exports.dbSetup = async function () {
	// setup database and acl stuff
	// ATTN: this code is faulty because it can throw an error without closing db because of async promise calls

	try {
		const mongoClient = mongo.MongoClient;
		const mongoUrl = 'mongodb://localhost/approomdb';

		var connect = await mongoClient.connect(mongoUrl, { useNewUrlParser: true });
		console.log ('connected to mongodb.');

		var db = connect;
		var dbo = await db.db('approomdb');
		console.log ('connected to mongodb db.');

		var collection = await dbo.createCollection('users');
		console.log ('connected to mongodb collection "users".');

		console.log('closing db connection.');
		db.close();

		return true;
	}
	catch (err) {
		console.log('Exception while trying to setup database:')
		console.log(err);
	}

};
//---------------------------------------------------------------------------

