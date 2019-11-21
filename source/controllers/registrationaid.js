/**
 * @module controllers/registrationaid
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 5/1/19
 * @description
 * This module defines the RegistrationAid class, which provides support functions for user registration
 */

"use strict";


// requirement service locator
const jrequire = require("../helpers/jrequire");

// our helper modules
const JrResult = require("../helpers/jrresult");
const jrhValidate = require("../helpers/jrh_validate");

// require controllers
const arserver = jrequire("arserver");

// require models
const VerificationModel = jrequire("models/verification");
const UserModel = jrequire("models/user");
const LoginModel = jrequire("models/login");









/**
 * Provides support functions for user registration
 *
 * @class RegistrationAid
 */
class RegistrationAid {

	//---------------------------------------------------------------------------
	// constructor
	constructor() {
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	// this function is used to initialize form variables when presenting registration form
	// it gets values from session related if they have a bridged login or a session-remembered validation of their emai, etc.
	// which allows us to have multi-step registration
	async fillReqBodyWithSessionedFieldValues(req) {
		// option fields
		var username, email, realName;
		var jrResult = JrResult.makeNew();

		// initial values for the form to present them with

		// ok now let's check if they are sessioned with a LoginId; if so we might get initial values from that
		var login = await arserver.getLoggedInLogin(req);
		if (login) {
			// bridged login, get their requested (or default) username
			email = login.getExtraData("email");
			realName = login.getExtraData("realName");
			username = login.getExtraData("username", realName);
			if (username) {
				username = await UserModel.fixImportedUsername(username);
			}
			// show them about their bridged login
			jrResult.pushSuccess("After your complete your registration, you will be able to login using " + login.getProviderLabel() + ".");
		}

		// previously sessioned with a verificationId? if so we could get initial values from that
		var verification = await arserver.getLastSessionedVerification(req);
		if (verification && verification.isValidNewAccountEmailReady(req)) {
			// ok we can get their initial registration data from their verification they already verified
			if (verification.key === "email") {
				email = verification.val;
				jrResult.pushSuccess("With your email address verified, you may now complete your registration.");
			}
			realName = verification.getExtraData("realName", realName);
			username = verification.getExtraData("username", username);
			email = verification.getExtraData("email", email);
		} else {
			// not relevant for us
			verification = null;
		}

		// store initial values for form in req.body, just as they would be if were were re-presending a failed form
		req.body.username = username;
		req.body.email = email;
		req.body.realName = realName;
		if (verification) {
			// We have a verification that is still relevant for creating a new account, so we do we want to pass that along in the form? what if we don't?
			if (true) {
				// ATTN: now, as would be the case if we were re-presenting a form with errors, we might want to put the (plaintext) verification code back on the form to re-consume it on new submit
				// however, it's not clear the best way to do this.. do we want to embed in form being passed back to user or just keep it in session...
				// NOTE also that if they hit the registration page attempting to finish a registration, their passed verification code may ALSO be in req.body.code or req.params.code (see verify route)
				// there are alternatives.  We could not put the already-taken verification code back in the form, and just grab it from session when we go to process the registration form (feels kludgey)
				// Alternatively, we could not look for it in session at all, and just get keep passing it through as hidden var on form but taking it from the original very route (req.params.code)
				//  this has advantage of not needing session to save verification code; the only real problem with this is that i think we may depend on session saving verification info when we do a bridged login.. is that true?
				// The reason it's currently hard to pass it through as a hidden variable on the registration form after we receive it in a verify url link, is that we are REDIRECTING the user to the register page, rather than
				//  just rendering full registration form.. So it's not easy to pass along the verification code info other than via session.
				if (!req.body.verificationCode) {
					req.body.verificationCode = verification.getUniqueCode();
				}
			}
			if (false) {
				req.body.verificationCodeHashed = verification.getUniqueCodeHashed();
			}
		}

		return jrResult;
	}
	//---------------------------------------------------------------------------

























	//---------------------------------------------------------------------------
	// New all in one registration/account form helper
	async processAccountAllInOneForm(req) {
		var jrResult = JrResult.makeNew();
		var successRedirectTo;

		// get any verification code associated with this registration, to prove they own the email
		// verificationCode can come explicitly from the form (takes priority) OR the session if not in the form
		var verification = await this.getValidNewAccountVerificationFromRequestOrLastSession(req);

		// depending on how we are invoked we may allow for missing fields
		// ATTN: note that it may be the case that a field is REQUIRED, but does not have to be present
		//  on the form if it is present in the verification record (e.g. they have verified their email)
		var requiredFields;
		if (verification) {
			// when we are following up on a verification, then this is a final registration
			requiredFields = this.calcRequiredRegistrationFieldsFinal();
		} else {
			// new registration, we may only need certain info, because we aren't creating user account yet, just pre-account verification without account to be created after they verify their email
			requiredFields = this.calcRequiredRegistrationFieldsInitial();
		}
		var flagEmailRequired = requiredFields.includes("email");
		var flagUsernameRequired = requiredFields.includes("username");
		var flagPasswordRequired = requiredFields.includes("password");
		var flagCheckDisallowedUsername = true;


		// get values from form submission, falling back on verification if there is one that is verified
		var email = req.body.email;
		var username = req.body.username;
		var password = req.body.password;
		var realName = req.body.realName;
		var passwordHashed;
		var flagVerifiedEmail = false;

		// blank values in form can assume verification values
		// this is so that when they signed up pre-account creation they could have supplies some of these as requested (but not guaranteed) values
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
				username = verification.getExtraData("username");
			}
			if (!password) {
				passwordHashed = verification.getExtraData("passwordHashed");
			}
			if (!realName) {
				realName = verification.getExtraData("realName");
			}
		}





		// ok now we want to validate fields
		// ATTN: there is some duplicated overlapping code here from user.js validateAndSaveNew() that we would ideally like to merge

		// valid email?
		email = await UserModel.validateEmail(jrResult, email, true, flagEmailRequired, null);

		// valid username?
		username = await UserModel.validateUsername(jrResult, username, true, flagUsernameRequired, flagCheckDisallowedUsername, null);

		// valid realName
		realName = await jrhValidate.validateRealName(jrResult, "realName", realName, false);

		// valid password?
		if (passwordHashed) {
			// we already have a valid hashed password for them, previously calculated and stored in verification object (and no new password specified), so we'll use that
		} else {
			passwordHashed = await UserModel.validatePlaintextPasswordConvertToHash(jrResult, password, flagPasswordRequired, false);
		}

		if (jrResult.isError()) {
			// error case, we can return now
			return { jrResult, successRedirectTo };
		}
		//---------------------------------------------------------------------------




		//---------------------------------------------------------------------------
		// user data object, used in both cases below
		var userObj = {
			email,
			username,
			realName,
			passwordHashed,
		};
		// ATTN: IMPORTANT NOTE
		// There are 2 cases we need to deal with here
		// Case 1: We already have verified proof they own this email, because they got here with a verificationCode that proves it (either provided in the form, or in their session)
		//  in which case we can create the account
		// Case 2: They somehow are on this page requesting a new account, without proof of they own the email (maybe they lost the verification coder, etc.)
		//  in this case, it's identical to asking for a registration
		// in case 1 we will complain if they try to use an email address in userObj that does not match the one in the verification;
		//  but alternately we could take a mismatch of email as a sign of case 2, and rather than complaining, just begin the email verification process again.
		//
		if (verification && flagVerifiedEmail) {
			// case 1, we can create the full account
			await this.createFullNewUserAccountForLoggedInUser(jrResult, req, verification, userObj);
			if (!jrResult.isError()) {
				if (arserver.getLoggedInLocalUserIdFromSession(req)) {
					// they have been logged in after verifying, so send them to their profile.
					successRedirectTo = "/profile";
				} else {
					// not logged in, so send them to login page to login
					successRedirectTo = "/login";
				}
				// drop down whether success or error
			}
		} else {
			// case 2, it's an initial registration attempt for which we need to send them a verification
			//
			// session user data (userId should be blank, but loginId might not be if they are doing this after a bridged login)
			var userId = arserver.getLoggedInLocalUserIdFromSession(req);
			var loginId = arserver.getLoggedInLocalLoginIdFromSession(req);

			// create the email verification and mail it
			jrResult = await VerificationModel.createVerificationNewAccountEmail(email, userId, loginId, userObj);

			// add message on success
			if (!jrResult.isError()) {
				// success
				jrResult.pushSuccess("Please check for the verification email.  You will need to confirm that you have received it before your account can be created.");
				successRedirectTo = "/verify";
			}
		}
		//---------------------------------------------------------------------------

		// return tuple with result and suggested succes redirect
		return { jrResult, successRedirectTo };
	}
	//---------------------------------------------------------------------------




	//---------------------------------------------------------------------------
	calcRequiredRegistrationFieldsInitial() {
		// we can change this stuff if we want to force user to provide different info on initial registration
		// if we only require email, then we can't create account until they verify email, and thereafter fill in another form with username, etc.
		// wheras if we gather full info (username, pass) now, we can remember it and create full account after they verify their email
		var requiredFields = ["email"];
		return requiredFields;
	}

	calcRequiredRegistrationFieldsFinal() {
		// what fields we require to create the full user account
		// ATTN: note that you can't put just any arbitrary list of fields here, only certain ones are checked in processAccountAllInOneForm() above
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
	// IMPORTANT: userObj may contain an email address -- if so it MUST match the one in the verification, otherwise it is an error to complain about
	// NOTE: verificationCode can optionally be an already resolved verification object
	//
	async createFullNewUserAccountForLoggedInUser(jrResult, req, verification, userObj) {
		var retvResult;

		// log them in automatically after we create their account?
		var flagLogInUserAfterAccountCreate = true;

		// create user (passwordHashed is pre-validated)
		// ATTN: this function is typically called by caller who has already validated username, email, etc, so we COULD list these all (or *) in the preValidated list
		// but for safety we ask ValidateAndSaveNew to revalidate everything EXCEPT passwordHash which cannot be re-validated since the plaintext may be gone to the wind
		var saveFields = ["username", "email", "realName", "passwordHashed"];
		// trust the email since we just verified it
		var options = {
			flagTrustEmailChange: true,
		};
		var user = await UserModel.validateAndSaveNew(jrResult, options, true, req, userObj, saveFields, ["passwordHashed"]);

		// success?
		if (!jrResult.isError()) {
			// success
			jrResult.pushSuccess("Your new account with username '" + user.username + "' has been created.");
			// mark that verification is used
			if (verification) {
				await verification.useUpAndSave(req, true);
			}
			// log it
			arserver.logr(req, "user.create", "created new account for " + user.getLogIdString());
			// now, if they were sessioned-in with a Login, we want to connect that to the new user
			//
			var loginId = arserver.getLoggedInLocalLoginIdFromSession(req);
			if (loginId) {
				retvResult = await LoginModel.connectUserToLogin(user, loginId, false);
				jrResult.mergeIn(retvResult);
			}
			// if successfullly created new account, should we actually log them in at this point?
			if (!jrResult.isError()) {
				if (flagLogInUserAfterAccountCreate) {
					// log them in
					retvResult = await arserver.asyncLoginUserToSessionThroughPassport(req, user);
					// merge errors?
					jrResult.mergeIn(retvResult);
					if (!jrResult.isError()) {
						jrResult.pushSuccess("You have been logged in.");
					}
				}
			}
			return;
		}

		jrResult.pushError("Failed to create new user account.");
	}
	//---------------------------------------------------------------------------






	//---------------------------------------------------------------------------
	async getValidNewAccountVerificationFromRequestOrLastSession(req) {
		// ATTN: In this function, we look for a (plaintext) verification code in the body of the form submitted, OR if not found, from the last session verification code checked
		// note we only look at newaccountready verifications
		var verification;

		const verificationCode = req.body.verificationCode;
		if (!verification && verificationCode) {
			// first lookup verify code if code provided in form
			verification = await VerificationModel.findOneByCode(verificationCode);
		}
		if (!verification) {
			// not found in form, maybe there is a remembered verification id in ession regarding new account email verified, then show full
			verification = await arserver.getLastSessionedVerification(req);
		}

		if (verification) {
			if (!verification.isValidNewAccountEmailReady(req)) {
				// not relevant for us, so clear it
				verification = undefined;
			}
		}
		return verification;
	}
	//---------------------------------------------------------------------------









}


// export the class as the sole export
module.exports = new RegistrationAid();
