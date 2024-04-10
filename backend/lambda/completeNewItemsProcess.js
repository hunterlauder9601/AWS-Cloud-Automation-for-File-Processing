import { EC2Client, TerminateInstancesCommand } from "@aws-sdk/client-ec2";
import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import {
  S3Client,
  GetObjectCommand,
  CopyObjectCommand,
} from "@aws-sdk/client-s3";

const dynamoDbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const s3Client = new S3Client({ region: process.env.AWS_REGION });
const ec2Client = new EC2Client({ region: process.env.AWS_REGION });

async function copyS3Object(bucketName, sourceKey, targetKey) {
  const copySource = encodeURIComponent(`${bucketName}/${sourceKey}`);
  const copyCommand = new CopyObjectCommand({
    Bucket: bucketName,
    CopySource: copySource,
    Key: targetKey,
  });

  try {
    const copyResult = await s3Client.send(copyCommand);
    console.log("Copy operation successful:", copyResult);
    return copyResult;
  } catch (error) {
    console.error("Error copying object:", error);
    throw error;
  }
}

export const main = async (event) => {
  for (const record of event.Records) {
    const bucketName = record.s3.bucket.name;
    console.log(bucketName);

    const objectKey = record.s3.object.key;
    console.log(objectKey);

    const detailsArr = objectKey.split("/");

    const id = detailsArr[1];
    console.log(id);

    const fileName = detailsArr[2];
    console.log(fileName);

    const newPath = `${bucketName}/${fileName}`;
    console.log(newPath);

    // get S3 object to get its metadata -> ec2 instanceId
    const getObjectCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
    });

    try {
      const { Metadata } = await s3Client.send(getObjectCommand);
      const instanceId = Metadata["instanceid"];
      console.log(instanceId);

      await copyS3Object(bucketName, objectKey, fileName);

      // update the DynamoDB item with the output file path
      const updateItemCommand = new UpdateItemCommand({
        TableName: process.env.DETAILS_TABLE_NAME,
        Key: { id: { S: id } },
        UpdateExpression: "SET output_file_path = :s3Path",
        ExpressionAttributeValues: { ":s3Path": { S: newPath } },
      });

      await dynamoDbClient.send(updateItemCommand);
      console.log(`Updated DynamoDB item ${id} with S3 path ${newPath}`);

      // terminate the EC2 instance
      if (instanceId) {
        const terminateCommand = new TerminateInstancesCommand({
          InstanceIds: [instanceId],
        });
        await ec2Client.send(terminateCommand);
        console.log(`Terminated EC2 instance ${instanceId}`);
      } else {
        console.log(
          "Instance ID not found in metadata. Skipping EC2 termination."
        );
      }
    } catch (error) {
      console.error(`Error processing S3 event for key ${objectKey}`, error);
      throw error;
    }
  }
};
