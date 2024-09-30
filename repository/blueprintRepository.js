const dynamoDbCon = require('../awsConfig');
const { TABLE_NAMES } = require('../constants/tables');
const indexName = require('../constants/indexes');
const { DATABASE_TABLE } = require('./baseRepository');
const helper = require('../helper/helper');
const constant = require('../constants/constant');
const baseRepositoryNew = require('./baseRepositoryNew');


exports.fetchActiveBluePrints = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Blue Print Database Error");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR)
        } else {

            let docClient = dynamoDBCall;

            let read_params = {
                TableName: TABLE_NAMES.upschool_blueprint_table,
                IndexName: indexName.Indexes.common_id_index,
                KeyConditionExpression: "common_id = :common_id",
                FilterExpression: "blueprint_status = :blueprint_status",
                ExpressionAttributeValues: {
                    ":common_id": constant.constValues.common_id,
                    ":blueprint_status": request.data.blueprint_status
                },
                ProjectionExpression: ["blueprint_id", "blueprint_name", "description", "test_duration", "display_name"], 
            }
            DATABASE_TABLE.queryRecord(docClient, read_params, callback);
        }
    });
}
exports.fetchActiveBluePrints2 = async (request) => {
    let params = {
        TableName: TABLE_NAMES.upschool_blueprint_table,
                IndexName: indexName.Indexes.common_id_index,
                KeyConditionExpression: "common_id = :common_id",
                FilterExpression: "blueprint_status = :blueprint_status",
                ExpressionAttributeValues: {
                    ":common_id": constant.constValues.common_id,
                    ":blueprint_status": "Active",
                },
                ProjectionExpression: "blueprint_id, blueprint_name, description, test_duration, display_name",

    };
    const data= await baseRepositoryNew.DATABASE_TABLE2.query(params);
    return data.Items;
}
exports.fetchBlueprintById = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log(constant.messages.DATABASE_ERROR);
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {
            let docClient = dynamoDBCall;

            let read_params = {
                TableName: TABLE_NAMES.upschool_blueprint_table,

                KeyConditionExpression: "blueprint_id = :blueprint_id",
                ExpressionAttributeValues: {
                    ":blueprint_id": request.data.blueprint_id
                }
            }

            DATABASE_TABLE.queryRecord(docClient, read_params, callback);

        }
    });
}
exports.fetchBluePrintData = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Class Data Database Error");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {
            let docClient = dynamoDBCall;
            let FilterExpressionDynamic = "";
            let ExpressionAttributeValuesDynamic = {}; 

            let blueprint_array = request.blueprint_array;
            console.log("blueprint_array : ", blueprint_array);

            if(blueprint_array.length === 1){
                let read_params = {
                    TableName: TABLE_NAMES.upschool_blueprint_table,
                    KeyConditionExpression: "blueprint_id = :blueprint_id",
                    ExpressionAttributeValues: { 
                        ":blueprint_id": blueprint_array[0]
                    },
                    ProjectionExpression: ["blueprint_id", "blueprint_name"],
                }
    
                DATABASE_TABLE.queryRecord(docClient, read_params, callback);

            }else{
                console.log(" Chapter Else");
                blueprint_array.forEach((element, index) => { 
                    console.log("element : ", element);

                    if(index < blueprint_array.length-1){ 
                        FilterExpressionDynamic = FilterExpressionDynamic + "blueprint_id = :blueprint_id"+ index +" OR "
                        ExpressionAttributeValuesDynamic[':blueprint_id'+ index] = element
                    } else{
                        FilterExpressionDynamic = FilterExpressionDynamic + "blueprint_id = :blueprint_id"+ index
                        ExpressionAttributeValuesDynamic[':blueprint_id'+ index] = element;
                    }
                });

                let read_params = {
                    TableName: TABLE_NAMES.upschool_blueprint_table,
                    FilterExpression: FilterExpressionDynamic,
                    ExpressionAttributeValues: ExpressionAttributeValuesDynamic,
                    ProjectionExpression: ["blueprint_id", "blueprint_name"],
                }
                DATABASE_TABLE.scanRecord(docClient, read_params, callback);
            }
        }
    });
}
exports.fetchBluePrintData2 = async (request) => {
    const fromatedRequest = await helper.getDataByFilterKey(request);
    let params = {
        TableName: TABLE_NAMES.upschool_blueprint_table,
        IndexName: indexName.Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: fromatedRequest.FilterExpression,
        ExpressionAttributeValues: fromatedRequest.ExpressionAttributeValues,
        ProjectionExpression: "blueprint_id, blueprint_name",

    };
    const data = await baseRepositoryNew.DATABASE_TABLE2.query(params);
    return data.Items;
}