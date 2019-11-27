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
exports.DefLogTypeError404 = exports.DefLogTypeError + ".404";
//
exports.DefLogTypeErrorCritical = "errorCrit";
exports.DefLogTypeErrorCriticalDb = exports.DefLogTypeErrorCritical + ".db";
exports.DefLogTypeErrorCriticalAcl = exports.DefLogTypeErrorCritical + ".acl";
//
exports.DefLogTypeAdmin = "admin";
exports.DefLogTypeDebug = "debug";
//---------------------------------------------------------------------------








//---------------------------------------------------------------------------
// acl constants

// roles
exports.DefAclRoleOwner = "owner";
exports.DefAclRoleModerator = "moderator";
exports.DefAclRoleFriend = "friend";
exports.DefAclRoleNone = "none";
exports.DefAclRoleGlobalMod = "globalmod";
exports.DefAclRoleSiteAdmin = "siteadmin";
exports.DefAclRoleVisitor = "visitor";

// object types (usually model classes)
exports.DefAclObjectTypeSite = "site";

// actions
exports.DefAclActionAdmin = "admin";
//
exports.DefAclActionAdd = "add";
exports.DefAclActionEdit = "edit";
exports.DefAclActionList = "list";
exports.DefAclActionView = "view";
exports.DefAclActionDelete = "delete";
exports.DefAclActionStats = "stats";
//
exports.DefAclActionAnalytics = "analytics";
//---------------------------------------------------------------------------



