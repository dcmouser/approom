/**
 * @module controllers/appdef
 * @author jesse reichler <mouser@donationcoder.com>
 * @copyright 11/26/19
 * @description
 * This module defines some define constants, that we used to have in arserver, aclaid, etc., but the class definition makes accessing module globals from other modules difficult, so we move it all here
 */


"use strict";



//---------------------------------------------------------------------------
// LIBRARY INFO
exports.DefLibName = "AppRoomLib";
exports.DefLibVersion = "1.0.10";
exports.DefLibVersionDate = "5/1/19-5/12/20";
exports.DefLibAuthor = "mouser@donationcoder.com";
exports.DefLibDescription = "multi-user room-based coordination framework (mewlo2)";
exports.DefApiVersion = "1.0";
//---------------------------------------------------------------------------



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
exports.DefDebugbKeyName = "approom";
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
// ATTN: we no longer use this, we use NULL for objectId when we mean ALL
exports.DefAclObjectIdAll = null;

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
exports.DefAclActionEnable = "enable";
exports.DefAclActionDisable = "disable";
exports.DefAclActionStats = "stats";
//
exports.DefAclActionSeeVdeletes = "seeVDel";
//
exports.DefAclActionAnalytics = "analytics";
//
exports.DefAclActionAddOwner = "add.owner";
exports.DefAclActionRemoveOwner = "delete.owner";
exports.DefAclActionAddModerator = "add.moderator";
exports.DefAclActionRemoveModerator = "delete.moderator";
exports.DefAclActionAddMember = "add.member";
exports.DefAclActionRemoveMember = "delete.member";
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
// this is used in jrh_grid to build a drop down gui for bulk operations on crud amin grid
exports.DefShowStateModeLabels = {
	onlyEnabled: "Only enabled",
	enabledDisabled: "Enabled/Disabled",
	onlyDisabled: "Only disabled",
	onlyDeleted: "Only deleted",
	all: "All (enabled, disabled, deleted)",
};
//---------------------------------------------------------------------------



//---------------------------------------------------------------------------
// rate limiter stuff
exports.DefRateLimiterBasic = "basic";
exports.DefRateLimiterApi = "api";
exports.DefRateLimiterEmergencyAlert = "emergencyAlert";
exports.DefRateLimiterTest = "test";
//---------------------------------------------------------------------------




//---------------------------------------------------------------------------
// config option strings

exports.DefConfigKeyDbBaseUrl = "database:BASE_URL";
exports.DefConfigKeyDbName = "database:DB_NAME";

exports.DefConfigKeyTestingForceCsrfFail = "testing:FORCE_CSRF_FAIL";
exports.DefConfigKeyLoggingDirectory = "logging:DIRECTORY";
//
exports.DefConfigKeyServerDbUrl = "server:DB_URL";
exports.DefConfigKeyServerHttp = "server:HTTP";
exports.DefConfigKeyServerHttpPort = "server:HTTP_PORT";
exports.DefConfigKeyServerHttps = "server:HTTPS";
exports.DefConfigKeyServerHttpsKey = "server:HTTPS_KEY";
exports.DefConfigKeyServerHttpsCert = "server:HTTPS_CERT";
exports.DefConfigKeyServerHttpsPort = "server:HTTPS_PORT";
exports.DefConfigKeyServerSiteDomain = "server:SITE_DOMAIN";
//
exports.DefConfigKeyDebugTags = "DEBUGTAGS";
exports.DefConfigKeyProfile = "PROFILE";
//
exports.DefConfigKeyAccountSignupFullRegForm = "account:SIGNUP_FULLREGISTRATIONFORM";
exports.DefConfigKeyAccountGravatarOptions = "account:GRAVATAR_OPTIONS";
//
exports.DefConfigKeyEmergencyAlertPrimaryEmails = "emergencyAlert:primary";
exports.DefConfigKeyEmergencyAlertSecondaryEmails = "emergencyAlert:secondary";
//
exports.DefConfigKeyMailerDebug = "mailer:DEBUG";
exports.DefConfigKeyMailerHost = "mailer:HOST";
exports.DefConfigKeyMailerPort = "mailer:PORT";
exports.DefConfigKeyMailerSecure = "mailer:SECURE";
exports.DefConfigKeyMailerUsername = "mailer:USERNAME";
exports.DefConfigKeyMailerPassword = "mailer:PASSWORD";
exports.DefConfigKeyMailerFrom = "mailer:FROM";
//
exports.DefConfigKeySessionIdName = "session:SESSIONIDNAME";
exports.DefConfigKeySessionSecret = "session:SESSIONSECRET";
//
exports.DefConfigKeyTokenCryptoKey = "token:CRYPTOKEY";
exports.DefConfigKeyTokenIssuer = "token:ISSUER";
exports.DefConfigKeyTokenExpirationSecsRefresh = "token:EXPIRATIONSECS_REFRESH";
exports.DefConfigKeyTokenExpirationSecsAccess = "token:EXPIRATIONSECS_ACCESS";
//
exports.DefConfigKeyCrypto = "crypto:VERIFICATIONCODESALT";
//
exports.DefConfigKeyPassportFacebookAppId = "passport:FACEBOOK_APP_ID";
exports.DefConfigKeyPassportFacebookAppSecret = "passport:FACEBOOK_APP_SECRET";
exports.DefConfigKeyPassportTwitterConsumerKey = "passport:TWITTER_consumerKey";
exports.DefConfigKeyPassportTwitterConsumerSecret = "passport:TWITTER_consumerSecret";
exports.DefConfigKeyPassportGoogleClientId = "passport:GOOGLE_clientid";
exports.DefConfigKeyPassportGoogleClientSecret = "passport:GOOGLE_secret";
//
exports.DefConfigKeyNodeEnv = "NODE_ENV";
//
exports.DefConfigKeyTestingClientUsernameEmail = "testing:CLIENT_USERNAMEEMAIL";
exports.DefConfigKeyTestingClientPassword = "testing:CLIENT_USERPASSWORD";
//
exports.DefConfigKeyLogFileBaseName = "logging:FILENAME_BASE";
exports.DefConfigLoggingAnnouncement = "logging:ANNOUNCEMENT";
//
exports.DefConfigKeyExitOnFatalError = "general:EXIT_ON_FATAL_ERROR";
//
exports.DefConfigKeySetupUserArray = "setup:users";
//
exports.DefConfigKeyLastAccessUpdateFrequencyMs = "general:LAST_ACCESS_UPDATE_FREQUENCY_MS";
//
exports.DefConfigKeyCollections = {
	plugins: "plugins",
	appFrameworks: "appFrameworks",
};
//---------------------------------------------------------------------------


