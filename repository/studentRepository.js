const dynamoDbCon = require('../awsConfig');
const { TABLE_NAMES } = require('../constants/tables');
const indexName = require('../constants/indexes');
const { DATABASE_TABLE } = require('./baseRepository');
const baseRepositoryNew = require('./baseRepositoryNew');
const { successResponse } = require('./baseRepository');
const helper = require('../helper/helper');
const constant = require('../constants/constant');


exports.getStudentsData = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Database Error : Fetch All Active Students");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {

            let docClient = dynamoDBCall;

            let read_params = {
                TableName: TABLE_NAMES.upschool_student_info,
                IndexName: indexName.Indexes.common_id_index,
                KeyConditionExpression: "common_id = :common_id",
                FilterExpression: "user_status = :user_status AND section_id = :section_id",
                ExpressionAttributeValues: {
                    ":common_id": constant.constValues.common_id,
                    ":user_status": "Active",
                    ":section_id": request.data.section_id
                }
            }

            DATABASE_TABLE.queryRecord(docClient, read_params, callback);

        }
    });
}
exports.getStudentsData2 = async (request) => {
    let params = {
        TableName: TABLE_NAMES.upschool_student_info,
        IndexName: indexName.Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: "user_status = :user_status AND section_id = :section_id",
        ExpressionAttributeValues: {
            ":common_id": constant.constValues.common_id,
            ":user_status": "Active",
            ":section_id": request.data.section_id
        }
    };

    return await baseRepositoryNew.DATABASE_TABLE2.query(params);
}

exports.getStudentsData2 = async (request) => {
        const params = {
            TableName: TABLE_NAMES.upschool_student_info,
            IndexName: indexName.Indexes.common_id_index,
            KeyConditionExpression: "common_id = :common_id",
            FilterExpression: "user_status = :user_status AND section_id = :section_id",
            ExpressionAttributeValues: {
                ":common_id": constant.constValues.common_id,
                ":user_status": "Active",
                ":section_id": request.data.section_id
            }
        };

        return await baseRepositoryNew.DATABASE_TABLE2.query(params); 
};

exports.fetchStudentDataByRollNoClassSection = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Database Error : Fetch Individual Students");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {

            let docClient = dynamoDBCall;

            let read_params = {
                TableName: TABLE_NAMES.upschool_student_info,
                IndexName: indexName.Indexes.common_id_index,
                KeyConditionExpression: "common_id = :common_id",
                FilterExpression: "class_id = :class_id AND section_id = :section_id AND roll_no = :roll_no",
                ExpressionAttributeValues: {
                    ":common_id": constant.constValues.common_id,
                    ":class_id": request.data.client_class_id,
                    ":section_id": request.data.section_id,
                    ":roll_no": request.data.roll_no
                }
            }

            DATABASE_TABLE.queryRecord(docClient, read_params, callback);

        }
    });
}

exports.getAllStudents = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Database Error : Fetch All Active Students");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {

            let docClient = dynamoDBCall;

            let read_params = {
                TableName: TABLE_NAMES.upschool_student_info,
                IndexName: indexName.Indexes.common_id_index,
                KeyConditionExpression: "common_id = :common_id",
                FilterExpression: "user_status = :user_status AND student_id = :student_id",
                ExpressionAttributeValues: {
                    ":common_id": constant.constValues.common_id,
                    ":user_status": "Active",
                    ":student_id": request,

                }
            }

            DATABASE_TABLE.queryRecord(docClient, read_params, callback);

        }
    });
}



