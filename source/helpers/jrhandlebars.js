// jrhandlebars
// v1.0.0 on 5/24/19 by mouser@donationcoder.com
//
// some general purpose handlebars temlate helpers

"use strict";

// modules
const hbs = require("hbs");

// our helper modules
const fs = require("fs");
const path = require("path");
const jrlog = require("./jrlog");








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
	hbs.registerHelper("jrPluralize", (number, singular, plural) => jrPluralize(number, singular, plural));

	// pluralizing helper
	hbs.registerHelper("jrPluralizeCount", (number, singular, plural) => jrPluralizeCount(number, singular, plural));

	// form helper for drop down inputs
	hbs.registerHelper("jrHtmlFormOptionList", (pairlist, selectedid) => jrHtmlFormOptionList(pairlist, selectedid));

	// paged grid list helper
	hbs.registerHelper("jrGridList", listHelperData => jrGridList(listHelperData));
}
//---------------------------------------------------------------------------












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
	return new hbs.SafeString(rethtml);
}
//---------------------------------------------------------------------------






//---------------------------------------------------------------------------
function jrGridList(listHelperData) {
	var rethtml = "";

	// destructure parts
	const gridSchema = listHelperData.gridSchema;
	const gridHeaders = listHelperData.gridHeaders;
	const gridItems = listHelperData.gridItems;
	const queryUrlData = listHelperData.queryUrlData;

	// form wrapper start
	rethtml += `
	<form id="jrGridList_${queryUrlData.tableId}" action="#">
	`;

	var pagerHtml = jrGridListPager(queryUrlData);

	// add pager at top
	if (false) {
		rethtml += pagerHtml;
	}

	// build table
	rethtml += jrGridListTable(listHelperData, queryUrlData);

	// add pager at bottom
	rethtml += pagerHtml;

	// debug info
	if (false) {
		rethtml += "<br/><hr/>";
		var debugHtml = "<pre>listHelperData: " + JSON.stringify(listHelperData, null, "  ") + "</pre>";
		rethtml += debugHtml;
	}

	// form wrapper start
	rethtml += `
	</form>
	`;

	// return it as raw html
	return new hbs.SafeString(rethtml);
}


function jrGridListPager(queryUrlData) {
	// see https://www.tutorialrepublic.com/twitter-bootstrap-tutorial/bootstrap-pagination.php
	var rethtml = "";

	var pageNum = queryUrlData.pageNum;
	var resultCount = queryUrlData.resultCount;
	var pageSize = queryUrlData.pageSize;
	//
	var pageCount = Math.ceil(resultCount / pageSize);
	var pageSurroundCount = 3;
	//
	var pageStart = Math.max(1, pageNum - pageSurroundCount);
	var pageEnd = Math.min(pageCount, pageNum + pageSurroundCount);
	var pageUp = Math.max(1, pageNum - ((pageSurroundCount * 2) + 1));
	var pageDown = Math.min(pageCount, pageNum + ((pageSurroundCount * 2) + 1));
	var flagActive;
	//
	// we want like:  FIRST | PREVIOUS | ... | 4 | 5 | 6 | 7 | 8 | ... | NEXT | LAST

	rethtml += `
	<nav>
		<ul class="pagination">
		`;

	// build the items before current pages
	rethtml += jrGridListPagerItem("First", 1, (pageNum !== 1), false, queryUrlData);
	rethtml += jrGridListPagerItem("Previous", pageNum - 1, (pageNum > 1), false, queryUrlData);
	rethtml += jrGridListPagerItem("...", pageUp, (pageUp < pageNum), false, queryUrlData);
	// surrounding numbers around current page
	for (var i = pageStart; i <= pageEnd; i += 1) {
		if (i === pageNum) {
			flagActive = true;
		} else {
			flagActive = false;
		}
		rethtml += jrGridListPagerItem(i.toString(), i, true, flagActive, queryUrlData);
	}
	// after current pages
	rethtml += jrGridListPagerItem("...", pageDown, (pageDown > pageNum), false, queryUrlData);
	rethtml += jrGridListPagerItem("Next", pageNum + 1, (pageNum < pageCount), false, queryUrlData);
	rethtml += jrGridListPagerItem("Last", pageCount, (pageNum < pageCount), false, queryUrlData);

	rethtml += `
	</ul>
	</nav>
	`;


	// page size selector
	rethtml += `
	<nav>
		<ul class="pagination">
	`;
	//
	rethtml += jrGridListPagerItemPerPage("Items per page", 0, pageSize, false, queryUrlData);
	rethtml += jrGridListPagerItemPerPage(null, 10, pageSize, true, queryUrlData);
	rethtml += jrGridListPagerItemPerPage(null, 50, pageSize, true, queryUrlData);
	rethtml += jrGridListPagerItemPerPage(null, 100, pageSize, true, queryUrlData);
	rethtml += jrGridListPagerItemPerPage(null, 250, pageSize, true, queryUrlData);
	rethtml += jrGridListPagerItemPerPage(null, 500, pageSize, true, queryUrlData);
	rethtml += jrGridListPagerItemPerPage(null, 1000, pageSize, true, queryUrlData);
	//
	rethtml += `
		</ul>
		</nav>
	`;

	// return it
	return rethtml;
}


function jrGridListPagerItem(label, pageIndex, flagLink, flagActive, queryUrlData) {
	// make an item for pager
	var liclass = "";
	if (flagActive) {
		liclass += " active";
	}
	if (!flagLink) {
		liclass += " disabled";
	}
	var url = "#"; // queryUrlData.baseUrl + "?pageNum=" + pageIndex.toString();
	var updateObjString = "{pageNum: '" + pageIndex.toString() + "'}";
	var onclick = "requestGridUpdate('" + queryUrlData.tableId + "', " + updateObjString + ");return false;";

	var rethtml = `
	<li class="page-item${liclass}">
		<a href="${url}" onclick="${onclick}" class="page-link">${label}</a>
	</li>
	`;

	return rethtml;
}


function jrGridListPagerItemPerPage(label, newPageSize, oldPageSize, flagLink, queryUrlData) {
	// make an item for pager
	if (label === null) {
		label = newPageSize.toString();
	}
	var flagActive = (newPageSize === oldPageSize);
	var liclass = "";
	if (flagActive) {
		liclass += " active";
	}
	if (!flagLink) {
		liclass += " disabled";
	}

	var url = "#"; // queryUrlData.baseUrl + "?pageSize=" + newPageSize.toString();
	var updateObjString = "{pageSize: '" + newPageSize.toString() + "'}";
	var onclick = "requestGridUpdate('" + queryUrlData.tableId + "', " + updateObjString + ");return false;";

	var rethtml = `
	<li class="page-item${liclass}">
		<a href="${url}" onclick="${onclick}" class="page-link">${label}</a>
	</li>
	`;

	return rethtml;
}


function jrGridListTable(listHelperData, queryUrlData) {
	var rethtml = "";

	// beginning stuff
	rethtml += `
	<div class="table-responsive">
		<table class="table table-striped w-auto table-bordered">
	`;

	// header
	rethtml += jrGridListTableHeader(listHelperData, queryUrlData);

	// data
	rethtml += jrGridListTableData(listHelperData, queryUrlData);

	// ending stuff
	rethtml += `
		</table>
	</div>
	`;

	return rethtml;
}


function jrGridListTableHeader(listHelperData, queryUrlData) {
	var rethtml = "";

	// header start
	rethtml += `
		<thead>
	`;


	// main header content
	rethtml += `
			<tr>
	`;
	var gridSchema = listHelperData.gridSchema;
	var headerKeys = calcHeaderKeysNicely(gridSchema);
	headerKeys.forEach((key) => {
		if (key === "_checkbox") {
			rethtml += `
			<th scope="col"> <input type="checkbox" name="_checkbox_all"> </th>
			`;
		} else {
			var sortDir = jrGridListTableHeaderSortDir(key, queryUrlData);
			var extraLabel = "";
			var updateObjString;
			if (sortDir) {
				if (sortDir === "asc") {
					extraLabel = " &#9660;";
					updateObjString = "{sortDir: 'desc'}";
				} else {
					extraLabel = " &#9650;";
					updateObjString = "{sortDir: 'asc'}";
				}
			} else {
				updateObjString = "{sortField:'" + key + "', sortDir: 'asc'}";
			}
			var onclick = "requestGridUpdate('" + queryUrlData.tableId + "', " + updateObjString + ");return false;";
			//
			if (key === "_id") {
				// fixup for id
				key = "id";
			}
			rethtml += `
				<th scope="col"> <a href="#" onclick="${onclick}"> ${key}${extraLabel} </a></th>
			`;
		}
	});
	//
	rethtml += `
			</tr>
	`;

	// filter row
	rethtml += `
			<tr>
	`;
	headerKeys.forEach((key) => {
		if (key === "_checkbox") {
			rethtml += `
				<th scope="col"> &nbsp; </th>
			`;
		} else {
			var val = queryUrlData.fieldFilters[key];
			if (val === undefined) {
				val = "";
			}
			var onkeydown = "jrGridGenericOnEnter('" + queryUrlData.tableId + "', this)";
			rethtml += `
				<th scope="col"> <input type="text" name = "filter_${key}" value="${val}" onkeydown="${onkeydown}"> </th>
			`;
		}
	});
	//
	rethtml += `
			</tr>
	`;

	// header end
	rethtml += `
		</thead>
	`;

	return rethtml;
}



function jrGridListTableHeaderSortDir(key, queryUrlData) {
	if (queryUrlData.sortField === key) {
		return queryUrlData.sortDir;
	}
	return null;
}




function jrGridListTableData(listHelperData, queryUrlData) {
	var rethtml = "";

	// data body start
	rethtml += `
		<tbody>
	`;


	// data content
	var gridSchema = listHelperData.gridSchema;
	var headerKeys = calcHeaderKeysNicely(gridSchema);
	const gridItems = listHelperData.gridItems;
	var val;
	var item;
	var numItems = gridItems.length;
	for (var i = 0; i < numItems; i += 1) {
		item = gridItems[i];
		// start
		rethtml += `
			<tr>
			`;
		// item row
		headerKeys.forEach((key) => {
			if (key === "_checkbox") {
				rethtml += `
					<td scope="col"> <input type="checkbox" name="checkboxid_${item._id}"> </td>
				`;
			} else {
				val = item[key];
				rethtml += `
					<td scope="col"> ${val} </td>
				`;
			}
		});
		// end
		rethtml += `
			</tr>
			`;
	}

	// data body end
	rethtml += `
		</tbody>
	`;

	return rethtml;
}


function calcHeaderKeysNicely(gridSchema) {
	var headerKeys = Object.keys(gridSchema);
	// if _id is found, move it to top
	var posId = headerKeys.indexOf("_id");
	if (posId > 0) {
		headerKeys.splice(posId, 1);
		headerKeys.unshift("_id");
	}

	// add checkbox
	headerKeys.unshift("_checkbox");

	// return it
	return headerKeys;
}
//---------------------------------------------------------------------------











//---------------------------------------------------------------------------
module.exports = {
	setupJrHandlebarHelpers, loadPartialFiles,
};
//---------------------------------------------------------------------------
