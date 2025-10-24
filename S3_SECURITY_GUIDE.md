# S3 User Access Security Guide

## The Problem: Per-User S3 Access Control

**Question**: How do I give each user access to ONLY their S3 prefix?

```
s3://temp-file-share-data/user1/*  ← Only user1 can access
s3://temp-file-share-data/user2/*  ← Only user2 can access
```

## ❌ Wrong Approach: One IAM Role Per User

```yaml
# DON'T DO THIS!
IAM Roles:
    - user1-s3-role:
          Policy:
              Resource: "arn:aws:s3:::bucket/user1/*"

    - user2-s3-role:
          Policy:
              Resource: "arn:aws:s3:::bucket/user2/*"

    - user3-s3-role:
          Policy:
              Resource: "arn:aws:s3:::bucket/user3/*"

    # ... one role for every user = nightmare!
```

**Why This is Bad:**

-   ❌ Can't create roles dynamically for new users
-   ❌ AWS limits: 1000 roles per account by default
-   ❌ Management nightmare (thousands of users = thousands of roles)
-   ❌ Can't easily update permissions for all users
-   ❌ Can't clean up roles when users leave
-   ❌ Role creation requires AWS admin permissions

---

## ✅ Right Approach: One Role + Dynamic STS Policies

### The Solution: AWS STS (Security Token Service)

Create **ONE base role** that has broad S3 access, but generate **temporary credentials** with user-specific policies at runtime.

```yaml
# Only ONE IAM role needed!
BaseS3AccessRole:
    Policy:
        # Broad permission - allows all prefixes
        Resource: "arn:aws:s3:::bucket/*"
```

Then, when a user requests access:

```typescript
// Runtime: Generate temp credentials with RESTRICTED policy
const tempCredentials = await sts.getFederationToken({
    Name: "user123",
    Policy: JSON.stringify({
        Statement: [
            {
                Resource: "arn:aws:s3:::bucket/user123/*", // ← User-specific!
            },
        ],
    }),
    DurationSeconds: 3600, // 1 hour
});
```

**Result**: User gets credentials that ONLY work for their prefix!

---

## How It Works: The Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User authenticates and gets access token (Cognito)      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. User requests S3 credentials                             │
│    GET /api/s3/credentials                                  │
│    Headers: Authorization: Bearer <access_token>            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Backend validates token and extracts username            │
│    → Token verified with Cognito                            │
│    → Username extracted: "user123"                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Backend calls AWS STS.GetFederationToken()              │
│                                                             │
│    Policy (created at runtime):                             │
│    {                                                        │
│      "Statement": [{                                        │
│        "Resource": "arn:aws:s3:::bucket/user123/*"         │
│      }]                                                     │
│    }                                                        │
│                                                             │
│    ← This policy is INJECTED at runtime!                   │
│    ← Different for every user!                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. STS returns temporary credentials                        │
│    {                                                        │
│      accessKeyId: "ASIA...",                               │
│      secretAccessKey: "...",                               │
│      sessionToken: "...",                                  │
│      expiration: "2025-10-25T12:00:00Z"                   │
│    }                                                        │
│                                                             │
│    ← Valid for 1 hour                                      │
│    ← Only works for user123/* prefix                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. User uses credentials to access S3 directly             │
│                                                             │
│    const s3 = new S3Client({                               │
│      credentials: tempCredentials                          │
│    });                                                     │
│                                                             │
│    ✅ s3.getObject("bucket/user123/file.pdf")  → Works!   │
│    ❌ s3.getObject("bucket/user456/file.pdf")  → Denied!  │
└─────────────────────────────────────────────────────────────┘
```

---

## Two STS Methods

### Method 1: GetFederationToken (Simpler) ✅ Recommended

**Use when:** Your Lambda/Backend has AWS credentials

```typescript
import { STSClient, GetFederationTokenCommand } from "@aws-sdk/client-sts";

const sts = new STSClient({ region: "ap-southeast-1" });

// Create user-specific policy at runtime
const userPolicy = {
    Version: "2012-10-17",
    Statement: [
        {
            Effect: "Allow",
            Action: ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
            Resource: `arn:aws:s3:::bucket/${username}/*`, // ← Dynamic!
        },
        {
            Effect: "Allow",
            Action: ["s3:ListBucket"],
            Resource: `arn:aws:s3:::bucket`,
            Condition: {
                StringLike: {
                    "s3:prefix": [`${username}/*`], // ← Only list their files
                },
            },
        },
    ],
};

// Get temporary credentials
const response = await sts.send(
    new GetFederationTokenCommand({
        Name: username,
        Policy: JSON.stringify(userPolicy),
        DurationSeconds: 3600, // 1 hour
    })
);

// Return to user
return response.Credentials;
```

**Pros:**

-   Simpler implementation
-   No need to create IAM roles
-   Works with any AWS credentials

**Cons:**

-   Max duration: 36 hours
-   Requires your Lambda to have broad S3 permissions

**IAM Setup:**

```yaml
# Your Lambda execution role needs:
LambdaExecutionRole:
    Policies:
        - PolicyName: STSGetFederationToken
          Statement:
              - Effect: Allow
                Action: sts:GetFederationToken
                Resource: "*"
        - PolicyName: S3FullAccess
          Statement:
              - Effect: Allow
                Action: s3:*
                Resource: arn:aws:s3:::bucket/*
```

### Method 2: AssumeRole (More Secure) 🔒

**Use when:** You want stricter permission boundaries

```typescript
import { STSClient, AssumeRoleCommand } from "@aws-sdk/client-sts";

const sts = new STSClient({ region: "ap-southeast-1" });

const response = await sts.send(
    new AssumeRoleCommand({
        RoleArn: "arn:aws:iam::ACCOUNT:role/UserS3AccessRole",
        RoleSessionName: username,
        Policy: JSON.stringify(userPolicy), // Further restricts the role
        DurationSeconds: 3600,
    })
);
```

**Pros:**

-   More secure (explicit trust relationship)
-   Longer duration possible (up to 12 hours with role chaining)
-   Better audit trail (CloudTrail shows role assumption)

**Cons:**

-   Requires creating a role
-   More complex setup

**IAM Setup:**

```yaml
# Create ONE role for all users
UserS3AccessRole:
    AssumeRolePolicyDocument:
        Statement:
            - Effect: Allow
              Principal:
                  AWS: !GetAtt LambdaExecutionRole.Arn
              Action: sts:AssumeRole
    Policies:
        - PolicyName: S3Access
          Statement:
              - Effect: Allow
                Action: s3:*
                Resource: arn:aws:s3:::bucket/*

# Lambda execution role needs:
LambdaExecutionRole:
    Policies:
        - PolicyName: AssumeUserS3Role
          Statement:
              - Effect: Allow
                Action: sts:AssumeRole
                Resource: !GetAtt UserS3AccessRole.Arn
```

---

## Comparison Table

| Feature          | GetFederationToken | AssumeRole               |
| ---------------- | ------------------ | ------------------------ |
| **Roles needed** | 0 (no roles!)      | 1 role for all users     |
| **Max duration** | 36 hours           | 12 hours (role chaining) |
| **Complexity**   | Simple             | Medium                   |
| **Security**     | Good               | Better (explicit trust)  |
| **CloudTrail**   | Shows STS calls    | Shows role assumption    |
| **Best for**     | Quick setup        | Production systems       |

---

## Implementation in Your Code

### Current Implementation (Next.js API Route)

Located at: `src/app/api/s3/credentials/route.ts`

```typescript
export async function GET(request: NextRequest) {
    // 1. Verify user's access token
    const userInfo = await verifyToken(accessToken);
    const username = userInfo["cognito:username"];

    // 2. Create user-specific policy
    const userPolicy = {
        Version: "2012-10-17",
        Statement: [
            {
                Effect: "Allow",
                Action: ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
                Resource: `arn:aws:s3:::${BUCKET_NAME}/${username}/*`,
            },
        ],
    };

    // 3. Get temporary credentials via STS
    const command = new GetFederationTokenCommand({
        Name: username,
        Policy: JSON.stringify(userPolicy),
        DurationSeconds: 3600,
    });

    const stsResponse = await stsClient.send(command);

    // 4. Return credentials to user
    return NextResponse.json({
        credentials: {
            accessKeyId: stsResponse.Credentials.AccessKeyId,
            secretAccessKey: stsResponse.Credentials.SecretAccessKey,
            sessionToken: stsResponse.Credentials.SessionToken,
            expiration: stsResponse.Credentials.Expiration,
        },
        bucket: BUCKET_NAME,
        prefix: `${username}/`,
    });
}
```

### Frontend Usage

```typescript
import {
    S3Client,
    ListObjectsV2Command,
    PutObjectCommand,
} from "@aws-sdk/client-s3";

// 1. Get temporary credentials
const response = await fetch("/api/s3/credentials", {
    headers: {
        Authorization: `Bearer ${accessToken}`,
    },
});

const { credentials, bucket, prefix, region } = await response.json();

// 2. Create S3 client with temporary credentials
const s3Client = new S3Client({
    region: region,
    credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken,
    },
});

// 3. List files (only user's files!)
const listCommand = new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: prefix,
});
const files = await s3Client.send(listCommand);

// 4. Upload a file (only to user's prefix!)
const uploadCommand = new PutObjectCommand({
    Bucket: bucket,
    Key: `${prefix}myfile.pdf`,
    Body: fileData,
});
await s3Client.send(uploadCommand);

// This would FAIL (user can't access other user's files):
// await s3Client.send(new PutObjectCommand({
//   Bucket: bucket,
//   Key: "otheruser/file.pdf"  // ❌ Access Denied!
// }));
```

---

## Required AWS Setup

### For Local Development (Next.js API Route)

Your backend needs AWS credentials to call STS:

```bash
# Option 1: AWS CLI credentials
aws configure
# Provide: Access Key, Secret Key, Region

# Option 2: Environment variables
# Add to .env.local:
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=ap-southeast-1
```

Your AWS user/role needs these permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": "sts:GetFederationToken",
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::temp-file-share-data",
                "arn:aws:s3:::temp-file-share-data/*"
            ]
        }
    ]
}
```

### For Lambda (Future Deployment)

Lambda execution role needs the same permissions above. CloudFormation will create this automatically when you deploy.

---

## Security Best Practices

### ✅ Do's

1. **Always validate the user's token** before generating credentials
2. **Set reasonable expiration times** (1-4 hours)
3. **Use HTTPS only** for credential transmission
4. **Log credential generation** for audit trails
5. **Use StringLike conditions** to enforce prefix restrictions
6. **Implement rate limiting** to prevent credential spam

### ❌ Don'ts

1. **Never create one role per user** (doesn't scale)
2. **Never hardcode credentials** in frontend
3. **Never use permanent credentials** for user access
4. **Never allow wildcards** in user-generated policies
5. **Never skip token validation**
6. **Never return credentials without expiration**

---

## Troubleshooting

### "Access Denied" when calling STS

**Problem**: Your backend doesn't have permission to call STS.

**Solution**: Add `sts:GetFederationToken` permission to your AWS credentials.

### "Access Denied" when user accesses S3

**Problem**: Generated policy is too restrictive or doesn't match S3 path.

**Solution**: Check that:

-   Username matches S3 prefix exactly
-   Policy includes both GetObject (for files) and ListBucket (for listing)
-   Bucket name is correct

### Credentials expire too quickly

**Problem**: DurationSeconds is too low.

**Solution**:

-   GetFederationToken: Max 129,600 seconds (36 hours)
-   AssumeRole: Max 43,200 seconds (12 hours)
-   Implement refresh mechanism in frontend

---

## Summary

**Answer to your question:**

> Should I create a role for each user with `Resource: "arn:aws:s3:::bucket/prefix/*"`?

**NO!** Create:

-   ✅ **One base role** (or zero with GetFederationToken)
-   ✅ **Dynamic STS policies** generated at runtime
-   ✅ **Temporary credentials** scoped to each user's prefix

This gives you:

-   🎯 Per-user isolation (each user only sees their files)
-   🔄 Dynamic user management (no role creation needed)
-   ⏱️ Time-limited access (credentials expire)
-   📈 Scalability (works for millions of users)
-   🔒 Security (can't access other users' data)

**The magic is**: The policy is created **at runtime** using the authenticated username, so you don't need to pre-create anything for each user!
