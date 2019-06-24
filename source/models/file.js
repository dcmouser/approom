// approom
// file model
// v1.0.0 on 5/1/19 by mouser@donationcoder.com
//
// The File model helps us track data files that are created by users/apps within the system
//  a File model object represents meta information for an actual filesystem file

"use strict";

// models
const ModelBaseMongoose = require("./modelBaseMongoose");



class FileModel extends ModelBaseMongoose {

	//---------------------------------------------------------------------------
	// global static version info
	static getVersion() { return 1; }

	// collection name for this model
	static getCollectionName() {
		return "files";
	}

	static getNiceName() {
		return "File";
	}
	//---------------------------------------------------------------------------


	//---------------------------------------------------------------------------
	static getSchemaDefinition() {
		return {
			...(this.getBaseSchemaDefinition()),
			path: {
				type: String,
				required: true,
			},
			label: {
				type: String,
			},
			sizeInBytes: {
				type: Number,
			},
		};
	}

	static getSchemaDefinitionExtra() {
		return {
			...(this.getBaseSchemaDefinitionExtra()),
			path: {
				label: "Path",
			},
			label: {
				label: "Label",
			},
			sizeInBytes: {
				label: "Size in bytes",
			},
		};
	}
	//---------------------------------------------------------------------------

}


// export the class as the sole export
module.exports = FileModel;
