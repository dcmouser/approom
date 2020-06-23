/**
 * @module helpers/jrh_text
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 5/24/19

 * @description
 * Collection of helper functions for text/html/views
*/

"use strict";

// modules
// see https://github.com/component/escape-html
const escapeHtml = require("escape-html");




//---------------------------------------------------------------------------
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
	const numberStr = number.toString();
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




//---------------------------------------------------------------------------
/**
 * Create an html input select (drop down) list.
 *
 * @param {string} name of the select input
 * @param {array} choices - list of id -> description pairs
 * @param {*} id - id of currently select id (if any)
 * @returns html for inclusion in form
 */
function jrHtmlFormOptionListSelect(selectName, choices, id, flagShowBlank) {
	const appHtmlList = jrHtmlFormOptionList(choices, id, flagShowBlank);
	const rethtml = `
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
 * @param {array} choices - list of id -> description pairs
 * @param {*} id - id of currently select id (if any)
 * @returns html for inclusion in form (inside a select form object usually)
 */
function jrHtmlFormOptionList(choices, id, flagShowBlank) {
	let rethtml = "";
	let foundId = false;
	// cast id to a string
	id = (id === null || id === undefined) ? "" : id.toString();

	if (flagShowBlank) {
		rethtml += "<option value=\"\" > </option>\n";
	}

	// now find it in list
	if (choices) {
		let seltext;
		for (const key in choices) {
			if (key === id) {
				seltext = " selected";
				foundId = true;
			} else {
				seltext = "";
			}
			rethtml += "<option value=\"" + key + "\"" + seltext + ">" + choices[key] + "</option>\n";
		}
	}
	if (id && !foundId) {
		// since we couldn't find an item for selected one, and an id was specifiedi, we add a new option at top and select it
		rethtml = "<option value=\"" + id + "\" selected> UNKNOWN VALUE (#" + id + ")</option>\n" + rethtml;
	}
	return rethtml;
}





/**
 * Given a pairlist of form id=>optionlabel, return the optionlabel corresponding to specified id
 * @param {object} choices
 * @param {*} id
 */
function jrHtmlNiceOptionFromList(choices, id) {
	if (id === undefined) {
		return "[not set]";
	}
	if (id === null) {
		return "null";
	}

	if (id === choices[id]) {
		return ((id in choices) ? choices[id] : "unknown");
	}

	return ((id in choices) ? choices[id] : "unknown") + " (" + id.toString() + ")";
}
//---------------------------------------------------------------------------




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

	const rethtml = `
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
	const rethtml = "<pre>" + JSON.stringify(obj, null, "  ") + "</pre>";
	return rethtml;
}
//---------------------------------------------------------------------------



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
	let rethtml, val;
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




//---------------------------------------------------------------------------
/**
 * @see <a href="https://stackoverflow.com/questions/1026069/how-do-i-make-the-first-letter-of-a-string-uppercase-in-javascript">stackoverflow</a>
 *
 * @param {*} string
 * @returns string with capitalized first letter
 */
function capitalizeFirstLetter(str) {
	return str.charAt(0).toUpperCase() + str.slice(1);
}
//---------------------------------------------------------------------------


//---------------------------------------------------------------------------
function sanitizeUnsafeText(str, flagShowNullUndefined, flagAddConvertNewlinesToBrs) {
	if (flagShowNullUndefined) {
		if (str === null) {
			return "[null]";
		}
		if (str === undefined) {
			return "[undefined]";
		}
	} else {
		if (str === null || str === undefined) {
			str = "";
		}
	}
	// escape it
	let retstr = escapeHtml(str);
	if (flagAddConvertNewlinesToBrs) {
		// change \n to br/
		retstr = retstr.replace(/\n/g, "<br/>\n");
	}
	// return it
	return retstr;
}


function coerceToString(val, flagKeepNullUndefined) {
	// ATTN: TODO: Catch toString conversion error?
	// conver val to str (but leave as undefined or null if flag set)
	if (val === undefined || val === null) {
		if (flagKeepNullUndefined) {
			return val;
		}
		if (val === undefined) {
			return "[undefined]";
		}
		if (val === null) {
			return "[null]";
		}
	}
	if (typeof val === "string") {
		return val;
	}
	return val.toString();
}
//---------------------------------------------------------------------------



//---------------------------------------------------------------------------
function formatDateNicely(dateVal, flagCompact) {
	// ATTN: TO DO -- some sanity check to make sure we are passed a valid date (or null/undefined)
	if (!dateVal) {
		return "[not set]";
	}
	if (flagCompact) {
		return dateVal.toLocaleString();
	}
	return dateVal.toString();
}
//---------------------------------------------------------------------------





//---------------------------------------------------------------------------
function cleanIp(ipStr) {
	if (!ipStr) {
		return ipStr;
	}
	return (ipStr.length > 7 && ipStr.substr(0, 7) === "::ffff:") ? ipStr.substr(7) : ipStr;
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
	capitalizeFirstLetter,

	sanitizeUnsafeText,
	coerceToString,
	formatDateNicely,

	cleanIp,
};

