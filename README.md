# Fovus-Challenge

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
