import { Duration, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as s3 from "aws-cdk-lib/aws-s3";
import { RemovalPolicy } from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";

export class BackendStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const fileUploadBucket = new s3.Bucket(this, "FileUploadBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: true,
      removalPolicy: RemovalPolicy.DESTROY, // use RETAIN for production environments
      cors: [
        {
          allowedMethods: [s3.HttpMethods.PUT],
          allowedOrigins: ["*"], // for dev --change later
          allowedHeaders: ["*"], // for dev
          maxAge: 3000,
        },
      ],
    });

    const detailsTable = new dynamodb.Table(this, "DetailsTable", {
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const preSignedUrlLambda = new lambda.Function(this, "PreSignedUrlLambda", {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset("lambda"),
      handler: "presignedUrlHandler.main",
      environment: {
        BUCKET_NAME: fileUploadBucket.bucketName,
      },
    });

    // grant lambda function permission to upload objects to S3
    fileUploadBucket.grantPut(preSignedUrlLambda);

    const saveDetailsLambdaRole = new iam.Role(this, "saveDetailsLambdaRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonDynamoDBFullAccess"),
        iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole"),
      ],
    });

    const saveDetailsLambda = new lambda.Function(this, "saveDetailsLambda", {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset("lambda"), // path to the directory with Lambda code
      handler: "saveDetailsHandler.main", // file is "saveDetailsHandler", function is "main"
      role: saveDetailsLambdaRole,
      timeout: Duration.seconds(30),
      environment: {
        DETAILS_TABLE_NAME: detailsTable.tableName,
      },
    });

    const apiGateway = new apigateway.RestApi(this, "MyApi", {
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    const saveDetailsResource = apiGateway.root.addResource("save-details"); //and S3 path
    saveDetailsResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(saveDetailsLambda)
    );

    const preSignedUrlResource = apiGateway.root.addResource("presigned-url");
    preSignedUrlResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(preSignedUrlLambda)
    );
  }
}
