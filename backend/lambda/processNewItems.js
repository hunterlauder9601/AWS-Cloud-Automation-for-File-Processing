import {
  DescribeInstancesCommand,
  EC2Client,
  RunInstancesCommand,
} from "@aws-sdk/client-ec2";
import {
  DescribeInstanceInformationCommand,
  SSMClient,
  SendCommandCommand,
} from "@aws-sdk/client-ssm";

const ec2Client = new EC2Client({ region: process.env.AWS_REGION });
const ssmClient = new SSMClient({ region: process.env.AWS_REGION });

const waitForEC2InstanceRunning = async (instanceId) => {
  let instanceState = null;
  while (instanceState !== "running") {
    const { Reservations } = await ec2Client.send(
      new DescribeInstancesCommand({
        InstanceIds: [instanceId],
      })
    );

    const instance = Reservations[0]?.Instances[0];
    instanceState = instance.State.Name;

    if (instanceState !== "running") {
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
  }
};

async function waitForSSMAgentAvailability(instanceId) {
  let isInstanceRegisteredWithSSM = false;
  while (!isInstanceRegisteredWithSSM) {
    const { InstanceInformationList } = await ssmClient.send(
      new DescribeInstanceInformationCommand({})
    );
    isInstanceRegisteredWithSSM = !!InstanceInformationList?.some(
      (info) => info.InstanceId === instanceId
    );

    if (!isInstanceRegisteredWithSSM) {
      console.log("Instance is not registered with SSM yet, waiting...");
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
  }
  console.log(
    `Instance ${instanceId} is registered with SSM and ready for commands.`
  );
}

const waitForInstanceReady = async (instanceId) => {
  await waitForEC2InstanceRunning(instanceId);
  await waitForSSMAgentAvailability(instanceId);
};

export const main = async (event) => {
  for (const record of event.Records) {
    if (record.eventName === "INSERT") {
      const newImage = record.dynamodb?.NewImage;
      const inputText = newImage?.inputText.S;
      console.log(inputText);

      const inputFileS3Path = newImage?.inputFilePath.S;
      console.log(inputFileS3Path);

      const id = newImage?.id.S;
      console.log(id);

      const bucketName = process.env.BUCKET_NAME;
      console.log(bucketName);

      if (id === undefined || bucketName === undefined) {
        throw new Error("Required information to update the item is missing");
      }

      const fileName = inputFileS3Path?.slice(
        inputFileS3Path.lastIndexOf("/") + 1
      );

      console.log(fileName);

      const outputFileName = `Output-${fileName}`;

      // ec2 configurations
      const runCommand = new RunInstancesCommand({
        ImageId: "ami-051f8a213df8bc089",
        InstanceType: "t2.micro",
        MinCount: 1,
        MaxCount: 1,
        IamInstanceProfile: {
          Arn: process.env.IAM_ARN,
        },
      });

      try {
        const runResponse = await ec2Client.send(runCommand);
        if (!runResponse.Instances || runResponse.Instances.length === 0) {
          throw new Error("No instances were created");
        }
        const instanceId = runResponse.Instances[0].InstanceId;
        console.log(instanceId);

        await waitForInstanceReady(instanceId); // waiting to ensure ssm command does not fail

        const sendCommand = new SendCommandCommand({
          InstanceIds: [instanceId],
          DocumentName: "AWS-RunShellScript",
          Parameters: {
            commands: [
              `cd /tmp || exit`,
              `aws s3 cp s3://${bucketName}/shell-scripts/append_to_file.sh ./append_to_file.sh`,
              `chmod +x append_to_file.sh`,
              `aws s3 cp s3://${inputFileS3Path} ${fileName}`,
              `./append_to_file.sh ${fileName} "${inputText}"`,
              `aws s3 cp ${outputFileName} s3://${bucketName}/processed-files/${id}/${outputFileName} --metadata instanceId=${instanceId}`,
            ],
          },
        });
        await ssmClient.send(sendCommand);
      } catch (error) {
        console.error("Error in processing", error);
        throw error;
      }
    }
  }
};
