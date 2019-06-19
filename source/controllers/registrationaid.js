// approom
// registration aid class
// v1.0.0 on 5/1/19 by mouser@donationcoder.com
//
// Helps out with registration processing

"use strict";

// our helper modules
const jrhelpers = require("../helpers/jrhelpers");
const JrResult = require("../helpers/jrresult");


class RegistrationAid {

	//---------------------------------------------------------------------------
	static async fillReqBodyWithSessionedFieldValues(req) {
		// option fields
		var username;
		var email;
		var extraData;
		var jrResult = JrResult.makeNew();

		// initial values for the form to present them with

		// require models
		const arserver = require("../models/server");
		const UserModel = require("../models/user");

		// ok now let's check if they are sessioned with a LoginId; if so we might get initial values from that
		var login = await arserver.getLoggedInLogin(req);
		if (login) {
			// bridged login, get their requested (or default) username
			extraData = login.getExtraData();
			if (extraData.username) {
				username = extraData.username;
			}
			if (extraData.email) {
				email = extraData.email;
			}
			//			if (extraData.passwordHashed) {
			//				passwordHashed = extraData.passwordHashed;
			//			}
			if (!username && extraData.realName) {
				username = extraData.realName;
			}
			if (username) {
				username = await UserModel.fixImportedUsername(username);
			}
		}

		// previously sessioned with a verificationId? if so we could get initial values from that
		var verification = await arserver.getLastSessionedVerification(req);
		if (verification && verification.isValidNewAccountEmailReady(req)) {
			// ok we can get their initial registration data from their verification they already verified
			if (verification.key === "email") {
				email = verification.val;
				jrResult.pushSuccess("Your email address has been verified.");
			}
			extraData = verification.getExtraData();
			if (extraData.username) {
				username = extraData.username;
			}
			if (extraData.email) {
				email = extraData.email;
			}
		} else {
			// not relevant for us
			verification = null;
		}

		// store initial values for form in req.body, just as they would be if were were re-presending a failed form
		req.body.username = username;
		req.body.email = email;
		if (verification) {
			req.body.verifyCode = verification.getUniqueCode();
		}

		return jrResult;
	}
	//---------------------------------------------------------------------------

























	//---------------------------------------------------------------------------
	// New all in one registration/account form helper
	static async processAccountAllInOneForm(req) {
		var jrResult = JrResult.makeNew();
		var retvResult;
		var successRedirectTo;

		// require models
		const arserver = require("../models/server");
		const VerificationModel = require("../models/verification");
		const UserModel = require("../models/user");

		// get any verification code associated with this registration, to prove they own the email
		// verifyCode can come explicitly from the form (takes priority) OR the session if not in the form
		var verification;
		//
		var verifyCodeForm = req.body.verifyCode;
		if (verifyCodeForm) {
			// verification vode was explicitly provided in the form, so get the information from that
			// and in THIS case we will allow an expired code to be used, since
			verification = await VerificationModel.findOneByCode(verifyCodeForm);
		} else {
			verification = await arserver.getLastSessionedVerification(req);
		}
		//
		if (verification) {
			if (!verification.isValidNewAccountEmailReady(req)) {
				// no good, vlear it
				verification = null;
			}
		}


		// depending on how we are invoked we may allow for missing fields
		var requiredFields;
		if (verification) {
			// when we are following up on a verification, then this is a final registration
			requiredFields = RegistrationAid.calcRequiredRegistrationFieldsFinal();
		} else {
			// new registration, we only need certain info
			requiredFields = RegistrationAid.calcRequiredRegistrationFieldsInitial();
		}
		var flagAllowBlankEmail = !requiredFields.includes("email");
		var flagAllowBlankUsername = !requiredFields.includes("username");
		var flagAllowBlankPassword = !requiredFields.includes("password");

		// ATTN: note that it may be the case that a field is REQUIRED, but does not have to be present
		//  on the form if it is present in the verification record (e.g. they have verified their email)


		// ---
		// VALIDATE FIELDS

		// values from form
		var email = req.body.email;
		var username = req.body.username;
		var password = req.body.password;
		var passwordHashed = null;
		var flagVerifiedEmail = false;

		// blank values can assume verification values
		if (verification) {
			if (!email) {
				email = verification.getVerifiedValue("email");
				flagVerifiedEmail = true;
			} else {
				// they have provided an email -- if it doesn't match verificaiton email, then the verification is moot
				if (email !== verification.getVerifiedValue("email")) {
					flagVerifiedEmail = false;
				} else {
					flagVerifiedEmail = true;
				}
			}
			if (!username) {
				username = verification.getExtraValue("username");
			}
			if (!password) {
				passwordHashed = verification.getExtraValue("passwordHashed");
			}
		}


		// valid email?
		retvResult = await UserModel.validateEmail(email, true, flagAllowBlankEmail);
		if (retvResult.isError()) {
			jrResult.mergeIn(retvResult);
		}

		// valid username?
		retvResult = await UserModel.validateUsername(username, true, flagAllowBlankUsername);
		if (retvResult.isError()) {
			jrResult.mergeIn(retvResult);
		}

		// valid password?
		if (passwordHashed) {
			// we already have a valid hashed password for them, previously calculated and stored in verification object (and no new password specified), so we'll use that
		} else {
			retvResult = await UserModel.validatePassword(password, flagAllowBlankPassword);
			if (retvResult.isError()) {
				jrResult.mergeIn(retvResult);
			} else {
				// hash password for storage
				if (password) {
					// hash their password
					passwordHashed = await UserModel.hashPassword(password);
				}
			}
		}

		if (jrResult.isError()) {
			// error case, we can return now
			return { jrResult, successRedirectTo };
		}
		// ---


		// user data object, used in both cases below
		var extraData = {
			email,
			username,
			passwordHashed,
		};
		// ATTN: IMPORTANT NOTE
		// There are 2 cases we need to deal with here
		// Case 1: We already have verified proof they own this email, because they got here with a verifyCode that proves it (either provided in the form, or in their session)
		//  in which case we can create the account
		// Case 2: They somehow are on this page requesting a new account, without proof of they own the email (maybe they lost the verification coder, etc.)
		//  in this case, it's identical to asking for a registration
		// in case 1 we will complain if they try to use an email address in extraData that does not match the one in the verification;
		//  but alternately we could take a mismatch of email as a sign of case 2, and rather than complaining, just begin the email verification process again.
		//
		if (verification && flagVerifiedEmail) {
			// case 1, we can create the full account
			jrResult = await RegistrationAid.createFullNewUserAccount(req, verification, extraData);
			if (!jrResult.isError()) {
				if (arserver.getLoggedInLocalUserIdFromSession(req)) {
					// they have been logged in after verifying, so send them to their profile.
					successRedirectTo = "/profile";
				} else {
					successRedirectTo = "/login";
				}
			}
		} else {
			// case 2, it's an initial registration attempt for which we need to send them a verification

			// session user data (userId should be blank, but loginId might not be if they are doing this after a bridged login)
			var userId = arserver.getLoggedInLocalUserIdFromSession(req);
			var loginId = arserver.getLoggedInLocalLoginIdFromSession(req);

			// create the email verification and mail it
			jrResult = await VerificationModel.createVerificationNewAccountEmail(email, userId, loginId, extraData);

			// add message on success
			if (!jrResult.isError()) {
				// success
				jrResult.pushSuccess("Please check for the verification email.  You will need to confirm that you have received it before your account can be created.");
				successRedirectTo = "/verify";
			}
		}


		// return tuple with result and suggested succes redirect
		return { jrResult, successRedirectTo };
	}
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	static calcRequiredRegistrationFieldsInitial() {
		var requiredFields = ["email"];
		return requiredFields;
	}

	static calcRequiredRegistrationFieldsFinal() {
		var requiredFields = ["email", "username", "password"];
		return requiredFields;
	}
	//---------------------------------------------------------------------------





	//---------------------------------------------------------------------------
	// this is the function called when user submits their username and password to create their account
	// AFTER they have confirmed their email address
	// it is called from the account route
	// there is very similar code elsewhere that we would like to combine
	//
	// ATTN: there is redundant code here; better would be to call the generic UseVerification process with the extra info
	// IMPORTANT: extraData may contain an email address -- if so it MUST match the one in the verification, otherwise it is an error to complain about
	// NOTE: verifyCode can optionally be an already resolved verification object
	//
	static async createFullNewUserAccount(req, verification, userObj) {
		var jrResult, jrResult2;

		// log them in automatically after we create their account?
		var flagLogInUserAfterAccountCreate = true;

		// require models
		const arserver = require("../models/server");
		const LoginModel = require("../models/login");
		const UserModel = require("../models/user");

		// create user
		var user = await UserModel.createUserFromObj(userObj);

		// success?
		if (user) {
			// success
			jrResult = JrResult.makeSuccess("Your new account with username '" + user.username + "' has been created.");
			// mark that it is used
			await verification.useUpAndSave(req, true);
			// now, if they were sessioned-in with a Login, we want to connect that to the new user
			//
			var loginId = arserver.getLoggedInLocalLoginIdFromSession(req);
			if (loginId) {
				jrResult2 = await LoginModel.connectUserToLogin(user, loginId, false);
				jrResult.mergeIn(jrResult2);
			}
			// if successfullly created new account, should we actually log them in at this point?
			if (!jrResult.isError()) {
				if (flagLogInUserAfterAccountCreate) {
					jrResult2 = await arserver.loginUserThroughPassport(req, user);
					jrResult.mergeIn(jrResult2);
				}
			}
			return jrResult;
		}

		jrResult = JrResult.makeError("RegistrationError", "Failed to create new user account.");
		return jrResult;
	}
	//---------------------------------------------------------------------------


}


// export the class as the sole export
module.exports = RegistrationAid;
