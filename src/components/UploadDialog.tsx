"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useState, useCallback } from "react";

interface UploadDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onUploadComplete: () => void;
}

export default function UploadDialog({
    isOpen,
    onClose,
    onUploadComplete,
}: UploadDialogProps) {
    const { accessToken } = useAuth();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [shortUrl, setShortUrl] = useState<string | null>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setError(null);
            setShortUrl(null);
        }
    };

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const file = e.dataTransfer.files?.[0];
        if (file) {
            setSelectedFile(file);
            setError(null);
            setShortUrl(null);
        }
    };

    const handleUpload = useCallback(async () => {
        if (!selectedFile || !accessToken) return;

        setUploading(true);
        setError(null);
        setUploadProgress(0);
        setShortUrl(null);

        try {
            // Step 1: Get presigned URL + short link from Lambda via our API proxy
            setUploadProgress(10);
            const urlResponse = await fetch("/api/s3/upload-url", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    fileName: selectedFile.name,
                    fileType: selectedFile.type,
                    fileSize: selectedFile.size,
                }),
            });

            if (!urlResponse.ok) {
                const errorData = await urlResponse.json();
                throw new Error(errorData.error || "Failed to get upload URL");
            }

            const responseData = await urlResponse.json();
            const { uploadUrl, uploadFields, shortUrl: generatedShortUrl } = responseData;

            // Save short URL immediately
            setShortUrl(generatedShortUrl);
            setUploadProgress(20);

            // Step 2: Upload to S3 using presigned POST
            const formData = new FormData();
            
            // Add all fields from the presigned POST
            if (uploadFields) {
                Object.entries(uploadFields).forEach(([key, value]) => {
                    formData.append(key, value as string);
                });
            }
            
            // Add the file last (important for S3)
            formData.append('file', selectedFile);

            setUploadProgress(30);

            const uploadResponse = await fetch(uploadUrl, {
                method: "POST",
                body: formData,
            });

            if (!uploadResponse.ok) {
                throw new Error(
                    `Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`,
                );
            }

            setUploadProgress(100);

            // Copy short URL to clipboard
            if (generatedShortUrl) {
                try {
                    await navigator.clipboard.writeText(generatedShortUrl);
                } catch (clipboardErr) {
                    console.warn("Failed to copy to clipboard:", clipboardErr);
                }
            }

            setSelectedFile(null);

            // Notify parent component
            setTimeout(() => {
                onUploadComplete();
                onClose();
            }, 1000);
        } catch (err) {
            console.error("Upload error:", err);
            setError(
                err instanceof Error ? err.message : "Failed to upload file",
            );
        } finally {
            setUploading(false);
        }
    }, [selectedFile, accessToken, onUploadComplete, onClose]);

    const handleClose = () => {
        if (!uploading) {
            setSelectedFile(null);
            setError(null);
            setUploadProgress(0);
            setShortUrl(null);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-lg w-full mx-4">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Upload File
                    </h3>
                    <button
                        onClick={handleClose}
                        disabled={uploading}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 transition-colors"
                    >
                        <svg
                            className="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Drag & Drop Area */}
                    <div
                        onDragEnter={handleDragEnter}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`relative border-2 border-dashed rounded-2xl p-8 transition-all duration-200 ${
                            isDragging
                                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                        }`}
                    >
                        <input
                            type="file"
                            onChange={handleFileSelect}
                            disabled={uploading}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                            id="file-upload"
                        />
                        <div className="flex flex-col items-center justify-center text-center">
                            <div className="flex gap-4 mb-4">
                                {/* Image Icon */}
                                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                                    <svg
                                        className="w-6 h-6 text-purple-600 dark:text-purple-400"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                        />
                                    </svg>
                                </div>
                                {/* File Icon */}
                                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                                    <svg
                                        className="w-6 h-6 text-blue-600 dark:text-blue-400"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                                        />
                                    </svg>
                                </div>
                                {/* Video Icon */}
                                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                                    <svg
                                        className="w-6 h-6 text-green-600 dark:text-green-400"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                                        />
                                    </svg>
                                </div>
                            </div>
                            <p className="text-lg font-medium text-gray-700 dark:text-gray-200 mb-2">
                                {isDragging
                                    ? "Drop your file here"
                                    : "Drop your file here"}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                or click to browse
                            </p>
                        </div>
                    </div>

                    {/* Selected File Info */}
                    {selectedFile && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                            <p className="text-sm text-gray-700 dark:text-gray-300 break-all" title={selectedFile.name}>
                                <span className="font-medium">File:</span>{" "}
                                {selectedFile.name}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                <span className="font-medium">Size:</span>{" "}
                                {(selectedFile.size / 1024 / 1024).toFixed(2)}{" "}
                                MB
                            </p>
                        </div>
                    )}

                    {/* Upload Progress */}
                    {uploading && (
                        <div className="space-y-2">
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                                <div
                                    className="bg-blue-500 h-2.5 rounded-full transition-all duration-300"
                                    style={{ width: `${uploadProgress}%` }}
                                ></div>
                            </div>
                            <p className="text-sm text-center text-gray-600 dark:text-gray-400">
                                Uploading... {uploadProgress}%
                            </p>
                        </div>
                    )}

                    {/* Short URL Display */}
                    {shortUrl && (
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                            <p className="text-sm text-green-700 dark:text-green-400 font-medium mb-1">
                                ✅ Upload successful! Link copied to clipboard.
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 break-all">
                                {shortUrl}
                            </p>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                            <p className="text-sm text-red-700 dark:text-red-400">
                                {error}
                            </p>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={handleClose}
                            disabled={uploading}
                            className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 
                                     rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors
                                     disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleUpload}
                            disabled={!selectedFile || uploading}
                            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg 
                                     hover:bg-blue-600 transition-colors
                                     disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {uploading ? "Uploading..." : "Upload"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
