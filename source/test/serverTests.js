/**
 * @module serverTests
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 4/26/19

 * @description
 * MOCHA test functions for approom application/framework
*/

"use strict";



//---------------------------------------------------------------------------
// testing modules
const assert = require("assert");
//---------------------------------------------------------------------------




//---------------------------------------------------------------------------
// program globals (version, author, etc.)
const arGlobals = require("../arglobals");
// initialize the service dependency requires helper
arGlobals.setupDefaultModulePaths();

// requirement service locator
const jrequire = require("../helpers/jrequire");

// constants
const appdef = jrequire("appdef");

// dynamic dependency requires
const arserver = jrequire("arserver");
const UserModel = jrequire("models/user");

// helper modules
const jrhAxios = require("../helpers/jrh_axios");
const jrdebug = require("../helpers/jrdebug");
//---------------------------------------------------------------------------



//---------------------------------------------------------------------------
// this should be done by even the unit test runners

// setup initial config stuff
arserver.setAppInfo(arGlobals);
arserver.addEarlyConfigFileSet("testing");
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
		await arserver.shutDown();
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
		await arserver.shutDown();
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
		await arserver.shutDown();
	});



	it("Fetching about page from http server", async () => {
		// fetch about page

		// test http server by getting about page
		const url = arserver.getBaseServerIpHttp() + "/help/about";
		jrdebug.cdebug("misc", "Fetching from url: " + url);
		const responseData = await jrhAxios.getCatchError(url);
		const data = responseData.data;
		assert((data && data.success === "about"), "Failed to fetch About info from http server.");
	});


	it("Fetching about page from https server", async () => {
		// fetch about page

		// test https server by getting about page
		const url = arserver.getBaseServerIpHttps() + "/help/about";
		jrdebug.cdebug("misc", "Fetching from url: " + url);
		const responseData = await jrhAxios.getCatchError(url);
		const data = responseData.data;
		assert((data && data.success === "about"), "Failed to fetch About info from https server.");
	});

});

//---------------------------------------------------------------------------
