const dynamoDbCon = require('../awsConfig');
const { TABLE_NAMES } = require('../constants/tables');
const indexName = require('../constants/indexes');
const { DATABASE_TABLE } = require('./baseRepository');
const { successResponse } = require('./baseRepository');
const helper = require('../helper/helper');
const constant = require('../constants/constant');
const baseRepositoryNew = require('./baseRepositoryNew');

exports.fetchDigiCardData = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("DigiCard Data Database Error");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {
            let docClient = dynamoDBCall;
            let FilterExpressionDynamic = "";
            let ExpressionAttributeValuesDynamic = {};
            // console.log("fetchDigiCardData request : ", request);
            let concept_digicard_id = request;

            console.log("request concept_digicard_id : ", concept_digicard_id);

            if (concept_digicard_id.length === 1) {
                let read_params = {
                    TableName: TABLE_NAMES.upschool_digi_card_table,
                    KeyConditionExpression: "digi_card_id = :digi_card_id",
                    FilterExpression: "digicard_status = :digicard_status",
                    ExpressionAttributeValues: {
                        ":digi_card_id": concept_digicard_id[0],
                        ":digicard_status": "Active",
                    },
                    ProjectionExpression: ["digi_card_id", "digi_card_title", "digicard_image", "display_name"],
                }

                DATABASE_TABLE.queryRecord(docClient, read_params, callback);

            } else {
                console.log("Else");

                concept_digicard_id.forEach((element, index) => {
                    if (index < concept_digicard_id.length - 1) {
                        FilterExpressionDynamic = FilterExpressionDynamic + "(digi_card_id = :digi_card_id" + index + " AND digicard_status = :digicard_status) OR "
                        ExpressionAttributeValuesDynamic[':digi_card_id' + index] = element + ''
                    } else {
                        FilterExpressionDynamic = FilterExpressionDynamic + "(digi_card_id = :digi_card_id" + index + " AND digicard_status = :digicard_status)"
                        ExpressionAttributeValuesDynamic[':digi_card_id' + index] = element;
                    }
                });
                ExpressionAttributeValuesDynamic[':digicard_status'] = 'Active'

                let read_params = {
                    TableName: TABLE_NAMES.upschool_digi_card_table,
                    FilterExpression: FilterExpressionDynamic,
                    ExpressionAttributeValues: ExpressionAttributeValuesDynamic,
                    ProjectionExpression: ["digi_card_id", "digi_card_title", "digicard_image", "display_name"],
                }

                DATABASE_TABLE.scanRecord(docClient, read_params, callback);

            }

        }
    });
}
exports.fetchDigiCardDisplayTitleID = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("DigiCard Data Database Error");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {
            let docClient = dynamoDBCall;
            let FilterExpressionDynamic = "";
            let ExpressionAttributeValuesDynamic = {};
            let concept_digicard_id = request;

            console.log("request concept_digicard_id : ", concept_digicard_id);

            if (concept_digicard_id.length === 1) {
                let read_params = {
                    TableName: TABLE_NAMES.upschool_digi_card_table,
                    KeyConditionExpression: "digi_card_id = :digi_card_id",
                    FilterExpression: "digicard_status = :digicard_status",
                    ExpressionAttributeValues: {
                        ":digi_card_id": concept_digicard_id[0],
                        ":digicard_status": "Active",
                    },
                    ProjectionExpression: ["digi_card_id", "digi_card_title", "display_name"],
                }
                DATABASE_TABLE.queryRecord(docClient, read_params, callback);
            } else {
                console.log("Else");

                concept_digicard_id.forEach((element, index) => {
                    if (index < concept_digicard_id.length - 1) {
                        FilterExpressionDynamic = FilterExpressionDynamic + "(digi_card_id = :digi_card_id" + index + " AND digicard_status = :digicard_status) OR "
                        ExpressionAttributeValuesDynamic[':digi_card_id' + index] = element + ''
                    } else {
                        FilterExpressionDynamic = FilterExpressionDynamic + "(digi_card_id = :digi_card_id" + index + " AND digicard_status = :digicard_status)"
                        ExpressionAttributeValuesDynamic[':digi_card_id' + index] = element;
                    }
                });
                ExpressionAttributeValuesDynamic[':digicard_status'] = 'Active'

                let read_params = {
                    TableName: TABLE_NAMES.upschool_digi_card_table,
                    FilterExpression: FilterExpressionDynamic,
                    ExpressionAttributeValues: ExpressionAttributeValuesDynamic,
                    ProjectionExpression: ["digi_card_id", "digi_card_title", "display_name"],
                }

                DATABASE_TABLE.scanRecord(docClient, read_params, callback);
            }
        }
    });
}
exports.fetchDigiCardDisplayTitleID2 = async (request) => {


    const concept_digicard_items = request;
    const fromatedRequest = await helper.getDataByFilterKey(concept_digicard_items);
    console.log({ fromatedRequest });

    const params = {
        TableName: TABLE_NAMES.upschool_digi_card_table,
        IndexName: indexName.Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: `${fromatedRequest.FilterExpression} AND digicard_status = :digicard_status`,
        ExpressionAttributeValues: {
            ...fromatedRequest.ExpressionAttributeValues,
            ":digicard_status": "Active"
        },
        ProjectionExpression: "digi_card_id, digi_card_title, display_name",
    };


    return await baseRepositoryNew.DATABASE_TABLE2.query(params);

};

exports.fetchRelatedDigiCardData = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("DigiCard Data Database Error");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {
            let docClient = dynamoDBCall;
            let FilterExpressionDynamic = "";
            let ExpressionAttributeValuesDynamic = {};
            console.log("fetchRelatedDigiCardData request : ", request);
            let related_digi_cards = request.related_digi_cards;

            console.log("related_digi_cards : ", related_digi_cards);
            if (related_digi_cards.length === 0) {

                callback(400, constant.messages.NO_RELATED_DIGICARDS);

            } else if (related_digi_cards.length === 1) {
                let read_params = {
                    TableName: TABLE_NAMES.upschool_digi_card_table,
                    KeyConditionExpression: "digi_card_id = :digi_card_id",
                    FilterExpression: "digicard_status = :digicard_status",
                    ExpressionAttributeValues: {
                        ":digi_card_id": related_digi_cards[0],
                        ":digicard_status": "Active",

                    },
                    ProjectionExpression: ["digi_card_id", "digi_card_title"],
                }

                DATABASE_TABLE.queryRecord(docClient, read_params, callback);

            } else {
                console.log("Else");
                related_digi_cards.forEach((element, index) => {
                    if (index < related_digi_cards.length - 1) {
                        FilterExpressionDynamic = FilterExpressionDynamic + "(digi_card_id = :digi_card_id" + index + " AND digicard_status = :digicard_status) OR "
                        ExpressionAttributeValuesDynamic[':digi_card_id' + index] = element + ''
                    } else {
                        FilterExpressionDynamic = FilterExpressionDynamic + "(digi_card_id = :digi_card_id" + index + " AND digicard_status = :digicard_status)"
                        ExpressionAttributeValuesDynamic[':digi_card_id' + index] = element;
                    }
                });
                ExpressionAttributeValuesDynamic[':digicard_status'] = 'Active'

                let read_params = {
                    TableName: TABLE_NAMES.upschool_digi_card_table,
                    FilterExpression: FilterExpressionDynamic,
                    ExpressionAttributeValues: ExpressionAttributeValuesDynamic,
                    ProjectionExpression: ["digi_card_id", "digi_card_title"],
                }

                DATABASE_TABLE.scanRecord(docClient, read_params, callback);

            }

        }
    });
}
exports.fetchDigiCardByID = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log(constant.messages.DIGICARD_DATABASE_ERROR);
            console.log(DBErr);
            callback(500, constant.messages.DIGICARD_DATABASE_ERROR)
        } else {
            let docClient = dynamoDBCall;

            let read_params = {
                TableName: TABLE_NAMES.upschool_digi_card_table,

                KeyConditionExpression: "digi_card_id = :digi_card_id",
                ExpressionAttributeValues: {
                    ":digi_card_id": request.data.digi_card_id
                },

                ProjectionExpression: ["digi_card_id", "digi_card_title", "digicard_image", "display_name", "digi_card_excerpt", "digi_card_content", "digicard_voice_note", "digicard_document"],
            }
            DATABASE_TABLE.queryRecord(docClient, read_params, callback);
        }
    });
}
exports.fetchDigiCardByID2 = async (request) => {
    let params = {
        TableName: TABLE_NAMES.upschool_digi_card_table,

        KeyConditionExpression: "digi_card_id = :digi_card_id",
        ExpressionAttributeValues: {
            ":digi_card_id": request.data.digi_card_id
        },

        // ProjectionExpression: "digi_card_id, digi_card_title, digicard_image, display_name, digi_card_excerpt, digi_card_content, digicard_voice_note, digicard_document",


    };
    console.log({ params });
    const data = await baseRepositoryNew.DATABASE_TABLE2.query(params);
    return data;
}
