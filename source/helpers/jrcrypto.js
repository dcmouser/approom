// jrcrypto
// v1.0.0 on 5/19/19 by mouser@donationcoder.com
//
// password hashing functions

"use strict";


//---------------------------------------------------------------------------
// modules
// for password hashing
var crypto = require("crypto");

// ATTN: move to bcrypt; not yet used
var bcrypt = require("bcrypt");

// our helper modules
const jrlog = require("./jrlog");
const jrhelpers = require("./jrhelpers");
//---------------------------------------------------------------------------




//---------------------------------------------------------------------------
// constants

const DEF_PasswordAlgorithm = "bcrypt";
//const DEF_PasswordAlgorithm = "crypto_sha512";

// salt length, not used by bcrypt
const DEF_CryptSaltLength = 16;

// salt rounds, used by bcrypt
const DEF_CryptSaltRounds = 11;

// update this when you change something about the way a pass algorithm works or the options here, so you can easily filter users based using a password version threshold to force updates
// in addition we store password creation dates, so we can filter based on some date of db compromise
const DEF_latestPasswordVersion = 2;

// ATTN: TODO -- we might add support to automatically fail any password check falling below some configured date or passwordVersion

// for humaneasy codes (all uppercase, no I no O no Z no 0 no 1 no 2)
const DEF_HumanEasyCharactersArray = ["ABCDEFGHJKLMNPQRSTUVWXY", "3456789"];
const DEF_HumanEasyCharacters = DEF_HumanEasyCharactersArray[0] + DEF_HumanEasyCharactersArray[1];
//---------------------------------------------------------------------------







//---------------------------------------------------------------------------
async function hashPlaintextPassword(passwordPlaintext) {
	// algorithm to use
	var passwordAlgorithm = DEF_PasswordAlgorithm
	var salt = "";
	// hash it
	var passwordHashed = await createPasswordHashed(passwordPlaintext, passwordAlgorithm, salt, DEF_CryptSaltRounds, DEF_latestPasswordVersion);
	// return it -- an OBJECT with properties not just a string
	return passwordHashed;
}



async function createPasswordHashed(passwordPlaintext, passwordAlgorithm, salt, saltRounds, passwordVersion) {
	// function to hash plaintext password and return an object with hashed password properties

	var passwordHashedStr;
	//
	if (passwordAlgorithm == "plain") {
		passwordHashedStr = passwordPlaintext;
		salt = "";
	} else if (passwordAlgorithm=="bcrypt") {
		// bcrypt module hash -- the most widely recommended method
		// note that bcrypt does not let us specify salt, and embeds extra info in passwordHashedStr string
		passwordHashedStr = await bcrypt.hash(passwordPlaintext, saltRounds);
		// null these so we dont save them (saltRound info is embedded in the bcrypt hash)
		salt = null;
		saltRounds = null;
	} else if (passwordAlgorithm=="crypto_sha512") {
		// crypto module hash
		// see https://ciphertrick.com/2016/01/18/salt-hash-passwords-using-nodejs-crypto/
		// note: crypto does not use saltRounds
		if (salt == "") {
			// no salt provided, make a random one
			salt = generateRandomSalt();
		}
		//
		var hash = crypto.createHmac("sha512", salt);
		hash.update(passwordPlaintext);
		passwordHashedStr = hash.digest("hex");
		// null these so we dont save them
		saltRounds = null;
	} else {
		throw("Uknown password hash algorithm: "+passwordAlgorithm);
	}

	// build the passwordHashed and return it
	var passwordHashed = {
		hash: passwordHashedStr,
		alg: passwordAlgorithm,
		// version is a numeric value we can use in case we need to force upgrade everyone with an old password algorithm, etc.
		ver: passwordVersion,
		// save date so we can find older passwords we want to force users to update after some issue
		date: new Date,
	};
	if (salt !== null) {
		passwordHashed.salt = salt;
	}
	if (saltRounds !== null) {
		passwordHashed.saltRounds = saltRounds;
	}
	//
	return passwordHashed;
}




async function testPassword(passwordPlaintext, passwordHashed) {
	// see if password matches

	// if passwordHashStringFromDb == "" then there is no password stored, so result is always false
	if (passwordPlaintext == "" || passwordHashed==null) {
		return false;
	}

	// password obj properties
	var passwordAlgorithm = passwordHashed.alg;
	var passwordHashedStr = passwordHashed.hash;
	var passwordDate = passwordHashed.date;
	var passwordVersion = passwordHashed.ver;

	// ok compare
	try {
		if (passwordAlgorithm == "bcrypt") {
			// bcrypt uses its own explicit compare function, that is meant to defeat timing attacks
			// note that it will figure out the salt and saltrounds from the actual hash string
			var bretv = bcrypt.compare(passwordPlaintext, passwordHashedStr);
			return bretv;
		} else {
			// for non-bcrypt, we essentially repeat the hash process with the previously used salt and then compare
			var salt = passwordHashed.salt;
			var saltRounds = passwordHashed.saltRounds;
			//
			var passwordHashedTest = await createPasswordHashed(passwordPlaintext, passwordAlgorithm, salt, saltRounds, passwordVersion);
			// now is the hashed version of the new plaintext the same as the hashed version of the old stored one?
			return (passwordHashedTest.passwordHashedStr == passwordHashedStr)
		}
	}
	catch (err) {
		jrlog.log("Error in jrhelpers exports.testPassword while attempting to parse/compare hashed password string");
		jrlog.log(err);
	}

	// no match
	return false;
}



function generateRandomSalt() {
	// private func
	return genRandomStringHex(DEF_CryptSaltLength);
}



// see https://ciphertrick.com/2016/01/18/salt-hash-passwords-using-nodejs-crypto/
/**
 * generates random string of characters i.e salt
 * @function
 * @param {number} length - Length of the random string.
 */
function genRandomStringHex(length) {
    return crypto.randomBytes(Math.ceil(length/2))
            .toString("hex") /** convert to hexadecimal format */
            .slice(0,length);   /** return required number of characters */
}


function genRandomStringHumanEasy(length) {
	// generate a string of letters and numbers that is hard for humans to mistake
	// so all uppercase and avoid letters that could be duplicates
	// see https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript
	var retstr = "";
	var charlen = DEF_HumanEasyCharacters.length;
	var charpos;
	for ( var i = 0; i < length; i++ ) {
		charpos = Math.floor(Math.random() * charlen);
		retstr +=  DEF_HumanEasyCharacters.charAt(charpos);
	}
	return retstr;
}


function genRandomStringHumanEasier(length) {
	// generate a string of letters and numbers that is hard for humans to mistake
	// so all uppercase and avoid letters that could be duplicates
	// see https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript
	// this version alternates digits and letters for even easier to read codes
	var retstr = "";
	var charlen, charpos;
	var group = 0;
	for ( var i = 0; i < length; i++ ) {
		if (group>1) {
			// alternate 
			group = 0;
		}
		charlen = DEF_HumanEasyCharactersArray[group].length;
		charpos = Math.floor(Math.random() * charlen);
		retstr +=  DEF_HumanEasyCharactersArray[group].charAt(charpos);
		group++;
	}
	return retstr;
}
//---------------------------------------------------------------------------













//---------------------------------------------------------------------------
module.exports = {
	hashPlaintextPassword, createPasswordHashed, testPassword,
	genRandomStringHex, genRandomStringHumanEasy, genRandomStringHumanEasier
	}
//---------------------------------------------------------------------------
