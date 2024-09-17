const fs = require("fs");
const dynamoDbCon = require('../awsConfig');  
const {unitRepository,subjectRepository} = require("../repository")  
const commonServices = require("../services/commonServices");
const constant = require('../constants/constant');
const helper = require('../helper/helper');
const { nextTick } = require("process");

