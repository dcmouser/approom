// MOCHA test functions for approom
// mouser@donationcoder.com on 4/26/19

"use strict";


// misc modules
const assert = require("assert");

// our modules
const arserver = require("../models/server");
const UserModel = require("../models/user");

// helpers
const jrconfig = require("../helpers/jrconfig");




//---------------------------------------------------------------------------
// this should be done by even the unit test runners

// setup initial config stuff
arserver.setupConfigAndLoggingEnvironment();

// configure server instance
arserver.configFromJrConfig(jrconfig);
//---------------------------------------------------------------------------





// describe tests to mocha




// server tests
describe("server", () => {

	// we need to change timeout for this test
	this.timeout(10000);

	// connect to db at start, and tear down at end
	before(async () => {
		// connect server and db
		await arserver.createAndConnectToDatabase();
	});
	after(async () => {
		// disconnect server
		await arserver.closeDown();
	});


	// sample test #1
	it("Sample server test #1", (done) => {
		assert(true);
		done();
	});

	// sample test #2
	// note that an async test doesn't call done() at the end
	it("Sample server test #2 (async)", async () => {
		assert(true);
	});

});




// user model tests
describe("user", () => {

	// we need to change timeout for this test
	this.timeout(10000);

	// connect to db at start, and tear down at end
	before(async () => {
		// connect server and db
		await arserver.createAndConnectToDatabase();
	});

	after(async () => {
		// disconnect server
		await arserver.closeDown();
	});



	it("Checking admin password is still set to default", async () => {
		// get admin user
		var user = await UserModel.findOneByUsername("admin");
		assert(user, "user with 'admin' username not found");

		// test password see if its default
		var plaintextPassword = UserModel.getPasswordAdminPlaintextDefault();
		var bretv = await user.testPassword(plaintextPassword);
		assert(bretv, "admin user password is not set to default value");
	});





});
