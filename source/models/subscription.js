/**
 * @module models/subscription
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 12/1/19
 * @description
 * The database object that keeps track of subscriptions for users to be notified about things
 * ATTN: THIS CLASS IS NOT USED YET (5/8/20); it is included only as a placeholder to remind us to add this functionality later
 */

"use strict";

// modules
const mongoose = require("mongoose");


// requirement service locator
const jrequire = require("../helpers/jrequire");

// models
const ModelBaseMongoose = jrequire("models/model_base_mongoose");
const UserModel = jrequire("models/user");


/**
 * The database object that keeps track of subscriptions for users to be notified about things
 *
 * @class SubscriptionModel
 * @extends {ModelBaseMongoose}
 */
class SubscriptionModel extends ModelBaseMongoose {

	//---------------------------------------------------------------------------
	getModelClass() {
		// subclass overriding function that returns class instance (each subclass MUST implement this)
		return SubscriptionModel;
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	// global static version info
	static getVersion() { return 1; }

	// collection name for this model
	static getCollectionName() {
		return "subscriptions";
	}

	static getNiceName() {
		return "Subscription";
	}

	// name for acl lookup
	static getAclName() {
		return "subscription";
	}

	// name for logging
	static getLoggingString() {
		return "Subscription";
	}
	//---------------------------------------------------------------------------



	//---------------------------------------------------------------------------
	static calcSchemaDefinition() {
		return {
			...(this.getBaseSchemaDefinition()),
			//
			userId: {
				label: "User",
				readOnly: true,
				valueFunction: this.makeModelValueFunctionObjectId(UserModel),
				mongoose: {
					type: mongoose.Schema.ObjectId,
					required: true,
				},
			},
			key: {
				label: "Key",
				mongoose: {
					type: String,
				},
			},
			val: {
				label: "Value",
				mongoose: {
					type: String,
				},
			},
		};
	}
	//---------------------------------------------------------------------------


}


// export the class as the sole export
module.exports = SubscriptionModel;
