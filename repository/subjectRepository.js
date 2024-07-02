const dynamoDbCon = require('../awsConfig');
const { TABLE_NAMES } = require('../constants/tables');
const indexName = require('../constants/indexes');
const { DATABASE_TABLE } = require('./baseRepository');
const helper = require('../helper/helper');
const constant = require('../constants/constant');

exports.getSubjetById = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Subject Database Error");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {

            let docClient = dynamoDBCall;

            let read_params = {
                TableName: TABLE_NAMES.upschool_subject_table,
                KeyConditionExpression: "subject_id = :subject_id",
                ExpressionAttributeValues: {
                    ":subject_id": request.data.subject_id
                }
            }

            DATABASE_TABLE.queryRecord(docClient, read_params, callback);
        }
    });
}
exports.getSubjetByIdAndName = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Subject Database Error");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {

            let docClient = dynamoDBCall;

            let read_params = {
                TableName: TABLE_NAMES.upschool_subject_table,
                KeyConditionExpression: "subject_id = :subject_id",
                ExpressionAttributeValues: {
                    ":subject_id": request.data.subject_id
                }, 
                ProjectionExpression: ["subject_id", "subject_title"],  

            }

            DATABASE_TABLE.queryRecord(docClient, read_params, callback);
        }
    });
}