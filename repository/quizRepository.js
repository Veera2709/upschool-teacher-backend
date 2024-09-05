const dynamoDbCon = require('../awsConfig');
const { TABLE_NAMES } = require('../constants/tables');
const indexName = require('../constants/indexes');
const { DATABASE_TABLE } = require('./baseRepository');
const baseRepositoryNew = require('./baseRepositoryNew');
const helper = require('../helper/helper');
const constant = require('../constants/constant');

exports.fetchQuizData = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("DB ERROR : QUIZ TABLE");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {

            let docClient = dynamoDBCall;

            let read_params = {
                TableName: TABLE_NAMES.upschool_quiz_table,
                IndexName: indexName.Indexes.common_id_index,
                KeyConditionExpression: "common_id = :common_id",
                FilterExpression: "client_class_id = :client_class_id AND section_id = :section_id AND subject_id = :subject_id AND quiz_status = :quiz_status AND chapter_id = :chapter_id AND learningType = :learningType",
                ExpressionAttributeValues: {
                    ":common_id": constant.constValues.common_id,
                    ":client_class_id": request.data.client_class_id,
                    ":section_id": request.data.section_id,
                    ":subject_id": request.data.subject_id,
                    ":chapter_id": request.data.chapter_id,
                    ":learningType": request.data.learningType,
                    ":quiz_status": "Active"
                }
            }

            DATABASE_TABLE.queryRecord(docClient, read_params, callback);
        }
    });
}

exports.addQuiz = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("DB ERROR : QUIZ TABLE");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {

            let docClient = dynamoDBCall;

            let insert_standard_params = {
                TableName: TABLE_NAMES.upschool_quiz_table,
                Item: {
                    "quiz_id": request.data.quiz_id,
                    "quiz_name": request.data.quiz_name,
                    "lc_quiz_name": request.data.quiz_name.toLowerCase().replace(/ /g, ''),
                    "client_class_id": request.data.client_class_id,
                    "section_id": request.data.section_id,
                    "subject_id": request.data.subject_id,
                    "chapter_id": request.data.chapter_id,
                    "quizMode": request.data.quizMode,
                    "quizType": request.data.quizType,
                    "quizStartDate": { yyyy_mm_dd: request.data.quizStartDate, dd_mm_yyyy: helper.change_dd_mm_yyyy(request.data.quizStartDate) },
                    "quizEndDate": { yyyy_mm_dd: request.data.quizEndDate, dd_mm_yyyy: helper.change_dd_mm_yyyy(request.data.quizEndDate) },
                    "quizStartTime": request.data.quizStartTime,
                    "quizEndTime": request.data.quizEndTime,
                    "noOfQuestionsForAuto": request.data.noOfQuestionsForAuto,
                    "selectedTopics": request.data.selectedTopics,
                    "varient": request.data.varient,
                    "learningType": request.data.learningType,
                    "quiz_question_details": request.data.quiz_question_details,
                    "quiz_duration": request.data.quiz_duration,
                    "quiz_status": "Active",
                    "question_track_details": request.data.question_track_details,
                    "not_considered_topics": request.data.not_considered_topics,
                    "common_id": constant.constValues.common_id,
                    "created_ts": helper.getCurrentTimestamp(),
                    "updated_ts": helper.getCurrentTimestamp(),
                }
            }

            DATABASE_TABLE.putRecord(docClient, insert_standard_params, callback);
        }
    });
}

exports.checkDuplicateQuizName = function (request, callback) {
    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("DB ERROR : QUIZ TABLE");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        }
        else {

            let docClient = dynamoDBCall;

            let read_params = {
                TableName: TABLE_NAMES.upschool_quiz_table,
                IndexName: indexName.Indexes.common_id_index,
                KeyConditionExpression: "common_id = :common_id",
                FilterExpression: "chapter_id = :chapter_id AND client_class_id = :client_class_id AND section_id = :section_id AND subject_id = :subject_id AND  learningType = :learningType AND lc_quiz_name = :lc_quiz_name",
                ExpressionAttributeValues: {
                    ":common_id": constant.constValues.common_id,
                    ":chapter_id": request.data.chapter_id,
                    ":client_class_id": request.data.client_class_id,
                    ":section_id": request.data.section_id,
                    ":subject_id": request.data.subject_id,
                    ":learningType": request.data.learningType,
                    ":lc_quiz_name": request.data.quiz_name.toLowerCase().replace(/ /g, ''),
                }

            }
            DATABASE_TABLE.queryRecord(docClient, read_params, callback);
        }
    })
}

exports.updateQuizTemplateDetails = function (request, callback) {
    dynamoDbCon.getDB(async function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Error : updating class test Status!");
            callback(500, constant.messages.DATABASE_ERROR);
        }
        else {

            let docClient = dynamoDBCall;

            let update_params = {
                TableName: TABLE_NAMES.upschool_quiz_table,
                Key: {
                    "quiz_id": request.data.quiz_id
                },
                UpdateExpression: "SET quiz_template_details = :quiz_template_details, updated_ts = :updated_ts",
                ExpressionAttributeValues: {
                    ":quiz_template_details": request.data.quiz_template_details,
                    ":updated_ts": helper.getCurrentTimestamp()
                }
            }

            await DATABASE_TABLE.updateRecord(docClient, update_params, callback);
        }
    })
}

exports.updateQuizStatus = function (request, callback) {
    dynamoDbCon.getDB(async function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Error : updating Quiz Status!");
            callback(500, constant.messages.DATABASE_ERROR);
        }
        else {

            let docClient = dynamoDBCall;

            let update_params = {
                TableName: TABLE_NAMES.upschool_quiz_table,
                Key: {
                    "quiz_id": request.data.quiz_id
                },
                UpdateExpression: "SET quiz_status = :quiz_status, updated_ts = :updated_ts",
                ExpressionAttributeValues: {
                    ":quiz_status": request.data.quiz_status,
                    ":updated_ts": await helper.getCurrentTimestamp(),
                }
            }
            DATABASE_TABLE.updateRecord(docClient, update_params, callback);
        }
    })
}

exports.getQuizBasedonStatus = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Fetch Quiz Data Database Error");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR)
        } else {

            let docClient = dynamoDBCall;

            let read_params = {
                TableName: TABLE_NAMES.upschool_quiz_table,
                IndexName: indexName.Indexes.common_id_index,
                KeyConditionExpression: "common_id = :common_id",
                FilterExpression: "quiz_status = :quiz_status AND client_class_id = :client_class_id AND section_id = :section_id AND subject_id = :subject_id AND chapter_id = :chapter_id",
                ExpressionAttributeValues: {
                    ":common_id": constant.constValues.common_id,
                    ":client_class_id": request.data.client_class_id,
                    ":section_id": request.data.section_id,
                    ":subject_id": request.data.subject_id,
                    ":chapter_id": request.data.chapter_id,
                    ":quiz_status": request.data.quiz_status
                },
                ProjectionExpression: ["quizMode", "quiz_status", "learningType", "quiz_id", "quiz_name", "chapter_id"],
            }
            DATABASE_TABLE.queryRecord(docClient, read_params, callback);
        }
    });
}

exports.fetchQuizDataById = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Quiz Data Database Error");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {
            let docClient = dynamoDBCall;

            let read_params = {
                TableName: TABLE_NAMES.upschool_quiz_table,
                Key: {
                    "quiz_id": request.data.quiz_id
                }
            }

            DATABASE_TABLE.getRecord(docClient, read_params, callback);
        }
    });
}

exports.fetchQuizDataById2 = async (request) => {
    let params = {
        TableName: TABLE_NAMES.upschool_quiz_table,
        Key: {
            "quiz_id": request.data.quiz_id
        }
    };

    return await baseRepositoryNew.DATABASE_TABLE2.getItem(params);
};

exports.getQuizResult = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Test Result Database Error");
            console.log(DBErr);
            callback(500, constant.messages.QUIZ_RESULT_DATA_DATABASE_ERROR);
        } else {
            let docClient = dynamoDBCall;
            console.log("request : ", request);

            let read_params = {
                TableName: TABLE_NAMES.upschool_quiz_result,
                IndexName: indexName.Indexes.common_id_index,
                KeyConditionExpression: "common_id = :common_id",
                FilterExpression: "quiz_id = :quiz_id AND student_id = :student_id",
                ExpressionAttributeValues: {
                    ":common_id": constant.constValues.common_id,
                    ":quiz_id": request.data.quiz_id,
                    ":student_id": request.data.student_id
                },
                ProjectionExpression: ["answer_metadata", "marks_details", "result_id", "evaluated"]
            }

            DATABASE_TABLE.queryRecord(docClient, read_params, callback);

        }
    });
}
exports.modifyStudentMarks = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log(constant.messages.DATABASE_ERROR);
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR)
        } else {
            let docClient = dynamoDBCall;

            let update_params = {
                TableName: TABLE_NAMES.upschool_quiz_result,
                Key: {
                    "result_id": request.data.result_id
                },
                UpdateExpression: "set marks_details = :marks_details, updated_ts = :updated_ts, isPassed = :isPassed",
                ExpressionAttributeValues: {
                    ":marks_details": request.data.marks_details,
                    ":isPassed": request.data.passStatus,
                    ":updated_ts": helper.getCurrentTimestamp()
                },
            };

            DATABASE_TABLE.updateRecord(docClient, update_params, callback);
        }
    });
}

exports.fetchQuizTemplates = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Quiz Data Database Error");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {
            let docClient = dynamoDBCall;

            let read_params = {
                TableName: TABLE_NAMES.upschool_quiz_table,

                KeyConditionExpression: "quiz_id = :quiz_id",
                FilterExpression: "quiz_status = :quiz_status",
                ExpressionAttributeValues: {
                    ":quiz_id": request.data.quiz_id,
                    ":quiz_status": request.data.quiz_status,
                },
                ProjectionExpression: ["quiz_id", "quiz_name", "quiz_template_details",]
            }

            DATABASE_TABLE.queryRecord(docClient, read_params, callback);
        }
    });
}



exports.checkPreQuiz = function (request, callback) {
    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Quiz Data Database Error");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {
            let docClient = dynamoDBCall;
            console.log("request", request);
            let read_params = {
                TableName: TABLE_NAMES.upschool_quiz_table,
                IndexName: indexName.Indexes.common_id_index,
                KeyConditionExpression: "common_id = :common_id",
                FilterExpression: "subject_id = :subject_id AND section_id = :section_id AND chapter_id = :chapter_id AND client_class_id = :client_class_id AND quiz_status = :quiz_status AND learningType = :learningType",
                ExpressionAttributeValues: {
                    ":common_id": constant.constValues.common_id,
                    ":quiz_status": request.data.quiz_status,
                    ":section_id": request.data.section_id,
                    ":subject_id": request.data.subject_id,
                    ":chapter_id": request.data.chapter_id,
                    ":client_class_id": request.data.client_class_id,
                    ":learningType": request.data.learningType
                }
            }

            DATABASE_TABLE.queryRecord(docClient, read_params, callback);
        }
    });
}


exports.fetchAllQuizBasedonSubject = function (request, callback) {
    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Quiz Data Database Error");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {
            let docClient = dynamoDBCall;
            console.log("request", request);
            let read_params = {
                TableName: TABLE_NAMES.upschool_quiz_table,
                IndexName: indexName.Indexes.common_id_index,
                KeyConditionExpression: "common_id = :common_id",
                FilterExpression: "subject_id = :subject_id AND section_id = :section_id AND client_class_id = :client_class_id AND quiz_status = :quiz_status",
                ExpressionAttributeValues: {
                    ":common_id": constant.constValues.common_id,
                    ":quiz_status": request.data.quiz_status,
                    ":section_id": request.data.section_id,
                    ":subject_id": request.data.subject_id,
                    ":client_class_id": request.data.client_class_id,
                }
            }

            DATABASE_TABLE.queryRecord(docClient, read_params, callback);
        }
    });
}
exports.fetchAllQuizBasedonSubject2 = async (request) => {
    let params = {
        TableName: TABLE_NAMES.upschool_quiz_table,
        IndexName: indexName.Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: "subject_id = :subject_id AND section_id = :section_id AND client_class_id = :client_class_id AND quiz_status = :quiz_status",
        ExpressionAttributeValues: {
            ":common_id": constant.constValues.common_id,
            ":quiz_status": request.data.quiz_status,
            ":section_id": request.data.section_id,
            ":subject_id": request.data.subject_id,
            ":client_class_id": request.data.client_class_id,
        }
    };

    return await baseRepositoryNew.DATABASE_TABLE2.query(params);
}

exports.getAllQuizData = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Test Result Database Error");
            console.log(DBErr);
            callback(500, constant.messages.QUIZ_RESULT_DATA_DATABASE_ERROR);
        } else {
            let docClient = dynamoDBCall;
            console.log("request : ", request);

            let read_params = {
                TableName: TABLE_NAMES.upschool_quiz_result,
                IndexName: indexName.Indexes.common_id_index,
                KeyConditionExpression: "common_id = :common_id",
                FilterExpression: "quiz_id = :quiz_id ",
                ExpressionAttributeValues: {
                    ":common_id": constant.constValues.common_id,
                    ":quiz_id": request.data.quiz_id,
                },
            }

            DATABASE_TABLE.queryRecord(docClient, read_params, callback);

        }
    });
}

