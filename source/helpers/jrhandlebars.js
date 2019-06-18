// jrhandlebars
// v1.0.0 on 5/24/19 by mouser@donationcoder.com
//
// some general purpose handlebars temlate helpers

"use strict";


// our helper modules
const fs = require("fs");
const path = require("path");
const jrlog = require("./jrlog");




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
function loadPartialFiles(hbs, partialsDir, prefix) {
	// walk a directory for all files with extensions hbs and register them as partials for handlebars
	// see https://gist.github.com/benw/3824204
	// see http://stackoverflow.com/questions/8059914/express-js-hbs-module-register-partials-from-hbs-file

	var filenames = fs.readdirSync(partialsDir);

	filenames.forEach((name) => {
		if (name !== ".") {
			// recurse subdirs
			var fullPath = path.join(partialsDir, name);
			if (fs.lstatSync(fullPath).isDirectory()) {
				// recurse
				var recursivePrefix = prefix;
				if (recursivePrefix) {
					recursivePrefix += "/";
				}
				recursivePrefix += name;
				// add it
				loadPartialFiles(hbs, fullPath, recursivePrefix);
			} else {
				// files
				var matches = /^([^.]+).hbs$/.exec(name);
				if (!matches) {
					return;
				}
				var partialName = matches[1];
				var prefixedPartialName = prefix ? (prefix + "/") + partialName : partialName;
				var template = fs.readFileSync(fullPath, "utf8");
				jrlog.cdebugf("Adding handlebar view partial: %s.", prefixedPartialName);
				hbs.registerPartial(prefixedPartialName, template);
			}
		}
	});
}
//---------------------------------------------------------------------------







//---------------------------------------------------------------------------
module.exports = {
	setupJrHandlebarHelpers, loadPartialFiles,
};
//---------------------------------------------------------------------------
