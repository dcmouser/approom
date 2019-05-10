// MOCHA test functions for approom
// mouser@donationcoder.com on 4/26/19

'use strict';


// modules
const assert = require('assert');
//
const AppRoomServer = require('../models/server');
const UserModel = require('../models/user');
// helpers
const jrhelpers = require('../helpers/jrhelpers');

// describe tests to mocha




// server tests
describe('server', function () {

	// we need to change timeout for this test
	this.timeout(10000);

	// connect to db at start, and tear down at end
	var arserver = AppRoomServer.getSingleton();
	before(async function() {
		// connect server and db
		await arserver.dbSetup();
	});
	after(async function() {
		// disconnect server
		await arserver.closeDown();
	});



	it('Server test #1', done => {
		assert(true == true);
		//console.log('Starting up server.');
		//arserver.runServer();
		done();
	});

	// note that an async test doesn't call done() at the end
	it('Server async test #2', async() => {
		assert(true == true);
		//console.log('Starting up server.');
		//await arserver.runServer();
	});

});




// user model test
describe('user', function () {

	// we need to change timeout for this test
	this.timeout(10000);

	// connect to db at start, and tear down at end
	var arserver = AppRoomServer.getSingleton();
	before(async function() {
		// connect server and db
		await arserver.dbSetup();
	});
	after(async function() {
		// disconnect server
		await arserver.closeDown();
	});



	it('User test #1', done => {
		assert(true == true);
		done();
	});


	it('Checking admin password is still set to default', async() => {
		// get admin user
		var doc = await UserModel.mongooseModel.findOne().where('username','admin').exec();
		assert(doc != undefined, 'user with "admin" username not found');

		// test password see if its default
		var plaintextPassword = UserModel.getPasswordAdminPlaintextDefault();
		var bretv = doc.testPassword(plaintextPassword);
		assert(bretv, 'admin user password is not set to default value');
	});





});
