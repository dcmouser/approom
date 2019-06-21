// jrFindFilter
// v1.0.0 on 5/7/19 by mouser@donationcoder.com
//
// some of my generic helper functions

"use strict";


// our helper modules
const jrlog = require("../helpers/jrlog");
const jrhelpers = require("../helpers/jrhelpers");



function buildMongooseQueryFromReq(filterOptions, schema, req) {
	// return the query object for use with mongoose
	// we parse the req data (form post vars or query params), and create the query used by mongoose

	// here are the req params we can get:
	//  pageNumb (gobal)
	//  pageSize (global)
	//  sortField (global)
	//  sortDir (global)
	// Then for each field:
	//	filterString

	var fieldKeys = Object.keys(schema);
	//
	var pageNum = jrhelpers.reqValAsInt(req, "pageNum", 1, null, 1);
	var pageSize = jrhelpers.reqValAsInt(req, "pageSize", filterOptions.minPageSize, filterOptions.maxPageSize, filterOptions.defaultPageSize);
	var sortField = jrhelpers.reqValFromList(req, "sortField", fieldKeys, filterOptions.defaultSortField);
	var sortDir = jrhelpers.reqValFromList(req, "sortDir", ["asc", "desc"], filterOptions.defaultSortDir);
	//
	var fieldFilters = jrhelpers.reqPrefixedValueArray(req, "filter", fieldKeys);

	// query options
	var queryOptions = {};
	// offset and limit
	queryOptions.limit = pageSize;
	queryOptions.skip = (pageNum - 1) * pageSize;
	// query option for sorting?
	if (sortField) {
		queryOptions.sort = {};
		queryOptions.sort[sortField] = sortDir;
	}

	// build the query
	var query = {};
	var aFindFilter;
	var fieldSchema;
	var fieldFilterKeys = Object.keys(fieldFilters);
	fieldFilterKeys.forEach((fieldFilterKey) => {
		fieldSchema = schema[fieldFilterKey];
		aFindFilter = jrhelpers.convertReqQueryStringToAMongooseFindFilter(fieldFilterKey, fieldSchema, fieldFilters[fieldFilterKey]);
		if (aFindFilter !== undefined) {
			// return value could be just the filter, a full object with fieldFilterKey as key, or an object with an $and or $or key
			if (aFindFilter[fieldFilterKey]) {
				query[fieldFilterKey] = aFindFilter[fieldFilterKey];
			} else if (aFindFilter.$and) {
				if (query.$and) {
					// merge and arrays
					query.$and = query.$and.concat(aFindFilter.$and);
				} else {
					query.$and = aFindFilter.$and;
				}
			} else if (aFindFilter.$or) {
				if (query.$or) {
					// merge or arrays
					query.$or = query.$or.concat(aFindFilter.$or);
				} else {
					query.$or = aFindFilter.$or;
				}
			} else {
				// store it under this field
				query[fieldFilterKey] = aFindFilter;
			}
		}
	});

	// obj data for url building
	/*
	var queryUrlData = {
		pageNum: (pageNum !== 1) ? pageNum : undefined,
		pageSize: (pageSize !== filterOptions.defaultPageSize) ? pageSize : undefined,
		sortField: (sortField !== filterOptions.defaultSortField) ? sortField : undefined,
		sortDir: (sortDir !== filterOptions.defaultSortDir) ? sortDir : undefined,
		fieldFilters: (fieldFilters.length > 0) ? fieldFilters : undefined,
	};
	*/
	var queryUrlData = {
		pageNum,
		pageSize,
		sortField,
		sortDir,
		fieldFilters,
	};

	// return tuple of query and queryOptions
	return { query, queryOptions, queryUrlData };
}







//---------------------------------------------------------------------------
module.exports = {
	buildMongooseQueryFromReq,
};
//---------------------------------------------------------------------------
