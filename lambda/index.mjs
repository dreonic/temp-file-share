import AWS from "aws-sdk";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";

const s3 = new AWS.S3();
const BUCKET_NAME = "temp-file-share-data";
const USER_POOL_ID = "ap-southeast-1_1wixcmwPk";
const REGION = "ap-southeast-1";

// JWKS client to verify JWT tokens
const client = jwksClient({
    jwksUri: `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}/.well-known/jwks.json`,
});

function getKey(header, callback) {
    client.getSigningKey(header.kid, (err, key) => {
        if (err) {
            callback(err);
            return;
        }
        const signingKey = key.publicKey || key.rsaPublicKey;
        callback(null, signingKey);
    });
}

async function verifyToken(token) {
    return new Promise((resolve, reject) => {
        jwt.verify(
            token,
            getKey,
            {
                audience: "4sceenhv8q25janbjc6dpjeclb",
                issuer: `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`,
                algorithms: ["RS256"],
            },
            (err, decoded) => {
                if (err) reject(err);
                else resolve(decoded);
            }
        );
    });
}

export const handler = async (event) => {
    console.log("Event:", JSON.stringify(event, null, 2));

    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
            "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Content-Type": "application/json",
    };
    console.log("Headers:", JSON.stringify(headers, null, 2));

    // Handle CORS preflight - check multiple possible event structures
    const httpMethod =
        event.httpMethod ||
        event.requestContext?.http?.method ||
        event.requestContext?.httpMethod;
    console.log("HTTP Method detected:", httpMethod);

    if (httpMethod === "OPTIONS") {
        console.log("Handling OPTIONS request");
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: "CORS preflight successful" }),
        };
    }

    try {
        // Extract JWT token from Authorization header
        const authHeader =
            event.headers?.Authorization ||
            event.headers?.authorization ||
            event.headers?.["Authorization"] ||
            event.headers?.["authorization"];

        console.log("All headers:", JSON.stringify(event.headers, null, 2));
        console.log("Auth header found:", authHeader ? "YES" : "NO");

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            console.log(
                "Missing or invalid auth header. Auth header:",
                authHeader
            );
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({
                    error: "Missing or invalid authorization header",
                }),
            };
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        console.log("Token received, length:", token.length);

        // Verify the JWT token
        const decoded = await verifyToken(token);
        console.log("Decoded token:", JSON.stringify(decoded, null, 2));

        const username =
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

        // List objects in S3 with the username as prefix
        const params = {
            Bucket: BUCKET_NAME,
            Prefix: `${username}/`,
            MaxKeys: 100,
        };

        console.log("S3 ListObjects params:", JSON.stringify(params, null, 2));

        const result = await s3.listObjectsV2(params).promise();
        console.log("S3 result:", JSON.stringify(result, null, 2));

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
            .filter((file) => file.fileName); // Filter out directory markers

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
    } catch (error) {
        console.error("Error:", error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: "Internal server error",
                details: error.message,
            }),
        };
    }
};
