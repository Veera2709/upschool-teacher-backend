const dynamoDbCon = require("../awsConfig");
const { DATABASE_TABLE } = require("./baseRepository");
const helper = require("../helper/helper");
const { DATABASE_TABLE2 } = require('./baseRepositoryNew');
const { constant, indexes: { Indexes }, tables: { TABLE_NAMES } } = require('../constants');


exports.fetchBulkData = function (request, callback) {
  dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
    if (DBErr) {
      console.log(constant.messages.DATABASE_ERROR);
      console.log(DBErr);
      callback(500, constant.messages.DATABASE_ERROR);
    } else {
      let IdArray = request.IdArray;
      let fetchIdName = request.fetchIdName;
      let TableName = request.TableName;

      let filterExpDynamic = fetchIdName + "= :" + fetchIdName;
      let expAttributeVal = {};

      let docClient = dynamoDBCall;
      let FilterExpressionDynamic = "";
      let ExpressionAttributeValuesDynamic = {};

      if (IdArray.length === 1) {
        expAttributeVal[":" + fetchIdName] = IdArray[0];

        let read_params = {
          TableName: TableName,
          KeyConditionExpression: "" + fetchIdName + " = :" + fetchIdName + "",
          ExpressionAttributeValues: expAttributeVal,
        };

        console.log("READ PARAMS : ", read_params);

        DATABASE_TABLE.queryRecord(docClient, read_params, callback);
      } else {
        IdArray.forEach((element, index) => {
          if (index < IdArray.length - 1) {
            FilterExpressionDynamic =
              FilterExpressionDynamic + filterExpDynamic + index + " OR ";
            ExpressionAttributeValuesDynamic[":" + fetchIdName + "" + index] =
              element + "";
          } else {
            FilterExpressionDynamic =
              FilterExpressionDynamic + filterExpDynamic + index + "";
            ExpressionAttributeValuesDynamic[":" + fetchIdName + "" + index] =
              element;
          }
        });
        let read_params = {
          TableName: TableName,
          FilterExpression: FilterExpressionDynamic,
          ExpressionAttributeValues: ExpressionAttributeValuesDynamic,
        };
        DATABASE_TABLE.scanRecord(docClient, read_params, callback);
      }
    }
  });
};

exports.BulkInsert = function (final_data, userTable, callback) {
  if (final_data.length > 0) {
    dynamoDbCon.getDB(async function (DBErr, dynamoDBCall) {
      if (DBErr) {
        console.log(constant.messages.DATABASE_ERROR);
        console.log(DBErr);
        callback(500, constant.messages.DATABASE_ERROR);
      } else {
        let docClient = dynamoDBCall;

        const putReqs = final_data.map((item) => ({
          PutRequest: {
            Item: item,
          },
        }));

        let ItemsObjects = {};
        ItemsObjects[userTable] = putReqs;

        const req = {
          RequestItems: ItemsObjects,
        };

        await docClient.batchWrite(req).promise();
        console.log("Bulk Data Added/Updated!");
        callback(0, 200);
      }
    });
  } else {
    callback(0, 200);
  }
};

exports.fetchBulkDataUsingIndex = function (request, callback) {
  dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
    if (DBErr) {
      console.log(constant.messages.DATABASE_ERROR);
      console.log(DBErr);
      callback(500, constant.messages.DATABASE_ERROR);
    } else {
      let IdArray = request.IdArray;
      let fetchIdName = request.fetchIdName;
      let TableName = request.TableName;

      let filterExpDynamic = fetchIdName + "= :" + fetchIdName;
      let expAttributeVal = {};

      let docClient = dynamoDBCall;
      let FilterExpressionDynamic = "";
      let ExpressionAttributeValuesDynamic = {};

      if (IdArray.length === 1) {
        expAttributeVal[":" + fetchIdName] = IdArray[0];
        expAttributeVal[":common_id"] = constant.constValues.common_id;

        let read_params = {
          TableName: TableName,
          IndexName: Indexes.common_id_index,
          KeyConditionExpression: "common_id = :common_id",
          FilterExpression: "" + fetchIdName + " = :" + fetchIdName + "",
          ExpressionAttributeValues: expAttributeVal,
        };

        DATABASE_TABLE.queryRecord(docClient, read_params, callback);
      } else {
        IdArray.forEach((element, index) => {
          if (index < IdArray.length - 1) {
            FilterExpressionDynamic =
              FilterExpressionDynamic + filterExpDynamic + index + " OR ";
            ExpressionAttributeValuesDynamic[":" + fetchIdName + "" + index] =
              element + "";
          } else {
            FilterExpressionDynamic =
              FilterExpressionDynamic + filterExpDynamic + index + "";
            ExpressionAttributeValuesDynamic[":" + fetchIdName + "" + index] =
              element;
          }
        });
        ExpressionAttributeValuesDynamic[":common_id"] =
          constant.constValues.common_id;

        let read_params = {
          TableName: TableName,
          IndexName: Indexes.common_id_index,
          KeyConditionExpression: "common_id = :common_id",
          FilterExpression: FilterExpressionDynamic,
          ExpressionAttributeValues: ExpressionAttributeValuesDynamic,
        };

        DATABASE_TABLE.queryRecord(docClient, read_params, callback);
      }
    }
  });
};

exports.getBulkDataUsingIndexWithActiveStatus = function (request, callback) {
  dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
    if (DBErr) {
      console.log(constant.messages.DATABASE_ERROR);
      console.log(DBErr);
      callback(500, constant.messages.DATABASE_ERROR);
    } else {
      let { IdArray, fetchIdName, TableName, isActiveFieldName, isActive } = request;
      //   let IdArray = request.IdArray;
      //   let fetchIdName = request.fetchIdName;
      //   let TableName = request.TableName;
      //   let isActiveFieldName = request.isActiveFieldName;
      //   let isActive = request.isActive;

      let filterExpDynamic = fetchIdName + "= :" + fetchIdName;
      let expAttributeVal = {};

      let docClient = dynamoDBCall;
      let FilterExpressionDynamic = "";
      let ExpressionAttributeValuesDynamic = {};

      if (IdArray.length === 1) {
        expAttributeVal[":" + fetchIdName] = IdArray[0];
        expAttributeVal[":common_id"] = constant.constValues.common_id;

        let read_params = {
          TableName: TableName,
          IndexName: Indexes.common_id_index,
          KeyConditionExpression: "common_id = :common_id",
          FilterExpression: "" + fetchIdName + " = :" + fetchIdName + "",
          ExpressionAttributeValues: expAttributeVal,
        };

        DATABASE_TABLE.queryRecord(docClient, read_params, callback);
      } else {
        IdArray.forEach((element, index) => {
          if (index < IdArray.length - 1) {
            FilterExpressionDynamic =
              FilterExpressionDynamic + filterExpDynamic + index + " OR ";
            ExpressionAttributeValuesDynamic[":" + fetchIdName + "" + index] =
              element + "";
          } else {
            FilterExpressionDynamic =
              FilterExpressionDynamic + filterExpDynamic + index + "";
            ExpressionAttributeValuesDynamic[":" + fetchIdName + "" + index] =
              element;
          }
        });
        FilterExpressionDynamic =
          FilterExpressionDynamic +
          " AND " +
          isActiveFieldName +
          "= :" +
          isActiveFieldName;
        ExpressionAttributeValuesDynamic[":" + isActiveFieldName] = isActive;
        ExpressionAttributeValuesDynamic[":common_id"] =
          constant.constValues.common_id;

        let read_params = {
          TableName: TableName,
          IndexName: Indexes.common_id_index,
          KeyConditionExpression: "common_id = :common_id",
          FilterExpression: FilterExpressionDynamic,
          ExpressionAttributeValues: ExpressionAttributeValuesDynamic,
        };

        DATABASE_TABLE.queryRecord(docClient, read_params, callback);
      }
    }
  });
};

exports.fetchBulkDataWithProjection = function (request, callback) {
  dynamoDbCon.getDB(async function (DBErr, dynamoDBCall) {
    if (DBErr) {
      console.log(constant.messages.DATABASE_ERROR);
      console.log(DBErr);
      callback(500, constant.messages.DATABASE_ERROR);
    } else {

      let { IdArray, fetchIdName, TableName, projectionExp } = request;
      //   let IdArray = request.IdArray;
      //   let fetchIdName = request.fetchIdName;
      //   let TableName = request.TableName;
      //   let projectionExp = request.projectionExp;

      let filterExpDynamic = fetchIdName + "= :" + fetchIdName;
      let expAttributeVal = {};

      let docClient = dynamoDBCall;
      let FilterExpressionDynamic = "";
      let ExpressionAttributeValuesDynamic = {};

      IdArray = [...new Set(IdArray)];

      console.log("IdArray : ", IdArray);
      if (IdArray.length === 0) {
        console.log("EMPTY BULK ID");
        callback(0, { Items: [] });
      }
      else if (IdArray.length === 1) {
        expAttributeVal[":" + fetchIdName] = IdArray[0];

        let read_params = {
          TableName: TableName,
          KeyConditionExpression: "" + fetchIdName + " = :" + fetchIdName + "",
          ExpressionAttributeValues: expAttributeVal,
          ProjectionExpression: projectionExp,
        };

        // console.log("READ PARAMS : ", read_params);

        DATABASE_TABLE.queryRecord(docClient, read_params, callback);
      }
      else {
        IdArray.forEach((element, index) => {
          if (index < IdArray.length - 1) {
            FilterExpressionDynamic = FilterExpressionDynamic + filterExpDynamic + index + " OR ";
            ExpressionAttributeValuesDynamic[":" + fetchIdName + "" + index] = element + "";
          } else {
            FilterExpressionDynamic = FilterExpressionDynamic + filterExpDynamic + index + "";
            ExpressionAttributeValuesDynamic[":" + fetchIdName + "" + index] = element;
          }
        });

        let read_params = {
          TableName: TableName,
          FilterExpression: FilterExpressionDynamic,
          ExpressionAttributeValues: ExpressionAttributeValuesDynamic,
          ProjectionExpression: projectionExp,
        };

        console.log("READ PARAMETER : ", read_params);

        DATABASE_TABLE.scanRecord(docClient, read_params, callback);
      }
    }
  });
};
exports.fetchBulkDataWithProjection2 = async (request) => {
  const fromatedRequest = await helper.getDataByFilterKey(request);
  const params = {
    TableName: TABLE_NAMES.upschool_question_table,
    IndexName: Indexes.common_id_index,
    KeyConditionExpression: "common_id = :common_id",
    FilterExpression: fromatedRequest.FilterExpression,
    ExpressionAttributeValues: fromatedRequest.ExpressionAttributeValues,
  };
  try {
    return await DATABASE_TABLE2.query(params);    
  } catch (error) {
    console.error(`Error fetching quiz results:`, error);
    throw error;
  }
};

exports.bulkBatchWrite = async (itemsToWrite, userTable) => {
  if (itemsToWrite.length > 0) {
    
        const batchSize = constant.awsConstants.batchSize;
        const promises = [];

        for (let i = 0; i < itemsToWrite.length; i += batchSize) {
          const batch = itemsToWrite.slice(i, i + batchSize);
          console.log({ batch });
          promises.push(exports.performBatchWrite(batch, userTable));
        }

        try {
          await Promise.all(promises);
          return 200;
        } catch (error) {
          throw helper.formatErrorResponse(error.message, 400);

        }
  } else {
    return 200;
  }
};


// async function performBatchWrite(batch, userTable) {
//     const params = { RequestItems: { 'YourTableName': batch } };
//     try {
//         await dynamoDB.batchWrite(params).promise();
//         console.log('Batch write successful.');
//     } catch (error) {
//         console.error(`Error in batch write: ${error.message}`);
//     }
// }

exports.performBatchWrite = async (batch, userTable) => {

  const putReqs = await batch.map((item) => ({
    PutRequest: {
      Item: item,
    },
  }));

  let ItemsObjects = {};
  ItemsObjects[userTable] = putReqs;

  const req = {
    RequestItems: ItemsObjects,
  };

  try {
    await DATABASE_TABLE2.createMany(req).promise();

    console.log("Doing batch wirte...");
  } catch (error) {
    console.error(`Error in batch write: ${error.message}`);
  }
}