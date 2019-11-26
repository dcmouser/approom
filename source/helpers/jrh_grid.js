/**
 * @module helpers/jrh_grid
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 6/21/19

 * @description
 * Collection of helper functions for creating general purpose html grids of data
*/

"use strict";


// our helper modules
const jrhMisc = require("./jrh_misc");
const jrhText = require("./jrh_text");






/**
 * Builds a grid table/list and form inputs for working with it
 * @todo Add info about where listHelperData comes from
 *
 * @param {object} req - express request object
 * @param {obj} listHelperData - data to put in the grid
 * @returns raw html string
 */
async function jrGridList(req, listHelperData) {
	var rethtml = "";

	// destructure parts
	const queryUrlData = listHelperData.queryUrlData;
	const tableid = queryUrlData.tableId;


	// form wrapper start
	rethtml += `
		<form id="jrGridList_${tableid}" action="#">
		`;

	// insert data object for the table
	var gridListDataJson = JSON.stringify(queryUrlData);
	rethtml += `<script>
			var jrGridListData_${tableid} = ${gridListDataJson};
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
	rethtml += await jrGridListTable(req, listHelperData, queryUrlData);

	// build "with all checked" input
	rethtml += await jrGridListBulkActions(req, listHelperData, queryUrlData, tableid);

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

	// debug extra stuff
	rethtml += "\n<br/><hr/>\n" + jrhText.jrBootstrapCollapseBox("Table Debug", listHelperData, "");

	// return it as raw html
	return rethtml;
}
//---------------------------------------------------------------------------


















//---------------------------------------------------------------------------
// private helper functions
/**
 * Build the html that represents the main area of the grid table
 * @private
 * @param {object} req
 * @param {object} listHelperData
 * @param {object} queryUrlData
 * @returns raw html string
 */
async function jrGridListTable(req, listHelperData, queryUrlData) {
	var rethtml = "";

	// beginning stuff
	rethtml += `
		<div class="table-responsive">
			<table class="table table-striped w-auto table-bordered">
		`;

	// header
	rethtml += jrGridListTableHeader(listHelperData, queryUrlData);

	// data
	rethtml += await jrGridListTableData(req, listHelperData, queryUrlData);

	// ending stuff
	rethtml += `
			</table>
		</div>
		`;

	return rethtml;
}



/**
 * Builds the core internal html table data
 * @private
 * @param {object} req
 * @param {object} listHelperData
 * @param {object} queryUrlData
 * @returns raw html string
 */
async function jrGridListTableData(req, listHelperData, queryUrlData) {
	var rethtml = "";

	// data body start
	rethtml += `
			<tbody>
		`;

	// data content
	var schemaExtra = listHelperData.schemaExtra;
	var headerKeys = calcHeaderKeysNicely(schemaExtra);
	const gridItems = listHelperData.gridItems;

	//
	var filterOptions = listHelperData.filterOptions;
	var protectedFields = filterOptions.protectedFields;
	var hiddenFields = filterOptions.hiddenFields;

	// cache extra info for each header column
	var extraInfo = {};
	headerKeys.forEach((key) => {
		extraInfo[key] = {
			valformat: listHelperData.modelClass.getSchemaExtraFieldVal(key, "format"),
			valfunc: listHelperData.modelClass.getSchemaExtraFieldVal(key, "valueFunction"),
			crudlink: listHelperData.modelClass.getSchemaExtraFieldVal(key, "crudlink"),
		};
	});

	var val, valtype, valfunc, valformat, valDisplay, crudLink;
	var extraInfoKey;
	var item;
	var numItems = gridItems.length;
	for (var i = 0; i < numItems; i += 1) {
		item = gridItems[i];
		// start
		rethtml += `
				<tr>
				`;
		// item row
		await jrhMisc.asyncAwaitForEachFunctionCall(headerKeys, async (key) => {
			if (jrhMisc.isInAnyArray(key, hiddenFields)) {
				return;
			}

			extraInfoKey = extraInfo[key];

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
				valformat = extraInfoKey.valformat;
				valfunc = extraInfoKey.valfunc;
				if (valfunc) {
					// use custom value resolving callback function
					valDisplay = await valfunc("list", key, req, item, listHelperData);
				} else {
					if (valformat === "checkbox") {
						if (val) {
							valDisplay = "true";
						} else {
							valDisplay = "false";
						}
					} else if (val === undefined) {
						valDisplay = "";
					} else if (val === null) {
						valDisplay = "null";
					} else {
						if (valformat === "date") {
							// format as compact date
							valDisplay = val.toLocaleString();
						} else {
							valDisplay = val.toString();
						}
					}
					//
					crudLink = extraInfoKey.crudlink;
					if (crudLink) {
						valDisplay = `<a href="${crudLink}/view/${val}">${valDisplay}</a>`;
					}
				}
				//
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
//---------------------------------------------------------------------------






/**
 * Builds html for a with all checked drop down box and button
 *
 * @private
 * @param {object} req
 * @param {object} listHelperData
 * @param {object} queryUrlData
 */
async function jrGridListBulkActions(req, listHelperData, queryUrlData, tableid) {
	var rethtml = "";

	// beginning
	rethtml += "<div>With all checked: ";

	// drop down box of choices
	rethtml += `<select name="bulkaction">
		<option value=""></option>
		<option value="delete">Delete All</option>
		</select>`;

	// go button
	rethtml += "<input name=\"bulkactiongo\" type=\"button\" value =\"GO\" onclick=\"requestGridBulkAction('" + tableid + "'); return false;\"></input>";

	// end
	rethtml += "</div><br/>";

	return rethtml;
}
//---------------------------------------------------------------------------







//---------------------------------------------------------------------------
/**
 * Builds html for implementing a pager area for the grid
 *
 * @private
 * @param {object} queryUrlData
 * @returns raw html string
 */
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

/**
 * Builds a single pager item.
 *
 * @private
 * @param {string} label
 * @param {int} pageIndex - current page
 * @param {boolean} flagLink - whether pager item should be a working link
 * @param {boolean} flagActive - whether this pager item represents current page
 * @param {object} queryUrlData
 * @returns raw html string
 */
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


/**
 * Helper function that creates the per-page dropdown option select
 *
 * @private
 * @param {string} label
 * @param {int} newPageSize - the new page size that this item selects
 * @param {int} currentPageSize - the current page size of the currently viewed page
 * @param {boolean} flagLink - whether to link it
 * @param {object} queryUrlData
 * @returns raw html string
 */
function jrGridListPagerItemPerPage(label, newPageSize, currentPageSize, flagLink, queryUrlData) {
	// make an item for pager page size control
	if (label === null) {
		label = newPageSize.toString();
	}
	var flagActive = (newPageSize === currentPageSize);
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


/**
 * Generates the header for a table with sortable columns, and filters
 * @private
 * @param {object} listHelperData
 * @param {object} queryUrlData
 * @returns raw html string
 */
function jrGridListTableHeader(listHelperData, queryUrlData) {
	// defaults
	const defaultFilterInputSize = 20;
	const flagUseLabel = true;

	// header start
	var rethtml = "";
	rethtml += `
			<thead>
		`;

	// main header content
	rethtml += `
				<tr>
		`;

	// data content
	var schemaExtra = listHelperData.schemaExtra;
	var headerKeys = calcHeaderKeysNicely(schemaExtra);
	var filterOptions = listHelperData.filterOptions;
	var protectedFields = filterOptions.protectedFields;
	var hiddenFields = filterOptions.hiddenFields;

	var onclick;
	headerKeys.forEach((key) => {
		if (jrhMisc.isInAnyArray(key, hiddenFields)) {
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
		} else if (false && jrhMisc.isInAnyArray(key, protectedFields)) {
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
		if (jrhMisc.isInAnyArray(key, hiddenFields)) {
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
		} else if (jrhMisc.isInAnyArray(key, protectedFields)) {
			rethtml += `
					<th scope="col">&nbsp;</th>
				`;
		} else {
			var val = queryUrlData.fieldFilters[key];
			if (val === undefined) {
				val = "";
			} else {
				val = jrhMisc.makeSafeForFormInput(val);
			}
			var onkeydown = "jrGridGenericOnEnterRefresh(event, '" + queryUrlData.tableId + "', this)";
			var size = listHelperData.modelClass.getSchemaExtraFieldVal(key, "filterSize", defaultFilterInputSize);
			if (!size) {
				rethtml += `
						<th scope="col"> &nbsp; </th>
					`;
			} else {
				rethtml += `
						<th scope="col"> <input type="text" name="filter_${key}" value="${val}" size="${size}" onkeydown="${onkeydown}" title="type search filter and hit Enter to refresh"> </th>
					`;
			}
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

/**
 * Returns the sort direction of a column key, based on previously parsed data
 * @private
 * @param {*} key
 * @param {*} queryUrlData
 * @returns string sort direction (asc|desc|null)
 */
function jrGridListTableHeaderSortDir(key, queryUrlData) {
	if (queryUrlData.sortField === key) {
		return queryUrlData.sortDir;
	}
	return null;
}



/**
 * Get keys (columnns) for the header, adding our special ones for checkbox column and actions icons column
 * @private
 * @param {object} gridSchema
 * @returns raw html string
 */
function calcHeaderKeysNicely(gridSchema) {
	var headerKeys = Object.keys(gridSchema);

	// add checkbox
	headerKeys.unshift("_checkbox");

	// add column for actions at end
	headerKeys.push("_actions");

	// return it
	return headerKeys;
}
//---------------------------------------------------------------------------




// export the class as the sole export
module.exports = {
	jrGridList,
};
