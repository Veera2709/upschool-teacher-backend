const dynamoDbCon = require('../awsConfig');
const { TABLE_NAMES } = require('../constants/tables');
const indexName = require('../constants/indexes');
const { DATABASE_TABLE } = require('./baseRepository');
const helper = require('../helper/helper');
const constant = require('../constants/constant');

exports.getSchoolDetailsById = function (request, callback) {
    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("School Data Database Error");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR)
        } else {

            let docClient = dynamoDBCall;

            let read_params = {
                TableName: TABLE_NAMES.upschool_school_info_table,
                KeyConditionExpression: "school_id = :school_id",
                ExpressionAttributeValues: {
                    ":school_id": request.data.school_id
                }
            }

            DATABASE_TABLE.queryRecord(docClient, read_params, callback);

        }
    });
}
