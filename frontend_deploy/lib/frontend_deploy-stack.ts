import { CfnOutput, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Bucket, BucketAccessControl } from "aws-cdk-lib/aws-s3";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import { Distribution, OriginAccessIdentity } from "aws-cdk-lib/aws-cloudfront";
import { S3Origin } from "aws-cdk-lib/aws-cloudfront-origins";

export class FrontendDeployStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const frontendBucket = new Bucket(this, "ReactFrontendBucket", {
      accessControl: BucketAccessControl.PRIVATE,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    new BucketDeployment(this, "DeployReactApp", {
      sources: [Source.asset("../react-frontend/dist")],
      destinationBucket: frontendBucket,
    });

    const originAccessIdentity = new OriginAccessIdentity(
      this,
      "OriginAccessIdentity"
    );
    frontendBucket.grantRead(originAccessIdentity);

    const distribution = new Distribution(this, "Distribution", {
      defaultRootObject: "index.html",
      defaultBehavior: {
        origin: new S3Origin(frontendBucket, { originAccessIdentity }),
      },
    });

    new CfnOutput(this, "ReactAppURL", {
      value: distribution.distributionDomainName,
    });
  }
}
