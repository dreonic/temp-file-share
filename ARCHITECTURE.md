# Authentication & S3 Access Architecture

## Current Setup (Next.js API Routes)

### Overview

The application currently uses **Next.js API routes** to handle authentication and S3 access. This keeps sensitive credentials (like Cognito client secret) on the backend while running everything locally.

### Components

#### 1. `/api/auth/exchange-token` (POST)

-   **Purpose**: Exchange OAuth authorization code for access tokens
-   **Security**: Client secret is kept on the backend (not exposed to frontend)
-   **Location**: `src/app/api/auth/exchange-token/route.ts`
-   **Usage**: Called by `auth-utils.ts` after OAuth callback

#### 2. `/api/s3/credentials` (GET)

-   **Purpose**: Generate temporary S3 credentials for authenticated users
-   **Current Status**: Placeholder - returns user info and bucket details
-   **Future**: Will use AWS STS to generate temporary credentials
-   **Location**: `src/app/api/s3/credentials/route.ts`

#### 3. Existing Lambda Function

-   **Purpose**: Lists user's files from S3
-   **Location**: `lambda/index.mjs`
-   **API**: Already deployed via API Gateway
-   **Usage**: Used by `FileList.tsx` component

### Security Improvements

**Before:**

```typescript
// ❌ Client secret exposed in frontend bundle
client_secret: "1tcqi8g7sn6r5cjlob13487sg9qsmuhkdtd99gbs882hs72ojfou";
```

**After:**

```typescript
// ✅ Client secret only in backend API route
// Frontend calls: POST /api/auth/exchange-token
```

### Current Auth Flow

```
1. User clicks "Login"
   ↓
2. Redirect to Cognito/Google OAuth
   ↓
3. User authenticates with Google
   ↓
4. Cognito redirects back with authorization code
   ↓
5. Frontend calls: POST /api/auth/exchange-token { code }
   ↓
6. Backend exchanges code for tokens (client secret stays secure)
   ↓
7. Frontend receives tokens, stores in cookies
   ↓
8. Frontend uses access token for API calls
```

### S3 Access Flow

```
Current (via Lambda proxy):
User → FileList component → Lambda /files endpoint → S3
         (with access token)

Future (direct access with temp credentials):
User → Get temp credentials → Direct S3 access from browser
         (with access token)     (with temp credentials)
```

---

## Future: CloudFormation Migration

### Why Migrate to CloudFormation?

1. **Scalability**: Lambda functions scale automatically
2. **Cost**: Pay only for actual usage, no always-on servers
3. **Infrastructure as Code**: Version control your infrastructure
4. **AWS Integration**: Native STS support for temporary credentials

### What Will Change

#### Lambda Functions (2 new + 1 existing)

1. **`exchange-token` Lambda**

    - Replace: `src/app/api/auth/exchange-token/route.ts`
    - Do: Same functionality, runs as Lambda

2. **`get-s3-credentials` Lambda**

    - Replace: `src/app/api/s3/credentials/route.ts`
    - Do: Use AWS STS to generate real temporary credentials
    - Users can access S3 directly from browser

3. **`list-files` Lambda** (already exists)
    - Keep as-is

#### CloudFormation Template Structure

```yaml
Resources:
    # IAM Roles
    - AuthLambdaExecutionRole
    - S3CredentialsLambdaRole
    - UserS3AccessRole (for temp credentials)

    # Lambda Functions
    - ExchangeTokenFunction
    - GetS3CredentialsFunction
    - (existing) ListFilesFunction

    # API Gateway
    - REST API with endpoints
    - CORS configuration
    - Lambda permissions

    # Outputs
    - API endpoint URLs
    - Function ARNs
```

### Migration Steps (When Ready)

1. **Create CloudFormation template**

    ```bash
    # Template will be in: cloudformation/auth-stack.yaml
    ```

2. **Deploy the stack**

    ```bash
    aws cloudformation create-stack \
      --stack-name temp-file-share-auth \
      --template-body file://cloudformation/auth-stack.yaml \
      --capabilities CAPABILITY_IAM \
      --parameters \
        ParameterKey=CognitoClientSecret,ParameterValue=YOUR_SECRET \
        ParameterKey=AllowedOrigin,ParameterValue=https://your-domain.com
    ```

3. **Update frontend configuration**

    ```typescript
    // Update API URLs to point to API Gateway
    const API_BASE_URL =
        "https://YOUR_API_ID.execute-api.ap-southeast-1.amazonaws.com/prod";
    ```

4. **Remove Next.js API routes** (optional)

    - Can keep them for local development
    - Use environment variables to switch between local/Lambda

5. **Test the migration**
    - Verify token exchange works
    - Test temporary credential generation
    - Confirm S3 direct access

### Direct S3 Access (After Migration)

Once migrated, users can access S3 directly:

```typescript
import AWS from "aws-sdk";

// Get temporary credentials
const credResponse = await fetch(`${API_BASE_URL}/get-credentials`, {
    headers: { Authorization: `Bearer ${accessToken}` },
});
const { credentials, bucket, prefix, region } = await credResponse.json();

// Configure S3 with temporary credentials
const s3 = new AWS.S3({
    accessKeyId: credentials.accessKeyId,
    secretAccessKey: credentials.secretAccessKey,
    sessionToken: credentials.sessionToken,
    region: region,
});

// Direct S3 access (no Lambda proxy needed!)
const objects = await s3
    .listObjectsV2({
        Bucket: bucket,
        Prefix: prefix,
    })
    .promise();

// Upload file directly to S3
await s3
    .putObject({
        Bucket: bucket,
        Key: `${prefix}myfile.pdf`,
        Body: fileData,
    })
    .promise();
```

### Benefits of Direct S3 Access

-   **Faster uploads**: No Lambda proxy bottleneck
-   **Large files**: No Lambda payload size limits (6MB)
-   **Real-time progress**: Upload progress tracking
-   **Reduced costs**: No Lambda invocation costs for uploads
-   **Better UX**: Direct browser-to-S3 communication

---

## File Structure

```
src/
├── app/
│   └── api/
│       ├── auth/
│       │   └── exchange-token/
│       │       └── route.ts          # Token exchange (backend)
│       └── s3/
│           └── credentials/
│               └── route.ts          # S3 credentials (backend)
│
├── lib/
│   ├── auth-utils.ts                 # Auth helper functions
│   ├── cognito-config.ts             # Cognito configuration
│   └── s3-utils.ts                   # S3 access utilities
│
└── components/
    ├── FileList.tsx                  # Lists user's S3 files
    └── ...

lambda/                               # Existing Lambda functions
└── index.mjs                         # list-files function

cloudformation/                       # (Future) IaC templates
└── auth-stack.yaml                   # (When migrating to Lambda)
```

---

## Development Workflow

### Current (Next.js)

```bash
npm run dev
# Everything runs locally
# API routes at http://localhost:3000/api/*
```

### After CloudFormation Migration

```bash
# Local development - use Next.js API routes
NEXT_PUBLIC_USE_LOCAL_API=true npm run dev

# Production - use Lambda functions
NEXT_PUBLIC_API_URL=https://xxx.execute-api.amazonaws.com/prod npm run build
```

---

## Security Notes

### Current Setup

-   ✅ Client secret protected on backend
-   ✅ Tokens stored in secure cookies
-   ✅ CORS configured properly
-   ⚠️ All API routes require authentication

### After CloudFormation Migration

-   ✅ All of the above, plus:
-   ✅ IAM roles with least privilege
-   ✅ Temporary credentials (1 hour expiry)
-   ✅ User can only access their own S3 prefix
-   ✅ CloudWatch logging for monitoring
-   ✅ API Gateway rate limiting

---

## Next Steps

1. **Test current setup** with Next.js API routes
2. **Verify authentication** flow works end-to-end
3. **When ready to migrate**: Create CloudFormation template
4. **Deploy to Lambda**: Use AWS CLI or Console
5. **Update frontend**: Point to new API Gateway URLs
6. **Implement direct S3 access**: Use temporary credentials

---

## Questions?

-   Keep everything in Next.js for now? ✅ **Current choice**
-   Want to migrate specific functions? Easy to do incrementally
-   Need help with CloudFormation? Template is ready to customize
