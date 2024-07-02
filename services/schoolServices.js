const fs = require("fs");
const dynamoDbCon = require('../awsConfig');  
const schoolRepository = require("../repository/schoolRepository");  
const classRepository = require("../repository/classRepository");  
const constant = require('../constants/constant');
const helper = require('../helper/helper');

