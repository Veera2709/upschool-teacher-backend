const fs = require("fs");
const dynamoDbCon = require('../awsConfig');  
const unitRepository = require("../repository/unitRepository");  
const subjectRepository = require("../repository/subjectRepository");  
const commonServices = require("../services/commonServices");
const constant = require('../constants/constant');
const helper = require('../helper/helper');
const { nextTick } = require("process");

