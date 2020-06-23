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
const jrdebug = require("../helpers/jrdebug");
//---------------------------------------------------------------------------




//---------------------------------------------------------------------------
// we use a module-wide flag to help testing when we want to fake bad credentials to test error
let flagUseBadCredentialsForTesting = false;
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
	let client;

	// connect to db at start, and tear down at end
	before(async () => {
		client = undefined;
		// connect server and db and run it to listen for connections
		assert(await arserver.startUp(true), "Could not connect to and start the arserver!");
		// create client
		client = createTestClient();
	});

	after(async () => {
		// disconnect server
		await arserver.shutDown();
		// debug
		if (client) {
			if (jrdebug.getDebugTagEnabled("client")) {
				client.debugToConsole();
			}
			// close client
			await client.shutDown();
			client = undefined;
		}
	});



	// Test intial api token get (note that if we don't do this here, the api will auto request it on our first invoke below
	it("Client connect and get api keys", async () => {
		// connect
		await assertClientConnect(client, true);
	});


	// find an application id
	let app;
	it("Invoke simple app lookup", async () => {
		const query = {
			appShortcode: "A1",
		};
		const reply = await client.invoke("/api/app/lookup", query);
		assertNoErrorInReply(reply, "Invoking app lookup");
		app = reply.app;
		jrdebug.cdebug("test", "Reply from app lookup:");
		jrdebug.cdebugObj("test", reply);
	});

	// create a new room
	it("Invoke room add", async () => {
		assert(app, "Missing app from previous lookup");
		const query = {
			appid: app._id,
			shortcode: "$RND",
			label: "mocha test room",
		};
		const reply = await client.invoke("/api/room/add", query);
		assertNoErrorInReply(reply, "Invoking room add");
		jrdebug.cdebug("test", "Reply from room add:");
		jrdebug.cdebugObj("test", reply);
	});


	// room lookup
	let room;
	it("Invoke simple room lookup", async () => {
		const query = {
			appShortcode: "A1",
			roomShortcode: "R1A1",
		};
		const reply = await client.invoke("/api/room/lookup", query);
		assertNoErrorInReply(reply, "Invoking room lookup");
		room = reply.room;
		jrdebug.cdebug("test", "Reply from room lookup:");
		jrdebug.cdebugObj("test", reply);
	});

	// get roomdata in the room
	it("Invoke roomdata lookup", async () => {
		assert(room, "Missing room from previous lookup");
		const query = {
			roomId: room._id,
		};
		const reply = await client.invoke("/api/roomdata/list", query);
		assertNoErrorInReply(reply, "Invoking room lookup");
		jrdebug.debug("Finished roomdata lookup, got " + reply.roomData.length + " items.");
		jrdebug.cdebug("test", "Reply from roomdata lookup:");
		jrdebug.cdebugObj("test", reply);
	});

	// get roomdata in the room via shortcode
	it("Invoke roomdata lookup via shortcode directly", async () => {
		assert(room, "Missing room from previous lookup");
		const query = {
			roomShortcode: "R1A1",
		};
		const reply = await client.invoke("/api/roomdata/list", query);
		assertNoErrorInReply(reply, "Invoking room lookup via shortcode");
	});

	// add a roomdata
	it("Invoke roomdata add", async () => {
		assert(room, "Missing room from previous lookup");
		const query = {
			roomid: room._id,
			label: "mocha test item",
			extraData: {
				e1: true,
				e2: "some text",
				e3: [1, 2, 3],
			},
		};
		const reply = await client.invoke("/api/roomdata/add", query);
		assertNoErrorInReply(reply, "Invoking roomdata add");
		jrdebug.cdebug("test", "Reply from roomdata add:");
		jrdebug.cdebugObj("test", reply);
	});


	// lets try some call that we know should fail to connect
	it("Test what should be a failure to get a good reply", async () => {
		const reply = await client.invoke("/api/BADURL");
		assertErrorInReply(reply, "Testing invocation that should return an error.");
	});



	// lets try a call that should be ok but we're going to false a bad auth token reply
	it("Test what should be a failure to get a valid auth token", async () => {
		flagUseBadCredentialsForTesting = true;
		client.disconnectAndClearCache();
		await client.connect(true);
		flagUseBadCredentialsForTesting = false;
		assert(!client.getValidApiAccess(), "Connected successfully but we should not have been able to.");
	});


	// lets try a call to a bad port that should timeout
	it("Test what should be a failure timeout or bad connection to bad ip", async () => {
		// force bad client options
		client.disconnectAndClearCache();
		client.setOption("serverUrlBase", "http://127.0.0.1:1234");
		// try to connect to bad client
		await client.connect(true);
		// restore client options
		setClientOptions(client);
		// make sure it failed
		assert(!client.getValidApiAccess(), "Connected successfully but we should not have been able to.");
	});



	// get roomdata in the room via shortcode
	it("Test hello reply", async () => {
		const reply = await client.invoke("/api/hello");
		assertNoErrorInReply(reply, "Invoking simple api hello");
	});


});
//---------------------------------------------------------------------------














//---------------------------------------------------------------------------
function createTestClient() {
	// create new client
	const client = arclient.makeNewAppRoomClient();
	setClientOptions(client);
	return client;
}



function setClientOptions(client) {
	// client options
	const clientOptions = {
		serverUrlBase: arserver.getBaseServerIpHttp(),
		getCredentialsFunction: async (clientp, hintMessage) => { return await handleGetCredentialsCallbackFunction(clientp, hintMessage); },
		errorFunction: async (clientp, errorMessage) => { return await handleErrorCallbackFunction(clientp, errorMessage); },
		debugFunction: async (clientp, debugMessage) => { return await handleDebugCallbackFunction(clientp, debugMessage); },
		checkTokenExpiration: true,
	};
	client.setOptions(clientOptions);
}



async function handleGetCredentialsCallbackFunction(clientp, hintMessage) {
	jrdebug.cdebug("client", "DEBUG - in client callback - handleGetCredentialsFunction: " + hintMessage);
	const credentials = {
		usernameEmail: arserver.getConfigVal(appdef.DefConfigKeyTestingClientUsernameEmail),
		password: (flagUseBadCredentialsForTesting ? "__BADPASSWORD__" : arserver.getConfigVal(appdef.DefConfigKeyTestingClientPassword)),
	};
	return credentials;
}

async function handleErrorCallbackFunction(clientp, errorMessage) {
	jrdebug.cdebug("client", "DEBUG - in client callback - handleErrorFunction: " + errorMessage);
}

async function handleDebugCallbackFunction(clientp, debugMessage) {
	jrdebug.cdebug("client", "DEBUG - in client callback  DBG: " + debugMessage);
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
	assert(!isErrorInDataReply(reply), "Error returned in " + hintMessage + ": " + reply.error);
}


function assertErrorInReply(reply, hintMessage) {
	assert(isErrorInDataReply(reply), "Ee expected but received no error returned in " + hintMessage + ": " + reply.error);
}


function isErrorInDataReply(reply) {
	if (typeof reply !== "object") {
		return true;
	}
	if (reply.error) {
		return true;
	}
	if (!reply.success) {
		return true;
	}
	return false;
}
//---------------------------------------------------------------------------

