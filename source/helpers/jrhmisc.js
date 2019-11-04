// jrhmisc
// v1.0.0 on 5/24/19 by mouser@donationcoder.com
//
// misc html helpers

"use strict";




class JrhMisc {

	//---------------------------------------------------------------------------
	constructor() {
	}

	// global singleton request
	static getSingleton(...args) {
		// we could do this more simply by just exporting a new instance as module export, but we wrap a function for more flexibility
		if (this.globalSingleton === undefined) {
			this.globalSingleton = new JrhMisc(...args);
		}
		return this.globalSingleton;
	}
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	jrPluralizeCount(number, singular, plural) {
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


	jrPluralize(number, singular, plural) {
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
	jrHtmlFormOptionListSelect(selectName, pairlist, selectedid) {
		var appHtmlList = this.jrHtmlFormOptionList(pairlist, selectedid);
		var rethtml = `
		<select name="${selectName}">
			${appHtmlList}
		</select>
		`;
		return rethtml;
	}

	jrHtmlFormOptionList(pairlist, selectedid) {
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


	jrHtmlNiceOptionFromList(pairlist, selectedid, defaultVal) {
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
	jrBootstrapCollapseBox(title, body, footer) {

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


	jrHtmlStrigifyObject(obj) {
		var rethtml = "<pre>" + JSON.stringify(obj, null, "  ") + "</pre>";
		return rethtml;
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	jrHtmlFormInputPassword(fieldName, obj, flagRequired, flagExistingIsNonBlank) {
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





}


// export the class as the sole export
module.exports = JrhMisc.getSingleton();
