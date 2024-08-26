const { DynamoDBClient, ListTablesCommand, CreateTableCommand, DeleteTableCommand, ReturnValue } = require('@aws-sdk/client-dynamodb');
const { v4: uuidv4 } = require('uuid');
const Aws = require('aws-sdk');
const { TABLE_NAMES } = require('./src/constants/tables');
const { QueryCommand, UpdateCommand, BatchWriteCommand, DynamoDBDocumentClient, DeleteCommand, PutCommand, GetCommand, BatchGetCommand } = require('@aws-sdk/lib-dynamodb');
const { request } = require('http');
const { create } = require('domain');
// Configure the AWS SDK to use the local DynamoDB instance
const client = new DynamoDBClient({
    region: process.env.REGION, // You can use any region
    // endpoint: "http://localhost:8000",
    credentials: {
        accessKeyId: process.env.ACCESS_KEY_ID,
        secretAccessKey: process.env.SECRET_ACCESS_KEY,
    },
});

const ddbDocClient = DynamoDBDocumentClient.from(client);


// AWS.config.update({
//     // accessKeyId: process.env.ACCESS_KEY_ID,
//     // secretAccessKey: process.env.SECRET_ACCESS_KEY,
//     // region: process.env.REGION,
//     // maxRetries: 2,
//     // httpOptions: {
//     //     timeout: 60000,
//     //     connectTimeout: 60000
//     // }
//     region: "us-west-2", // You can use any region
//     endpoint: "http://localhost:8000",
//     credentials: {
//         accessKeyId: "fakeMyKeyId",
//         secretAccessKey: "fakeSecretAccessKey",
//     },
// });

// // Create a DynamoDB service object
// const dynamodb = new AWS.DynamoDB();

const tableNme = 'Uth2'

// Example function to create a table
const createTable = async () => {
    const params = {
        TableName: 'Uth_dev',
        AttributeDefinitions: [
            {
                AttributeName: "id",
                AttributeType: "S",
            },
            {
                AttributeName: "sort_id",
                AttributeType: "S",
            },
            {
                AttributeName: "email",
                AttributeType: "S",
            },
        ],
        KeySchema: [
            {
                AttributeName: "id",
                KeyType: "HASH",
            },
            {
                AttributeName: 'sort_id',
                KeyType: 'RANGE',    //Sort key
            }
        ],
        ProvisionedThroughput: {
            ReadCapacityUnits: 10,
            WriteCapacityUnits: 10
        },
        GlobalSecondaryIndexes: [
            {
                IndexName: "EmailIndex",
                KeySchema: [
                    {
                        AttributeName: "email", KeyType: "HASH"
                    }
                ],
                Projection: {
                    ProjectionType: "ALL"
                },
                ProvisionedThroughput: {
                    ReadCapacityUnits: "10",
                    WriteCapacityUnits: "10"
                }
            }
        ]
    };

    try {
        const data = await client.send(new CreateTableCommand(params));
        console.log("Table created:", data.TableDescription.KeySchema);
        console.log("Table created:", data.TableDescription.AttributeDefinitions);
        console.log("Table contents:", data.$metadata);
    } catch (err) {
        console.error("Unable to create table:", err);
    }
};

// Example function to put an item into the table
const putItem = async () => {
    const params = {
        TableName: tableNme,
        Item: {
            id: "Uth#Users",
            sort_id: `Users#${uuidv4()}`,
            firstName: 'Durga',
            lastName: 'Prasad',
            email: 'dsp@gmail.com',
            password: '$2a$10$0hImyglYinwZ6pHPQvG2/u.m0OdhSNgenrGBoM/VsJaUVRx56QGF2',
            phone: '5677898765',
            city: 'bang'
        },
        ConditionExpression: "attribute_not_exists(email)",
        ReturnConsumedCapacity: "TOTAL",
        ReturnValues: 'ALL_OLD'
    };

    try {
        const data = await ddbDocClient.send(new PutCommand(params));
        console.log('ggh', data);
        console.log("Item added:", data.Attributes);
        console.log("Table contents:", data.$metadata);
        console.log("Table contents:", data.ItemCollectionMetrics);
    } catch (err) {
        console.error("Unable to add item:", err);
    }
};

// Example function to get an item from the table
const getItem = async () => {
    const params = {
        TableName: "Movies",
        Key: {
            userName: "Prasad",
            email: "dsp90322@gmail.com",
            password: "Pa$$word!",
            phone: "2346782345"
        }
    };

    try {
        const data = await client.send(new GetItemCommand(params));
        console.log("Item retrieved:", data);
    } catch (err) {
        console.error("Unable to retrieve item:", err);
    }
};
// Example function to scan the table and display its contents
const scanTable = async () => {
    const params = {
        TableName: tableNme
    };

    try {
        const data = (await client.send(new ScanCommand(params)));
        console.log("Table contents:", data.Items);

    } catch (error) {
        console.error("Unable to scan table:", error);
    }
};

const get = async () => {
    const params = {
        TableName: tableNme,
        Key: {
            id: 'Movies#Items',
            sort_id: 'items#02fd7bc2-4a18-45f7-abd9-7286f4ba9152'
        }
    }
    try {
        const data = await client.send(new GetCommand(params));
        console.log("Table:", data.Item);
    } catch (error) {
        console.error("Unable to scan table:", error);
    }
}
const deleteTable = async () => {
    const params = {
        TableName: tableNme
    };

    try {
        const data = await ddbDocClient.send(new DeleteTableCommand(params));
        console.log("Table contents:", data);
    } catch (error) {
        console.error("Unable to scan table:", error);
    }
}

const listOfTables = async () => {
    try {
        const data = await client.send(new ListTablesCommand());
        console.log("Table contents:", data);
    } catch (error) {
        console.error("Unable to scan table:", error);
    }
}

const deleteItem = async () => {
    const params = {
        TableName: 'Uth',
        Key: {
            id: 'Uth#Users',
            sort_id: 'Users#0fc0af42-2367-4cb0-a1b5-159b777305f7'
        }
    }
    try {
        const data = await client.send(new DeleteCommand(params))
        console.log("Table contents:", data.Attributes);
        console.log("Table contents:", data.$metadata);
        console.log("Table contents:", data.ItemCollectionMetrics);

    } catch (error) {
        console.error("Unable to scan table:", error);
    }
}

const query = async () => {
    const params = {
        TableName: tableNme,
        // IndexName: 'EmailIndex', // If you have an index for emails, otherwise scan the table
        KeyConditionExpression: 'id = :id and sort_id = :sortid',
        ExpressionAttributeValues: {
            ':id': 'Uth#Users',
            ':sortid': 'Users#3e4b5eb7-a536-4fdc-b411-b1944d561200'
        }

    };
    try {
        const data = await ddbDocClient.send(new QueryCommand(params))
        console.log("Table contents:", data.Items);
        console.log("Table contents:", data.$metadata);
        console.log("Table contents:", data.ItemCollectionMetrics);

    } catch (error) {
        console.error("Unable to scan table:", error);
    }
}

const deleteById = async (request) => {
    const params = {
        TableName: 'Uth2',
        Key: {
            id: 'Uth#Users',
            sort_id: 'Users#8e8ae826-1d75-409a-871a-fb72c34cde2c'
        }
    }
    try {
        const data = (await client.send(new DeleteCommand(params)))
        console.log("Table contents:", data.Attributes);
        console.log("Table contents:", data.$metadata);
        console.log("Table contents:", data.ItemCollectionMetrics);

    } catch (error) {
        console.error("Unable to scan table:", error);
    }
}

const getEmail = async (object) => {
    const params = {
        TableName: TABLE_NAMES.UTH,
        IndexName: `${Object.values(object)[0]}`, // If you have an index for emails, otherwise scan the table
        KeyConditionExpression: `${Object.keys(object)[1]} = :value`,
        ExpressionAttributeValues: {
            ':value': `${Object.values(object)[1]}`,
        },
    };
    const data = (await client.send(new QueryCommand(params))).Items;
    console.log({ data });
    return data;
}

const updateService = async (request) => {
    let UpdateExpression = 'set '
    let ExpressionAttributeValues = {}
    Object.entries(request).forEach(([key, value]) => {
        key !== 'id' && (UpdateExpression += `${key} = :${key},`)
        key !== 'id' && (ExpressionAttributeValues[`:${key}`] = value)
    })
    const params = {
        TableName: TABLE_NAMES.UTH,
        Key: {
            id: "Uth#Users",
            sort_id: `Users#${request.id}`
        },
        UpdateExpression: UpdateExpression.slice(0, -1),
        ExpressionAttributeValues: ExpressionAttributeValues,
        ReturnValues: "ALL_NEW", // Optional: return updated attributes         
    };

    const command = await ddbDocClient.send(new UpdateCommand(params));
    console.log("rdrdr", command.Attributes);
    return command.Attributes;
}

const deleteMany = async (request) => {
    const deleteRequests = request.map(key => ({
        DeleteRequest: {
            Key: {
                id: 'Uth#Users',
                sort_id: `Users#${key}`
            }
        }
    }));

    const params = {
        RequestItems: {
            [tableNme]: deleteRequests
        }
    };
    try {
        const result = await ddbDocClient.send(new BatchWriteCommand(params));
        console.log('Batch delete succeeded:', result);
    } catch (error) {
        console.error('Error in batch delete:', error);
    }
}

const bulkDeleteUsers = async (request) => {
    const chunkSize = 25;
    try {
        for (let i = 0; i < request.length; i += chunkSize) {
            const chunk = request.slice(i, i + chunkSize);

            const deleteRequests = chunk.map(item => ({
                DeleteRequest: {
                    Key: {
                        id: 'Uth#Users',
                        sort_id: `Users#${item}`
                    }
                }
            }));

            const params = {
                RequestItems: {
                    [tableNme]: deleteRequests
                }
            };
            let response = await ddbDocClient.send(new BatchWriteCommand(params));

            // Check for unprocessed items and retry if necessary
            while (Object.keys(response.UnprocessedItems).length > 0) {
                console.log('Retrying unprocessed items');
                response = await ddbDocClient.send(new BatchWriteCommand(deleteRequests));
            }

            console.log(`Deleted ${chunk.length} items`);
        }
    }
    catch (err) {
        console.error("Failed to delete items:", err);
    }
}

const bulkCreateUsers = async (request) => {
    const chunkSize = 25;
    try {
        for (let i = 0; i < request.length; i += chunkSize) {
            const chunk = request.slice(i, i + chunkSize);

            const putRequest = chunk.map(item => ({
                PutRequest: {
                    Key: {
                        ...item,
                        id: 'Uth#Users',
                        sort_id: `Users#${item}`,
                    }
                }
            }));

            const params = {
                RequestItems: {
                    [tableNme]: putRequest
                }
            };
            let response = await ddbDocClient.send(new BatchWriteCommand(params));

            // Check for unprocessed items and retry if necessary
            while (Object.keys(response.UnprocessedItems).length > 0) {
                console.log('Retrying unprocessed items');
                response = await ddbDocClient.send(new BatchWriteCommand(putRequest));
            }

            console.log(`Deleted ${chunk.length} items`);
        }
    }
    catch (err) {
        console.error("Failed to delete items:", err);
    }
}

const getByObjects = async (request) => {
    const getRequest = request.map(key => ({
        id: 'Uth#Users',
        sort_id: `Users#${key}`
    }));
    const params = {
        RequestItems: {
            [tableNme]: {
                Keys: getRequest
            }
        }
    };
    try {
        const data = (await client.send(new BatchGetCommand(params)))
        console.log("Table contents:", data.Responses);
        console.log("Table contents:", data.$metadata);
        console.log("Table contents:", data.ItemCollectionMetrics);

    } catch (error) {
        console.error("Unable to scan table:", error);
    }
}
// Run the example functions
(async () => {
    // await createTable();
    //await putItem();
    //await get();
    //await query();
    //await scanTable();
    // await deleteTable();
    //await deleteById();
    //await get();
    //await listOfTables();
    //await deleteItem();
    // await getEmail({ index: 'EmailIndex', email: 'yoillommeukoinnu-306@yopmail.com' })
    // await updateService({
    //     "id": "e19561e6-e19f-4ff4-8f2b-f99ef4f15d95",
    //     "userName": "DurgaPrasad",
    //     "phone": "2346782345"
    // })
    //await deleteMany(['8e8ae826-1d75-409a-871a-fb72c34cde2c', 'e115f61d-af5d-42f9-afd7-3dc5972bdef2']);
    //await bulkCreateUsers();
    //await getByObjects(['73e3f22e-b3e2-41a3-b04f-44d8f0c5e800', 'af9bcc62-13a4-400c-8710-2a1cb465db82'])
})();

