/**
 * @module helpers/jrhmisc
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 5/24/19

 * @description
 * Collection of my general helper functions for html/views
*/

"use strict";




/**
 * Pluralize a string based on a number (presumably the number of items being referred to)
 * @example "You have eaten " + jrPluralizeCount(4, "apples", "apples")
 * So it used the singular if the count is 1, otherwise the plural
 *
 * @param {int} number
 * @param {string} singular
 * @param {string} plural
 * @returns string with number specified as signular or plural, and number mentioned specifically
 */
function jrPluralizeCount(number, singular, plural) {
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
}

/**
 * Pluralize a string based on a number (presumably the number of items being referred to)
 * @example "You have eaten " + jrPluralize(4, "one apple", "some apples")
 * @example "Should we discard the " + jrPluralize(4, "apple")
 * So it used the singular if the count is 1, otherwise the plural form; if no plural form is specified, use singular and add "s"
 *
 * @param {int} number
 * @param {string} singular
 * @param {string} plural
 * @returns string with number specified as signular or plural
 */
function jrPluralize(number, singular, plural) {
	if (number === undefined) {
		number = 0;
	} else if (Array.isArray(number)) {
		number = number.length;
	}
	if (number === 1) {
		return singular;
	}
	return (typeof plural === "string" ? plural : singular + "s");
}
//---------------------------------------------------------------------------




/**
 * Create an html input select (drop down) list.
 *
 * @param {string} name of the select input
 * @param {array} pairlist - list of id -> description pairs
 * @param {*} selectedid - id of currently select id (if any)
 * @returns html for inclusion in form
 */
function jrHtmlFormOptionListSelect(selectName, pairlist, selectedid) {
	var appHtmlList = jrHtmlFormOptionList(pairlist, selectedid);
	var rethtml = `
		<select name="${selectName}">
			${appHtmlList}
		</select>
		`;
	return rethtml;
}

/**
 *
 * Create an html string containing <option value="val">description</option> values
 *
 * @param {array} pairlist - list of id -> description pairs
 * @param {*} selectedid - id of currently select id (if any)
 * @returns html for inclusion in form (inside a select form object usually)
 */
function jrHtmlFormOptionList(pairlist, selectedid) {
	var rethtml = "";
	var foundId = false;
	// cast id to a string
	selectedid = (selectedid === null || selectedid === undefined) ? "" : selectedid.toString();
	// now find it in list
	if (pairlist) {
		var seltext;
		for (var key in pairlist) {
			if (key === selectedid) {
				seltext = " selected";
				foundId = true;
			} else {
				seltext = "";
			}
			rethtml += "<option value=\"" + key + "\"" + seltext + ">" + pairlist[key] + "</option>\n";
		}
	}
	if (selectedid && !foundId) {
		// since we couldn't find an item for selected one, and an id was specifiedi, we add a new option at top and select it
		rethtml = "<option value=\"" + selectedid + "\" selected> UNKNOWN VALUE (#" + selectedid + ")</option>\n" + rethtml;
	}
	return rethtml;
}


/**
 * Given a pairlist of form id=>optionlabel, return the optionlabel corresponding to specified id
 *
 * @param {array} pairlist - list of id -> description pairs
 * @param {*} selectedid - id of currently select id (if any)
 * @param {*} defaultVal - value to return if not found in list
 * @returns the description/label associated with the id, or defaultVal if not found
 */
function jrHtmlNiceOptionFromList(pairlist, selectedid, defaultVal) {
	// blank, nothing we can do
	if (selectedid === null || selectedid === undefined || selectedid === "") {
		return defaultVal;
	}
	var label = pairlist[selectedid];
	if (label === undefined) {
		return defaultVal;
	}

	return label;
}
//---------------------------------------------------------------------------





/**
 * Helper funciton to generate some html that shows a bootstrap spoiler box with some debug information
 *
 * @param {string} title
 * @param {string} body
 * @param {string} footer
 * @returns html string
 */
function jrBootstrapCollapseBox(title, body, footer) {

	if (!(body instanceof String)) {
		body = "<pre>" + JSON.stringify(body, null, "  ") + "</pre>";
	}

	var rethtml = `
		<div class="card" style="padding: 5px; margin: 5px;">
				<div class="card-heading">
					<h4 class="card-title">
					<a data-toggle="collapse" href="#collapse1">&gt; ${title}</a>
					</h4>
				</div>
				<div id="collapse1" class="card-collapse collapse">
					<div class="card-body">${body}</div>
					<div class="card-footer">${footer}</div>
				</div>
		</div>
		`;

	return rethtml;
}
//---------------------------------------------------------------------------




//---------------------------------------------------------------------------
/**
 * Simple wrapper for JSON.stringify that formats output for html using <pre> tags
 *
 * @param {*} obj
 * @returns html string
 */
function jrHtmlStrigifyObject(obj) {
	var rethtml = "<pre>" + JSON.stringify(obj, null, "  ") + "</pre>";
	return rethtml;
}
//---------------------------------------------------------------------------




/**
 * Create html text for a form input password, with a hint saying whether there is an existing value in the database,
 * and a hint saying whether leaving the value blank will preserve existing value,
 * and a hint showing how to clear the database value by using a "-" character (if this is an optional password field)
 *
 * @param {string} fieldName
 * @param {*} obj
 * @param {boolean} flagRequired
 * @param {boolean} flagExistingIsNonBlank
 * @returns html string
 */
function jrHtmlFormInputPassword(fieldName, obj, flagRequired, flagExistingIsNonBlank) {
	var rethtml, val;
	if (obj && obj[fieldName]) {
		val = obj[fieldName];
	} else {
		val = "";
	}
	rethtml = `<input name="${fieldName}" type="password" value="${val}">`;
	if (flagExistingIsNonBlank) {
		rethtml += " (existing password in db is encrypted and non-blank; leave this field empty to preserve the existing password";
		if (!flagRequired) {
			rethtml += "; or specify '-' to delete existing password and leave it blank";
		}
		rethtml += ")";
	}
	return rethtml;
}
//---------------------------------------------------------------------------








module.exports = {
	jrPluralizeCount,
	jrPluralize,
	jrHtmlFormOptionListSelect,
	jrHtmlFormOptionList,
	jrHtmlNiceOptionFromList,
	jrBootstrapCollapseBox,
	jrHtmlStrigifyObject,
	jrHtmlFormInputPassword,
};

