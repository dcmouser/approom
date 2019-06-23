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
		aFindFilter = convertReqQueryStringToAMongooseFindFilter(fieldFilterKey, fieldSchema, fieldFilters[fieldFilterKey]);
		if (aFindFilter !== undefined) {
			// return value could be just the filter, a full object with fieldFilterKey as key, or an object with an $and or $or key
			if (aFindFilter && aFindFilter[fieldFilterKey]) {
				query[fieldFilterKey] = aFindFilter[fieldFilterKey];
			} else if (aFindFilter && aFindFilter.$and) {
				if (query.$and) {
					// merge and arrays
					query.$and = query.$and.concat(aFindFilter.$and);
				} else {
					query.$and = aFindFilter.$and;
				}
			} else if (aFindFilter && aFindFilter.$or) {
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

	// obj data for url building and grid ui construction
	var queryUrlData = {
		pageNum,
		pageSize,
		sortField,
		sortDir,
		fieldFilters,
		fieldKeys,
	};

	// return tuple of query and queryOptions
	return { query, queryOptions, queryUrlData };
}
//---------------------------------------------------------------------------






//---------------------------------------------------------------------------
function convertReqQueryStringToAMongooseFindFilter(fkey, fieldSchema, querystr) {
	// user types a filter for a field (db column) as a string;
	// here we convert it into something suitable for a mongoose find query obj
	const schemaType = fieldSchema.type;
	let key, retQuery;

	if (schemaType === Number) {
		// it's a numeric column
		// filter rules:
		//   user can use operators > < ! =
		// retQuery = convertReqQueryStringToAMongooseFindFilterNumber(fkey, schemaType, querystr);
		retQuery = convertReqQueryStringToAMongooseFindFilterNumeric(fkey, schemaType, querystr, "integer");
	} else if (schemaType === String) {
		// it's a string column
		// filter rules:
		//   if enclosed in double quotes, it should be an exact search
		//   if not, it should be a wildcard LIKE type search (we wil have to use regex)
		//   if surrounded by / / then it is an explicit regex
		// retQuery = convertReqQueryStringToAMongooseFindFilterString(fkey, schemaType, querystr);
		retQuery = convertReqQueryStringToAMongooseFindFilterStringic(fkey, schemaType, querystr, "string");
	} else if (schemaType === Date) {
		// it's a date column
		// filter rules:
		//  similar to numeric column
		// retQuery = convertReqQueryStringToAMongooseFindFilterDate(fkey, schemaType, querystr);
		retQuery = convertReqQueryStringToAMongooseFindFilterNumeric(fkey, schemaType, querystr, "date");
	} else if (schemaType === "id") {
		// exact match
		retQuery = convertReqQueryStringToAMongooseFindFilterStringic(fkey, schemaType, querystr, "idstring");
	} else {
		throw ("Unknown filter field type: " + schemaType.toString());
	}

	return retQuery;
}
//---------------------------------------------------------------------------



//---------------------------------------------------------------------------
function convertReqQueryStringToAMongooseFindFilterNumeric(fkey, schemaType, querystr, numberSubType) {
	var valPat;
	var mongoValFunc;

	// numeric mongo operators
	const operators = {
		"<": "$lt",
		">": "$gt",
		"<=": "$lte",
		">=": "$gte",
		"=": "$eq",
		"==": "$eq",
		"!=": "$ne",
		"!==": "$ne",
		"!<": "$gte",
		"!>": "$lte",
		"!<=": "$gt",
		"!>=": "$lt",
	};

	// eslint-disable-next-line no-useless-escape
	var opChars = "\<\>=\!";

	if (numberSubType === "integer") {
		valPat = "[+-]{0,1}\\d+";
		mongoValFunc = function mvf(strVal) { return Number(strVal); };
	} else if (numberSubType === "date") {
		valPat = "\\d+";
		mongoValFunc = function mvf(strVal) {
			var d = new Date();
			d.setDate(d.getDate() - Number(strVal));
			return d;
		};
	} else {
		throw ("Unknown numeric subtype in convertReqQueryStringToAMongooseFindFilterNumeric: " + numberSubType);
	}

	const standaloneOpString = "$eq";
	return convertReqQueryStringToAMongooseFindFilterGenericOperator(fkey, schemaType, querystr, operators, opChars, valPat, mongoValFunc, standaloneOpString);
}


function convertReqQueryStringToAMongooseFindFilterStringic(fkey, schemaType, querystr, numberSubType) {
	var valPat;
	var mongoValFunc;

	// numeric mongo operators
	const operators = {
		"=": "",
		"==": "",
		"!=": "$not",
		"!==": "$not",
		// "=": "$eq",
		// "==": "$eq",
		// "!=": "$ne",
		// "!==": "$ne",
	};

	// eslint-disable-next-line no-useless-escape
	var opChars = "=!";


	// eslint-disable-next-line no-useless-escape
	if (numberSubType === "string") {
		valPat = "[^=!]+";
		mongoValFunc = function mvf(strVal) { return convertReqQueryStringToAMongooseFindFilterMongoStrCmp(strVal); };
	} else if (numberSubType === "idstring") {
		valPat = "[^=!]+";
		mongoValFunc = function mvf(strVal) {
			if (jrhelpers.isValidMongooseObjectId(strVal)) {
				return strVal;
			}
			return undefined;
		};
	} else {
		throw ("Unknown numeric subtype in convertReqQueryStringToAMongooseFindFilterStringic: " + numberSubType);
	}

	const standaloneOpString = "";
	return convertReqQueryStringToAMongooseFindFilterGenericOperator(fkey, schemaType, querystr, operators, opChars, valPat, mongoValFunc, standaloneOpString);
}



function convertReqQueryStringToAMongooseFindFilterMongoStrCmp(strVal) {
	// help for string compare
	// first let's see if its an explicit regex
	var regex, regexMatch;
	var retv;
	regex = /^\/(.+)\/(.*)$/;
	regexMatch = strVal.match(regex);
	if (regexMatch) {
		var regexMain = regexMatch[1];
		var regexOptions = regexMatch[2];
		try {
			retv = new RegExp(regexMain, regexOptions);
		} catch (error) {
			// illegal regex error
			return undefined;
		}
		return {
			$regex: retv,
		};
	}

	regex = /^"(.*)"$/;
	regexMatch = strVal.match(regex);
	if (regexMatch) {
		// EXACT string match
		var exactString = regexMatch[1];
		return exactString;
	}


	// special strings?
	if (strVal === "undefined" || strVal === "null") {
		return null;
	}

	// otherwise we want a LIKE type string

	// create a regex that allows wild characters on left or right, by ESCAPING string
	var queryStrEscaped = jrhelpers.regexEscapeStr(strVal);
	try {
		retv = new RegExp(queryStrEscaped, "im");
	} catch (err) {
		// illegal regex error
		return undefined;
	}
	return {
		$regex: retv,
	};
}




function convertReqQueryStringToAMongooseFindFilterGenericOperator(fkey, schemaType, querystr, operators, opChars, valPat, mongoValFunc, standaloneOpString) {
	var retv = {};

	// first split into comma separated values -- these are ORs
	var orParts = querystr.split(",");

	var opRegex = new RegExp("\\s*([" + opChars + "]+)\\s*(" + valPat + ")\\s*");

	var valRegex = new RegExp("\\s*(" + valPat + ")\\s*");
	//
	var mongoOp, opVal, opValm;
	var oneCondition;
	var orSet = [];

	orParts.forEach((str) => {
		var andSet = [];

		// operator expressions
		if (opChars) {
			str = str.replace(opRegex, (foundstr, g1, g2) => {
				mongoOp = operators[g1];
				if (mongoOp !== undefined) {
					opVal = g2;
					opValm = mongoValFunc(opVal);
					var obj = {};
					if (mongoOp) {
						oneCondition = {};
						oneCondition[mongoOp] = opValm;
						obj[fkey] = oneCondition;
					} else {
						obj[fkey] = opValm;
					}
					andSet.push(obj);
				}
				// return "" to replace it with empty
				return "";
			});
		}

		// standalone values
		str = str.replace(valRegex, (foundstr, g2) => {
			mongoOp = standaloneOpString;
			opVal = g2;
			opValm = mongoValFunc(opVal);
			var obj = {};
			if (mongoOp) {
				oneCondition = {};
				oneCondition[mongoOp] = opValm;
				obj[fkey] = oneCondition;
			} else {
				obj[fkey] = opValm;
			}
			andSet.push(obj);
			// return "" to replace it with empty
			return "";
		});

		if (andSet.length === 0) {
			// do nothing
		} else if (andSet.length === 1) {
			orSet.push(andSet[0]);
		} else {
			var andObj = {
				$and: andSet,
			};
			orSet.push(andObj);
		}
	});

	if (orSet.length === 0) {
		return undefined;
	}
	if (orSet.length === 1) {
		return orSet[0];
	}

	var orObj = {
		$or: orSet,
	};
	return orObj;
}

//---------------------------------------------------------------------------





//---------------------------------------------------------------------------
module.exports = {
	buildMongooseQueryFromReq,
};
//---------------------------------------------------------------------------
