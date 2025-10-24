/**
 * Lambda function that uses Cognito Identity Pool for S3 access
 *
 * This version accepts EITHER:
 * 1. Access token (for JWT verification) - returns file list via Lambda
 * 2. ID token (for Identity Pool) - validates and returns Identity Pool config
 */

import AWS from "aws-sdk";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";

const s3 = new AWS.S3();
const BUCKET_NAME = "temp-file-share-data";
const USER_POOL_ID = "ap-southeast-1_1wixcmwPk";
const IDENTITY_POOL_ID = "ap-southeast-1:7f850e4c-0964-4d43-ac7f-c80c417a8dd5";
const REGION = "ap-southeast-1";

// JWKS client to verify JWT tokens
const client = jwksClient({
    jwksUri: `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}/.well-known/jwks.json`,
});

function getKey(header, callback) {
    client.getSigningKey(header.kid, (err, key) => {
        if (err) {
            console.error("Error getting signing key:", err);
            callback(err);
            return;
        }
        const signingKey = key.publicKey || key.rsaPublicKey;
        callback(null, signingKey);
    });
}

// Verify ACCESS token (for API calls)
async function verifyAccessToken(token) {
    return new Promise((resolve, reject) => {
        jwt.verify(
            token,
            getKey,
            {
                audience: "4sceenhv8q25janbjc6dpjeclb", // Client ID
                issuer: `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`,
                algorithms: ["RS256"],
            },
            (err, decoded) => {
                if (err) {
                    console.error("Access token verification error:", err);
                    reject(err);
                } else {
                    resolve(decoded);
                }
            }
        );
    });
}

// Verify ID token (for Identity Pool)
async function verifyIdToken(token) {
    return new Promise((resolve, reject) => {
        jwt.verify(
            token,
            getKey,
            {
                // ID token has different validation - no audience check!
                issuer: `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`,
                algorithms: ["RS256"],
            },
            (err, decoded) => {
                if (err) {
                    console.error("ID token verification error:", err);
                    reject(err);
                } else {
                    resolve(decoded);
                }
            }
        );
    });
}

// Helper function to detect API Gateway version and extract method
function getHttpMethod(event) {
    if (event.version === "2.0" && event.requestContext?.http?.method) {
        return event.requestContext.http.method;
    }
    if (event.httpMethod) {
        return event.httpMethod;
    }
    return null;
}

// Helper function to get headers (case-insensitive)
function getHeader(event, headerName) {
    if (!event.headers) return null;

    const lowerHeaderName = headerName.toLowerCase();
    for (const [key, value] of Object.entries(event.headers)) {
        if (key.toLowerCase() === lowerHeaderName) {
            return value;
        }
    }
    return null;
}

export const handler = async (event) => {
    console.log("=== Lambda Function Started ===");
    console.log("Event:", JSON.stringify(event, null, 2));

    const httpMethod = getHttpMethod(event);
    console.log("HTTP Method detected:", httpMethod);

    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
            "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE",
        "Access-Control-Max-Age": "86400",
        "Content-Type": "application/json",
    };

    // Handle CORS preflight
    if (httpMethod === "OPTIONS") {
        console.log("=== Handling OPTIONS (CORS preflight) request ===");
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: "CORS preflight successful" }),
        };
    }

    try {
        const authHeader = getHeader(event, "Authorization");

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            console.log("Missing or invalid authorization header");
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({
                    error: "Missing or invalid authorization header",
                }),
            };
        }

        const token = authHeader.substring(7);
        console.log("Token received, length:", token.length);

        // Decode token without verification to check type
        const unverifiedDecoded = jwt.decode(token);
        const tokenUse = unverifiedDecoded?.token_use;

        console.log("Token type:", tokenUse);

        let decoded;
        let username;

        if (tokenUse === "id") {
            // ID Token - return Identity Pool configuration
            console.log("ID token detected - returning Identity Pool config");
            decoded = await verifyIdToken(token);
            username = decoded["cognito:username"] || decoded.sub;

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    message: "Use Identity Pool for direct S3 access",
                    identityPoolId: IDENTITY_POOL_ID,
                    region: REGION,
                    userPoolId: USER_POOL_ID,
                    bucket: BUCKET_NAME,
                    prefix: `${username}/`,
                    username: username,
                    note: "Use the ID token with fromCognitoIdentityPool in the frontend",
                }),
            };
        } else {
            // Access Token - list files via Lambda (current behavior)
            console.log("Access token detected - listing files via Lambda");
            decoded = await verifyAccessToken(token);
            username =
                decoded["cognito:username"] || decoded.username || decoded.sub;

            if (!username) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        error: "Username not found in token",
                    }),
                };
            }

            console.log("Username:", username);

            // List objects in S3
            const params = {
                Bucket: BUCKET_NAME,
                Prefix: `${username}/`,
                MaxKeys: 100,
            };

            console.log(
                "S3 ListObjects params:",
                JSON.stringify(params, null, 2)
            );
            const result = await s3.listObjectsV2(params).promise();
            console.log(
                "S3 result count:",
                result.Contents ? result.Contents.length : 0
            );

            // Format the response
            const files = (result.Contents || [])
                .map((obj) => ({
                    key: obj.Key,
                    fileName: obj.Key.replace(`${username}/`, ""),
                    size: obj.Size,
                    lastModified: obj.LastModified,
                    downloadUrl: `https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com/${encodeURIComponent(
                        obj.Key
                    )}`,
                }))
                .filter((file) => file.fileName);

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    files,
                    username,
                    totalFiles: files.length,
                    bucket: BUCKET_NAME,
                    prefix: `${username}/`,
                }),
            };
        }
    } catch (error) {
        console.error("=== Error occurred ===");
        console.error("Error:", error);
        console.error("Error stack:", error.stack);

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: "Internal server error",
                details: error.message,
                timestamp: new Date().toISOString(),
            }),
        };
    }
};
