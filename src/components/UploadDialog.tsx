"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useState, useCallback, useEffect } from "react";
import AnimatedCheckmark from "./AnimatedCheckmark";

interface UploadDialogProps {
    isOpen: boolean;
    onClose?: () => void;
    onUploadComplete?: () => void;
    onQuotaUpdate?: (predictedTotal: number, maxQuota: number) => void;
    initialFiles?: File[];
}

interface FileUploadStatus {
    file: File;
    progress: number;
    status: "pending" | "uploading" | "success" | "error";
    shortUrl?: string;
    error?: string;
}

export default function UploadDialog({
    isOpen,
    onClose,
    onUploadComplete,
    onQuotaUpdate,
    initialFiles,
}: UploadDialogProps) {
    const { accessToken } = useAuth();
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [fileStatuses, setFileStatuses] = useState<
        Map<string, FileUploadStatus>
    >(new Map());
    const [uploading, setUploading] = useState(false);
    const [overallProgress, setOverallProgress] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const getFileId = (file: File) =>
        `${file.name}-${file.size}-${file.lastModified}`;

    // Set initial files when provided
    useEffect(() => {
        if (initialFiles && initialFiles.length > 0) {
            setSelectedFiles(initialFiles);
            const newStatuses = new Map<string, FileUploadStatus>();
            initialFiles.forEach((file) => {
                const fileId = getFileId(file);
                newStatuses.set(fileId, {
                    file,
                    progress: 0,
                    status: "pending",
                });
            });
            setFileStatuses(newStatuses);
        }
    }, [initialFiles]);

    // Auto-hide success message after 1 second and close dialog
    useEffect(() => {
        if (showSuccess) {
            const timer = setTimeout(() => {
                setShowSuccess(false);
                onUploadComplete?.();
                onClose?.();
            }, 1500);
            return () => clearTimeout(timer);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showSuccess]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            setSelectedFiles(files);
            const newStatuses = new Map<string, FileUploadStatus>();
            files.forEach((file) => {
                newStatuses.set(getFileId(file), {
                    file,
                    progress: 0,
                    status: "pending",
                });
            });
            setFileStatuses(newStatuses);
            setShowSuccess(false);
        }
    };

    const removeFile = (fileId: string) => {
        setSelectedFiles((prev) => prev.filter((f) => getFileId(f) !== fileId));
        setFileStatuses((prev) => {
            const newMap = new Map(prev);
            newMap.delete(fileId);
            return newMap;
        });
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

        const files = Array.from(e.dataTransfer.files || []);
        if (files.length > 0) {
            setSelectedFiles(files);
            const newStatuses = new Map<string, FileUploadStatus>();
            files.forEach((file) => {
                newStatuses.set(getFileId(file), {
                    file,
                    progress: 0,
                    status: "pending",
                });
            });
            setFileStatuses(newStatuses);
            setShowSuccess(false);
        }
    };

    const uploadSingleFile = async (
        file: File,
        accumulatedQuota: {
            predictedTotal: number | null;
            maxQuota: number | null;
        },
    ): Promise<void> => {
        const fileId = getFileId(file);

        try {
            // Update status to uploading
            setFileStatuses((prev) => {
                const newMap = new Map(prev);
                const status = newMap.get(fileId);
                if (status) {
                    newMap.set(fileId, {
                        ...status,
                        status: "uploading",
                        progress: 10,
                    });
                }
                return newMap;
            });

            const lambdaUrl = process.env.NEXT_PUBLIC_DATA_AUTH_LAMBDA_URL;
            if (!lambdaUrl) {
                throw new Error("Lambda URL not configured");
            }

            // Get presigned URL
            const urlResponse = await fetch(lambdaUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    fileName: file.name,
                    contentType: file.type || "application/octet-stream",
                    fileSize: file.size || 0,
                }),
            });

            if (!urlResponse.ok) {
                const errorData = await urlResponse.json();
                throw new Error(errorData.error || "Failed to get upload URL");
            }

            const responseData = await urlResponse.json();
            const {
                uploadUrl,
                uploadFields,
                shortUrl: generatedShortUrl,
                predictedTotalSize,
                maxSizePerMonth,
            } = responseData;

            // Update progress
            setFileStatuses((prev) => {
                const newMap = new Map(prev);
                const status = newMap.get(fileId);
                if (status) {
                    newMap.set(fileId, {
                        ...status,
                        progress: 30,
                        shortUrl: generatedShortUrl,
                    });
                }
                return newMap;
            });

            // Accumulate quota info (will update at the end)
            if (predictedTotalSize && maxSizePerMonth) {
                accumulatedQuota.predictedTotal = predictedTotalSize;
                accumulatedQuota.maxQuota = maxSizePerMonth;
            }

            // Upload to S3
            const formData = new FormData();
            if (uploadFields) {
                Object.entries(uploadFields).forEach(([key, value]) => {
                    formData.append(key, value as string);
                });
            }
            formData.append("file", file);

            const uploadResponse = await fetch(uploadUrl, {
                method: "POST",
                body: formData,
            });

            if (!uploadResponse.ok) {
                throw new Error(
                    `Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`,
                );
            }

            // Mark as success
            setFileStatuses((prev) => {
                const newMap = new Map(prev);
                const status = newMap.get(fileId);
                if (status) {
                    newMap.set(fileId, {
                        ...status,
                        status: "success",
                        progress: 100,
                    });
                }
                return newMap;
            });
        } catch (err) {
            console.error(`Upload error for ${file.name}:`, err);
            setFileStatuses((prev) => {
                const newMap = new Map(prev);
                const status = newMap.get(fileId);
                if (status) {
                    newMap.set(fileId, {
                        ...status,
                        status: "error",
                        error:
                            err instanceof Error
                                ? err.message
                                : "Failed to upload file",
                    });
                }
                return newMap;
            });
        }
    };

    const handleUpload = useCallback(async () => {
        if (selectedFiles.length === 0 || !accessToken) return;

        setUploading(true);
        setOverallProgress(0);
        setShowSuccess(false);

        const CONCURRENT_UPLOADS = 3;
        const chunks: File[][] = [];

        // Split files into chunks for concurrent upload
        for (let i = 0; i < selectedFiles.length; i += CONCURRENT_UPLOADS) {
            chunks.push(selectedFiles.slice(i, i + CONCURRENT_UPLOADS));
        }

        try {
            let completedFiles = 0;
            const totalFiles = selectedFiles.length;
            const accumulatedQuota = {
                predictedTotal: null as number | null,
                maxQuota: null as number | null,
            };

            // Upload chunks sequentially, but files within chunks in parallel
            for (const chunk of chunks) {
                await Promise.allSettled(
                    chunk.map((file) =>
                        uploadSingleFile(file, accumulatedQuota),
                    ),
                );
                completedFiles += chunk.length;
                setOverallProgress(
                    Math.round((completedFiles / totalFiles) * 100),
                );
            }

            // Update quota once at the end with the final accumulated values
            if (
                onQuotaUpdate &&
                accumulatedQuota.predictedTotal &&
                accumulatedQuota.maxQuota
            ) {
                onQuotaUpdate(
                    accumulatedQuota.predictedTotal,
                    accumulatedQuota.maxQuota,
                );
            }

            // Wait for state to settle before checking success
            // Use a small delay to ensure all setState calls have completed
            await new Promise((resolve) => setTimeout(resolve, 100));

            // Check if all uploads succeeded by rechecking the current state
            setFileStatuses((currentStatuses) => {
                const allSuccessful = Array.from(
                    currentStatuses.values(),
                ).every((status) => status.status === "success");

                if (allSuccessful) {
                    // Copy all short URLs to clipboard
                    const urls = Array.from(currentStatuses.values())
                        .map((status) => status.shortUrl)
                        .filter(Boolean)
                        .join("\n");

                    if (urls) {
                        navigator.clipboard
                            .writeText(urls)
                            .catch((clipboardErr) => {
                                console.warn(
                                    "Failed to copy to clipboard:",
                                    clipboardErr,
                                );
                            });
                    }

                    setShowSuccess(true);
                }

                return currentStatuses;
            });
        } catch (err) {
            console.error("Batch upload error:", err);
        } finally {
            setUploading(false);
        }
    }, [selectedFiles, accessToken, fileStatuses, onQuotaUpdate]);

    const handleClose = () => {
        if (!uploading && !showSuccess) {
            setSelectedFiles([]);
            setFileStatuses(new Map());
            setOverallProgress(0);
            setShowSuccess(false);
            onClose?.();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-lg w-full mx-4">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Upload File{selectedFiles.length > 1 ? "s" : ""}
                        {selectedFiles.length > 0 && (
                            <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                                ({selectedFiles.length} file
                                {selectedFiles.length > 1 ? "s" : ""})
                            </span>
                        )}
                    </h3>
                    <button
                        onClick={handleClose}
                        disabled={uploading || showSuccess}
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
                    <div
                        onDragEnter={handleDragEnter}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`relative border-2 border-dashed rounded-2xl p-8 transition-all duration-200 ${
                            showSuccess
                                ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                                : isDragging
                                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                  : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                        }`}
                    >
                        {!showSuccess && (
                            <input
                                type="file"
                                multiple
                                onChange={handleFileSelect}
                                disabled={uploading}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                id="file-upload"
                            />
                        )}

                        {showSuccess ? (
                            // Success state with animated checkmark
                            <div className="flex flex-col items-center justify-center text-center">
                                <AnimatedCheckmark
                                    className="text-green-600 dark:text-green-400 mb-4"
                                    size="w-24 h-24"
                                />
                                <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                                    Upload Successful!
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                                    {selectedFiles.length} file
                                    {selectedFiles.length > 1 ? "s" : ""}{" "}
                                    uploaded
                                </p>
                            </div>
                        ) : (
                            // Normal drop area
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
                                        ? "Drop your files here"
                                        : "Drop your files here"}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    or click to browse (multiple files
                                    supported)
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Selected Files List */}
                    {selectedFiles.length > 0 && !uploading && !showSuccess && (
                        <div className="max-h-60 overflow-y-auto space-y-2">
                            {selectedFiles.map((file) => {
                                const fileId = getFileId(file);
                                return (
                                    <div
                                        key={fileId}
                                        className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-center justify-between"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p
                                                className="text-sm text-gray-700 dark:text-gray-300 truncate"
                                                title={file.name}
                                            >
                                                {file.name}
                                            </p>
                                            <p className="text-xs text-gray-600 dark:text-gray-400">
                                                {(
                                                    file.size /
                                                    1024 /
                                                    1024
                                                ).toFixed(2)}{" "}
                                                MB
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => removeFile(fileId)}
                                            className="ml-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                        >
                                            <svg
                                                className="w-5 h-5"
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
                                );
                            })}
                        </div>
                    )}

                    {/* Upload Progress for Individual Files */}
                    {uploading && (
                        <div className="space-y-3">
                            {/* Overall Progress */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-700 dark:text-gray-300 font-medium">
                                        Overall Progress
                                    </span>
                                    <span className="text-gray-600 dark:text-gray-400">
                                        {overallProgress}%
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                                    <div
                                        className="bg-blue-500 h-2.5 rounded-full transition-all duration-300"
                                        style={{ width: `${overallProgress}%` }}
                                    ></div>
                                </div>
                            </div>

                            {/* Individual File Progress */}
                            <div className="max-h-60 overflow-y-auto space-y-2">
                                {Array.from(fileStatuses.entries()).map(
                                    ([fileId, status]) => (
                                        <div
                                            key={fileId}
                                            className={`border rounded-lg p-3 ${
                                                status.status === "success"
                                                    ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                                                    : status.status === "error"
                                                      ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                                                      : "bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700"
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <p
                                                    className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1"
                                                    title={status.file.name}
                                                >
                                                    {status.file.name}
                                                </p>
                                                <div className="ml-2">
                                                    {status.status ===
                                                        "success" && (
                                                        <svg
                                                            className="w-5 h-5 text-green-600 dark:text-green-400"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M5 13l4 4L19 7"
                                                            />
                                                        </svg>
                                                    )}
                                                    {status.status ===
                                                        "error" && (
                                                        <svg
                                                            className="w-5 h-5 text-red-600 dark:text-red-400"
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
                                                    )}
                                                </div>
                                            </div>
                                            {status.status === "uploading" && (
                                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                                    <div
                                                        className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                                                        style={{
                                                            width: `${status.progress}%`,
                                                        }}
                                                    ></div>
                                                </div>
                                            )}
                                            {status.error && (
                                                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                                    {status.error}
                                                </p>
                                            )}
                                            {status.shortUrl && (
                                                <p
                                                    className="text-xs text-blue-600 dark:text-blue-400 mt-1 truncate"
                                                    title={status.shortUrl}
                                                >
                                                    {status.shortUrl}
                                                </p>
                                            )}
                                        </div>
                                    ),
                                )}
                            </div>
                        </div>
                    )}

                    {/* Success URLs Display */}
                    {showSuccess && (
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 max-h-40 overflow-y-auto">
                            <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-2">
                                Short URLs (copied to clipboard):
                            </p>
                            {Array.from(fileStatuses.values()).map(
                                (status, idx) =>
                                    status.shortUrl && (
                                        <p
                                            key={idx}
                                            className="text-xs text-green-600 dark:text-green-400 font-mono break-all"
                                        >
                                            {status.shortUrl}
                                        </p>
                                    ),
                            )}
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
                            disabled={selectedFiles.length === 0 || uploading}
                            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg 
                                     hover:bg-blue-600 transition-colors
                                     disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {uploading
                                ? "Uploading..."
                                : `Upload ${selectedFiles.length > 0 ? `(${selectedFiles.length})` : ""}`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
