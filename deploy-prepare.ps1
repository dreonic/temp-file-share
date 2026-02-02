# PowerShell script to prepare static files for deployment
Write-Host "Creating deployment directory..." -ForegroundColor Green

# Remove existing out directory
if (Test-Path "out") {
    Remove-Item -Recurse -Force "out"
}

Write-Host "Building the project for static export..." -ForegroundColor Yellow
npm run export

Write-Host "Static files generated in 'out' directory!" -ForegroundColor Green

# Optional: Build and deploy Lambda function
if ($args[0] -eq "--with-lambda") {
    Write-Host "Building Lambda function..." -ForegroundColor Yellow
    
    if (Test-Path "lambda-package.zip") {
        Remove-Item "lambda-package.zip"
    }
    
    # Install Lambda dependencies
    Set-Location "lambda"
    npm install --production
    
    # Create deployment package
    Compress-Archive -Path "*" -DestinationPath "..\lambda-package.zip"
    Set-Location ".."
    
    Write-Host "Lambda package created: lambda-package.zip" -ForegroundColor Green
    Write-Host "Deploy this to AWS Lambda manually or update the function:" -ForegroundColor Yellow
    Write-Host "aws lambda update-function-code --function-name temp-file-share-list-files --zip-file fileb://lambda-package.zip" -ForegroundColor Cyan
}

# The out directory should now contain all static files ready for S3

aws s3 sync out s3://temp-file-share-app

Write-Host "Files synced to S3 bucket 'temp-file-share-app'" -ForegroundColor Green

# Perform CloudFront invalidation
aws cloudfront create-invalidation --distribution-id ETVADS63NWGE0 --paths "/*"

Write-Host "CloudFront cache invalidated!" -ForegroundColor Green