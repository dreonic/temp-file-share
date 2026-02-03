# PowerShell script to deploy frontend to S3 and invalidate CloudFront cache
# Usage: .\deploy-prepare.ps1 [--stack-name TempFileShareBackendStack]

param(
    [string]$StackName = "TempFileShareBackendStack"
)

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "  Temp File Share - Frontend Deploy" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Build the Next.js static export
Write-Host "[1/4] Building Next.js static export..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

# Check if out directory exists
if (-not (Test-Path "out")) {
    Write-Host "❌ Build directory 'out' not found!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build successful!" -ForegroundColor Green
Write-Host ""

# Step 2: Get CDK stack outputs
Write-Host "[2/4] Fetching CloudFront distribution ID and S3 bucket name from CDK..." -ForegroundColor Yellow

$cdkOutputs = aws cloudformation describe-stacks --stack-name $StackName --query "Stacks[0].Outputs" --output json | ConvertFrom-Json

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to fetch CDK outputs. Make sure the stack '$StackName' is deployed." -ForegroundColor Red
    exit 1
}

$bucketName = ($cdkOutputs | Where-Object { $_.OutputKey -eq "FrontendBucketName" }).OutputValue
$distributionId = ($cdkOutputs | Where-Object { $_.OutputKey -eq "FrontendDistributionId" }).OutputValue
$frontendUrl = ($cdkOutputs | Where-Object { $_.OutputKey -eq "FrontendUrl" }).OutputValue

if (-not $bucketName -or -not $distributionId) {
    Write-Host "❌ Could not find FrontendBucketName or FrontendDistributionId in stack outputs!" -ForegroundColor Red
    Write-Host "Make sure the CDK stack has been deployed with frontend infrastructure." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Found S3 bucket: $bucketName" -ForegroundColor Green
Write-Host "✅ Found CloudFront distribution: $distributionId" -ForegroundColor Green
Write-Host ""

# Step 3: Sync to S3
Write-Host "[3/4] Syncing files to S3..." -ForegroundColor Yellow
aws s3 sync out s3://$bucketName --delete

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ S3 sync failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Files synced to S3 successfully!" -ForegroundColor Green
Write-Host ""

# Step 4: Invalidate CloudFront cache
Write-Host "[4/4] Invalidating CloudFront cache..." -ForegroundColor Yellow
$invalidation = aws cloudfront create-invalidation --distribution-id $distributionId --paths "/*" --output json | ConvertFrom-Json

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ CloudFront invalidation failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ CloudFront cache invalidated! Invalidation ID: $($invalidation.Invalidation.Id)" -ForegroundColor Green
Write-Host ""

# Summary
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "  Deployment Complete! 🎉" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Frontend URL: $frontendUrl" -ForegroundColor Green
Write-Host "S3 Bucket: $bucketName" -ForegroundColor Gray
Write-Host "CloudFront Distribution: $distributionId" -ForegroundColor Gray
Write-Host ""
Write-Host "Note: CloudFront cache invalidation may take a few minutes to complete." -ForegroundColor Yellow
Write-Host "Visit $frontendUrl to view your deployed application." -ForegroundColor Cyan
