// jrhmisc
// v1.0.0 on 5/24/19 by mouser@donationcoder.com
//
// misc html helpers

"use strict";






//---------------------------------------------------------------------------
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
function jrHtmlFormOptionListSelect(selectName, pairlist, selectedid) {
	var appHtmlList = jrHtmlFormOptionList(pairlist, selectedid);
	var rethtml = `
	<select name="${selectName}">
		${appHtmlList}
	</select>
	`;
	return rethtml;
}

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








//---------------------------------------------------------------------------
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
module.exports = {
	jrPluralize, jrPluralizeCount,
	jrHtmlFormOptionListSelect, jrHtmlFormOptionList, jrHtmlNiceOptionFromList, 
	jrBootstrapCollapseBox,
};
//---------------------------------------------------------------------------
