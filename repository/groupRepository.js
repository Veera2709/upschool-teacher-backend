const dynamoDbCon = require('../awsConfig');
const { TABLE_NAMES } = require('../constants/tables');
const indexName = require('../constants/indexes');
const { DATABASE_TABLE } = require('./baseRepository');
const helper = require('../helper/helper');
const constant = require('../constants/constant');


exports.fetchGroupsData = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) { 
            console.log("DigiCard Data Database Error");
            console.log(DBErr); 
            callback(500, constant.messages.DATABASE_ERROR);
        } else { 
            let docClient = dynamoDBCall;
            let FilterExpressionDynamic = "";
            let ExpressionAttributeValuesDynamic = {}; 
            let group_array = request.group_array; 
            console.log("group_array : ", group_array);
            
            if (group_array.length === 0) { 

                callback(400, constant.messages.NO_RELATED_DIGICARDS); 

            } else if (group_array.length === 1){ 
                let read_params = { 
                    TableName: TABLE_NAMES.upschool_group_table,
                    KeyConditionExpression: "group_id = :group_id", 
                    // FilterExpression: "digicard_status = :digicard_status", 
                    ExpressionAttributeValues: {
                        ":group_id": group_array[0],
                        // ":digicard_status": "Active",
                    }, 
                }
    
                DATABASE_TABLE.queryRecord(docClient, read_params, callback);

            } else { 
                console.log("Else");
                group_array.forEach((element, index) => { 
                    if(index < group_array.length-1){ 
                        FilterExpressionDynamic = FilterExpressionDynamic + "(group_id = :group_id"+ index +") OR "
                        ExpressionAttributeValuesDynamic[':group_id'+ index] = element + '' 
                    } else{
                        FilterExpressionDynamic = FilterExpressionDynamic + "(group_id = :group_id"+ index +")"
                        ExpressionAttributeValuesDynamic[':group_id'+ index] = element;
                    }
                }); 
                // ExpressionAttributeValuesDynamic[':digicard_status'] = 'Active'

                let read_params = {
                    TableName: TABLE_NAMES.upschool_group_table,
                    FilterExpression: FilterExpressionDynamic,
                    ExpressionAttributeValues: ExpressionAttributeValuesDynamic,
                }
                console.log("read_params : ", read_params); 

                DATABASE_TABLE.scanRecord(docClient, read_params, callback);

            }

        }
    });
}
