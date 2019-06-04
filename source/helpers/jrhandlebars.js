// jrhandlebars
// v1.0.0 on 5/24/19 by mouser@donationcoder.com
//
// some general purpose handlebars temlate helpers

"use strict";


//---------------------------------------------------------------------------
// modules
//---------------------------------------------------------------------------



//---------------------------------------------------------------------------
function setupJrHandlebarHelpers(hbs) {
	// pluralizing helpers
	hbs.registerHelper("jrPluralize", (number, singular, plural) => {
		if (number === undefined) {
			number = 0;
		} else if (Array.isArray(number)) {
			number = number.length;
		}
		if (number === 1) {
			return singular;
		}
		return (typeof plural === "string" ? plural : singular + "s");
	});
	//
	hbs.registerHelper("jrPluralizeCount", (number, singular, plural) => {
		if (number === undefined) {
			number = 0;
		} else if (Array.isArray(number)) {
			number = number.length;
		}
		//
		var numberStr = number.toString();
		if (number === 1) {
			return numberStr + " " + singular;
		}
		return (typeof plural === "string" ? numberStr + " " + plural : numberStr + " " + singular + "s");
	});
}
//---------------------------------------------------------------------------



//---------------------------------------------------------------------------
function loadPartialFiles(hbs, partialsDir) {
	// walk a directory for all files with extensions hbs and register them as partials for handlebars
	// see https://gist.github.com/benw/3824204
	// see http://stackoverflow.com/questions/8059914/express-js-hbs-module-register-partials-from-hbs-file

	const fs = require("fs");
	var filenames = fs.readdirSync(partialsDir);

	filenames.forEach((filename) => {
		var matches = /^([^.]+).hbs$/.exec(filename);
		if (!matches) {
			return;
		}
		var name = matches[1];
		var template = fs.readFileSync(partialsDir + "/" + filename, "utf8");
		hbs.registerPartial(name, template);
	});
}
//---------------------------------------------------------------------------







//---------------------------------------------------------------------------
module.exports = {
	setupJrHandlebarHelpers, loadPartialFiles,
};
//---------------------------------------------------------------------------
