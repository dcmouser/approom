/**
 * @module helpers/jrh_handlebars
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 5/24/19

 * @description
 * Collection of my general helper functions for handlebars template system
*/

"use strict";


// modules
const hbs = require("hbs");

const fs = require("fs");
const path = require("path");

// our helper modules
const jrdebug = require("./jrdebug");
const jrhText = require("./jrh_text");





//---------------------------------------------------------------------------
/**
 * Register some custom helper functions that become available in handlebar template view files (.hbs)
 *
 */
function setupJrHandlebarHelpers() {

	// pluralizing helpers
	hbs.registerHelper("jrPluralize", (number, singular, plural) => jrhText.jrPluralize(number, singular, plural));

	// pluralizing helper
	hbs.registerHelper("jrPluralizeCount", (number, singular, plural) => jrhText.jrPluralizeCount(number, singular, plural));

	// form helper for drop down inputs
	hbs.registerHelper("jrHtmlFormOptionList", (pairlist, selectedid, flagShowBlank) => new hbs.SafeString(jrhText.jrHtmlFormOptionList(pairlist, selectedid, flagShowBlank)));

	// simple object debug display helper
	hbs.registerHelper("jrHtmlDebugObj", (obj) => new hbs.SafeString(jrhText.jrHtmlStrigifyObject(obj)));

	// simple helper to select the submitted option in an html form
	hbs.registerHelper("jrHtmlSelectOption", (selected, options) => { return jrHbsSelectOption(selected, options); });
}
//---------------------------------------------------------------------------
















//---------------------------------------------------------------------------
// simple helper to select the submitted option in an html form
// see https://stackoverflow.com/questions/13046401/how-to-set-selected-select-option-in-handlebars-template
/* e.g.:
      <select id="role" name="role">
         {{#jrHtmlSelectOption reqBody.role}}
           <option value="member">Member</option>
           <option value="moderator">Moderator</option>
           <option value="owner">Owner</option>
         {{/jrHtmlSelectOption}}
	</select>
*/
function jrHbsSelectOption(selected, options) {
	return options.fn(this).replace(new RegExp(" value=\"" + selected + "\""), "$& selected=\"selected\"");
}
//---------------------------------------------------------------------------







//---------------------------------------------------------------------------
/**
 * Walk a directory for all files with extensions hbs and register them as partials for handlebars.
 * This helper function makes it easy for us to quickly register a directory of partials (includable files) for use in our handlebar view templates
 *
 * @see <a href="https://gist.github.com/benw/3824204">github code</a>
 * @see <a href="http://stackoverflow.com/questions/8059914/express-js-hbs-module-register-partials-from-hbs-file">stackoverflow</a>
 * @param {string} partialsDir - file path
 * @param {string} prefix
 */
function loadPartialFiles(partialsDir, prefix) {
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
				jrdebug.cdebugf("Adding handlebar view partial: %s.", prefixedPartialName);
				hbs.registerPartial(prefixedPartialName, template);
			}
		}
	});
}
//---------------------------------------------------------------------------






// export the class as the sole export
module.exports = {
	setupJrHandlebarHelpers,
	loadPartialFiles,
};

