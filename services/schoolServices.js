const fs = require("fs");
const dynamoDbCon = require('../awsConfig');  
const {schoolRepository,classRepository} = require("../repository") 
const constant = require('../constants/constant');
const helper = require('../helper/helper');

