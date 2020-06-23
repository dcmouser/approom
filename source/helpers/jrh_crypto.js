/**
 * @module helpers/jrh_crypto
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 5/19/19

 * @description
 * Collection of helper functions for crypto related stuff
*/

"use strict";



// modules
// for password hashing
const crypto = require("crypto");

// bcrypt crypto helper
const bcrypt = require("bcrypt");


// our helper modules
const jrhMisc = require("./jrh_misc");





//---------------------------------------------------------------------------
// constants

const DefPasswordAlgorithm = "bcrypt";
// const DefPasswordAlgorithm = "crypto_sha512";

// salt length, not used by bcrypt
const DefCryptSaltLength = 16;

// salt rounds, used by bcrypt
const DefCryptSaltRounds = 11;

// update this when you change something about the way a pass algorithm works or the options here,
//  so you can easily filter users based using a password version threshold to force updates.
// in addition we store password creation dates, so we can filter based on some date of db compromise
const DefLatestPasswordVersion = 2;

// for humaneasy codes (all uppercase, no I no O no Z no 0 no 1 no 2)
const DefHumanEasyCharactersArray = ["ABCDEFGHJKLMNPQRSTUVWXY", "3456789"];
const DefHumanEasyCharacters = DefHumanEasyCharactersArray[0] + DefHumanEasyCharactersArray[1];
//---------------------------------------------------------------------------





/**
 * Take a plaintext string and hash it.
 * A random salt is automatically generated and added to the hash object
 *
 * @param {string} passwordPlaintext
 * @returns passwordHashedObj, an object with property fields for the hashed password, including hash (the hashed string), and other meta properties describing the hash operation
 */
async function hashPlaintextPasswordToObj(passwordPlaintext) {
	// algorithm to use
	const passwordAlgorithm = DefPasswordAlgorithm;
	// a salt of "" means to use a random salt and include it in the hash
	const salt = "";
	// hash it
	const passwordHashedObj = await createHashedObjectFromString(passwordPlaintext, passwordAlgorithm, salt, DefCryptSaltRounds, DefLatestPasswordVersion);
	// return it -- an OBJECT with properties not just a string
	return passwordHashedObj;
}


/**
 * Test a plaintext string (user entered password) against a stored passwordHashed object.
 * The passwordHashedObj will contain the random salt to use and the algorithm used.
 *
 * @param {string} passwordPlaintext
 * @param {object} passwordHashedObj
 * @returns true if they match, false if they don't, or throws ERROR if something else goes wrong (password algorithm not supported, etc.)
 */
async function testPlaintextPassword(passwordPlaintext, passwordHashedObj) {
	// see if password matches

	// we allow for password stored in db to be blank.  in this case we always reject a password as not matching (ie they can't login with password)
	// we allow for this case -- sometimes users may have no password set; in this case it
	// but note that we WILL allow a check of a blank plaintext password (so if a blank string is hashed and stored as a valid password, we will check and approve that if it matches)
	if (jrhMisc.isObjectEmpty(passwordHashedObj)) {
		return false;
	}

	// password obj properties
	const passwordAlgorithm = passwordHashedObj.alg;
	const passwordHashedStr = passwordHashedObj.hash;
	const passwordVersion = passwordHashedObj.ver;

	// ok compare
	try {
		if (passwordAlgorithm === "bcrypt") {
			// bcrypt uses its own explicit compare function, that is meant to defeat timing attacks
			// note that it will figure out the salt and saltrounds from the actual hash string
			const bretv = bcrypt.compare(passwordPlaintext, passwordHashedStr);
			return bretv;
		}
		// for non-bcrypt, we essentially repeat the hash process with the previously used salt and then compare
		const salt = passwordHashedObj.salt;
		const saltRounds = passwordHashedObj.saltRounds;
		//
		const passwordHashedTest = await createHashedObjectFromString(passwordPlaintext, passwordAlgorithm, salt, saltRounds, passwordVersion);
		// now is the hashed version of the new plaintext the same as the hashed version of the old stored one?
		return (passwordHashedTest.passwordHashedStr === passwordHashedStr);
	} catch (err) {
		const emsg = "Error in jrhMisc exports.testPlaintextPassword while attempting to parse/compare hashed password string with password algorithn '" + passwordAlgorithm + "'";
		if (true) {
			// throw it up and let caller handle it (adding our more verbos error)
			err.message = emsg + "; " + err.message;
		}
		throw err;
	}

	// no match
	return false;
}
//---------------------------------------------------------------------------







/**
 * More specific function to created hashed object from a plaintext string
 *
 * @param {string} plaintextString
 * @param {string} passwordAlgorithm - from bcrypt|crypto_sha512|plain (just returns string itself)
 * @param {string} salt - the salt to use, incorporated in return object; if blank a random one is generated
 * @param {int} saltRounds - the number of rounds of salting
 * @param {int} passwordVersion - password version number; passed to hash function, slows down hashing making brute forcing harder
 * @returns hashed object with .hash containing the hashed string with salt info, etc. and other meta properties
 */
async function createHashedObjectFromString(plaintextString, passwordAlgorithm, salt, saltRounds, passwordVersion) {
	// function to hash plaintext password and return an object with hashed password properties

	let hashedString;
	//
	if (passwordAlgorithm === "plain") {
		hashedString = plaintextString;
		salt = "";
	} else if (passwordAlgorithm === "bcrypt") {
		// bcrypt module hash -- the most widely recommended method
		// note that bcrypt does not let us specify salt, and embeds extra info in hashedString string
		hashedString = await bcrypt.hash(plaintextString, saltRounds);
		// null these so we dont save them (saltRound info is embedded in the bcrypt hash)
		salt = null;
		saltRounds = null;
	} else if (passwordAlgorithm === "crypto_sha512") {
		// crypto module hash
		// see https://ciphertrick.com/2016/01/18/salt-hash-passwords-using-nodejs-crypto/
		// note: crypto does not use saltRounds
		if (!salt) {
			// no salt provided, make a random one
			salt = generateRandomSalt();
		}
		//
		const hash = crypto.createHmac("sha512", salt);
		hash.update(plaintextString);
		hashedString = hash.digest("hex");
		// null these so we dont save them
		saltRounds = null;
	} else {
		throw (new Error("Uknown password hash algorithm: " + passwordAlgorithm));
	}

	// build the passwordHashed and return it
	const hashedObj = {
		hash: hashedString,
		alg: passwordAlgorithm,
		// version is a numeric value we can use in case we need to force upgrade everyone with an old password algorithm, etc.
		ver: passwordVersion,
		// save date so we can find older passwords we want to force users to update after some issue
		date: new Date(),
	};
	if (salt !== null) {
		hashedObj.salt = salt;
	}
	if (saltRounds !== null) {
		hashedObj.saltRounds = saltRounds;
	}
	//
	return hashedObj;
}
//---------------------------------------------------------------------------





//---------------------------------------------------------------------------
/**
 * Generate a random salt of a default langth (DefCryptSaltLength const)
  * @returns hex string of length DefCryptSaltLength
 */
function generateRandomSalt() {
	// private func
	return genRandomStringHex(DefCryptSaltLength);
}


/**
 * Generate a random hex string of a specified length, cryptographically random bytes used as data
 * @see <a href="https://ciphertrick.com/2016/01/18/salt-hash-passwords-using-nodejs-crypto/">salting hash passwords</a>
 *
 * @param {int} length - the number of characters
 * @returns random string of characters of specified length
 */
function genRandomStringHex(length) {
	return crypto.randomBytes(Math.ceil(length / 2))
		.toString("hex")
		.slice(0, length);
}


/**
 * This generates a random string using only characters and digits that are easy for humans to recognize and differentiate
 * @see <a href="https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript">stackoverflow</a>
 * ##### Notes
 *  * This is not cryptographically secure random numbers, as it uses Math.random
 * @todo Security: Replace with crypto secure prng?
 *
 * @param {int} length
 * @returns random string of specified characters consisting of only characters and digits found in DefHumanEasyCharacters
 */
function genRandomStringHumanEasy(length) {
	// generate a string of letters and numbers that is hard for humans to mistake
	// so all uppercase and avoid letters that could be duplicates
	// see https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript
	let retstr = "";
	const charlen = DefHumanEasyCharacters.length;
	let charpos;
	for (let i = 0; i < length; i++) {
		charpos = Math.floor(Math.random() * charlen);
		retstr += DefHumanEasyCharacters.charAt(charpos);
	}
	return retstr;
}


/**
 * This generates a random string using only characters and digits that are easy for humans to recognize and differentiate,
 * and also alternates numbers and digits for even easier to remember codes.
 * @see <a href="https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript">stackoverflow</a>
 * ##### Notes
 *  * This is not cryptographically secure random numbers, as it uses Math.random
 * @todo Security: Replace with crypto secure prng?
 *
 * @param {int} length
 * @returns random string consisting of only characters and digits found in DefHumanEasyCharacters
 */
function genRandomStringHumanEasier(length) {
	let retstr = "";
	let charlen, charpos;
	let group = 0;
	for (let i = 0; i < length; i++) {
		if (group > 1) {
			// alternate
			group = 0;
		}
		charlen = DefHumanEasyCharactersArray[group].length;
		charpos = Math.floor(Math.random() * charlen);
		retstr += DefHumanEasyCharactersArray[group].charAt(charpos);
		group++;
	}
	return retstr;
}


/**
 * Generate a random string of characters from a character set, of the length specified
 *
 * @param {string} charset
 * @param {int} length
 * @returns the random string
 */
function genRandomStringFromCharSet(charset, length) {
	const charlen = charset.length;
	let retstr = "";
	let charpos;
	for (let i = 0; i < length; i++) {
		charpos = Math.floor(Math.random() * charlen);
		retstr += charset.charAt(charpos);
	}
	return retstr;
}
//---------------------------------------------------------------------------



//---------------------------------------------------------------------------
/**
 * Hash a string, but this time using a specific salt, returning a simple hashed string as result.
 * ##### Notes
 *  * This function needs to retun the SAME HASH no matter when we call it, so that we can search for result.  This means we dont use a random salt
 *  * And we always use sha51 algorithm.
 *  * This helper function is used to hash verification codes in database so that if db is compromised it will be harder to retrieve plaintext verificaiton code
 *  * We can't use random salt because we need to be able to look up matching items by the hashed version.
 * @todo In future we might use a two-part verification code, where first part is unique plaintext id, and second part is hashed string; in that way we could look up items by their plaintext part, and use any crypto for the hashed part.
 *
 * @param {string} plaintextString
 * @param {string} salt
 * @returns hashed string
 */
async function hashPlaintextStringInsecureButSearchable(plaintextString, salt) {
	const hash = crypto.createHmac("sha512", salt);
	hash.update(plaintextString);
	const hashedString = hash.digest("hex");
	return hashedString;
}
//---------------------------------------------------------------------------








module.exports = {
	hashPlaintextPasswordToObj,
	testPlaintextPassword,

	genRandomStringHumanEasy,
	genRandomStringHumanEasier,
	genRandomStringFromCharSet,

	hashPlaintextStringInsecureButSearchable,
};

