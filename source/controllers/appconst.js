/**
 * @module controllers/appconst
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 11/26/19
 * @description
 * This module defines some constants, that we used to have in arserver, aclaid, etc., but the class definition makes accessing module globals from other modules difficult, so we move it all here
 */





//---------------------------------------------------------------------------
// text constants
exports.DefRequiredLoginMessage = "You need to log in before you can access the requested page.";
//---------------------------------------------------------------------------







//---------------------------------------------------------------------------
// log constants

// categories
exports.DefLogCategoryError = "error";
exports.DefLogCategoryError404 = "404";
exports.DefLogCategoryDebug = "debug";
exports.DefLogCategory = "";
//
// types
exports.DefLogTypeError = "error";
//
exports.DefLogTypeErrorCritical = "errorCrit";
exports.DefLogTypeErrorCriticalDb = exports.DefLogTypeErrorCritical + ".db";
exports.DefLogTypeErrorCriticalAcl = exports.DefLogTypeErrorCritical + ".acl";
exports.DefLogTypeErrorCriticalException = exports.DefLogTypeErrorCritical + ".exc";
exports.DefLogTypeError404 = exports.DefLogTypeError + ".404";
exports.DefLogTypeErrorServer = exports.DefLogTypeError + ".server";
//
exports.DefLogTypeInfo = "info";
exports.DefLogTypeInfoServer = "info.server";
//
exports.DefLogTypeAdmin = "admin";
exports.DefLogTypeDebug = "debug";
//---------------------------------------------------------------------------








//---------------------------------------------------------------------------
// acl constants

// roles
exports.DefAclRoleSiteAdmin = "siteAdmin";
exports.DefAclRoleGlobalMod = "globalMod";
exports.DefAclRoleModerator = "moderator";
exports.DefAclRoleOwner = "owner";
exports.DefAclRoleMember = "member";
exports.DefAclRoleCreator = "creator"; // may not have any implications for acl but useful
exports.DefAclRoleFriend = "friend";
exports.DefAclRoleVisitor = "visitor";
exports.DefAclRoleNone = "none";

// object types (usually model classes)
exports.DefAclObjectTypeSite = "site";
exports.DefAclObjectTypeApp = "app";
exports.DefAclObjectTypeRoom = "room";

// special objectId meaning all objectid
exports.DefAclObjectIdAll = "ALL";

// actions
exports.DefAclActionAdminister = "administer";
//
exports.DefAclActionAdd = "add";
exports.DefAclActionEdit = "edit";
exports.DefAclActionList = "list";
exports.DefAclActionView = "view";
exports.DefAclActionViewData = "viewData";
exports.DefAclActionAddData = "addData";
exports.DefAclActionDelete = "delete";
exports.DefAclActionPermDelete = "permDelete";
exports.DefAclActionUnDelete = "unDelete";
exports.DefAclActionStats = "stats";
//
exports.DefAclActionSeeVdeletes = "seeVDel";
//
exports.DefAclActionAnalytics = "analytics";
//
exports.DefAclActionAddOwner = "addOwner";
exports.DefAclActionDeleteOwner = "deleteOwner";
exports.DefAclActionAddModerator = "addModerator";
exports.DefAclActionDeleteModerator = "deleteModerator";

//---------------------------------------------------------------------------





//---------------------------------------------------------------------------
// model constants

exports.DefMdbEnable = 0;
exports.DefMdbDisable = 1;
exports.DefMdbVirtDelete = 2;
exports.DefMdbRealDelete = 3;
exports.DefStateModeLabels = {
	[exports.DefMdbEnable]: "enabled",
	[exports.DefMdbDisable]: "disabled",
	[exports.DefMdbVirtDelete]: "vdeleted",
	[exports.DefMdbRealDelete]: "deleted",
};
exports.DefStateModeLabelsEdit = {
	[exports.DefMdbEnable]: "enabled",
	[exports.DefMdbDisable]: "disabled",
	[exports.DefMdbVirtDelete]: "vdeleted",
	// [exports.DefMdbRealDelete]: "deleted",
};
//---------------------------------------------------------------------------



//---------------------------------------------------------------------------
// showing disabled, etc
exports.DefShowStateModeLabels = {
	onlyEnabled: "Only enabled",
	enabledDisabled: "Enabled/Disabled",
	onlyDisabled: "Only disabled",
	onlyDeleted: "Only deleted",
	all: "All (enabled, disabled, deleted)",
};
//---------------------------------------------------------------------------
