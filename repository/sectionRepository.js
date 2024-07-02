const dynamoDbCon = require('../awsConfig');
const { TABLE_NAMES } = require('../constants/tables');
const indexName = require('../constants/indexes');
const { DATABASE_TABLE } = require('./baseRepository');
const helper = require('../helper/helper');
const constant = require('../constants/constant');

exports.getSectionIdAndName = function (request, callback) {
    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Section Data Database Error");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR)
        } else {

            let docClient = dynamoDBCall;

            let read_params = {
                TableName: TABLE_NAMES.upschool_section_table,
                KeyConditionExpression: "section_id = :section_id",
                ExpressionAttributeValues: {
                    ":section_id": request.data.section_id
                },
                ProjectionExpression: ["section_id", "section_name"] 
            }

            DATABASE_TABLE.queryRecord(docClient, read_params, callback);

        }
    });
}
exports.getSectionDetailsById = function (request, callback) {
    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Section Data Database Error");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR)
        } else {

            let docClient = dynamoDBCall;

            let read_params = {
                TableName: TABLE_NAMES.upschool_section_table,
                KeyConditionExpression: "section_id = :section_id",
                ExpressionAttributeValues: {
                    ":section_id": request.data.section_id
                }
            }

            DATABASE_TABLE.queryRecord(docClient, read_params, callback);

        }
    });
}
