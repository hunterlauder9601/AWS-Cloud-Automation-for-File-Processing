import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({ region: process.env.AWS_REGION });

export const main = async (event) => {
  const objectKey = event.queryStringParameters
    ? event.queryStringParameters.filename
    : "default-filename";

  try {
    const bucketName = process.env.BUCKET_NAME;
    const putParams = {
      Bucket: bucketName,
      Key: objectKey,
    };

    const putCommand = new PutObjectCommand(putParams);

    const signedUrl = await getSignedUrl(s3Client, putCommand, {
      expiresIn: 3600,
    });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ uploadUrl: signedUrl, bucketName }),
    };
  } catch (error) {
    console.error("Error creating pre-signed URL", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ message: "Could not create pre-signed URL" }),
    };
  }
};
