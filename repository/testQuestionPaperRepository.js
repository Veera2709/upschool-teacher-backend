const dynamoDbCon = require('../awsConfig');
const { TABLE_NAMES } = require('../constants/tables');
const indexName = require('../constants/indexes');
const { DATABASE_TABLE } = require('./baseRepository');
const helper = require('../helper/helper');
const constant = require('../constants/constant');
const baseRepositoryNew = require('./baseRepositoryNew');

exports.getTestQuestionPapersBasedonStatus = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("DB ERROR : TEACHING ACTIVITY");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {

            let docClient = dynamoDBCall;

            let filterExpression = "client_class_id = :client_class_id AND section_id = :section_id AND subject_id = :subject_id AND question_paper_status = :question_paper_status";
            let expressionAttributeValues = {
                ":common_id": constant.constValues.common_id,
                ":client_class_id": request.data.client_class_id,
                ":section_id": request.data.section_id,
                ":subject_id": request.data.subject_id,
                ":question_paper_status": request.data.question_paper_status
            };

            if (request.data.blueprint_type) {
                filterExpression += " AND blueprint_type = :blueprint_type";
                expressionAttributeValues[":blueprint_type"] = request.data.blueprint_type;
            }

            let read_params = {
                TableName: TABLE_NAMES.upschool_test_question_paper,
                IndexName: indexName.Indexes.common_id_index,
                KeyConditionExpression: "common_id = :common_id",
                FilterExpression: filterExpression,
                ExpressionAttributeValues: expressionAttributeValues,
                ProjectionExpression: ["question_paper_id", "question_paper_name", "blueprint_id"]
            };

            DATABASE_TABLE.queryRecord(docClient, read_params, callback);
        }
    });
};

exports.getTestQuestionPapersBasedonStatus2 = async (request) => {
    const params = {
        TableName: TABLE_NAMES.upschool_test_question_paper,
        IndexName: indexName.Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: "client_class_id = :client_class_id AND section_id = :section_id AND subject_id = :subject_id AND question_paper_status = :question_paper_status",
        ExpressionAttributeValues: {
            ":common_id": constant.constValues.common_id,
            ":client_class_id": request.data.client_class_id,
            ":section_id": request.data.section_id,
            ":subject_id": request.data.subject_id,
            ":question_paper_status": request.data.question_paper_status
        },
        ProjectionExpression: "question_paper_id, question_paper_name, blueprint_id"
    };

    const data = await baseRepositoryNew.DATABASE_TABLE2.query(params);
    return data.Items;
};

exports.fetchTestQuestionPaperbyName = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Group Data Database Error");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR)
        } else {
            let docClient = dynamoDBCall;

            let read_params = {
                TableName: TABLE_NAMES.upschool_test_question_paper,

                IndexName: indexName.Indexes.common_id_index,
                KeyConditionExpression: "common_id = :common_id",
                FilterExpression: "lc_question_paper_name = :lc_question_paper_name",
                ExpressionAttributeValues: {
                    ":lc_question_paper_name": request.data.question_paper_name.toLowerCase().replace(/ /g, ''),
                    ":common_id": constant.constValues.common_id,
                }
            }

            DATABASE_TABLE.queryRecord(docClient, read_params, callback);
        }
    });
}

exports.insertTestQuestionPaper = function (request, callback) {

    console.log("request : ", request);
    dynamoDbCon.getDB(async function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log(constant.messages.DATABASE_ERROR);
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR)
        } else {
            let docClient = dynamoDBCall;

            let insert_question_paper_params = {
                TableName: TABLE_NAMES.upschool_test_question_paper,
                Item: {
                    "question_paper_id": await helper.getRandomString(),
                    "blueprint_id": request.data.blueprint_id,
                    "client_class_id": request.data.client_class_id,
                    "subject_id": request.data.subject_id,
                    "section_id": request.data.section_id,
                    "source_id": request.data.source_id,
                    "lc_question_paper_name": request.data.question_paper_name.toLowerCase().replace(/ /g, ''),
                    "question_paper_name": request.data.question_paper_name,
                    "question_paper_status": "Active",
                    "chapter_id": request.data.chapter_id,
                    "questions": request.data.questions,
                    "common_id": constant.constValues.common_id,
                    "created_ts": helper.getCurrentTimestamp(),
                    "updated_ts": helper.getCurrentTimestamp(),
                    "blueprint_type" : request.data.blueprint_type,
                },
            }
            DATABASE_TABLE.putRecord(docClient, insert_question_paper_params, callback);
        }
    });
}

exports.fetchTestQuestionPaperByID = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log(constant.messages.DATABASE_ERROR);
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR)
        } else {
            let docClient = dynamoDBCall;

            let read_params = {
                TableName: TABLE_NAMES.upschool_test_question_paper,
                KeyConditionExpression: "question_paper_id = :question_paper_id",
                ExpressionAttributeValues: {
                    ":question_paper_id": request.data.question_paper_id
                }
            }
            DATABASE_TABLE.queryRecord(docClient, read_params, callback);
        }
    });
}
exports.fetchTestQuestionPaperByID2 = async (request) => {
    let params = {
        TableName: TABLE_NAMES.upschool_test_question_paper,
        KeyConditionExpression: "question_paper_id = :question_paper_id",
        ExpressionAttributeValues: {
            ":question_paper_id": request.data.question_paper_id
        }

    };
    console.log(params);
    const data = await baseRepositoryNew.DATABASE_TABLE2.query(params);
    return data;
}

exports.getTestQuestionPaperById = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log(constant.messages.DATABASE_ERROR);
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR)
        } else {

            let docClient = dynamoDBCall;

            let read_params = {
                TableName: TABLE_NAMES.upschool_test_question_paper,
                KeyConditionExpression: "question_paper_id = :question_paper_id",
                ExpressionAttributeValues: {
                    ":question_paper_id": request.data.question_paper_id
                }
            }

            DATABASE_TABLE.queryRecord(docClient, read_params, callback);
        }
    });
}

exports.getClassTestsBasedonIds = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("getClassTestsBasedonIds Database Error");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR)
        } else {

            let docClient = dynamoDBCall;

            let read_params = {
                TableName: TABLE_NAMES.upschool_class_test_table,
                IndexName: indexName.Indexes.common_id_index,
                KeyConditionExpression: "common_id = :common_id",
                FilterExpression: "class_test_status = :class_test_status AND question_paper_id = :question_paper_id",
                ExpressionAttributeValues: {
                    ":common_id": constant.constValues.common_id,
                    ":class_test_status": "Active",
                    ":question_paper_id": request.data.question_paper_id,
                },
                ProjectionExpression: ["class_test_name", "question_paper_id"],
            }
            DATABASE_TABLE.queryRecord(docClient, read_params, callback);
        }
    });
}

exports.updateQuestionPaperStatus = function (request, callback) {
    console.log("updateQuestionPaperStatus", request);

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("updateQuestionPaperStatus Database Error");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR)
        } else {

            let docClient = dynamoDBCall;
            let updated_params = {
                TableName: TABLE_NAMES.upschool_test_question_paper,
                Key: { "question_paper_id": request.data.question_paper_id },
                UpdateExpression: "set question_paper_status = :question_paper_status, updated_ts = :updated_ts",
                ExpressionAttributeValues: {
                    ":question_paper_status": request.data.question_paper_status,
                    ":updated_ts": helper.getCurrentTimestamp()
                },
            }
            DATABASE_TABLE.updateRecord(docClient, updated_params, callback);
        }
    });
}
