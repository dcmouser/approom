// approom
// logout route
// v1.0.0 on 5/1/19 by mouser@donationcoder.com
//

"use strict";


// modules
const express = require("express");



const router = express.Router();

router.get("/", function(req, res, next) {
	// logout the user from passport
	req.logout();
	// now render the logout page or redirect
	res.render("account/logout", {});
	// res.redirect("/");
});





module.exports = router;
