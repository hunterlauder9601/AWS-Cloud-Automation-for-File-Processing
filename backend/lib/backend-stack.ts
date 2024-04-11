import { Duration, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as s3 from "aws-cdk-lib/aws-s3";
import { RemovalPolicy } from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { DynamoEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import * as s3n from "aws-cdk-lib/aws-s3-notifications";

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

    //initial shell script deployment
    new BucketDeployment(this, "DeployShellScript", {
      sources: [Source.asset("scripts")],
      destinationBucket: fileUploadBucket,
      destinationKeyPrefix: "shell-scripts",
    });

    //policies for S3 and SSM access from ec2
    const ec2Role = new iam.Role(this, "EC2Role", {
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "AmazonSSMManagedInstanceCore"
        ),
      ],
    });

    const ec2s3Policy = new iam.PolicyStatement({
      actions: ["s3:GetObject", "s3:PutObject"],
      resources: [`${fileUploadBucket.bucketArn}/*`],
    });
    ec2Role.addToPolicy(ec2s3Policy);

    // IAM instance profile for ec2 instance
    const ec2InstanceProfile = new iam.CfnInstanceProfile(
      this,
      "EC2InstanceProfile",
      {
        roles: [ec2Role.roleName],
      }
    );

    // DDB Table instantiation
    const detailsTable = new dynamodb.Table(this, "DetailsTable", {
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      stream: dynamodb.StreamViewType.NEW_IMAGE,
    });

    // Presigned URL creation for direct file upload from browser

    const preSignedUrlLambda = new lambda.Function(this, "PreSignedUrlLambda", {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset("lambda"),
      handler: "presignedUrl.main",
      environment: {
        BUCKET_NAME: fileUploadBucket.bucketName,
      },
    });

    fileUploadBucket.grantPut(preSignedUrlLambda);

    // initial details insert into DDB

    const insertDetailsDDBLambdaRole = new iam.Role(
      this,
      "insertDetailsDDBLambdaRole",
      {
        assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            "service-role/AWSLambdaBasicExecutionRole"
          ),
        ],
      }
    );

    const insertDetailsDDBPolicy = new iam.PolicyStatement({
      actions: ["dynamodb:PutItem"],
      resources: [detailsTable.tableArn],
    });
    insertDetailsDDBLambdaRole.addToPolicy(insertDetailsDDBPolicy);

    const insertDetailsDDBLambda = new lambda.Function(
      this,
      "insertDetailsDDBLambda",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        code: lambda.Code.fromAsset("lambda"),
        handler: "insertDetailsDDB.main",
        role: insertDetailsDDBLambdaRole,
        timeout: Duration.seconds(30),
        environment: {
          DETAILS_TABLE_NAME: detailsTable.tableName,
        },
      }
    );

    // ec2 creation and outputfile processing lambda

    const processNewItemsLambdaRole = new iam.Role(
      this,
      "processNewItemsLambdaRole",
      {
        assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            "service-role/AWSLambdaBasicExecutionRole"
          ),
        ],
      }
    );

    const processNewItemsLambda = new lambda.Function(
      this,
      "processNewItemsLambda",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        code: lambda.Code.fromAsset("lambda"),
        handler: "processNewItems.main",
        role: processNewItemsLambdaRole,
        timeout: Duration.seconds(120),
        environment: {
          BUCKET_NAME: fileUploadBucket.bucketName,
          IAM_ARN: ec2InstanceProfile.attrArn,
        },
      }
    );

    processNewItemsLambdaRole.addToPolicy(
      new iam.PolicyStatement({
        resources: ["*"],
        actions: [
          "ec2:RunInstances",
          "ssm:SendCommand",
          "iam:PassRole",
          "ec2:DescribeInstances",
          "ssm:DescribeInstanceInformation",
        ],
      })
    );

    processNewItemsLambda.addEventSource(
      new DynamoEventSource(detailsTable, {
        startingPosition: lambda.StartingPosition.TRIM_HORIZON,
        batchSize: 1,
        bisectBatchOnError: true,
        retryAttempts: 2,
      })
    );

    // ec2 termination and S3, DDB update lambda

    const completeNewItemsProcessLambdaRole = new iam.Role(
      this,
      "completeNewItemsProcessLambdaRole",
      {
        assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            "service-role/AWSLambdaBasicExecutionRole"
          ),
        ],
      }
    );

    const completeNewItemsProcessLambda = new lambda.Function(
      this,
      "completeNewItemsProcessLambda",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        code: lambda.Code.fromAsset("lambda"),
        handler: "completeNewItemsProcess.main",
        role: completeNewItemsProcessLambdaRole,
        environment: {
          DETAILS_TABLE_NAME: detailsTable.tableName,
        },
      }
    );

    completeNewItemsProcessLambdaRole.addToPolicy(
      new iam.PolicyStatement({
        resources: [detailsTable.tableArn, `${fileUploadBucket.bucketArn}/*`],
        actions: ["dynamodb:UpdateItem", "s3:GetObject", "s3:PutObject"],
      })
    );

    completeNewItemsProcessLambdaRole.addToPolicy(
      new iam.PolicyStatement({
        resources: ["*"],
        actions: ["ec2:TerminateInstances"],
      })
    );

    // s3 notification to trigger lambda
    fileUploadBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(completeNewItemsProcessLambda),
      {
        prefix: "processed-files/",
      }
    );

    //API gateway

    const apiGateway = new apigateway.RestApi(this, "apiGateway", {
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: ["OPTIONS", "GET", "POST"],
      },
    });

    const saveDetailsResource = apiGateway.root.addResource("save-details");
    saveDetailsResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(insertDetailsDDBLambda)
    );

    const preSignedUrlResource = apiGateway.root.addResource("presigned-url");
    preSignedUrlResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(preSignedUrlLambda)
    );
  }
}
