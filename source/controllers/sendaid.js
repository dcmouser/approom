/**
 * @module controllers/sendaid
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 11/24/19
 * @description
 * This module does some generic message sending (email, etc.)
 * @see <a href="https://www.npmjs.com/package/rate-limiter-flexible"></a>
 */

"use strict";


// modules

// mail
const nodemailer = require("nodemailer");


// requirement service locator
const jrequire = require("../helpers/jrequire");


// helpers
const jrdebug = require("../helpers/jrdebug");
const JrResult = require("../helpers/jrresult");
const jrhMisc = require("../helpers/jrh_misc");


// controllers
const arserver = jrequire("arserver");




/**
 * Provides support functions for sending emails/sms/etc.
 *
 * @class SendAid
 */

class SendAid {


	//---------------------------------------------------------------------------
	async setupMailer() {
		// setup the mailer system
		// see https://nodemailer.com/about/
		// see https://medium.com/@SeanChenU/send-mail-using-node-js-with-nodemailer-in-2-mins-c3f3e23f4a1
		this.mailTransport = nodemailer.createTransport({
			host: arserver.getConfigVal("mailer:HOST"),
			port: arserver.getConfigVal("mailer:PORT"),
			secure: arserver.getConfigVal("mailer:SECURE"),
			auth: {
				user: arserver.getConfigVal("mailer:USERNAME"),
				pass: arserver.getConfigVal("mailer:PASSWORD"),
			},
		});

		jrdebug.cdebugf("Setting up mail transport through %s.", arserver.getConfigVal("mailer:HOST"));

		// verify it?
		if (arserver.getOptionDebugEnabled()) {
			await this.getMailTransport().verify();
		}
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	getMailTransport() {
		// return previously created transport
		return this.mailTransport;
	}


	makeJrResultFromSendmailRetv(retv, mailobj) {
		var msg;
		if (retv.rejected.length === 0) {
			// success!
			if (mailobj.revealEmail) {
				msg = "Mail sent to " + jrhMisc.stringArrayToNiceString(retv.accepted) + ".";
			} else {
				msg = "Mail sent.";
			}
			return JrResult.makeSuccess(msg);
		}
		// error
		if (mailobj.revealEmail) {
			msg = "Failed to send email to " + jrhMisc.stringArrayToNiceString(retv.rejected) + ".";
		} else {
			msg = "Failed to send email.";
		}
		return JrResult.makeError(msg);
	}
	//---------------------------------------------------------------------------





	//---------------------------------------------------------------------------
	/**
	 * Send a message to a recipient
	 * The mechanism is usually email, but could be sms, etc. based on recipient object
	 * @todo Unfinished rate limiting
	 *
	 * @param {object} recipient
	 * @param {string} subject
	 * @param {string} message
	 * @param {boolean} flagBypassRateLimitChecks
	 */
	async sendMessage(recipient, subject, message, extraData, flagBypassRateLimitChecks) {
		if (flagBypassRateLimitChecks) {
			// ATTN: TODO rate limiting checks here
		}

		// add extra data
		if (!jrhMisc.isObjectEmpty(extraData)) {
			// pretty print extra data into message
			message += "\n" + jrhMisc.objToString(extraData, false);
		}

		if (recipient.email) {
			// there's an email address
			var mailobj = {
				revealEmail: true,
				subject,
				text: message,
				to: recipient.email,
			};
			await this.sendMail(mailobj);
		}

		// other things we might check for would be sms
	}
	//---------------------------------------------------------------------------





	//---------------------------------------------------------------------------
	/**
	 * Send an email object
	 *
	 * @param {object} mailobj - suitable for sending to mailTransport.sendMail
	 * @returns jrResult holding success or error
	 */
	async sendMail(mailobj) {
		// add from field
		if (!mailobj.from) {
			mailobj.from = arserver.getConfigVal("mailer:FROM");
		}

		if (arserver.getConfigValDefault("mailer:DEBUG", false)) {
			// don't actually mail, instead just log it to console and file
			jrdebug.debug("Config flag mailer:DEBUG set, so mail to [" + mailobj.to + "] not actually sent (sending mail to debug log instead).");
			arserver.logm("debug.mailer", "mailer:DEBUG option preventing mail from being sent", null, mailobj);
			return JrResult.makeSuccess();
		}

		var result = await this.mailTransport.sendMail(mailobj);
		jrdebug.cdebugObj(result, "Result from sendMail.");

		var jrResult = this.makeJrResultFromSendmailRetv(result, mailobj);
		return jrResult;
	}
	//---------------------------------------------------------------------------










}


// export the class as the sole export
module.exports = new SendAid();
