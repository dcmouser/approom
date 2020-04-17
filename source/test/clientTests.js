/**
 * @module clientTests
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 4/14/20

 * @description
 * MOCHA test functions for approom application/framework - client
*/

"use strict";



//---------------------------------------------------------------------------
// testing modules
const assert = require("assert");
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
const arclient = jrequire("arclient");

// helper modules
const jrdebug = require("../helpers/jrdebug");
//---------------------------------------------------------------------------


//---------------------------------------------------------------------------
// this should be done by even the unit test runners

// setup initial config stuff
arserver.setup();
//---------------------------------------------------------------------------








// describe tests to mocha





//---------------------------------------------------------------------------
// server tests
describe("client", function test() {
	// we need to change timeout for this test
	this.timeout(10000);

	var client;

	// connect to db at start, and tear down at end
	before(async () => {
		// connect server and db and run it to listen for connections
		await arserver.startUp(true);
		// create client
		client = createTestClient();
	});

	after(async () => {
		// disconnect server
		arserver.shutDown();
		// debug
		if (jrdebug.getDebugEnabled()) {
			client.debugToConsole();
		}
		// close client
		client.shutdown();
	});



	// Client test
	it("Client connect and get api keys", async () => {
		// connect
		await client.connect(true);
		if (!client.getValidApiAccess()) {
			console.log("Client last error: " + client.getLastError());
		}
		assert(client.getValidApiAccess() === true, "Client failed to get valid api key.");
	});

});

//---------------------------------------------------------------------------














//---------------------------------------------------------------------------
function createTestClient() {
	// create new client
	var client = arclient.makeNewAppRoomClient();

	// client options
	const clientOptions = {
		serverUrlBase: arserver.getBaseServerIpHttp(),
		getCredentialsFunction: async (clientp, hintMessage) => { return await handleGetCredentialsFunction(clientp, hintMessage); },
		errorFunction: async (clientp, errorMessage) => { return await handleErrorFunction(clientp, errorMessage); },
		debugFunction: async (clientp, debugMessage) => { return await handleDebugFunction(clientp, debugMessage); },
	};
	client.setOptions(clientOptions);
	return client;
}


async function handleGetCredentialsFunction(clientp, hintMessage) {
	jrdebug.cdebug("DEBUG - in client callback - handleGetCredentialsFunction: " + hintMessage);
	var credentials = {
		usernameEmail: "admin",
		password: "test",
	};
	return credentials;
}

async function handleErrorFunction(clientp, errorMessage) {
	jrdebug.cdebug("DEBUG - in client callback - handleErrorFunction: " + errorMessage);
}

async function handleDebugFunction(clientp, debugMessage) {
	jrdebug.cdebug("DEBUG - in client callback  DBG: " + debugMessage);
}
//---------------------------------------------------------------------------

