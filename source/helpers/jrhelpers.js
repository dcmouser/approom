// jrhelpers
// v1.0.0 on 5/7/19 by mouser@donationcoder.com
//
// some of my generic helper functions

"use strict";


// our helper modules
const jrlog = require("../helpers/jrlog");











//---------------------------------------------------------------------------
// helper function for merging unique arrays
// see https://stackoverflow.com/questions/1584370/how-to-merge-two-arrays-in-javascript-and-de-duplicate-items
function mergeArraysDedupe(array1, array2) {
	return Array.from(new Set(array1.concat(array2)));
}
//---------------------------------------------------------------------------


//---------------------------------------------------------------------------
function getNonEmptyPropertyOrDefault(val, defaultval) {
	if (!val) {
		return defaultval;
	}
	return val;
}


/*
function isEmpty(val) {
	// ATTN: we could just simply do:  "if (val) return true; else return false"
	// which would only differ in the unimportant cases like where val is false or 0
	// The reason we are using this function instead of the simpler "if (val)" is only to help us locate these kind of tests in code via a search, since they are prone to issues..
	return (val === undefined || val===null || val==="");
}
*/


function firstNonEmptyValue(...args) {
	if (!args || args.length === 0) {
		return undefined;
	}
	for (var arg of args) {
		if (arg) {
			return arg;
		}
	}
	// return last
	return args[args.length - 1];
}
//---------------------------------------------------------------------------



//---------------------------------------------------------------------------
function DateNowPlusMinutes(expirationMinutes) {
	var expirationDate = new Date();
	expirationDate.setMinutes(expirationDate.getMinutes() + expirationMinutes);
	return expirationDate;
}
//---------------------------------------------------------------------------



//---------------------------------------------------------------------------
function stringArrayToNiceString(arr) {
	if (!arr || arr.length === 0) {
		return "";
	}
	return arr.toString();
}
//---------------------------------------------------------------------------



//---------------------------------------------------------------------------
function makeClonedObjFromEnumerableProperties(source) {
	// just a simple wrapper to make code easier to understand
	var obj = Object.assign({}, source);
	return obj;
}
//---------------------------------------------------------------------------


//---------------------------------------------------------------------------
function getFormTypeStrToPastTenseVerb(formTypeStr) {
	if (formTypeStr === "add") {
		return "added";
	}
	if (formTypeStr === "edit") {
		return "updated";
	}
	if (formTypeStr === "delete") {
		return "deleted";
	}
	return "operation unknown";
}
//---------------------------------------------------------------------------

//---------------------------------------------------------------------------
// see https://github.com/Automattic/mongoose/issues/1959
function isValidMongooseObjectId(str) {
	if (typeof str !== "string") {
		return false;
	}
	return str.match(/^[a-f\d]{24}$/i);
}
//---------------------------------------------------------------------------



//---------------------------------------------------------------------------
function getNiceNowString() {
	return new Date(Date.now()).toLocaleString();
}
//---------------------------------------------------------------------------


//---------------------------------------------------------------------------
function reqVal(req, key, defaultVal) {
	// return query param or post val or default
	if (req.body[key]) {
		return req.body[key];
	}
	if (req.query[key]) {
		return req.query[key];
	}
	return defaultVal;
}


function reqValAsInt(req, key, min, max, defaultVal) {
	// get val as int and min and max it
	var val = Number(reqVal(req, key, defaultVal));
	if (min !== null) {
		val = Math.max(val, min);
	}
	if (max !== null) {
		val = Math.min(val, max);
	}
	return val;
}


function reqValFromList(req, key, valueList, defaultVal) {
	var val = reqVal(req, key, defaultVal);
	if (valueList.indexOf(val) > -1) {
		return val;
	}
	return defaultVal;
}

function reqPrefixedValueArray(req, prefix, keyList) {
	// look for ALL values for prefix+"_"+key and return an associative array of them
	var valArray = {};
	var fieldName;
	var val;
	keyList.forEach((key) => {
		fieldName = prefix + "_" + key;
		val = reqVal(req, fieldName, undefined);
		if (val !== undefined && val !== "") {
			// store it
			valArray[key] = val;
		}
	});

	return valArray;
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
		retQuery = convertReqQueryStringToAMongooseFindFilterNumber(fkey, schemaType, querystr);
	} else if (schemaType === String) {
		// it's a string column
		// filter rules:
		//   if enclosed in double quotes, it should be an exact search
		//   if not, it should be a wildcard LIKE type search (we wil have to use regex)
		//   if surrounded by / / then it is an explicit regex
		retQuery = convertReqQueryStringToAMongooseFindFilterString(fkey, schemaType, querystr);
	} else if (schemaType === Date) {
		// it's a date column
		// filter rules:
		//  similar to numeric column, but with values specified as DATES YYYY.MM.DD
		retQuery = convertReqQueryStringToAMongooseFindFilterDate(fkey, schemaType, querystr);
	} else if (schemaType === "id") {
		// exact match
		if (isValidMongooseObjectId(querystr)) {
			retQuery = querystr;
		} else {
			retQuery = undefined;
		}
	} else {
		throw ("Unknown filter field type: " + schemaType.toString());
	}

	return retQuery;
}


// private helpers

function convertReqQueryStringToAMongooseFindFilterNumber(fkey, schemaType, querystr) {
	//
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

	var retv = {};

	// first split into comma separated values -- these are ORs
	var orParts = querystr.split(",");
	var valPat = "[+-]{0,1}\\d+";
	var opChars = "\<\>=\!";
	var opRegex = new RegExp("\\s*([" + opChars + "]+)\\s*(" + valPat + ")\\s*");
	var valRegex = new RegExp("\\s*(" + valPat + ")\\s*");
	var mongoOp, opVal, opValNumeric;
	var oneCondition;
	var orSet = [];

	orParts.forEach((str) => {
		var andSet = [];
		// operator expressions
		str = str.replace(opRegex, (foundstr, g1, g2) => {
			mongoOp = operators[g1];
			if (mongoOp) {
				opVal = g2;
				opValNumeric = Number(opVal);
				oneCondition = {};
				oneCondition[mongoOp] = opValNumeric;
				var obj = {};
				obj[fkey] = oneCondition;
				andSet.push(obj);
			}
			// return "" to replace it with empty
			return "";
		});
		// standalone values
		str = str.replace(valRegex, (foundstr, g2) => {
			mongoOp = "$eq";
			opVal = g2;
			opValNumeric = Number(opVal);
			oneCondition = {};
			oneCondition[mongoOp] = opValNumeric;
			var obj = {};
			obj[fkey] = oneCondition;
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

function convertReqQueryStringToAMongooseFindFilterString(fkey, schemaType, querystr) {
	// first let's see if its an explicit regex
	var regex, regexMatch;
	var retv;
	regex = /^\/(.+)\/(.*)$/;
	regexMatch = querystr.match(regex);
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
	regexMatch = querystr.match(regex);
	if (regexMatch) {
		// EXACT string match
		var exactString = regexMatch[1];
		return exactString;
	}

	// otherwise we want a LIKE type string

	// create a regex that allows wild characters on left or right, by ESCAPING string
	var queryStrEscaped = regexEscapeStr(querystr);
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



function convertReqQueryStringToAMongooseFindFilterDate(fkey, schemaType, querystr) {
	return undefined;
}
//---------------------------------------------------------------------------



//---------------------------------------------------------------------------
function regexEscapeStr(str) {
	// replace special characters in string so it can be used in regex
	str = str.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
	return str;
}
//---------------------------------------------------------------------------




//---------------------------------------------------------------------------
module.exports = {
	mergeArraysDedupe, getNonEmptyPropertyOrDefault, firstNonEmptyValue,
	DateNowPlusMinutes,
	stringArrayToNiceString,
	makeClonedObjFromEnumerableProperties,
	getFormTypeStrToPastTenseVerb,
	isValidMongooseObjectId,
	getNiceNowString,
	reqVal, reqValAsInt, reqValFromList, reqPrefixedValueArray,
	convertReqQueryStringToAMongooseFindFilter,
	regexEscapeStr,
};
//---------------------------------------------------------------------------
