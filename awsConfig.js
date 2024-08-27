const AWS = require("aws-sdk");
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const dotenv = require("dotenv");
dotenv.config();

AWS.config.update({
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
    region: process.env.REGION,
    maxRetries: 2,
    httpOptions: {
        timeout: 60000,
        connectTimeout: 60000
    }
});

const docClient = new AWS.DynamoDB.DocumentClient();

exports.getDB = (callBack) => {
    callBack(0, docClient);
}


exports.s3 = new AWS.S3();

exports.sns = new AWS.SNS({
    apiVersion: '2010-03-31',
    region: process.env.REGION
});


exports.client = new DynamoDBClient({
    region: process.env.REGION, // You can use any region
    // endpoint: "http://localhost:8000",
    credentials: {
        accessKeyId: process.env.ACCESS_KEY_ID,
        secretAccessKey: process.env.SECRET_ACCESS_KEY,
    },
});