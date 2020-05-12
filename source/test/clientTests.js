/**
 * @module clientTests
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 4/14/20

 * @description
 * MOCHA test functions for approom application/framework - client
 * Note that client testing requires a client login account username/password
 * This is retrieved from options file (normally defaultPrivate.yml in /local/config)
 * Values: "testing:CLIENT_USERNAMEEMAIL" and "testing:CLIENT_USERPASSWORD"
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

// dynamic dependency requires
const arserver = jrequire("arserver");
const arclient = jrequire("arclient");

// constants
const appdef = jrequire("appdef");

// helper modules
const JrResult = require("../helpers/jrresult");
const jrdebug = require("../helpers/jrdebug");
//---------------------------------------------------------------------------










//---------------------------------------------------------------------------
// this should be done by even the unit test runners

// setup initial config stuff
arserver.setAppInfo(arGlobals);
arserver.addEarlyConfigFileSet("testing");
arserver.setup(["testing"]);
//---------------------------------------------------------------------------








// describe tests to mocha





//---------------------------------------------------------------------------
// client tests
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
		await arserver.shutDown();
		// debug
		if (jrdebug.getDebugEnabled()) {
			client.debugToConsole();
		}
		// close client
		await client.shutDown();
	});



	// Test intial api token get (note that if we don't do this here, the api will auto request it on our first invoke below
	it("Client connect and get api keys", async () => {
		// connect
		await assertClientConnect(client, true);
	});


	// find an application id
	var app;
	it("Invoke simple app lookup", async () => {
		var query = {
			appShortcode: "A1",
		};
		var reply = await client.invoke("/api/app/lookup", query);
		assertNoErrorInReply(reply, "Invoking app lookup");
		app = reply.app;
		jrdebug.cdebug("Reply from app lookup:");
		jrdebug.cdebugObj(reply);
	});

	// create a new room
	it("Invoke room add", async () => {
		assert(app, "Missing app from previous lookup");
		var query = {
			appid: app._id,
			shortcode: "$RND",
			label: "mocha test room",
		};
		var reply = await client.invoke("/api/room/add", query);
		assertNoErrorInReply(reply, "Invoking room add");
		jrdebug.cdebug("Reply from room add:");
		jrdebug.cdebugObj(reply);
	});


	// room lookup
	var room;
	it("Invoke simple room lookup", async () => {
		var query = {
			appShortcode: "A1",
			roomShortcode: "R1A1",
		};
		var reply = await client.invoke("/api/room/lookup", query);
		assertNoErrorInReply(reply, "Invoking room lookup");
		room = reply.room;
		jrdebug.cdebug("Reply from room lookup:");
		jrdebug.cdebugObj(reply);
	});

	// get roomdata in the room
	it("Invoke roomdata lookup", async () => {
		assert(room, "Missing room from previous lookup");
		var query = {
			roomId: room._id,
		};
		var reply = await client.invoke("/api/roomdata/list", query);
		assertNoErrorInReply(reply, "Invoking room lookup");
		jrdebug.debug("Finished roomdata lookup, got " + reply.roomData.length + " items.");
		jrdebug.cdebug("Reply from roomdata lookup:");
		jrdebug.cdebugObj(reply);
	});

	// get roomdata in the room via shortcode
	it("Invoke roomdata lookup via shortcode directly", async () => {
		assert(room, "Missing room from previous lookup");
		var query = {
			roomShortcode: "R1A1",
		};
		var reply = await client.invoke("/api/roomdata/list", query);
		assertNoErrorInReply(reply, "Invoking room lookup via shortcode");
	});

	// add a roomdata
	it("Invoke roomdata add", async () => {
		assert(room, "Missing room from previous lookup");
		var query = {
			roomid: room._id,
			label: "mocha test item",
			extraData: {
				e1: true,
				e2: "some text",
				e3: [1, 2, 3],
			},
		};
		var reply = await client.invoke("/api/roomdata/add", query);
		assertNoErrorInReply(reply, "Invoking roomdata add");
		jrdebug.cdebug("Reply from roomdata add:");
		jrdebug.cdebugObj(reply);
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
		getCredentialsFunction: async (clientp, hintMessage) => { return await handleGetCredentialsCallbackFunction(clientp, hintMessage); },
		errorFunction: async (clientp, errorMessage) => { return await handleErrorCallbackFunction(clientp, errorMessage); },
		debugFunction: async (clientp, debugMessage) => { return await handleDebugCallbackFunction(clientp, debugMessage); },
		checkTokenExpiration: true,
	};
	client.setOptions(clientOptions);
	return client;
}



async function handleGetCredentialsCallbackFunction(clientp, hintMessage) {
	jrdebug.cdebug("DEBUG - in client callback - handleGetCredentialsFunction: " + hintMessage);
	var credentials = {
		usernameEmail: arserver.getConfigVal(appdef.DefConfigKeyTestingClientUsernameEmail),
		password: arserver.getConfigVal(appdef.DefConfigKeyTestingClientPassword),
	};
	return credentials;
}

async function handleErrorCallbackFunction(clientp, errorMessage) {
	jrdebug.cdebug("DEBUG - in client callback - handleErrorFunction: " + errorMessage);
}

async function handleDebugCallbackFunction(clientp, debugMessage) {
	jrdebug.cdebug("DEBUG - in client callback  DBG: " + debugMessage);
}
//---------------------------------------------------------------------------



//---------------------------------------------------------------------------
async function assertClientConnect(client, flagReconnect) {
	await client.connect(true);
	if (!client.getValidApiAccess()) {
		console.log("Client last error: " + client.getLastError());
	}
	assert(client.getValidApiAccess() === true, "Client failed to get valid api key.");
}

function assertNoErrorInReply(reply, hintMessage) {
	// if (reply.error) {
	// 	console.log("Error details: " + reply.error);
	// }
	assert(!reply.error, "Error returned in " + hintMessage + ": " + reply.error);
}
//---------------------------------------------------------------------------

