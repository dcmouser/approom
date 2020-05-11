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

// set module flag so we dont run setup twice
var didSetup = false;






//---------------------------------------------------------------------------
/**
 * Register the default module paths for the approom system.
 * This should be called early before an application (or test) is set up, it basically registers the normal modules of the approom system.
 * If you wanted to use the approom framework in a project and SWAP OUT certain modules, you could do that AFTER calling this function, replacing just the modules you care about.
 * ###### Notes
 * You might call setDeferredLoading(false) first if you want to disable deferred loading of requirements, which can be useful to force a predictable order of requirements to bypass any potential cyclical dependencies
 */
function setupDefaultModulePaths() {

	if (didSetup) {
		// ignoore secondary call
		return;
	}

	// set flag
	didSetup = true;

	// initialize it with all of the dependencies in the system
	// NOTE: Because of circular dependencies, if we use deferred requirement resolution on the jrequire helper, then the order we declare things here does not matter;
	// but we might turn off deferred requirements in order to get the order safe and predictable.

	// generic helpers
	// NOTE: these dont really need the service locator system, as they are not really candidates for swapping out?
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
	jrequire.registerPath("appdef", require.resolve("./appdef"));
	jrequire.registerPath("aclaid", require.resolve("./aclaid"));
	jrequire.registerPath("arserver", require.resolve("./arserver"));

	jrequire.registerPath("arclient", require.resolve("../client/arclient"));

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
	jrequire.registerPath("models/subscription", require.resolve("../models/subscription"));
	jrequire.registerPath("models/modqueue", require.resolve("../models/modqueue"));

	// controllers/aids
	jrequire.registerPath("adminaid", require.resolve("./adminaid"));
	jrequire.registerPath("crudaid", require.resolve("./crudaid"));
	jrequire.registerPath("registrationaid", require.resolve("./registrationaid"));
	jrequire.registerPath("sendaid", require.resolve("./sendaid"));
}


/**
 * Just pass along the deferred loading flag set to jrequire.
 * Turning off deferred loading can be useful to test circular dependency risks and ensure a predictable order of requires that avoids it
 *
 * @param {boolean} val
 */
function setDeferredLoading(val) {
	jrequire.setDeferredLoading(val);
}
//---------------------------------------------------------------------------




// export the single function as the sole export
module.exports = {
	setupDefaultModulePaths,
	setDeferredLoading,
};
