const dynamoDbCon = require('../awsConfig');
const { TABLE_NAMES } = require('../constants/tables');
const indexName = require('../constants/indexes');
const { DATABASE_TABLE } = require('./baseRepository');
const helper = require('../helper/helper');
const constant = require('../constants/constant');

exports.getAllPresets = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Preset Data Database Error");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR)
        } else {

            let docClient = dynamoDBCall;

            let read_params = {
                TableName: TABLE_NAMES.upschool_presets_table,
                IndexName: indexName.Indexes.common_id_index,
                KeyConditionExpression: "common_id = :common_id",
                FilterExpression: "preset_status = :preset_status",
                ExpressionAttributeValues: {
                    ":common_id": constant.constValues.common_id,
                    ":preset_status": "Active",
                }
            }

            DATABASE_TABLE.queryRecord(docClient, read_params, callback);

        }
    });
}