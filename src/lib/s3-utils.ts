// /**
//  * S3 Access Utilities
//  *
//  * This file provides utilities for accessing S3 directly from the frontend.
//  * Currently uses the Lambda proxy endpoint. When converted to Lambda with
//  * CloudFormation, this will use temporary credentials from AWS STS.
//  */

// interface S3Credentials {
//     accessKeyId: string;
//     secretAccessKey: string;
//     sessionToken: string;
//     expiration: string;
// }

// interface S3CredentialsResponse {
//     credentials?: S3Credentials;
//     username: string;
//     bucket: string;
//     prefix: string;
//     region: string;
//     message?: string;
//     note?: string;
// }

// /**
//  * Get temporary S3 credentials for the authenticated user
//  * NOTE: This will be fully implemented when converted to Lambda
//  */
// export async function getS3Credentials(
//     accessToken: string
// ): Promise<S3CredentialsResponse> {
//     const response = await fetch("/api/s3/credentials", {
//         headers: {
//             Authorization: `Bearer ${accessToken}`,
//         },
//     });

//     if (!response.ok) {
//         const error = await response.json();
//         throw new Error(error.error || "Failed to get S3 credentials");
//     }

//     return response.json();
// }

// /**
//  * List files in user's S3 directory using the Lambda proxy
//  * This is the current implementation using the existing Lambda function
//  */
// export async function listUserFiles(accessToken: string) {
//     const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

//     const response = await fetch(`${API_BASE_URL}/files`, {
//         headers: {
//             Authorization: `Bearer ${accessToken}`,
//         },
//     });

//     if (!response.ok) {
//         const error = await response.json();
//         throw new Error(error.error || "Failed to list files");
//     }

//     return response.json();
// }

// /**
//  * Future: Direct S3 access using temporary credentials
//  * This will be implemented when using AWS STS credentials
//  *
//  * Example usage:
//  * ```typescript
//  * const credentials = await getS3Credentials(accessToken);
//  * const s3 = new AWS.S3({
//  *   accessKeyId: credentials.accessKeyId,
//  *   secretAccessKey: credentials.secretAccessKey,
//  *   sessionToken: credentials.sessionToken,
//  *   region: credentials.region
//  * });
//  *
//  * const objects = await s3.listObjectsV2({
//  *   Bucket: credentials.bucket,
//  *   Prefix: credentials.prefix
//  * }).promise();
//  * ```
//  */
