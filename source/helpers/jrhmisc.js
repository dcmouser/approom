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
function jrHtmlFormOptionList(pairlist, selectedid) {
	var rethtml = "";
	var foundId = false;
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
//---------------------------------------------------------------------------




//---------------------------------------------------------------------------
module.exports = {
	jrPluralize, jrPluralizeCount,
	jrHtmlFormOptionList,
};
//---------------------------------------------------------------------------
