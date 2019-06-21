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
	jrGridGrabFilterInputValues(tableId, tableData);

	// now merge in any changes
	jrGridDataMerge(tableData, varChangeObj);

	// now build the new url to go to
	var url = jrGridBuildUrl(tableData);
	window.location.href = url;
}


function grabGlobalJrGridDataStructure(tableId) {
	var data = {};
	return data;
}

function jrGridGrabFilterInputValues(tableId, tableData) {
	// parse filter inputs from the table form
}


function jrGridDataMerge(tableData, varChangeObj) {
	// merge data in varChangeObj into tableData
}


function jrGridBuildUrl(tableData) {
	// build the url to navigate to based on the data
	var url;

	// test
	url = "/admin";

	return url;
}


function jrGridGenericOnEnter(tableId, ele) {
	if (event.key === "Enter") {
		requestGridUpdate(tableId, {});
	}
}

