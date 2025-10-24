# AWS Lambda and API Gateway Setup Instructions

## 1. Create the Lambda Function

### Step 1: Package the Lambda Function

```bash
cd lambda
npm install
zip -r ../lambda-package.zip .
```

### Step 2: Create IAM Role for Lambda

Create an IAM role with the following policies:

-   `AWSLambdaBasicExecutionRole` (AWS managed policy)
-   Custom policy for S3 access:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": ["s3:GetObject", "s3:ListBucket"],
            "Resource": [
                "arn:aws:s3:::temp-file-share-data",
                "arn:aws:s3:::temp-file-share-data/*"
            ]
        }
    ]
}
```

### Step 3: Create Lambda Function

```bash
aws lambda create-function \
  --function-name temp-file-share-list-files \
  --runtime nodejs18.x \
  --role arn:aws:iam::YOUR_ACCOUNT_ID:role/lambda-execution-role \
  --handler list-files.handler \
  --zip-file fileb://lambda-package.zip \
  --timeout 30 \
  --memory-size 256
```

## 2. Create API Gateway

### Step 1: Create REST API

```bash
aws apigateway create-rest-api --name temp-file-share-api
```

Note the API ID from the response.

### Step 2: Get Root Resource ID

```bash
aws apigateway get-resources --rest-api-id YOUR_API_ID
```

Note the root resource ID.

### Step 3: Create `/files` Resource

```bash
aws apigateway create-resource \
  --rest-api-id YOUR_API_ID \
  --parent-id YOUR_ROOT_RESOURCE_ID \
  --path-part files
```

Note the new resource ID.

### Step 4: Create GET Method

```bash
aws apigateway put-method \
  --rest-api-id YOUR_API_ID \
  --resource-id YOUR_FILES_RESOURCE_ID \
  --http-method GET \
  --authorization-type NONE
```

### Step 5: Create OPTIONS Method (for CORS)

```bash
aws apigateway put-method \
  --rest-api-id YOUR_API_ID \
  --resource-id YOUR_FILES_RESOURCE_ID \
  --http-method OPTIONS \
  --authorization-type NONE
```

### Step 6: Set Up Lambda Integration for GET

```bash
aws apigateway put-integration \
  --rest-api-id YOUR_API_ID \
  --resource-id YOUR_FILES_RESOURCE_ID \
  --http-method GET \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri arn:aws:apigateway:ap-southeast-1:lambda:path/2015-03-31/functions/arn:aws:lambda:ap-southeast-1:YOUR_ACCOUNT_ID:function:temp-file-share-list-files/invocations
```

### Step 7: Set Up Lambda Integration for OPTIONS

```bash
aws apigateway put-integration \
  --rest-api-id YOUR_API_ID \
  --resource-id YOUR_FILES_RESOURCE_ID \
  --http-method OPTIONS \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri arn:aws:apigateway:ap-southeast-1:lambda:path/2015-03-31/functions/arn:aws:lambda:ap-southeast-1:YOUR_ACCOUNT_ID:function:temp-file-share-list-files/invocations
```

### Step 8: Grant API Gateway Permission to Invoke Lambda

```bash
aws lambda add-permission \
  --function-name temp-file-share-list-files \
  --statement-id api-gateway-invoke \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:ap-southeast-1:YOUR_ACCOUNT_ID:YOUR_API_ID/*/*"
```

### Step 9: Deploy API

```bash
aws apigateway create-deployment \
  --rest-api-id YOUR_API_ID \
  --stage-name prod
```

## 3. Update Frontend Configuration

After deployment, update the API URL in `src/components/FileList.tsx`:

```typescript
const API_BASE_URL =
    "https://YOUR_API_ID.execute-api.ap-southeast-1.amazonaws.com/prod";
```

## 4. Test the Setup

### Test Lambda Function Directly

```bash
aws lambda invoke \
  --function-name temp-file-share-list-files \
  --payload '{"httpMethod":"GET","headers":{"Authorization":"Bearer YOUR_ACCESS_TOKEN"}}' \
  response.json
```

### Test API Gateway

```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  https://YOUR_API_ID.execute-api.ap-southeast-1.amazonaws.com/prod/files
```

## 5. S3 Bucket Structure

Files should be organized in S3 as follows:

```
temp-file-share-data/
├── username1/
│   ├── file1.pdf
│   ├── file2.jpg
│   └── document.txt
├── username2/
│   ├── image.png
│   └── data.csv
```

The Lambda function will only return files under the authenticated user's prefix.

## 6. Security Notes

-   The Lambda function validates JWT tokens from Cognito
-   Users can only see files in their own directory (username prefix)
-   CORS is configured to only allow your domain
-   All API calls require valid authentication

## 7. Environment Variables

Set these environment variables in your Lambda function if needed:

-   `S3_BUCKET_NAME`: temp-file-share-data (already hardcoded)
-   `NODE_ENV`: production

## 8. Monitoring

Enable CloudWatch logs for your Lambda function to monitor API calls and debug issues.
