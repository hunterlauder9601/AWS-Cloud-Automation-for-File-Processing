# AWS Cloud Automation for File Processing

## Overview
This project aims to automate a cloud-based file processing system using AWS services. The system's architecture utilizes the AWS Cloud Development Kit (CDK) to provision infrastructure and leverages AWS SDK for JavaScript V3 within AWS Lambda for serverless operations.

### Features:
* Infrastructure as Code: Utilize AWS CDK with TypeScript to manage cloud resources.
* Serverless Integration: Implement AWS Lambda functions with the AWS SDK for JavaScript V3 to handle backend processes.
* Secure Configuration: Avoid hard-coded credentials and ensure that S3 bucket objects are not publicly accessible.
* User Interface: Develop a responsive web UI using ReactJS with TailwindCSS for styling.
* Data Persistence: Store inputs and outputs in DynamoDB using a FileTable structure.
* Automated Workflow:
Input handling through a web UI that captures text and file uploads.
S3 for storing input files and DynamoDB for metadata tracking.
EC2 instances are provisioned upon data ingestion for script execution.
Output file generation that concatenates input text with file content.
Clean-up process to terminate EC2 instances post-execution.

### Workflow:
* User Interaction:
A responsive web UI gathers user inputs: a text string and a file.
The file is uploaded to S3, and input data is saved in DynamoDB through an API Gateway and Lambda function.

### Back-End Processing:
* An EC2 instance is spun up upon new entries in DynamoDB.
This instance retrieves the script and input file from S3.
The script appends the text input to the file content and outputs a new file.

* Output Management:
The output file is uploaded back to S3.
DynamoDB is updated with the new file's metadata.
The EC2 instance is terminated to complete the process.

## Prerequisites
* Node.js installed
* An AWS account with appropriate permissions
* AWS CLI configured with your account credentials: aws configure
* AWS CDK Toolkit: npm install -g aws-cdk
* Git

## Setup
* git clone https://github.com/hunterlauder9601/Fovus-Challenge.git
* cd react-frontend
* npm install
* cd ../backend
* npm install
* cd lambda
* npm install
* cd ..
* cdk bootstrap
* cdk deploy
* You should now see an output containing the API gateway URL, copy the whole URL (including trailing slash)
  * e.g. BackendStack.apiGatewayEndpoint8F3C8843 = https://a0eh4yblle.execute-api.us-east-1.amazonaws.com/prod/
* cd ../react-frontend
* Paste the API gateway URL in the react-frontend/.env file and save
* npm run build
* cd ../frontend_deploy
* npm install
* cdk deploy
* In your browser, navigate to the URL outputted by the terminal
  * e.g. FrontendDeployStack.ReactAppURL = deg1lwmoiqsmk.cloudfront.net
* Enjoy demoing the app!
