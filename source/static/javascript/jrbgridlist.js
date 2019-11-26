// jrbgridlist.js
// v1.0.0 on 6/20/19 by mouser@donationcoder.com
//
// BROWSER JS
// javascript helper for working with jrGridList data tables


// alert("hello");

function requestGridUpdate(tableId, varChangeObj) {
	// resubmit request for grid with new parameters, in url or in post
	// use starting request based on data object on page, with changes specified in varChangeObj
	// this provides a fairly compact way to change the grid
	// so all linked items on the page that would do things like change sortField, sortDir, pageNum, pageSize, filters
	//  all trigger a call to this function
	// note that we should grab all filter_ field inputs explicitly since multiple of those might be changed before requesting update

	// first grab the global data object associated with this tableId
	var tableData = grabGlobalJrGridDataStructure(tableId);

	// parse filters
	var filterData = jrGridGrabFilterInputValues(tableId, tableData);

	// merge in filters
	jrGridDataMerge(tableData.fieldFilters, filterData);

	// now merge in any changes
	jrGridDataMerge(tableData, varChangeObj);

	// now build the new url to go to
	var url = jrGridBuildUrl(tableData);
	window.location.href = url;
}


function grabGlobalJrGridDataStructure(tableId) {
	// grab the global variable with dynamically constructed name
	var varName = "jrGridListData_" + tableId;
	var data = window[varName];
	return data;
}

function jrGridGrabFilterInputValues(tableId, tableData) {
	// parse filter inputs from the table form

	// alert("Stage1");

	var formObj = document.forms["jrGridList_" + tableId];
	if (!formObj) {
		return {};
	}

	var filterData = {};

	var eleObj;
	var fieldKeys = tableData.fieldKeys;
	var key;
	for (var i = 0; i < fieldKeys.length; i += 1) {
		key = fieldKeys[i];
		// alert("Stage3 " + key);
		eleObj = formObj.elements["filter_" + key];
		if (eleObj) {
			// found it
			var val = eleObj.value;
			// alert("Stage4 " + key + " = " + val);
			filterData[key] = val;
		}
	}

	return filterData;
}


function jrGridDataMerge(tableData, varChangeObj) {
	// merge data in varChangeObj into tableData
	Object.assign(tableData, varChangeObj);
	// alert(JSON.stringify(tableData));
}


function jrGridBuildUrl(tableData) {
	// build the url to navigate to based on the data
	var url;

	// build the url up
	url = tableData.baseUrl + "?";
	// add stuff
	url += "pageNum=" + tableData.pageNum;
	url += "&pageSize=" + tableData.pageSize;
	url += "&sortField=" + tableData.sortField;
	url += "&sortDir=" + tableData.sortDir;
	// filter fields
	var fieldKeys = Object.keys(tableData.fieldFilters);
	var key;
	for (var i = 0; i < fieldKeys.length; i += 1) {
		key = fieldKeys[i];
		if (tableData.fieldFilters[key] !== "" && tableData.fieldFilters[key] !== undefined) {
			url += "&filter_" + key + "=" + tableData.fieldFilters[key];
		}
	}


	return url;
}


function jrGridGenericOnEnterRefresh(event, tableId) {
	if (!event) {
		event = window.event;
	}
	if (event.key === "Enter") {
		requestGridUpdate(tableId, {});
	}
}


function jrGridToggleCheckboxes(tableId) {
	// toggle the checkboxes
	var formObj = document.forms["jrGridList_" + tableId];
	if (!formObj) {
		return;
	}
	var items = formObj.getElementsByTagName("input");
	for (var i = 0; i < items.length; i++) {
		if (items[i].type === "checkbox") {
			items[i].checked = !items[i].checked;
		}
	}
}


function jrCountCheckedItems(tableId) {
	// toggle the checkboxes
	var formObj = document.forms["jrGridList_" + tableId];
	if (!formObj) {
		return 0;
	}
	var checkedCount = 0;
	var items = formObj.getElementsByTagName("input");
	for (var i = 0; i < items.length; i++) {
		if (items[i].type === "checkbox") {
			if (items[i].checked) {
				checkedCount += 1;
			}
		}
	}
	return checkedCount;
}


function jrGridClearFilters(tableId) {
	// toggle the checkboxes
	var formObj = document.forms["jrGridList_" + tableId];
	if (!formObj) {
		return;
	}
	var items = formObj.getElementsByTagName("input");
	for (var i = 0; i < items.length; i++) {
		if (items[i].type === "text") {
			items[i].value = "";
		}
	}
}






function requestGridBulkAction(tableId) {
	// submit checkbox batch
	
	var itemCountString;
	var itemCount = jrCountCheckedItems(tableId);
	if (itemCount == 0) {
		alert("You need to check some items first.");
		return;
	} else if (itemCount == 1) {
		itemCountString = "this " + itemCount.toString() + " item";
	} else {
		itemCountString = "these " + itemCount.toString() + " items";
	}

	var formObj = document.forms["jrGridList_" + tableId];
	if (!formObj) {
		alert("Internal error -- table [" + tableId + "] not found.");
		return;
	}

	// get bulk action
	var bulkAction = formObj.elements.namedItem("bulkaction");
	if (!bulkAction) {
		alert("Internal error -- bulk action select for table [" + tableId + "] not found.");
		return;
	}
	var actionString = bulkAction.options[bulkAction.selectedIndex].value;
	
	if (actionString == "") {
		alert("You need to select a bulk action first.");
		return;
	}
	
	var bretv = window.confirm("Are you sure you want to " + actionString + " " + itemCountString + "?");
	if (!bretv) {
		return;
	}



	formObj.method = "POST";
	formObj.submit();
}


