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
* cdk bootstrap
* cdk deploy
* You should now see an output containing the api gateway url, copy the whole url (including trailing slash)
e.g. BackendStack.apiGatewayEndpoint8F3C8843 = https://a0eh4yblle.execute-api.us-east-1.amazonaws.com/prod/
* cd ../react-frontend
* Paste the api gateway url in the react-frontend/.env file and save
* npm run build
* cd ../frontend_deploy
* cdk bootstrap
* cdk deploy
* Navigate to the URL outputted by the terminal
* Enjoy demoing the app!



