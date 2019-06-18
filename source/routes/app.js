// approom
// app route
// v1.0.0 on 6/4/19 by mouser@donationcoder.com
//

"use strict";


// modules
const express = require("express");

// helpers
const CrudAid = require("../controllers/crudaid");

// models
const AppModel = require("../models/app");

// init
const router = express.Router();




// setup crud handler
CrudAid.setupRouter(router, AppModel, "/app");












// exports
module.exports = router;
