"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
    S3Client,
    ListObjectsV2Command,
    PutObjectCommand,
} from "@aws-sdk/client-s3";

interface S3File {
    key: string;
    size: number;
    lastModified: Date;
}

interface S3CredentialsResponse {
    credentials: {
        accessKeyId: string;
        secretAccessKey: string;
        sessionToken: string;
        expiration: string;
    };
    bucket: string;
    prefix: string;
    region: string;
    username: string;
}

/**
 * Example component showing direct S3 access with temporary credentials
 *
 * This demonstrates the STS approach where users get temporary credentials
 * scoped to their S3 prefix only.
 */
export default function DirectS3Access() {
    const { accessToken } = useAuth();
    const [files, setFiles] = useState<S3File[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [s3Client, setS3Client] = useState<S3Client | null>(null);
    const [credentials, setCredentials] =
        useState<S3CredentialsResponse | null>(null);

    // Step 1: Get temporary S3 credentials
    const getCredentials = async () => {
        if (!accessToken) {
            setError("Not authenticated");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/s3/credentials", {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            if (!response.ok) {
                throw new Error("Failed to get credentials");
            }

            const data = await response.json();
            setCredentials(data);

            // Create S3 client with temporary credentials
            const client = new S3Client({
                region: data.region,
                credentials: {
                    accessKeyId: data.credentials.accessKeyId,
                    secretAccessKey: data.credentials.secretAccessKey,
                    sessionToken: data.credentials.sessionToken,
                },
            });

            setS3Client(client);
            return { client, data };
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
            return null;
        } finally {
            setLoading(false);
        }
    };

    // Step 2: List files using temporary credentials
    const listFiles = async () => {
        setLoading(true);
        setError(null);

        try {
            let client = s3Client;
            let creds = credentials;

            // Get credentials if we don't have them
            if (!client) {
                const result = await getCredentials();
                if (!result) return;
                client = result.client;
                creds = result.data;
            }

            // List objects with user's prefix
            const command = new ListObjectsV2Command({
                Bucket: creds!.bucket,
                Prefix: creds!.prefix,
            });

            const response = await client!.send(command);

            const fileList = (response.Contents || []).map((obj) => ({
                key: obj.Key!,
                size: obj.Size || 0,
                lastModified: obj.LastModified || new Date(),
            }));

            setFiles(fileList);
        } catch (err) {
            console.error("Error listing files:", err);
            setError(
                err instanceof Error ? err.message : "Failed to list files"
            );
        } finally {
            setLoading(false);
        }
    };

    // Step 3: Upload file using temporary credentials
    const uploadFile = async (file: File) => {
        if (!s3Client || !credentials) {
            const result = await getCredentials();
            if (!result) return;
        }

        if (!credentials) return; // Type guard

        setLoading(true);
        setError(null);

        try {
            const command = new PutObjectCommand({
                Bucket: credentials.bucket,
                Key: `${credentials.prefix}${file.name}`,
                Body: file,
                ContentType: file.type,
            });

            await s3Client!.send(command);

            // Refresh file list
            await listFiles();
        } catch (err) {
            console.error("Error uploading file:", err);
            setError(
                err instanceof Error ? err.message : "Failed to upload file"
            );
        } finally {
            setLoading(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            uploadFile(file);
        }
    };

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-4">Direct S3 Access (STS)</h2>

            <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
                <p className="text-sm text-blue-900">
                    This component uses{" "}
                    <strong>temporary AWS credentials</strong> to access S3
                    directly. No Lambda proxy needed!
                </p>
            </div>

            {credentials && (
                <div className="bg-green-50 border border-green-200 rounded p-4 mb-4">
                    <p className="text-sm text-green-900">
                        ✅ Credentials active until:{" "}
                        {new Date(
                            credentials.credentials.expiration
                        ).toLocaleString()}
                    </p>
                    <p className="text-sm text-green-900">
                        📁 Your prefix: <code>{credentials.prefix}</code>
                    </p>
                </div>
            )}

            {error && (
                <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
                    <p className="text-sm text-red-900">{error}</p>
                </div>
            )}

            <div className="space-y-4">
                {!credentials ? (
                    <button
                        onClick={getCredentials}
                        disabled={loading || !accessToken}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                    >
                        {loading
                            ? "Getting credentials..."
                            : "Get S3 Credentials"}
                    </button>
                ) : (
                    <>
                        <button
                            onClick={listFiles}
                            disabled={loading}
                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                        >
                            {loading ? "Loading..." : "List My Files"}
                        </button>

                        <div>
                            <label className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 cursor-pointer inline-block">
                                {loading ? "Uploading..." : "Upload File"}
                                <input
                                    type="file"
                                    onChange={handleFileSelect}
                                    disabled={loading}
                                    className="hidden"
                                />
                            </label>
                        </div>
                    </>
                )}
            </div>

            {files.length > 0 && (
                <div className="mt-6">
                    <h3 className="font-semibold mb-2">Your Files:</h3>
                    <ul className="space-y-2">
                        {files.map((file) => (
                            <li
                                key={file.key}
                                className="p-3 bg-gray-50 rounded border"
                            >
                                <div className="font-medium">{file.key}</div>
                                <div className="text-sm text-gray-600">
                                    {(file.size / 1024).toFixed(2)} KB •{" "}
                                    {file.lastModified.toLocaleDateString()}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
