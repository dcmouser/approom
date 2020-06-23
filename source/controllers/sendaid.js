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
const assert = require("assert");

// mail
const nodemailer = require("nodemailer");

// requirement service locator
const jrequire = require("../helpers/jrequire");


// helpers
const jrdebug = require("../helpers/jrdebug");
const JrResult = require("../helpers/jrresult");
const jrhMisc = require("../helpers/jrh_misc");
const jrlog = require("../helpers/jrlog");


// controllers
const arserver = jrequire("arserver");

// constants
const appdef = jrequire("appdef");






/**
 * Provides support functions for sending emails/sms/etc.
 *
 * @class SendAid
 */

class SendAid {


	//---------------------------------------------------------------------------
	async setupMailer(mailTransportConfigObj, defaultFrom, flagDebugMode) {
		// setup the mailer system
		// see https://nodemailer.com/about/
		// see https://medium.com/@SeanChenU/send-mail-using-node-js-with-nodemailer-in-2-mins-c3f3e23f4a1
		this.mailTransport = nodemailer.createTransport(mailTransportConfigObj);
		this.defaultFrom = defaultFrom;
		this.flagDebugMode = flagDebugMode;

		assert(defaultFrom);

		jrdebug.cdebugf("misc", "Setting up mail transport through %s.", mailTransportConfigObj.host);

		// verify it?
		if (jrdebug.getDebugTagEnabled("mail")) {
			await this.getMailTransport().verify();
		}
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	getMailTransport() {
		// return previously created transport
		return this.mailTransport;
	}


	addSendmailRetvToContext(jrContext, sendMailResult, mailobj) {
		let msg;
		if (sendMailResult.rejected.length === 0) {
			// success!
			if (mailobj.revealEmail) {
				msg = "Mail sent to " + jrhMisc.stringArrayToNiceString(sendMailResult.accepted) + ".";
			} else {
				msg = "Mail sent.";
			}
			jrContext.pushSuccess(msg);
			return;
		}

		// error
		if (mailobj.revealEmail) {
			msg = "Failed to send email to " + jrhMisc.stringArrayToNiceString(sendMailResult.rejected) + ".";
		} else {
			msg = "Failed to send email.";
		}
		jrContext.pushError(msg);
	}
	//---------------------------------------------------------------------------





	//---------------------------------------------------------------------------
	/**
	 * Send a message to a recipient
	 * The mechanism is usually email, but could be sms, etc. based on recipient object
	 *
	 * @param {JrContext} jrContext
	 * @param {object} recipient
	 * @param {string} subject
	 * @param {string} message
	 * @param {object} extraData
	 * @param {boolean} flagBypassRateLimitChecks
	 */
	async sendMessage(jrContext, recipient, subject, message, extraData, flagBypassRateLimitChecks) {
		if (!flagBypassRateLimitChecks) {
			// ATTN: TODO: Add rate limiting checks here? Or should we do this separately in sendmail, etc.
		}

		// add extra data
		if (!jrhMisc.isObjectEmpty(extraData)) {
			// pretty print extra data into message
			message += "\n" + jrhMisc.objToString(extraData, false);
		}

		if (recipient.email) {
			// there's an email address
			const mailobj = {
				revealEmail: true,
				subject,
				text: message,
				to: recipient.email,
			};
			await this.sendMail(jrContext, mailobj);
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
	async sendMail(jrContext, mailobj) {
		// add from field
		if (!mailobj.from) {
			mailobj.from = this.defaultFrom;
		}

		if (this.flagDebugMode) {
			// don't actually mail, instead just log it to console and file
			jrdebug.debug("Config flag mailer:DEBUG set, so mail with subject \"" + mailobj.subject + "\" to \"" + mailobj.to + "\" not actually sent (sending mail to debug log instead).");
			await arserver.logr(jrContext, appdef.DefLogTypeDebug + ".mailer", "mailer:DEBUG option preventing mail from being sent", mailobj);
			jrContext.pushSuccess("Mail sent (but only to log because of mail debug flag).");
			return;
		}

		const sendMailResult = await this.mailTransport.sendMail(mailobj);
		jrdebug.cdebugObj("misc", sendMailResult, "Result from sendMail.");

		// convert sendmail response to our internal result format of success or error
		this.addSendmailRetvToContext(jrContext, sendMailResult, mailobj);
	}
	//---------------------------------------------------------------------------










}


// export the class as the sole export
module.exports = new SendAid();
