const dynamoDbCon = require('../awsConfig');
const { TABLE_NAMES } = require('../constants/tables');
const indexName = require('../constants/indexes');
const { DATABASE_TABLE } = require('./baseRepository');
const helper = require('../helper/helper');
const constant = require('../constants/constant');

exports.checkDuplicateAdminEmail = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Teacher/Admin Data Database Error");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR)
        } else {

            let docClient = dynamoDBCall;

            let read_params = {
                TableName: TABLE_NAMES.upschool_teacher_info,
                IndexName: indexName.Indexes.common_id_index,
                KeyConditionExpression: "common_id = :common_id",
                FilterExpression: "user_email = :user_email",
                ExpressionAttributeValues: {
                    ":common_id": constant.constValues.common_id,
                    ":user_email": request.data.school_admin_email
                }
            }
            DATABASE_TABLE.queryRecord(docClient, read_params, callback);
        }
    });
}

exports.insertSchoolAdmin = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("DB ERROR : Insert School Admin");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR)
        } else {

            let docClient = dynamoDBCall;

            let insert_school_admin_params = {
                TableName: TABLE_NAMES.upschool_teacher_info,
                Item: {
                    "teacher_id": helper.getRandomString(),
                    "school_id": request.data.school_id.toString(),
                    "user_email": request.data.school_admin_email.toLowerCase(),
                    "user_role": "SchoolAdmin",
                    "user_status": "Active",
                    "common_id": constant.constValues.common_id,
                    "created_ts": helper.getCurrentTimestamp(),
                    "updated_ts": helper.getCurrentTimestamp()
                }
            }
            DATABASE_TABLE.putRecord(docClient, insert_school_admin_params, callback);
        }
    });
}

exports.updateSchoolAdmin = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("DB ERROR : Update Teacher");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR)
        } else {

            let docClient = dynamoDBCall;

            let update_params = {
                TableName: TABLE_NAMES.upschool_teacher_info,
                Key: {
                    "teacher_id": request.data.school_admin_id
                },
                UpdateExpression: "set user_email = :user_email, updated_ts = :updated_ts",
                ExpressionAttributeValues: {
                    ":user_email": request.data.school_admin_email.toLowerCase(),
                    ":updated_ts": helper.getCurrentTimestamp()
                },
            };

            DATABASE_TABLE.updateRecord(docClient, update_params, callback);

        }
    });
}