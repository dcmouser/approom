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
//---------------------------------------------------------------------------




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

// ATTN: TODO -- we might add support to automatically fail any password check falling below some configured date or passwordVersion

// for humaneasy codes (all uppercase, no I no O no Z no 0 no 1 no 2)
const DefHumanEasyCharactersArray = ["ABCDEFGHJKLMNPQRSTUVWXY", "3456789"];
const DefHumanEasyCharacters = DefHumanEasyCharactersArray[0] + DefHumanEasyCharactersArray[1];
//---------------------------------------------------------------------------




class JrCrypto {

	//---------------------------------------------------------------------------
	constructor() {
	}

	// global singleton request
	static getSingleton(...args) {
		// we could do this more simply by just exporting a new instance as module export, but we wrap a function for more flexibility
		if (this.globalSingleton === undefined) {
			this.globalSingleton = new JrCrypto(...args);
		}
		return this.globalSingleton;
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	async hashPlaintextPasswordToObj(passwordPlaintext) {
		// algorithm to use
		var passwordAlgorithm = DefPasswordAlgorithm;
		var salt = "";
		// hash it
		var passwordHashed = await this.createHashedObjectFromString(passwordPlaintext, passwordAlgorithm, salt, DefCryptSaltRounds, DefLatestPasswordVersion);
		// return it -- an OBJECT with properties not just a string
		return passwordHashed;
	}


	async hashPlaintextStringSecurely(plaintextString) {
		// algorithm to use
		var passwordAlgorithm = DefPasswordAlgorithm;
		var salt = "";
		// hash it
		var hashedObj = this.createHashedObjectFromString(plaintextString, passwordAlgorithm, salt, DefCryptSaltRounds, DefLatestPasswordVersion);
		var hashedString = hashedObj.hash;
		return hashedString;
	}



	async createHashedObjectFromString(plaintextString, passwordAlgorithm, salt, saltRounds, passwordVersion) {
		// function to hash plaintext password and return an object with hashed password properties

		var hashedString;
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
				salt = this.generateRandomSalt();
			}
			//
			var hash = crypto.createHmac("sha512", salt);
			hash.update(plaintextString);
			hashedString = hash.digest("hex");
			// null these so we dont save them
			saltRounds = null;
		} else {
			throw ("Uknown password hash algorithm: " + passwordAlgorithm);
		}

		// build the passwordHashed and return it
		var hashedObj = {
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




	async testPlaintextPassword(passwordPlaintext, passwordHashed) {
		// see if password matches

		// if passwordHashStringFromDb == "" then there is no password stored, so result is always false
		if (!passwordPlaintext || !passwordHashed) {
			return false;
		}

		// password obj properties
		var passwordAlgorithm = passwordHashed.alg;
		var passwordHashedStr = passwordHashed.hash;
		var passwordVersion = passwordHashed.ver;

		// ok compare
		try {
			if (passwordAlgorithm === "bcrypt") {
				// bcrypt uses its own explicit compare function, that is meant to defeat timing attacks
				// note that it will figure out the salt and saltrounds from the actual hash string
				var bretv = bcrypt.compare(passwordPlaintext, passwordHashedStr);
				return bretv;
			}
			// for non-bcrypt, we essentially repeat the hash process with the previously used salt and then compare
			var salt = passwordHashed.salt;
			var saltRounds = passwordHashed.saltRounds;
			//
			var passwordHashedTest = await this.createPasswordHashed(passwordPlaintext, passwordAlgorithm, salt, saltRounds, passwordVersion);
			// now is the hashed version of the new plaintext the same as the hashed version of the old stored one?
			return (passwordHashedTest.passwordHashedStr === passwordHashedStr);
		} catch (err) {
			jrlog.log("Error in jrhelpers exports.testPlaintextPassword while attempting to parse/compare hashed password string");
			jrlog.log(err);
		}

		// no match
		return false;
	}



	generateRandomSalt() {
		// private func
		return this.genRandomStringHex(DefCryptSaltLength);
	}



	// see https://ciphertrick.com/2016/01/18/salt-hash-passwords-using-nodejs-crypto/
	/**
	 * generates random string of characters i.e salt
	 * @function
	 * @param {number} length - Length of the random string.
	 */
	genRandomStringHex(length) {
		return crypto.randomBytes(Math.ceil(length / 2))
			.toString("hex")
			.slice(0, length);
	}


	genRandomStringHumanEasy(length) {
		// generate a string of letters and numbers that is hard for humans to mistake
		// so all uppercase and avoid letters that could be duplicates
		// see https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript
		var retstr = "";
		var charlen = DefHumanEasyCharacters.length;
		var charpos;
		for (var i = 0; i < length; i++) {
			charpos = Math.floor(Math.random() * charlen);
			retstr += DefHumanEasyCharacters.charAt(charpos);
		}
		return retstr;
	}


	genRandomStringHumanEasier(length) {
		// generate a string of letters and numbers that is hard for humans to mistake
		// so all uppercase and avoid letters that could be duplicates
		// see https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript
		// this version alternates digits and letters for even easier to read codes
		var retstr = "";
		var charlen, charpos;
		var group = 0;
		for (var i = 0; i < length; i++) {
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
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	// this function needs to retun the SAME HASH no matter when we call it, so that we can search for result
	// this means we dont use a random salt
	async hashPlaintextStringInsecureButSearchable(plaintextString, salt) {
		var hash = crypto.createHmac("sha512", salt);
		hash.update(plaintextString);
		var hashedString = hash.digest("hex");
		return hashedString;
	}
	//---------------------------------------------------------------------------

}











// export the class as the sole export
module.exports = JrCrypto.getSingleton();
