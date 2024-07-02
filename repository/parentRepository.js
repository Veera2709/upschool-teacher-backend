const dynamoDbCon = require('../awsConfig');
const { TABLE_NAMES } = require('../constants/tables');
const indexName = require('../constants/indexes');
const { DATABASE_TABLE } = require('./baseRepository');
const { successResponse } = require('./baseRepository');
const helper = require('../helper/helper');
const constant = require('../constants/constant');

