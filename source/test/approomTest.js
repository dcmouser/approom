/**
 * @module approomTest
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 4/26/19

 * @description
 * MOCHA test functions for approom application/framework
*/

"use strict";


// misc modules
const assert = require("assert");



//---------------------------------------------------------------------------
// program globals (version, author, etc.)
const arGlobals = require("../approomglobals");
//---------------------------------------------------------------------------


//---------------------------------------------------------------------------
// dynamic dependencies instead of using require
const jrequire = arGlobals.setupDefaultModulePaths();

const arserver = jrequire("arserver");
const UserModel = jrequire("models/user");
//---------------------------------------------------------------------------








//---------------------------------------------------------------------------
// this should be done by even the unit test runners

// setup initial config stuff
arserver.setup();

// configure server instance
arserver.processConfig();
//---------------------------------------------------------------------------





// describe tests to mocha





//---------------------------------------------------------------------------
// server tests
describe("server", function test() {

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
describe("user", function test() {

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
		var bretv = await user.testPlaintextPassword(plaintextPassword);

		assert(bretv, "admin user password is not set to default value");
	});

});
//---------------------------------------------------------------------------
