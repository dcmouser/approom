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

const jrequire = require("./jrequire");






/**
 * Builds a grid table/list and form inputs for working with it
 * @todo Add info about where listHelperData comes from
 *
 * @param {object} req - express request object
 * @param {obj} listHelperData - data to put in the grid
 * @returns raw html string
 */
async function jrGridList(req, listHelperData, csrfToken) {
	//
	let rethtml = "";
	const flagShowDebugInfo = false;
	const flagShowTopPager = false;

	// destructure parts
	const queryUrlData = listHelperData.queryUrlData;
	const tableid = queryUrlData.tableId;


	// form wrapper start
	rethtml += `
		<form id="jrGridList_${tableid}" action="#">
		`;

	// insert data object for the table
	const gridListDataJson = JSON.stringify(queryUrlData);
	// ATTN: 5/18/20 - IMPORTANT -- must use "var jrGridListData_" instead of "let jrGridListData_" or we get js error in browser
	rethtml += `<script>
			var jrGridListData_${tableid} = ${gridListDataJson};
		</script>
		`;

	const pagerHtml = jrGridListPager(queryUrlData);

	// link to ADD a new item
	const addUrl = queryUrlData.baseUrl + "/add";
	const addLabel = listHelperData.modelClass.getNiceName();
	rethtml += `
			<div class="float-right"><h4><a href="${addUrl}">Add ${addLabel}</a></h4></div>
		`;

	// add pager at top
	if (flagShowTopPager) {
		rethtml += pagerHtml;
	}

	// show result count
	const resultCount = queryUrlData.resultCount;
	rethtml += "<div><strong>Total items:" + resultCount.toString() + "</strong></div>";

	// build table
	rethtml += await jrGridListTable(req, listHelperData, queryUrlData);

	// show deleted/hidden options
	rethtml += await jrGridListShowHiddenOptions(req, listHelperData, queryUrlData);

	// build "with all checked" input
	rethtml += await jrGridListBulkActions(req, listHelperData, queryUrlData, tableid);

	// add pager at bottom
	rethtml += pagerHtml;

	// debug info
	if (flagShowDebugInfo) {
		rethtml += "<br/><hr/>";
		const debugHtml = "<pre>listHelperData: " + JSON.stringify(listHelperData, null, "  ") + "</pre>";
		rethtml += debugHtml;
	}

	// add csrf
	if (csrfToken) {
		rethtml += `
			<input type="hidden" name="_csrf" value="${csrfToken}">
		`;
	}

	// form wrapper start
	rethtml += `
		</form>
		`;

	if (flagShowDebugInfo) {
		// debug extra stuff
		rethtml += "\n<br/><hr/>\n" + jrhText.jrBootstrapCollapseBox("Table Debug", listHelperData, "");
	}

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
	let rethtml = "";

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
	let rethtml = "";

	// data body start
	rethtml += `
			<tbody>
		`;

	// data content
	const gridSchema = listHelperData.gridSchema;
	const headerKeys = calcHeaderKeysNicely(gridSchema);
	const gridItems = listHelperData.gridItems;

	//
	const filterOptions = listHelperData.filterOptions;
	const protectedFields = filterOptions.protectedFields;
	const hiddenFields = filterOptions.hiddenFields;

	// cache extra info for each header column
	const extraInfo = {};
	headerKeys.forEach((key) => {
		extraInfo[key] = {
			valformat: listHelperData.modelClass.getSchemaFieldVal(key, "format"),
			valueFunction: listHelperData.modelClass.getSchemaFieldVal(key, "valueFunction"),
			refModelClass: listHelperData.modelClass.getSchemaFieldVal(key, "refModelClass"),
			valchoices: listHelperData.modelClass.getSchemaFieldVal(key, "choices"),
		};
	});

	let val, valtype, valueFunction, valformat, valDisplay, valchoices, refModelClass;
	let extraInfoKey;
	let item;
	let url;
	const numItems = gridItems.length;

	for (let i = 0; i < numItems; i += 1) {
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

			// SPECIAL COLUMNS
			if (key === "_batch_checkbox") {
				// checkbox for batch actions
				rethtml += `
						<td scope="col"> <input type="checkbox" name="checkboxid_${item._id}"> </td>
				`;
				return;
			}
			if (key === "_actions") {
				// action column
				rethtml += "<td scope=\"col\">";
				// edit
				const urlEdit = queryUrlData.baseUrl + "/edit/" + item._id;
				rethtml += `<a href="${urlEdit}" title="edit">&#9998;</a> `;
				// undelete
				if (("disabled" in item) && item.disabled === 2) {
					const urlUnDelete = queryUrlData.baseUrl + "/undelete/" + item._id;
					rethtml += ` <a href="${urlUnDelete}" title="undelete">&#9852;</a> `;
				} else {
					// delete
					const urlDelete = queryUrlData.baseUrl + "/delete/" + item._id;
					rethtml += ` <a href="${urlDelete}" title="delete">&#10008;</a> `;
				}
				rethtml += "</td>";
				return;
			}


			// ATTN:TODO -- split this off into a standalone function we can reuse elsewhere
			// and perhaps reuse it for crudaid
			// let valHtml = modelClass.renderFieldValueHtml(req, obj, reqbody, fieldName, crudSubType, helperData);

			extraInfoKey = extraInfo[key];

			val = item[key];

			// put value as href link?
			url = undefined;
			// ids are internal special columns we know how to link
			if (key === "_id" && val) {
				url = queryUrlData.baseUrl + "/view/" + val;
			}

			// set url from schema info
			if (!url && val) {
				refModelClass = extraInfoKey.refModelClass;
				if (refModelClass) {
					url = refModelClass.getCrudUrlBase("view", val);
				}
			}


			// extra scheme info
			valformat = extraInfoKey.valformat;
			valueFunction = extraInfoKey.valueFunction;
			valchoices = extraInfoKey.valchoices;

			// format it
			if (valueFunction) {
				// use custom value resolving callback function
				valDisplay = await valueFunction("list", key, req, item, null, listHelperData);
			} else {
				if (valformat === "checkbox") {
					if (val) {
						valDisplay = "true";
					} else {
						valDisplay = "false";
					}
				} else if (valformat === "choices") {
					// choices can be tricky.. because we'd like to show the nice choice option, but we also want to show underlying values so user can filter (esp. if it's numerical)
					valDisplay = jrhText.jrHtmlNiceOptionFromList(valchoices, val);
				} else if (valformat === "textarea") {
					valDisplay = jrhText.sanitizeUnsafeText(val, true, true);
				} else if (valformat === "date") {
					// format as compact date
					valDisplay = jrhText.formatDateNicely(val, true);
				} else {
					// default coerce to string
					valDisplay = jrhText.sanitizeUnsafeText(jrhText.coerceToString(val, true), true, false);
				}
			}

			// wrap in href url?
			if (url) {
				valDisplay = `<a href="${url}">${valDisplay}</a>`;
			}

			// add cell value
			rethtml += `<td scope="col"> ${valDisplay} </td>`;
		});

		// end row
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
	let rethtml = "";

	// beginning
	rethtml += "<div>With all checked: ";

	// drop down box of choices
	rethtml += `<select name="bulkaction">
		<option value=""></option>
	`;


	// enable and disable
	rethtml += `
		<option value="enable">Enable All</option>
		<option value="disable">Disable All</option>
	`;

	// virtual delete/undelete
	if (listHelperData.modelClass.supportsVirtualDelete()) {
		rethtml += `
			<option value="delete">Delete All (virtually)</option>
			<option value="undelete">Un-delete All (virtually)</option>
		`;
	}

	// permanently delete
	rethtml += `
		<option value="permdelete">Permanently Delete All (!)</option>

	`;

	// end of choices
	rethtml += "</select>";

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
	let rethtml = "";

	const pageNum = queryUrlData.pageNum;
	const resultCount = queryUrlData.resultCount;
	const pageSize = queryUrlData.pageSize;
	//
	const pageCount = Math.ceil(resultCount / pageSize);
	const pageSurroundCount = 3;
	//
	const pageStart = Math.max(1, pageNum - pageSurroundCount);
	const pageEnd = Math.min(pageCount, pageNum + pageSurroundCount);
	const pageUp = Math.max(1, pageNum - ((pageSurroundCount * 2) + 1));
	const pageDown = Math.min(pageCount, pageNum + ((pageSurroundCount * 2) + 1));
	let flagActive;
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
	for (let i = pageStart; i <= pageEnd; i += 1) {
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
	let liclass = "";
	if (flagActive) {
		liclass += " active";
	}
	if (!flagLink) {
		liclass += " disabled";
	}
	const url = "#";
	const updateObjString = "{pageNum: '" + pageIndex.toString() + "'}";
	const onclick = "requestGridUpdate('" + queryUrlData.tableId + "', " + updateObjString + ", false);return false;";

	const rethtml = `
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
	const flagActive = (newPageSize === currentPageSize);
	let liclass = "";
	if (flagActive) {
		liclass += " active";
	}
	if (!flagLink) {
		liclass += " disabled";
	}

	const url = "#"; // queryUrlData.baseUrl + "?pageSize=" + newPageSize.toString();
	const updateObjString = "{pageSize: '" + newPageSize.toString() + "'}";
	const onclick = "requestGridUpdate('" + queryUrlData.tableId + "', " + updateObjString + ", true);return false;";

	const rethtml = `
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
	let rethtml = "";
	rethtml += `
			<thead>
		`;

	// main header content
	rethtml += `
				<tr>
		`;

	// data content
	const gridSchema = listHelperData.gridSchema;
	const headerKeys = calcHeaderKeysNicely(gridSchema);
	const filterOptions = listHelperData.filterOptions;
	const protectedFields = filterOptions.protectedFields;
	const hiddenFields = filterOptions.hiddenFields;

	let onclick;
	headerKeys.forEach((key) => {
		if (jrhMisc.isInAnyArray(key, hiddenFields)) {
			return;
		}
		//
		if (key === "_batch_checkbox") {
			// toggle check all button
			onclick = "jrGridToggleCheckboxes('" + queryUrlData.tableId + "');return false;";
			rethtml += `
					<th scope="col"> <input type="checkbox" name="_batch_checkbox_all" onclick="${onclick}" title="toggle all checkboxes"> </th>
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
			const sortDir = jrGridListTableHeaderSortDir(key, queryUrlData);
			let extraLabel = "";
			let updateObjString;
			let title;
			let keyLabel;
			if (sortDir) {
				if (sortDir === "asc") {
					extraLabel = " &#9650;";
					updateObjString = "{sortDir: 'desc'}";
				} else {
					extraLabel = " &#9660;";
					updateObjString = "{sortDir: 'asc'}";
				}
				title = "change sort direction";
			} else {
				updateObjString = "{sortField:'" + key + "', sortDir: 'asc'}";
				title = "sort on this variable";
			}
			onclick = "requestGridUpdate('" + queryUrlData.tableId + "', " + updateObjString + ", true);return false;";
			//
			// use label?
			if (flagUseLabel) {
				keyLabel = listHelperData.modelClass.getSchemaFieldVal(key, "label", key);
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
		if (key === "_batch_checkbox") {
			onclick = "jrGridClearFilters('" + queryUrlData.tableId + "'); requestGridUpdate('" + queryUrlData.tableId + "', {}, true); return false;";
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
			let val = queryUrlData.fieldFilters[key];
			if (val === undefined) {
				val = "";
			} else {
				val = jrhMisc.makeSafeForFormInput(val);
			}
			const onkeydown = "jrGridGenericOnEnterRefresh(event, '" + queryUrlData.tableId + "', this, true)";
			const size = listHelperData.modelClass.getSchemaFieldVal(key, "filterSize", defaultFilterInputSize);
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
	const headerKeys = Object.keys(gridSchema);

	// add checkbox
	headerKeys.unshift("_batch_checkbox");

	// add column for actions at end
	headerKeys.push("_actions");

	// return it
	return headerKeys;
}
//---------------------------------------------------------------------------







/**
 *  Add some hidden optinon to the grid form
 *
 * @param {*} req
 * @param {*} listHelperData
 * @param {*} queryUrlData
 * @returns html to add to the input form
 */
function jrGridListShowHiddenOptions(req, listHelperData, queryUrlData) {
	// show a drop down with hidden options
	// what we show may depend on user acl permissions
	const tableid = queryUrlData.tableId;
	const appdef = jrequire("appdef");

	let rethtml = "";

	if (false) {
		// start stuff
		rethtml += "<hr/><div>";
		// build form input
		const selectedid = "all";
		rethtml += "Show: " + jrhText.jrHtmlFormOptionListSelect("showdisabled", appdef.DefShowStateModeLabels, selectedid, false);
	}

	// end stuff
	rethtml += "</div><hr/>";

	return rethtml;
}
//---------------------------------------------------------------------------

















// export the class as the sole export
module.exports = {
	jrGridList,
};
