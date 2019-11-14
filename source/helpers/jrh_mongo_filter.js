/**
 * @module helpers/jrh_mongo_filter
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 5/7/19

 * @description
 * Collection of helper functions for database crud filtering
*/

"use strict";


// modules
const mongoose = require("mongoose");

// our helper modules
const jrhMisc = require("./jrh_misc");
const jrhExpress = require("./jrh_express");
const jrhMongo = require("./jrh_mongo");



/**
 * Build a mongoose (mongo?) query to filter only certain rows of a database table, from form variables in a user request.
 * This is used to allow the crud admin tables to be filtered by an admin user using simple column filters.
 * This function includes sort fields and direction, and pagination values (offset, size)
 *
 * @param {*} filterOptions - defined default sort field/direction, default page size, max page size, etc.
 * @param {*} schema - defines the column headers available and their characteristics
 * @param {*} req - express request
 * @param {*} jrResult - a JrResult object that we will push error codes into in the case of error
 * @returns tuple \{ query, queryOptions, queryUrlData \} where queryUrlData is an object with data to include in form data/links to reproduce the request (useful for going to next page, etc)
 */
function buildMongooseQueryFromReq(filterOptions, schema, req, jrResult) {
	// return the query object for use with mongoose
	// we parse the req data (form post vars or query params), and create the query used by mongoose

	// here are the req params we can get:
	//  pageNum (gobal)
	//  pageSize (global)
	//  sortField (global)
	//  sortDir (global)
	// Then for each field:
	//	filterString

	var fieldKeys = Object.keys(schema);
	//
	var pageNum = jrhExpress.reqValAsInt(req, "pageNum", 1, null, 1);
	var pageSize = jrhExpress.reqValAsInt(req, "pageSize", filterOptions.minPageSize, filterOptions.maxPageSize, filterOptions.defaultPageSize);
	var sortField = jrhExpress.reqValFromList(req, "sortField", fieldKeys, filterOptions.defaultSortField);
	var sortDir = jrhExpress.reqValFromList(req, "sortDir", ["asc", "desc"], filterOptions.defaultSortDir);
	//
	var fieldFilters = jrhExpress.reqPrefixedValueArray(req, "filter", fieldKeys);
	//
	var protectedFields = filterOptions.protectedFields;
	var hiddenFields = filterOptions.hiddenFields;

	// block sort if its on our block list
	if (jrhMisc.isInAnyArray(sortField, protectedFields, hiddenFields)) {
		sortField = "";
	}

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

		// certain fields we will refuse to filter on
		if (jrhMisc.isInAnyArray(fieldFilterKey, protectedFields)) {
			return;
		}

		fieldSchema = schema[fieldFilterKey];
		aFindFilter = convertReqQueryStringToAMongooseFindFilter(fieldFilterKey, fieldSchema, fieldFilters[fieldFilterKey], jrResult);
		if (aFindFilter !== undefined) {
			// return value could be just the filter, a full object with fieldFilterKey as key, or an object with an $and or $or key
			if (aFindFilter && aFindFilter[fieldFilterKey]) {
				// if its an undefined value stored in object, its because we returned an error
				// ATTN: unfinished
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
/**
 * Take a query string (which is in an adhoc format described below) and convert it into a safe mongoose(mongo) query object that can be sent to the database
 * ##### Notes
 *
 * format for query string is a bit ad hoc, but works like this:\
 * the search phrase is first divided into a set of OR tests by splitting using the text " or " (without quotes)\
 * alternatively a comma may be used in place of " or "\
 * with each OR phrase we can have a set of AND queries, separated by " and " (without quotes)\
 * integer (Number) fields are simple integers\
 *
 * Operators for numbers are < > <= >= = == != !== !< !> !<= !>=\
 * So some example valid numeric searches:\
 * <20\
 * <20 and >5\
 * <20 or >100\
 * <20 and >5 or >100  [remember this is treated like (<20 and >5) or (>100) ]\
 *
 * Date fields are exactly like numbers, EXCEPT that the numeric values in the search query are treated as dates, X number of days in the past\
 * So <5 means the date is less (older) than 5 days ago\
 *
 * String fields only support the operators = == != !==\
 * But string queries are parsed slightly specially.\
 * First, strings in double quotes are tested for exact matches, they do NOT do a substring %LIKE% match\
 * Strings *not* in double quotes are searched for as substrings in the field as if they were %LIKE% matches in sql\
 * Strings enclosed in // are treated as regular expression searches\
 * Note that the and/or operators are not smart about being in quotes, which means that you simply CANNOT search for something with " and " or " or "" in it or commas\
 *
 * Additionally you can use the constant "null" or "undefined" (not in quotes) to search for undefined value, or !null to search for values that are NOT undefined or null\
 *
 * @private
 *
 * @param {string} fkey - the name of the column (field)
 * @param {object} fieldSchema - the schema definition for the field
 * @param {string} querystr - the string specified by the user specifying how to filter the data
 * @param {object} jrResult - errors will be pushed into this object
 * @returns the query object generated
 */
function convertReqQueryStringToAMongooseFindFilter(fkey, fieldSchema, querystr, jrResult) {
	// user types a filter for a field (db column) as a string;
	// here we convert it into something suitable for a mongoose find query obj
	const schemaType = fieldSchema.type;
	let key, retQuery;

	if (schemaType === Number) {
		// it's a numeric column
		// filter rules:
		//   user can use operators > < ! =
		retQuery = convertReqQueryStringToAMongooseFindFilterNumeric(fkey, schemaType, querystr, "integer", jrResult);
	} else if (schemaType === String) {
		// it's a string column
		// filter rules:
		//   if enclosed in double quotes, it should be an exact search
		//   if not, it should be a wildcard LIKE type search (we wil have to use regex)
		//   if surrounded by / / then it is an explicit regex
		retQuery = convertReqQueryStringToAMongooseFindFilterStringic(fkey, schemaType, querystr, "string", jrResult);
	} else if (schemaType === Date) {
		// it's a date column
		// filter rules:
		//  similar to numeric column
		retQuery = convertReqQueryStringToAMongooseFindFilterNumeric(fkey, schemaType, querystr, "date", jrResult);
	} else if (schemaType === mongoose.Schema.ObjectId) {
		// exact match
		retQuery = convertReqQueryStringToAMongooseFindFilterStringic(fkey, schemaType, querystr, "idstring", jrResult);
	} else if (schemaType === Map) {
		// can't filter this
		retQuery = undefined;
	} else if (schemaType === Boolean) {
		// boolean
		retQuery = convertReqQueryStringToAMongooseFindFilterBoolean(fkey, schemaType, querystr, jrResult);
	} else {
		jrResult.pushError("Search filter error: Unknown schema field type: " + schemaType.toString());
	}

	return retQuery;
}
//---------------------------------------------------------------------------





//---------------------------------------------------------------------------
/**
 * A numeric-field-specific version of the function that makes a query object from a query string
 * @see convertReqQueryStringToAMongooseFindFilter
 * @private
 *
 * @param {*} fkey
 * @param {*} schemaType
 * @param {*} querystr
 * @param {*} subType
 * @param {*} jrResult
 * @returns query object
 */
function convertReqQueryStringToAMongooseFindFilterNumeric(fkey, schemaType, querystr, subType, jrResult) {
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

	if (subType === "integer") {
		valPat = "[+-]{0,1}\\d+";
		mongoValFunc = (strVal, jrResulti) => {
			var num = Number(strVal);
			if (Number.isNaN(num)) {
				jrResult.pushError("Search filter error: Not a valid number: " + strVal);
				num = undefined;
			}
			return num;
		};
	} else if (subType === "date") {
		// eslint-disable-next-line no-useless-escape
		valPat = "[\\d/\\.\\-]+";
		mongoValFunc = (strVal, jrResulti) => {
			var dateVal;
			// is it a pure number
			if (strVal.match(/^[\d]+$/)) {
				var num = Number(strVal);
				if (Number.isNaN(num)) {
					jrResult.pushError("Search filter error: Not a valid number for date (days old) comparison: " + strVal);
					num = undefined;
				} else {
					dateVal = new Date();
					dateVal.setDate(dateVal.getDate() - num);
				}
			} else {
				// try to parse as a date
				try {
					dateVal = new Date(strVal);
				} catch (err) {
					// doesn't throw an exception just drops through with invalid date
				}
				// check for invalid date
				if (Number.isNaN(dateVal.getTime())) {
					jrResult.pushError("Search filter error: Date filters should use numbers to indicate how many days in past, or date format YYYY-MM-DD.  Syntax error at: " + strVal);
				}
			}

			return dateVal;
		};
	} else {
		jrResult.pushError("Search filter error: Unknown numeric subtype in convertReqQueryStringToAMongooseFindFilterNumeric: " + subType);
	}

	const standaloneOpString = "$eq";
	return convertReqQueryStringToAMongooseFindFilterGenericOperator(fkey, schemaType, querystr, operators, opChars, valPat, mongoValFunc, standaloneOpString, jrResult);
}


/**
 * A string-field-specific version of the function that makes a query object from a query string
 * @see convertReqQueryStringToAMongooseFindFilter
 * @private
 *
 * @param {*} fkey
 * @param {*} schemaType
 * @param {*} querystr
 * @param {*} subType
 * @param {*} jrResult
 * @returns query object
 */
function convertReqQueryStringToAMongooseFindFilterStringic(fkey, schemaType, querystr, subType, jrResult) {
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
	if (subType === "string") {
		valPat = "[^=!]+";
		mongoValFunc = (strVal, jrResulti) => {
			return convertReqQueryStringToAMongooseFindFilterMongoStrCmp(strVal, jrResult);
		};
	} else if (subType === "idstring") {
		valPat = "[^=!]+";
		mongoValFunc = (strVal, jrResulti) => {
			if (jrhMongo.isValidMongooseObjectId(strVal)) {
				return strVal;
			}
			jrResulti.pushError("Search filter error: Id value is improperly formatted");
			return undefined;
		};
	} else {
		jrResult.pushError("Search filter error: Unknown subtype in convertReqQueryStringToAMongooseFindFilterStringic: " + subType);
	}

	const standaloneOpString = "";
	return convertReqQueryStringToAMongooseFindFilterGenericOperator(fkey, schemaType, querystr, operators, opChars, valPat, mongoValFunc, standaloneOpString, jrResult);
}



/**
 * A boolean-field-specific version of the function that makes a query object from a query string
 * @see convertReqQueryStringToAMongooseFindFilter
 * @private
 *
 * @param {*} fkey
 * @param {*} schemaType
 * @param {*} querystr
 * @param {*} jrResult
 * @returns query object
 */
function convertReqQueryStringToAMongooseFindFilterBoolean(fkey, schemaType, querystr, jrResult) {
	var retv;

	if (querystr === "true" || querystr === "1") {
		retv = {
			$eq: "true",
		};
	} else if (querystr === "false" || querystr === "0") {
		retv = {
			$ne: "true",
		};
	} else {
		jrResult.pushError("Search filter error: Expected filter to be 'true' or 'false'.");
		return undefined;
	}

	return retv;
}
//---------------------------------------------------------------------------




//---------------------------------------------------------------------------
/**
 * Take a query string for a string field, and make a query object out of it which will be either a regex style query to act like a wildcard match, or pass through the regex search if user specifies it as /regex/
 * @private
 *
 * @param {string} strVal
 * @param {object} jrResult
 * @returns query object
 */
function convertReqQueryStringToAMongooseFindFilterMongoStrCmp(strVal, jrResult) {
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
			jrResult.pushError("Search filter error: Illegal regular expression syntax: " + strVal);
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

	// otherwise we want a LIKE type string

	// create a regex that allows wild characters on left or right, by ESCAPING string
	var queryStrEscaped = jrhMisc.regexEscapeStr(strVal);
	try {
		retv = new RegExp(queryStrEscaped, "im");
	} catch (err) {
		// illegal regex error
		jrResult.pushError("Search filter error: Illegal filter string syntax, incompatible with regex escape: " + strVal);
		return undefined;
	}
	return {
		$regex: retv,
	};
}



/**
 * Parse a query string using and and or separators and create a query object with and and or arrays
 * @todo improve documentation for other parameters
 *
 * @param {string} fkey
 * @param {*} schemaType
 * @param {string} querystr
 * @param {array} operators -- allowable operators
 * @param {*} opChars
 * @param {*} valPat
 * @param {*} mongoValFunc
 * @param {*} standaloneOpString
 * @param {*} jrResult
 * @returns an array of disjunctive queries (ors)
 */
function convertReqQueryStringToAMongooseFindFilterGenericOperator(fkey, schemaType, querystr, operators, opChars, valPat, mongoValFunc, standaloneOpString, jrResult) {
	var opRegex = new RegExp("\\s*([" + opChars + "]+)\\s*(" + valPat + ")\\s*");
	var valRegex = new RegExp("\\s*(" + valPat + ")\\s*");
	// var nullRegex = /([!=]*)\s*\bnull\b/;
	var nullRegex = /([!=]*)\s*\b(null|undefined)\b/;
	//
	var mongoOp, opVal, opValm;
	var oneCondition;
	var orSet = [];

	// first split into comma separated values -- these are ORs
	var andSplit = /\s+and\s+/;
	var orSplit = /\s+or\s+|,/;

	var orParts = querystr.split(orSplit);
	orParts.forEach((orstr) => {
		var andSet = [];

		// ok now the set of unitary operator, or standalone items are combines as ANDS
		// but we also allow separation of operators and standalones by && to be used as an AND
		// which is useful for strings

		var andParts = orstr.split(andSplit);

		andParts.forEach((str) => {
			// operator expressions
			if (opChars) {
				str = str.replace(opRegex, (foundstr, g1, g2) => {
					mongoOp = operators[g1];
					if (mongoOp !== undefined) {
						var obj = convertReqQueryStringToAMongooseFindFilterGenericOperatorResolveVal(fkey, g2, mongoOp, mongoValFunc, jrResult);
						andSet.push(obj);
					} else {
						// operator not found, leave it alone
						return foundstr;
					}
					// return "" to replace it with empty
					return "";
				});
			}

			// special value: null
			str = str.replace(nullRegex, (foundstr, g1) => {
				var obj = {};
				oneCondition = {};
				if (g1.indexOf("!") === -1) {
					oneCondition.$eq = opValm;
				} else {
					oneCondition.$ne = opValm;
				}
				obj[fkey] = oneCondition;
				andSet.push(obj);
				// return "" to replace it with empty
				return "";
			});

			// standalone values
			str = str.replace(valRegex, (foundstr, g2) => {
				mongoOp = standaloneOpString;
				var obj = convertReqQueryStringToAMongooseFindFilterGenericOperatorResolveVal(fkey, g2, mongoOp, mongoValFunc, jrResult);
				andSet.push(obj);
				// return "" to replace it with empty
				return "";
			});

			// anything left in string other than whitespace? if so we should consider it error?
			str = str.trim();
			if (str !== "") {
				// error?
				jrResult.pushError("Search filter error: Invalid syntax, unparsed: " + str);
			}

		});	// end of AND foreach

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
	}); // end of OR foreach

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


/**
 * Examine a string value (opVal) and operator, and handle null|undefined case specially
 * @todo improve documentation for other parameters
 *
 * @param {*} fkey
 * @param {*} opVal
 * @param {*} mongoOp
 * @param {*} mongoValFunc
 * @param {*} jrResult
 * @returns an object, either simple value or operator and value for handling null/undefined cases
 */
function convertReqQueryStringToAMongooseFindFilterGenericOperatorResolveVal(fkey, opVal, mongoOp, mongoValFunc, jrResult) {
	var opValm;

	// this is a bit messy, but we need to handle null carefully and weirdly
	if (opVal === "null" || opVal === "undefined") {
		opValm = null;
		if (!mongoOp) {
			mongoOp = "$eq";
		} else if (mongoOp === "$not") {
			mongoOp = "$ne";
		} else if (mongoOp !== "$eq") {
			jrResult.pushError("Search filter syntax error: Bad operator for use with null");
		}
	} else if (opVal === "!null" || opVal === "!undefined") {
		opValm = null;
		if (!mongoOp) {
			mongoOp = "$ne";
		} else if (mongoOp === "$eq") {
			mongoOp = "$ne";
		} else if (mongoOp === "$ne") {
			mongoOp = "$eq";
		} else if (mongoOp === "$not") {
			mongoOp = "$eq";
		} else {
			jrResult.pushError("Search filter syntax error: Bad operator for use with null");
		}
	} else {
		opValm = mongoValFunc(opVal, jrResult);
	}
	// if its UNDEFINED then an error happened, just return it
	if (opValm === undefined) {
		return undefined;
	}
	//
	var obj = {};
	if (mongoOp) {
		var oneCondition = {};
		oneCondition[mongoOp] = opValm;
		obj[fkey] = oneCondition;
	} else {
		obj[fkey] = opValm;
	}
	return obj;
}
//---------------------------------------------------------------------------






// export the class as the sole export
module.exports = {
	buildMongooseQueryFromReq,
};

