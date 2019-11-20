/**
 * @module controllers/jrequireaid
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 11/19/19
 * @description
 * Initialize the default service locator which maps the default classes and dependencies
 * If you wanted to make an app that used different module replacements, you would just not call this, OR call this and THEN replace/overwrite the selective paths you cared about
 */

"use strict";


// the jrequire module (singleton) is where we registere the module paths
const jrequire = require("../helpers/jrequire");




//---------------------------------------------------------------------------
// default service locator configuration
function setupDefaultModulePaths() {

	// initialize it with all of the dependencies in the system (note that order is important to avoid cyclical includes)

	// generic helpers
	// NOTE: these dont really need the service locator system, as they are not really candidates for swapping out
	if (false) {
		jrequire.registerPath("helpers/jrdebug", require.resolve("../helpers/jrdebug"));
		jrequire.registerPath("helpers/jrconfig", require.resolve("../helpers/jrconfig"));
		jrequire.registerPath("helpers/jrh_crypto", require.resolve("../helpers/jrh_crypto"));
		jrequire.registerPath("helpers/jrh_grid", require.resolve("../helpers/jrh_grid"));
		jrequire.registerPath("helpers/jrh_handlebars", require.resolve("../helpers/jrh_handlebars"));
		jrequire.registerPath("helpers/jrh_misc", require.resolve("../helpers/jrh_misc"));
		jrequire.registerPath("helpers/jrh_mongo_filter", require.resolve("../helpers/jrh_mongo_filter"));
		jrequire.registerPath("helpers/jrh_text", require.resolve("../helpers/jrh_text"));
		jrequire.registerPath("helpers/jrh_validate", require.resolve("../helpers/jrh_validate"));
		jrequire.registerPath("helpers/jrlog", require.resolve("../helpers/jrlog"));
		jrequire.registerPath("helpers/jrresult", require.resolve("../helpers/jrresult"));
	}

	// some early controller dependencies
	jrequire.registerPath("ratelimiteraid", require.resolve("./ratelimiteraid"));
	jrequire.registerPath("aclaid", require.resolve("./aclaid"));
	jrequire.registerPath("arserver", require.resolve("./arserver"));

	// models
	jrequire.registerPath("models/model_base_mongoose", require.resolve("../models/model_base_mongoose"));
	jrequire.registerPath("models/model_base_mongoose_minimal", require.resolve("../models/model_base_mongoose_minimal"));
	//
	jrequire.registerPath("models/app", require.resolve("../models/app"));
	jrequire.registerPath("models/connection", require.resolve("../models/connection"));
	jrequire.registerPath("models/log", require.resolve("../models/log"));
	jrequire.registerPath("models/user", require.resolve("../models/user"));
	jrequire.registerPath("models/login", require.resolve("../models/login"));
	jrequire.registerPath("models/option", require.resolve("../models/option"));
	jrequire.registerPath("models/room", require.resolve("../models/room"));
	jrequire.registerPath("models/roomdata", require.resolve("../models/roomdata"));
	jrequire.registerPath("models/file", require.resolve("../models/file"));
	jrequire.registerPath("models/session", require.resolve("../models/session"));
	jrequire.registerPath("models/verification", require.resolve("../models/verification"));

	// controllers
	jrequire.registerPath("adminaid", require.resolve("./adminaid"));
	jrequire.registerPath("crudaid", require.resolve("./crudaid"));
	jrequire.registerPath("registrationaid", require.resolve("./registrationaid"));


	// return the jrequire module so it can be chained
	return jrequire;
}
//---------------------------------------------------------------------------




// export the single function as the sole export
module.exports = {
	setupDefaultModulePaths,
};
