import { NextRequest, NextResponse } from "next/server";
import { cognitoConfig } from "@/lib/cognito-config";
import { STSClient, GetFederationTokenCommand } from "@aws-sdk/client-sts";

// Initialize STS client
const stsClient = new STSClient({ region: "ap-southeast-1" });
const BUCKET_NAME = "temp-file-share-data";

interface UserInfo {
    sub: string;
    email?: string;
    username?: string;
    "cognito:username"?: string;
}

// Verify token with Cognito
async function verifyToken(accessToken: string): Promise<UserInfo> {
    const response = await fetch(
        `https://${cognitoConfig.domain}/oauth2/userInfo`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    );

    if (!response.ok) {
        throw new Error("Failed to verify token");
    }

    return response.json();
}

export async function GET(request: NextRequest) {
    try {
        // Extract access token from Authorization header
        const authHeader = request.headers.get("Authorization");

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json(
                { error: "Missing or invalid authorization header" },
                { status: 401 }
            );
        }

        const accessToken = authHeader.substring(7);

        // Verify token and get user info
        const userInfo = await verifyToken(accessToken);
        const username =
            userInfo["cognito:username"] || userInfo.username || userInfo.sub;

        if (!username) {
            return NextResponse.json(
                { error: "Username not found in token" },
                { status: 400 }
            );
        }

        // Generate temporary credentials with user-specific policy
        // This policy is created dynamically for EACH request
        const userPolicy = {
            Version: "2012-10-17",
            Statement: [
                {
                    Effect: "Allow",
                    Action: ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
                    // ONLY this user's prefix
                    Resource: `arn:aws:s3:::${BUCKET_NAME}/${username}/*`,
                },
                {
                    Effect: "Allow",
                    Action: ["s3:ListBucket"],
                    Resource: `arn:aws:s3:::${BUCKET_NAME}`,
                    Condition: {
                        StringLike: {
                            // ONLY list with this prefix
                            "s3:prefix": [`${username}/*`],
                        },
                    },
                },
            ],
        };

        // Call STS to get temporary credentials
        // These credentials are SCOPED to the user's prefix only
        const command = new GetFederationTokenCommand({
            Name: username, // Session name
            Policy: JSON.stringify(userPolicy), // Runtime policy injection
            DurationSeconds: 3600, // 1 hour (can be up to 129600 = 36 hours)
        });

        const stsResponse = await stsClient.send(command);

        if (!stsResponse.Credentials) {
            throw new Error("Failed to generate credentials");
        }

        return NextResponse.json({
            credentials: {
                accessKeyId: stsResponse.Credentials.AccessKeyId!,
                secretAccessKey: stsResponse.Credentials.SecretAccessKey!,
                sessionToken: stsResponse.Credentials.SessionToken!,
                expiration: stsResponse.Credentials.Expiration!.toISOString(),
            },
            username,
            bucket: BUCKET_NAME,
            prefix: `${username}/`,
            region: "ap-southeast-1",
        });
    } catch (error) {
        console.error("Error in get-credentials:", error);
        return NextResponse.json(
            {
                error: "Failed to generate credentials",
                details:
                    error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
    });
}
