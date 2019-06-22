// jrhandlebars
// v1.0.0 on 5/24/19 by mouser@donationcoder.com
//
// some general purpose handlebars temlate helpers

"use strict";

// modules
const hbs = require("hbs");
//
const fs = require("fs");
const path = require("path");

// our helper modules
const jrlog = require("./jrlog");
const jrhelpers = require("./jrhelpers");
const jrhmisc = require("./jrhmisc");
const jrhgrid = require("./jrhgrid");








//---------------------------------------------------------------------------
function loadPartialFiles(partialsDir, prefix) {
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
				loadPartialFiles(fullPath, recursivePrefix);
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
// these are registered with handlebar template system so they can be called as functions from hbs view files
function setupJrHandlebarHelpers() {

	// pluralizing helpers
	hbs.registerHelper("jrPluralize", (number, singular, plural) => jrhmisc.jrPluralize(number, singular, plural));

	// pluralizing helper
	hbs.registerHelper("jrPluralizeCount", (number, singular, plural) => jrhmisc.jrPluralizeCount(number, singular, plural));

	// form helper for drop down inputs
	hbs.registerHelper("jrHtmlFormOptionList", (pairlist, selectedid) => new hbs.SafeString(jrhmisc.jrHtmlFormOptionList(pairlist, selectedid)));

	// paged grid list helper
	hbs.registerHelper("jrGridList", listHelperData => new hbs.SafeString(jrhgrid.jrGridList(listHelperData)));
}
//---------------------------------------------------------------------------

















//---------------------------------------------------------------------------
module.exports = {
	setupJrHandlebarHelpers, loadPartialFiles,
};
//---------------------------------------------------------------------------
