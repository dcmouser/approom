/**
 * @module approomTest
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 4/26/19

 * @description
 * MOCHA test functions for approom application/framework
*/

"use strict";



//---------------------------------------------------------------------------
// testing modules
const assert = require("assert");
const axios = require("axios");
const https = require("https");
//---------------------------------------------------------------------------




//---------------------------------------------------------------------------
// program globals (version, author, etc.)
const arGlobals = require("../approomglobals");

// initialize the service dependency requires helper
arGlobals.setupDefaultModulePaths();

// requirement service locator
const jrequire = require("../helpers/jrequire");

// dynamic dependency requires
const arserver = jrequire("arserver");
const UserModel = jrequire("models/user");
//---------------------------------------------------------------------------


//---------------------------------------------------------------------------
// this should be done by even the unit test runners

// setup initial config stuff
arserver.setup();
//---------------------------------------------------------------------------








// describe tests to mocha





//---------------------------------------------------------------------------
// server tests
describe("server", function test() {

	// we need to change timeout for this test
	this.timeout(10000);

	// connect to db at start, and tear down at end
	before(async () => {
		// connect server and db and run it to listen for connections
		await arserver.startUp(true);
	});

	after(async () => {
		// disconnect server
		arserver.shutDown();
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
		// connect server and db but no need to listen for connections
		await arserver.startUp(false);
	});

	after(async () => {
		// disconnect server
		arserver.shutDown();
	});



	it("Checking admin password is still set to default", async () => {
		// get admin user
		var user = await UserModel.findUserByUsername("admin");
		assert(user, "User with 'admin' username not found");

		// test password see if its default
		var plaintextPassword = UserModel.getPasswordAdminPlaintextDefault();
		var bretv = await user.testPlaintextPassword(plaintextPassword);

		assert(bretv, "Admin user password is not set to default value");
	});

});
//---------------------------------------------------------------------------







//---------------------------------------------------------------------------
// user model tests
describe("fetch", function test() {

	// we need to change timeout for this test
	this.timeout(10000);

	// connect to db at start, and tear down at end
	before(async () => {
		// connect server and db and run it to listen for connections
		await arserver.startUp(true);
	});

	after(async () => {
		// disconnect server
		arserver.shutDown();
	});



	it("Fetching about page", async () => {
		// fetch about page

		// ignore cert expired
		// see https://github.com/axios/axios/issues/535
		const agent = new https.Agent({
			rejectUnauthorized: false,
		});

		var url, responseData, data;

		// test http server
		url = arserver.getBaseServerIpHttp() + "/help/about";
		console.log("Fetching from url: " + url);
		responseData = await axios.get(url, { httpsAgent: agent });
		data = responseData.data;
		assert((data && data.success === "About"), "Failed to fetch About info.");

		// test https server
		url = arserver.getBaseServerIpHttps() + "/help/about";
		console.log("Fetching from url: " + url);
		responseData = await axios.get(url, { httpsAgent: agent });
		data = responseData.data;
		assert((data && data.success === "About"), "Failed to fetch About info.");

	});

});

//---------------------------------------------------------------------------
