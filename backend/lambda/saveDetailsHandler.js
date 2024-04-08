import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { nanoid } from "nanoid";

const dynamoDbClient = new DynamoDBClient({ region: process.env.AWS_REGION });

export const main = async (event) => {
  try {
    if (event.body === null) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Invalid request body" }),
      };
    }

    const { inputText, inputFilePath } = JSON.parse(event.body);

    if (typeof inputText !== "string" || typeof inputFilePath !== "string") {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Invalid inputText or inputFilePath" }),
      };
    }

    const id = nanoid();
    console.log(id);

    const command = new PutItemCommand({
      TableName: process.env.DETAILS_TABLE_NAME,
      Item: marshall({
        id,
        inputText,
        inputFilePath
      }),
    });

    console.log(command)

    await dynamoDbClient.send(command);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*", // adjust in production
      },
      body: JSON.stringify({
        message: "Details saved successfully"
      }),
    };
  } catch (error) {
    console.error("An error occurred", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        message: "An error occurred while saving details",
      }),
    };
  }
};
