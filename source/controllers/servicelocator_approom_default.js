/**
 * @module controllers/servicelocator_default
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 11/19/19
 * @description
 * Creates the default service locator which maps the default classes adn dependencies
 */

"use strict";


//---------------------------------------------------------------------------
// default service locator configuration
function makeServiceLocator() {
	// create service locator
	var serviceLocator = require("../helpers/jrservicelocator");

	// initialize it with all of the dependencies in the system (note that order is important to avoid cyclical includes)

	// generic helpers
	// NOTE: these dont really need the service locator system, as they are not really candidates for swapping out
	if (false) {
		serviceLocator.registerPath("helpers/jrdebug", require.resolve("../helpers/jrdebug"));
		serviceLocator.registerPath("helpers/jrconfig", require.resolve("../helpers/jrconfig"));
		serviceLocator.registerPath("helpers/jrh_crypto", require.resolve("../helpers/jrh_crypto"));
		serviceLocator.registerPath("helpers/jrh_grid", require.resolve("../helpers/jrh_grid"));
		serviceLocator.registerPath("helpers/jrh_handlebars", require.resolve("../helpers/jrh_handlebars"));
		serviceLocator.registerPath("helpers/jrh_misc", require.resolve("../helpers/jrh_misc"));
		serviceLocator.registerPath("helpers/jrh_mongo_filter", require.resolve("../helpers/jrh_mongo_filter"));
		serviceLocator.registerPath("helpers/jrh_text", require.resolve("../helpers/jrh_text"));
		serviceLocator.registerPath("helpers/jrh_validate", require.resolve("../helpers/jrh_validates"));
		serviceLocator.registerPath("helpers/jrlog", require.resolve("../helpers/jrlog"));
		serviceLocator.registerPath("helpers/jrresult", require.resolve("../helpers/jrresult"));
	}

	// some early controller dependencies
	serviceLocator.registerPath("ratelimiteraid", require.resolve("./ratelimiteraid"));
	serviceLocator.registerPath("aclaid", require.resolve("./aclaid"));
	serviceLocator.registerPath("arserver", require.resolve("./arserver"));

	// models
	serviceLocator.registerPath("models/model_base_mongoose", require.resolve("../models/model_base_mongoose"));
	serviceLocator.registerPath("models/model_base_mongoose_minimal", require.resolve("../models/model_base_mongoose_minimal"));
	//
	serviceLocator.registerPath("models/app", require.resolve("../models/app"));
	serviceLocator.registerPath("models/connection", require.resolve("../models/connection"));
	serviceLocator.registerPath("models/log", require.resolve("../models/log"));
	serviceLocator.registerPath("models/user", require.resolve("../models/user"));
	serviceLocator.registerPath("models/login", require.resolve("../models/login"));
	serviceLocator.registerPath("models/option", require.resolve("../models/option"));
	serviceLocator.registerPath("models/room", require.resolve("../models/room"));
	serviceLocator.registerPath("models/roomdata", require.resolve("../models/roomdata"));
	serviceLocator.registerPath("models/file", require.resolve("../models/file"));
	serviceLocator.registerPath("models/session", require.resolve("../models/session"));
	serviceLocator.registerPath("models/verification", require.resolve("../models/verification"));

	// controllers
	serviceLocator.registerPath("adminaid", require.resolve("./adminaid"));
	serviceLocator.registerPath("crudaid", require.resolve("./crudaid"));
	serviceLocator.registerPath("registrationaid", require.resolve("./registrationaid"));


	// return the service locator which will be used by invoking .jrequire("name")
	return serviceLocator;
}
//---------------------------------------------------------------------------




// export the class as the sole export
module.exports = makeServiceLocator;
