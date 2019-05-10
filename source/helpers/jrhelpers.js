// jrhelpers
// v1.0.0 on 5/7/19 by mouser@donationcoder.com
//
// some of my generic helper functions

"use strict";


//---------------------------------------------------------------------------
// modules
// for password hashing
var crypto = require("crypto");
//---------------------------------------------------------------------------


//---------------------------------------------------------------------------
// constants
const defaultCryptoSaltLength = 16;
//---------------------------------------------------------------------------




//---------------------------------------------------------------------------
exports.consoleLogObj = function(obj,msg) {
	// just helper log function
	if (msg!=="" && msg!==undefined) {
		console.log(msg + ":");
	}
	console.log(obj);
};
//---------------------------------------------------------------------------





//---------------------------------------------------------------------------
exports.createPasswordObj = function(passwordPlaintext, passwordAlgorithm) {
	// hash pass
	var passwordHashedFull = createPasswordHashedString(passwordPlaintext, passwordAlgorithm, "", true);
	// store it
	var obj = {
		passwordHashed: passwordHashedFull,
		passwordDate: new Date
	};
	return obj;
}


function createPasswordHashedString(passwordPlaintext, passwordAlgorithm, salt, flag_returnFullString) {
	var passwordHashed;
	if (passwordAlgorithm == "plain") {
		passwordHashed = passwordPlaintext;
	} else {
		// hash it
		// see https://ciphertrick.com/2016/01/18/salt-hash-passwords-using-nodejs-crypto/
		if (salt == "") {
			salt = genRandomString(defaultCryptoSaltLength);
		}
		var hash = crypto.createHmac(passwordAlgorithm, salt);
		hash.update(passwordPlaintext);
		passwordHashed = hash.digest("hex");
	}
	//
	if (!flag_returnFullString) {
		// they just want hashed password, NOT the full string (useful when testing)
		return passwordHashed;
	}
	// they want full string
	var passwordHashedFull = "|a=" + passwordAlgorithm + "|h=" + passwordHashed + "|s=" + salt + "|";
	return passwordHashedFull;
}


exports.testPassword = function(passwordPlaintext, passwordHashStringFromDb) {
	// see if password matches
	// first parse passwordHashStringFromDb into parts (|a=.*|h=.*|s=.*|) [passwordAlgorithmDb, passwordHashedDb, saltDb]
	var regex_alg = /.*a\=(\w*)\|/;
	var regex_hash = /.*h\=(\w*)\|/;
	var regex_salt = /.*s\=(\w*)\|/;
	try {
		var passwordAlgorithmDb = regex_alg.exec(passwordHashStringFromDb)[1];
		var passwordHashedDb = regex_hash.exec(passwordHashStringFromDb)[1];
		var saltDb = regex_salt.exec(passwordHashStringFromDb)[1];
		// now make hash string
		var passwordHashed = createPasswordHashedString(passwordPlaintext, passwordAlgorithmDb, saltDb, false);
		// now see if it matches
		if (passwordHashed == passwordHashedDb) {
			// it matches
			return true;
		}
	}
	catch (err) {
		console.log("Error in jrhelpers exports.testPassword while attempting to parse/compare hashed password string");
		console.log(err);
	}
	// no match
	return false;
}



// see https://ciphertrick.com/2016/01/18/salt-hash-passwords-using-nodejs-crypto/
/**
 * generates random string of characters i.e salt
 * @function
 * @param {number} length - Length of the random string.
 */
function genRandomString(length) {
    return crypto.randomBytes(Math.ceil(length/2))
            .toString("hex") /** convert to hexadecimal format */
            .slice(0,length);   /** return required number of characters */
};
//---------------------------------------------------------------------------
