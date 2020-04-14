/**
 * @module models/subscription
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 12/1/19
 * @description
 * The database object that keeps track of subscriptions for users to be notified about things
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
	static getSchemaDefinition() {
		return {
			...(this.getBaseSchemaDefinition()),
			userId: {
				type: mongoose.Schema.ObjectId,
				required: true,
			},
			key: {
				type: String,
			},
			val: {
				type: String,
			},
		};
	}

	static getSchemaDefinitionExtra() {
		return {
			...(this.getBaseSchemaDefinitionExtra()),
			userId: {
				label: "User",
				readOnly: ["edit"],
				valueFunction: this.makeModelValueFunctionObjectId(UserModel),
			},
			key: {
				label: "Key",
			},
			val: {
				label: "Value",
			},
		};
	}
	//---------------------------------------------------------------------------


}


// export the class as the sole export
module.exports = SubscriptionModel;