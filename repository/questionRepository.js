const dynamoDbCon = require("../awsConfig");
const { TABLE_NAMES } = require("../constants/tables");
const indexName = require("../constants/indexes");
const { DATABASE_TABLE } = require("./baseRepository");
const { successResponse } = require("./baseRepository");
const helper = require("../helper/helper");
const constant = require("../constants/constant");


exports.REFfetchBulkQuestionsWithPublishStatusAndProjection = function (request, callback) {

    dynamoDbCon.getDB(async function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log(constant.messages.DATABASE_ERROR);
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {
            let { IdArray, fetchIdName, TableName, projectionExp, questionStatus } = request;
            
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
            else if (IdArray.length === 1) 
            {
                expAttributeVal[":" + fetchIdName] = IdArray[0];
                expAttributeVal[":question_status"] = questionStatus;
                expAttributeVal[":question_source0"] = "71416d29-c96b-5889-9b90-580567446dbc";
                expAttributeVal[":question_source1"] = "71416d29-c96b-5889-9b90-580567446dc";

                let read_params = {
                    TableName: TableName,
                    FilterExpression: "" + fetchIdName + " = :" + fetchIdName + " AND question_status = :question_status AND (question_source = :question_source0 OR question_source = :question_source1)",
                    ExpressionAttributeValues: expAttributeVal,
                    ProjectionExpression: projectionExp,
                };

                console.log("READ PARAMS : ", read_params);

                DATABASE_TABLE.scanRecord(docClient, read_params, callback);
            } 
            else {
                IdArray.forEach((element, index) => {
                    if (index < IdArray.length - 1) {
                        FilterExpressionDynamic = FilterExpressionDynamic + filterExpDynamic + index + " AND question_status = :question_status" + index + " OR ";
                        ExpressionAttributeValuesDynamic[":" + fetchIdName + "" + index] = element + "";
                        ExpressionAttributeValuesDynamic[":question_status" + index] = questionStatus + "";
                    } else {
                        FilterExpressionDynamic = FilterExpressionDynamic + filterExpDynamic + index + " AND question_status = :question_status" + index;
                        ExpressionAttributeValuesDynamic[":" + fetchIdName + "" + index] = element;
                        ExpressionAttributeValuesDynamic[":question_status" + index] = questionStatus;
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
}

exports.fetchBulkQuestionsWithPublishStatusAndProjection = function (request, callback) {

    dynamoDbCon.getDB(async function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log(constant.messages.DATABASE_ERROR);
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {
            let { IdArray, fetchIdName, TableName, projectionExp, questionStatus, sourceIds } = request;
            
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
            else if (IdArray.length === 1) 
            {
                /** SINGLE DATA **/
                expAttributeVal[":" + fetchIdName] = IdArray[0];
                expAttributeVal[":question_status"] = questionStatus;
                let singleSourceFilter = " AND (";
                await sourceIds.forEach((sId, sIndex) => {
                    expAttributeVal[":question_source" + sIndex] = sId;

                    singleSourceFilter += (sIndex === sourceIds.length-1) ? "question_source = :question_source" + sIndex + ")" : "question_source = :question_source" + sIndex + " OR ";

                })

                singleSourceFilter = sourceIds.length > 0 ? singleSourceFilter : "";

                let read_params = {
                    TableName: TableName,
                    FilterExpression: "" + fetchIdName + " = :" + fetchIdName + " AND question_status = :question_status" + singleSourceFilter,
                    ExpressionAttributeValues: expAttributeVal,
                    ProjectionExpression: projectionExp,
                };

                // console.log("SINGLE READ PARAMS : ", read_params);

                DATABASE_TABLE.scanRecord(docClient, read_params, callback);
                
                /** END SINGLE DATA **/
            } 
            else {
                let multiSourceFilter = "";
                async function multiset(index)
                {
                    if(index < IdArray.length)
                    {
                        multiSourceFilter = " AND (";
                        await sourceIds.forEach((mId, mIndex) => {
                            ExpressionAttributeValuesDynamic[":question_source" + mIndex +""+ index] = mId;
        
                            multiSourceFilter += (mIndex === sourceIds.length-1) ? "question_source = :question_source" + mIndex+""+ index + ")" : "question_source = :question_source" + mIndex+""+ index + " OR ";
        
                        })

                        multiSourceFilter = sourceIds.length > 0 ? multiSourceFilter : "";

                        if (index < IdArray.length - 1) {
                            FilterExpressionDynamic = FilterExpressionDynamic + filterExpDynamic + index + " AND question_status = :question_status" + index + "" + multiSourceFilter +" OR ";
                            ExpressionAttributeValuesDynamic[":" + fetchIdName + "" + index] = IdArray[index] + "";
                            ExpressionAttributeValuesDynamic[":question_status" + index] = questionStatus + "";
                        } else {
                            FilterExpressionDynamic = FilterExpressionDynamic + filterExpDynamic + index + " AND question_status = :question_status" + index + "" + multiSourceFilter;
                            ExpressionAttributeValuesDynamic[":" + fetchIdName + "" + index] = IdArray[index];
                            ExpressionAttributeValuesDynamic[":question_status" + index] = questionStatus;
                        }

                        index++;
                        multiset(index);
                    }
                    else
                    {
                        /** THE END **/
                        let read_params = {
                            TableName: TableName,
                            FilterExpression: FilterExpressionDynamic,
                            ExpressionAttributeValues: ExpressionAttributeValuesDynamic,
                            ProjectionExpression: projectionExp,
                        };
                        
                        // let read_params = {
                        //     "TableName": "testing_upschool_question_table",
                        //     "FilterExpression": "#qs = :publish_status AND (#qid IN (:qid0, :qid1, :qid2, :qid3, :qid4, :qid5, :qid6, :qid7, :qid8, :qid9, :qid10, :qid11, :qid12, :qid13, :qid14, :qid15, :qid16, :qid17, :qid18, :qid19, :qid20, :qid21, :qid22, :qid23, :qid24, :qid25, :qid26, :qid27, :qid28, :qid29)) AND (#qsource IN (:qsource0, :qsource1, :qsource2, :qsource3))",
                        //     "ExpressionAttributeNames": {
                        //       "#qs": "question_status",
                        //       "#qid": "question_id",
                        //       "#qsource": "question_source"
                        //     },
                        //     "ExpressionAttributeValues": {
                        //       ":publish_status": "Publish",
                        //       ":qid0": "9717d2b3-d427-5583-82ca-d158bda0d49c",
                        //       ":qid1": "10a2533b-cfc3-53b9-abc5-952ef5bc41ab",
                        //       ":qid2": "7645b3eb-ce13-5725-86ec-a06150c15fd5",
                        //       ":qid3": "323c6b8a-44ca-5047-b250-9ff78fb4a975",
                        //       ":qid4": "517b4301-729a-56e1-94b2-8b80af1be56d",
                        //       ":qid5": "ee222a57-51ac-5318-8e15-1b6a515e82df",
                        //       ":qid6": "f08abd21-9d52-5f53-b577-943113cec438",
                        //       ":qid7": "a1f22c30-4c19-52f5-80f1-4743140b6ae8",
                        //       ":qid8": "dce6011d-5ea5-52e3-a928-aa5757a3ecb8",
                        //       ":qid9": "1413e4f7-c087-5d5b-b4f2-a08d5213139f",
                        //       ":qid10": "66196a81-e492-5569-a1d3-ab39028c41f3",
                        //       ":qid11": "d3021fc5-7c64-5832-9746-1adffb1f2b80",
                        //       ":qid12": "b426a3cf-cdaf-5726-be90-2f8d2f79aa29",
                        //       ":qid13": "6765b39f-3c89-5b60-b9e7-0e8cf2aa96c8",
                        //       ":qid14": "a01640db-4592-5a48-aa31-3b39e83ac0f4",
                        //       ":qid15": "85a8f12c-c91c-5907-8868-309ebda2c7ed",
                        //       ":qid16": "b8e6fecf-a05f-5089-bba1-5afcbf6fe5b4",
                        //       ":qid17": "f1fe5422-ed0e-5e95-aecd-6fee774c7a1f",
                        //       ":qid18": "63da8386-dda4-5f66-b84d-e0382713773d",
                        //       ":qid19": "580d00c5-a31e-546d-b54b-2f2b8d820234",
                        //       ":qid20": "528df820-fea6-5ff9-96d9-f18d08d59727",
                        //       ":qid21": "7bdbea8c-56b0-56fa-a14b-d2f8614820f3",
                        //       ":qid22": "328951d0-a688-5e5c-a6b0-f8da442f1f8d",
                        //       ":qid23": "51280df1-4c02-5edf-9b9b-75147d06d935",
                        //       ":qid24": "99979402-df18-5e41-abf1-e93452a849a6",
                        //       ":qid25": "6bcef44e-cf6b-567d-85d8-ec74078e9f85",
                        //       ":qid26": "d25fdf64-e06e-5d06-8325-8fd3968b58d3",
                        //       ":qid27": "91807a5a-c7f0-598b-9c3d-05da4a9c0f30",
                        //       ":qid28": "06ebf150-e25a-5091-bb71-9152e0b52857",
                        //       ":qid29": "feeb7841-9028-53b5-8665-728c11501d5e",
                        //       ":qsource0": "28519b88-fcc7-55ba-9df0-c11a2960e389",
                        //       ":qsource1": "9e477266-a438-5d50-8304-e5f92ee379ff",
                        //       ":qsource2": "d4b82b0c-7538-5953-aed0-ed6b481d93ef",
                        //       ":qsource3": "5696128f-1a43-582d-8a60-7e4bf5257fcb"
                        //     },
                        //     ProjectionExpression: projectionExp,
                        // }
                          
                        console.log("TEST READ PARAMETER : ", read_params);
                        
                        DATABASE_TABLE.scanRecord(docClient, read_params, callback);
                        /** END THE END **/
                    }
                }
                multiset(0);
            }
        }
    });
}

// exports.fetchBulkQuestionsWithPublishStatusAndProjection = function (request, callback) {

//     dynamoDbCon.getDB(async function (DBErr, dynamoDBCall) {
//         if (DBErr) {
//             console.log(constant.messages.DATABASE_ERROR);
//             console.log(DBErr);
//             callback(500, constant.messages.DATABASE_ERROR);
//         } else {
//             let { IdArray, fetchIdName, TableName, projectionExp, questionStatus } = request;
            
//             let filterExpDynamic = fetchIdName + "= :" + fetchIdName;
//             let expAttributeVal = {};

//             let docClient = dynamoDBCall;
//             let FilterExpressionDynamic = "";
//             let ExpressionAttributeValuesDynamic = {};

//             IdArray = [...new Set(IdArray)];

//             console.log("IdArray : ", IdArray);
//             if (IdArray.length === 0) {
//                 console.log("EMPTY BULK ID");
//                 callback(0, { Items: [] });
//             } 
//             else if (IdArray.length === 1) 
//             {
//                 expAttributeVal[":" + fetchIdName] = IdArray[0];
//                 expAttributeVal[":question_status"] = questionStatus;

//                 let read_params = {
//                     TableName: TableName,
//                     FilterExpression: "" + fetchIdName + " = :" + fetchIdName + " AND question_status = :question_status",
//                     ExpressionAttributeValues: expAttributeVal,
//                     ProjectionExpression: projectionExp,
//                 };

//                 console.log("READ PARAMS : ", read_params);

//                 DATABASE_TABLE.scanRecord(docClient, read_params, callback);
//             } 
//             else {
//                 IdArray.forEach((element, index) => {
//                     if (index < IdArray.length - 1) {
//                         FilterExpressionDynamic = FilterExpressionDynamic + filterExpDynamic + index + " AND question_status = :question_status" + index + " OR ";
//                         ExpressionAttributeValuesDynamic[":" + fetchIdName + "" + index] = element + "";
//                         ExpressionAttributeValuesDynamic[":question_status" + index] = questionStatus + "";
//                     } else {
//                         FilterExpressionDynamic = FilterExpressionDynamic + filterExpDynamic + index + " AND question_status = :question_status" + index;
//                         ExpressionAttributeValuesDynamic[":" + fetchIdName + "" + index] = element;
//                         ExpressionAttributeValuesDynamic[":question_status" + index] = questionStatus;
//                     }
//                 });

//                 let read_params = {
//                     TableName: TableName,
//                     FilterExpression: FilterExpressionDynamic,
//                     ExpressionAttributeValues: ExpressionAttributeValuesDynamic,
//                     ProjectionExpression: projectionExp,
//                 };

//                 console.log("READ PARAMETER : ", read_params);

//                 DATABASE_TABLE.scanRecord(docClient, read_params, callback);
//             }
//         }
//     });
// }

exports.fetchBulkQuestionsNameById = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Class Data Database Error");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {
            let docClient = dynamoDBCall;
            let FilterExpressionDynamic = "";
            let ExpressionAttributeValuesDynamic = {}; 
            console.log("fetchChapterData request : ", request);
            let question_id = request.question_id;
            console.log("question_id : ", question_id);
            if(question_id.length === 1){
                let read_params = {
                    TableName: TABLE_NAMES.upschool_question_table,
                    KeyConditionExpression: "question_id = :question_id",
                    ExpressionAttributeValues: { 
                        ":question_id": question_id[0]
                    },
                    ProjectionExpression: ["answers_of_question", "cognitive_skill", "question_id" ,"question_type" , "marks" , "difficulty_level" , "question_content"],
                }
    
                DATABASE_TABLE.queryRecord(docClient, read_params, callback);

            }else{
                console.log(" Chapter Else");
                question_id.forEach((element, index) => { 
                    console.log("element : ", element);

                    if(index < question_id.length-1){ 
                        FilterExpressionDynamic = FilterExpressionDynamic + "question_id = :question_id"+ index +" OR "
                        ExpressionAttributeValuesDynamic[':question_id'+ index] = element
                    } else{
                        FilterExpressionDynamic = FilterExpressionDynamic + "question_id = :question_id"+ index
                        ExpressionAttributeValuesDynamic[':question_id'+ index] = element;
                    }
                });

                let read_params = {
                    TableName: TABLE_NAMES.upschool_question_table,
                    FilterExpression: FilterExpressionDynamic,
                    ExpressionAttributeValues: ExpressionAttributeValuesDynamic,
                    ProjectionExpression: ["answers_of_question", "cognitive_skill", "question_id" ,"question_type" , "marks" , "difficulty_level" , "question_content"],
                }
                DATABASE_TABLE.scanRecord(docClient, read_params, callback);
            }
        }
    });
}




