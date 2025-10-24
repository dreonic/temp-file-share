/**
 * Cognito Identity Pool utilities
 *
 * This approach lets the frontend get S3 credentials directly from
 * Cognito Identity Pool without needing a Lambda function.
 *
 * Identity Pool automatically creates user-specific IAM policies using
 * ${cognito-identity.amazonaws.com:sub} variable.
 */

import { S3Client } from "@aws-sdk/client-s3";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-providers";

const REGION = "ap-southeast-1";
const IDENTITY_POOL_ID = "ap-southeast-1:7f850e4c-0964-4d43-ac7f-c80c417a8dd5";
const USER_POOL_ID = "ap-southeast-1_1wixcmwPk";

/**
 * Get S3 client with Cognito Identity Pool credentials
 *
 * @param idToken - The ID token (not access token!) from Cognito authentication
 * @returns S3Client configured with temporary credentials scoped to user's prefix
 */
export function getS3ClientWithIdentityPool(idToken: string): S3Client {
    return new S3Client({
        region: REGION,
        credentials: fromCognitoIdentityPool({
            clientConfig: { region: REGION },
            identityPoolId: IDENTITY_POOL_ID,
            logins: {
                // IMPORTANT: Use ID token here, not access token!
                [`cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`]:
                    idToken,
            },
        }),
    });
}

/**
 * Check if user has valid ID token stored
 */
export function hasIdentityPoolCredentials(): boolean {
    // Check if we have an ID token stored
    // You'll need to store this along with access token in your auth flow
    const idToken = getStoredIdToken();
    return !!idToken;
}

/**
 * Get stored ID token from cookies/localStorage
 * This should be stored during the OAuth callback
 */
function getStoredIdToken(): string | null {
    // Import from your existing auth-utils or implement here
    if (typeof window === "undefined") return null;

    // If using cookies (recommended)
    const cookies = document.cookie.split(";");
    const idTokenCookie = cookies.find((c) => c.trim().startsWith("id_token="));
    if (idTokenCookie) {
        return idTokenCookie.split("=")[1];
    }

    return null;
}

/**
 * Example: List user's files using Identity Pool credentials
 */
export async function listUserFilesWithIdentityPool(
    idToken: string,
    username: string,
    bucket: string = "temp-file-share-data"
) {
    const s3Client = getS3ClientWithIdentityPool(idToken);

    // The credentials are automatically scoped to the user's prefix
    // because of the IAM policy in the Identity Pool role
    const { ListObjectsV2Command } = await import("@aws-sdk/client-s3");

    const command = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: `${username}/`,
        MaxKeys: 100,
    });

    return await s3Client.send(command);
}
