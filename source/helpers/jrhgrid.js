// jrhgrid
// v1.0.0 on 6/21/19 by mouser@donationcoder.com
//
// html helpers fro grid

"use strict";


// our helper modules
const jrhelpers = require("./jrhelpers");
const jrhmisc = require("./jrhmisc");



//---------------------------------------------------------------------------
function jrGridList(listHelperData) {
	var rethtml = "";

	// destructure parts
	const queryUrlData = listHelperData.queryUrlData;

	// form wrapper start
	rethtml += `
	<form id="jrGridList_${queryUrlData.tableId}" action="#">
	`;

	// insert data object for the table
	var gridListDataJson = JSON.stringify(queryUrlData);
	rethtml += `<script>
		var jrGridListData_${queryUrlData.tableId} = ${gridListDataJson};
	</script>
	`;

	var pagerHtml = jrGridListPager(queryUrlData);

	// ADD link
	var addUrl = queryUrlData.baseUrl + "/add";
	var addLabel = listHelperData.modelClass.getNiceName();
	rethtml += `
		<div class="float-right"><h4><a href="${addUrl}">Add ${addLabel}</a></h4></div>
	`;

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

	// debug stuff
	rethtml += "\n<br/><hr/>\n" + jrhmisc.jrBootstrapCollapseBox("Table Debug", listHelperData, "");


	// return it as raw html
	return rethtml;
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
	rethtml += jrGridListPagerItem("Last (" + pageCount + ")", pageCount, (pageNum < pageCount), false, queryUrlData);

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
	var url = "#";
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
	// test flag
	var flagUseLabel = true;

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

	//
	var filterOptions = listHelperData.filterOptions;
	var protectedFields = filterOptions.protectedFields;
	var hiddenFields = filterOptions.hiddenFields;

	var onclick;
	headerKeys.forEach((key) => {
		if (jrhelpers.isInAnyArray(key, hiddenFields)) {
			return;
		}
		//
		if (key === "_checkbox") {
			// toggle check all button
			onclick = "jrGridToggleCheckboxes('" + queryUrlData.tableId + "');return false;";
			rethtml += `
				<th scope="col"> <input type="checkbox" name="_checkbox_all" onclick="${onclick}" title="toggle all checkboxes"> </th>
			`;
		} else if (key === "_actions") {
			// actions column for edit/delete buttons
			rethtml += `
				<th scope="col"> &nbsp; </th>
			`;
		} else if (false && jrhelpers.isInAnyArray(key, protectedFields)) {
			rethtml += `
				<th scope="col">${key}</th>
			`;
		} else {
			var sortDir = jrGridListTableHeaderSortDir(key, queryUrlData);
			var extraLabel = "";
			var updateObjString;
			var title;
			var keyLabel;
			if (sortDir) {
				if (sortDir === "asc") {
					extraLabel = " &#9660;";
					updateObjString = "{sortDir: 'desc'}";
				} else {
					extraLabel = " &#9650;";
					updateObjString = "{sortDir: 'asc'}";
				}
				title = "change sort direction";
			} else {
				updateObjString = "{sortField:'" + key + "', sortDir: 'asc'}";
				title = "sort on this variable";
			}
			onclick = "requestGridUpdate('" + queryUrlData.tableId + "', " + updateObjString + ");return false;";
			//
			// use label?
			if (flagUseLabel) {
				keyLabel = listHelperData.modelClass.getSchemaExtraFieldVal(key, "label", key);
			} else {
				if (key === "_id") {
					// fixup for id
					keyLabel = "id";
				} else {
					keyLabel = key;
				}
			}
			rethtml += `
				<th scope="col"> <a href="#" onclick="${onclick}" title="${title}"> ${keyLabel}${extraLabel} </a></th>
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
		if (jrhelpers.isInAnyArray(key, hiddenFields)) {
			return;
		}
		if (key === "_checkbox") {
			onclick = "jrGridClearFilters('" + queryUrlData.tableId + "'); requestGridUpdate('" + queryUrlData.tableId + "', {}); return false;";
			rethtml += `
				<th scope="col"> <a href="#" onclick="${onclick}" title="clear all filters"> &#x2717; </a> </th>
			`;
		} else if (key === "_actions") {
			// action column
			rethtml += `
				<th scope="col"> &nbsp; </th>
			`;
		} else if (jrhelpers.isInAnyArray(key, protectedFields)) {
			rethtml += `
				<th scope="col">&nbsp;</th>
			`;
		} else {
			var val = queryUrlData.fieldFilters[key];
			if (val === undefined) {
				val = "";
			} else {
				val = jrhelpers.makeSafeForFormInput(val);
			}
			var onkeydown = "jrGridGenericOnEnterRefresh(event, '" + queryUrlData.tableId + "', this)";
			rethtml += `
				<th scope="col"> <input type="text" name = "filter_${key}" value="${val}" onkeydown="${onkeydown}" title="type search filter and hit Enter to refresh"> </th>
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

	//
	var filterOptions = listHelperData.filterOptions;
	var protectedFields = filterOptions.protectedFields;
	var hiddenFields = filterOptions.hiddenFields;

	// cache header field custom display hints
	var valFuncList = {};
	var valfunc;
	headerKeys.forEach((key) => {
		valfunc = listHelperData.modelClass.getSchemaExtraFieldValueFunction(key, "list");
		if (valfunc) {
			valFuncList[key] = valfunc;
		}
	});

	var val, valDisplay, crudLink;
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
			if (jrhelpers.isInAnyArray(key, hiddenFields)) {
				return;
			}
			if (key === "_checkbox") {
				// checkbox for batch actions
				rethtml += `
					<td scope="col"> <input type="checkbox" name="checkboxid_${item._id}"> </td>
				`;
			} else if (key === "_actions") {
				// action column
				var urlEdit = queryUrlData.baseUrl + "/edit/" + item._id;
				var urlDelete = queryUrlData.baseUrl + "/delete/" + item._id;
				rethtml += `
					<td scope="col"> <a href="${urlEdit}" title="edit">&#9998;</a>  <a href="${urlDelete}" title="delete">&#10008;</a> </td>
				`;
			} else {
				val = item[key];
				if (valFuncList[key]) {
					// use custom value resolving callback function
					valDisplay = valFuncList[key](item);
				} else {
					if (val === undefined) {
						valDisplay = "";
					} else if (val === null) {
						valDisplay = "null";
					} else {
						valDisplay = val.toString();
					}
					//
					crudLink = listHelperData.modelClass.getSchemaExtraFieldVal(key, "crudLink");
					if (crudLink) {
						valDisplay = `<a href="${crudLink}/view/${val}">${valDisplay}</a>`;
					}
				}
				if (key === "_id") {
					var url = queryUrlData.baseUrl + "/view/" + val;
					rethtml += `
						<td scope="col"> <a href="${url}">${valDisplay}</a> </td>
					`;
				} else {
					rethtml += `
						<td scope="col"> ${valDisplay} </td>
					`;
				}
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

	// add column for actions at end
	headerKeys.push("_actions");

	// return it
	return headerKeys;
}
//---------------------------------------------------------------------------





//---------------------------------------------------------------------------
module.exports = {
	jrGridList,
};
//---------------------------------------------------------------------------
