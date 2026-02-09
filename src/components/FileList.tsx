"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect, useCallback } from "react";
import UploadDialog from "./UploadDialog";
import CustomLinkDialog from "./CustomLinkDialog";
import DeleteConfirmDialog from "./DeleteConfirmDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { truncateFileName, formatFileSize } from "@/lib/formatters";

interface FileItem {
    key: string;
    fileName: string;
    size: number;
    lastModified?: string;
    downloadUrl?: string;
    shortUrl: string;
    expiryDate: string;
    expiryTimestamp: number;
    customLinkSet?: boolean;
    status?: "pending" | "active";
}

interface ApiResponse {
    files: FileItem[];
    username: string;
    totalFiles: number;
    totalUsedSizeThisMonth: number;
    maxSizePerMonth: number;
    nextMonthReset: string;
}

export default function FileList() {
    const { accessToken, user } = useAuth();
    const [files, setFiles] = useState<FileItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [totalUsedSizeThisMonth, setTotalUsedSizeThisMonth] =
        useState<number>(0);
    const [maxSizePerMonth, setMaxSizePerMonth] = useState<number>(1073741824);
    const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
    const [copiedFileKey, setCopiedFileKey] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(Date.now());
    const [nextMonthResetTime, setNextMonthResetTime] = useState<Date>(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth() + 1, 1);
    });

    // Custom link dialog state
    const [customLinkDialogOpen, setCustomLinkDialogOpen] = useState(false);
    const [selectedFileForCustomLink, setSelectedFileForCustomLink] =
        useState<FileItem | null>(null);

    // Delete dialog state
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedFileForDelete, setSelectedFileForDelete] =
        useState<FileItem | null>(null);

    const API_BASE_URL = process.env.NEXT_PUBLIC_DATA_AUTH_LAMBDA_URL || "";

    const fetchFiles = useCallback(async () => {
        if (!accessToken) return;

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE_URL}`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                const errorText = await response.text();

                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch {
                    errorData = { error: errorText };
                }

                throw new Error(
                    errorData.error ||
                        `HTTP error! status: ${response.status} - ${response.statusText}`,
                );
            }

            const data: ApiResponse = await response.json();

            console.log("Data from fetchFiles: ", data);

            setTotalUsedSizeThisMonth(data.totalUsedSizeThisMonth);
            setMaxSizePerMonth(data.maxSizePerMonth || 1073741824);
            setFiles(data.files || []);
            setNextMonthResetTime(new Date(data.nextMonthReset));
        } catch (err) {
            console.error("Error fetching files:", err);

            if (err instanceof TypeError && err.message.includes("fetch")) {
                setError(`Network error: Unable to connect to the API.`);
            } else {
                setError(
                    err instanceof Error ? err.message : "Failed to load files",
                );
            }
        } finally {
            setLoading(false);
        }
    }, [accessToken, API_BASE_URL]);

    const setCustomLink = async (
        s3Location: string,
        customShortLink: string,
    ) => {
        if (!accessToken) throw new Error("Not authenticated");

        const response = await fetch(`${API_BASE_URL}`, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                s3Location,
                customShortLink,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw errorData;
        }

        const result = await response.json();

        // Refresh the file list
        await fetchFiles();

        return result;
    };

    const deleteFile = async (s3Location: string) => {
        if (!accessToken) throw new Error("Not authenticated");

        const response = await fetch(`${API_BASE_URL}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                s3Location,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Failed to delete file");
        }

        // Refresh the file list
        await fetchFiles();
    };

    const handleQuotaUpdate = (predictedTotal: number, maxQuota: number) => {
        setTotalUsedSizeThisMonth(predictedTotal);
        setMaxSizePerMonth(maxQuota);
    };

    useEffect(() => {
        if (accessToken && user) {
            fetchFiles();
        }
    }, [accessToken, user, fetchFiles]);

    // Update current time every second for countdown
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(Date.now());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleString();
    };

    const formatTimeRemaining = (expiryTimestamp: number): string => {
        const now = Math.floor(currentTime / 1000);
        const secondsLeft = expiryTimestamp - now;

        if (secondsLeft <= 0) return "Expired";

        const days = Math.floor(secondsLeft / 86400);
        const hours = Math.floor((secondsLeft % 86400) / 3600);
        const minutes = Math.floor((secondsLeft % 3600) / 60);
        const seconds = secondsLeft % 60;

        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        if (minutes > 0) return `${minutes}m ${seconds}s`;
        return `${seconds}s`;
    };

    const copyToClipboard = async (text: string, fileKey: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedFileKey(fileKey);
            setTimeout(() => setCopiedFileKey(null), 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    // Filter out expired files
    const activeFiles = files.filter((file) => {
        const now = Math.floor(currentTime / 1000);
        return file.expiryTimestamp > now;
    });

    const handleCustomLinkClick = (file: FileItem) => {
        setSelectedFileForCustomLink(file);
        setCustomLinkDialogOpen(true);
    };

    const handleDeleteClick = (file: FileItem) => {
        setSelectedFileForDelete(file);
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!selectedFileForDelete) return;

        try {
            await deleteFile(selectedFileForDelete.key);
        } catch (err) {
            console.error("Error deleting file:", err);
            setError(
                err instanceof Error ? err.message : "Failed to delete file",
            );
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-2">Loading files...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-8">
                <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                    <p className="text-red-700 dark:text-red-400 font-medium">
                        Error loading files
                    </p>
                    <p className="text-red-600 dark:text-red-500 text-sm mt-1">
                        {error}
                    </p>
                </div>
                <Button onClick={fetchFiles}>Try Again</Button>
            </div>
        );
    }

    return (
        <div className="w-full">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            {activeFiles.length}{" "}
                            {activeFiles.length === 1 ? "file" : "files"}
                        </span>
                        <span className="text-gray-300 dark:text-gray-600">
                            •
                        </span>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400 cursor-help border-b border-dotted border-gray-400">
                                        {formatFileSize(totalUsedSizeThisMonth)}{" "}
                                        / {formatFileSize(maxSizePerMonth)} used
                                        this month
                                    </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>
                                        Quota resets on{" "}
                                        {nextMonthResetTime.toLocaleDateString(
                                            "en-US",
                                            {
                                                month: "long",
                                                day: "numeric",
                                                year: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                                timeZoneName: "short",
                                            },
                                        )}
                                    </p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => setUploadDialogOpen(true)}>
                        <svg
                            className="w-4 h-4 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                            />
                        </svg>
                        Upload
                    </Button>
                    <Button variant="outline" onClick={fetchFiles}>
                        Refresh
                    </Button>
                </div>
            </div>

            {activeFiles.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
                    <div className="flex flex-col items-center justify-center py-16 px-4">
                        <div className="w-16 h-16 mb-4 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center">
                            <svg
                                className="w-8 h-8 text-gray-400 dark:text-gray-500"
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
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            No files yet
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 text-center max-w-sm">
                            Upload your first file to start sharing
                        </p>
                    </div>
                </div>
            ) : (
                <div className="rounded-xl border overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="pl-4">
                                    File Name
                                </TableHead>
                                <TableHead>Size</TableHead>
                                <TableHead>Expires In</TableHead>
                                <TableHead>Shortened Link</TableHead>
                                <TableHead className="pr-4">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {activeFiles.map((file) => (
                                <TableRow key={file.key}>
                                    <TableCell className="pl-4">
                                        <div className="flex items-center gap-3">
                                            {/* File icon */}
                                            <div className="flex-shrink-0 w-8 h-10 rounded-lg flex items-center justify-center">
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    viewBox="0 0 24 24"
                                                    width="24"
                                                    height="24"
                                                    fill="none"
                                                    stroke="#000000"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    style={{ opacity: 1 }}
                                                >
                                                    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                                                    <path d="M14 2v4a2 2 0 0 0 2 2h4M10 9H8m8 4H8m8 4H8" />
                                                </svg>
                                            </div>
                                            <div className="flex flex-col">
                                                <p
                                                    className="font-medium"
                                                    title={file.fileName}
                                                >
                                                    {truncateFileName(
                                                        file.fileName,
                                                        60,
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">
                                            {formatFileSize(file.size)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell
                                        title={`Expires: ${formatDate(file.expiryDate)}`}
                                        className="w-24"
                                    >
                                        <Badge variant="outline">
                                            {formatTimeRemaining(
                                                file.expiryTimestamp,
                                            )}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center justify-between gap-2">
                                            <a
                                                href={file.shortUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-primary hover:underline truncate max-w-xs font-medium"
                                            >
                                                {file.shortUrl.replace(
                                                    /^https?:\/\//,
                                                    "",
                                                )}
                                            </a>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                    copyToClipboard(
                                                        file.shortUrl,
                                                        file.key,
                                                    )
                                                }
                                                title="Copy link"
                                            >
                                                {copiedFileKey === file.key ? (
                                                    <svg
                                                        className="w-4 h-4 text-green-600 dark:text-green-400"
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
                                                ) : (
                                                    <svg
                                                        className="w-4 h-4"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                                        />
                                                    </svg>
                                                )}
                                            </Button>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right pr-4">
                                        <div
                                            className={`flex items-center gap-2 ${!file.customLinkSet ? "justify-between" : "justify-end"}`}
                                        >
                                            {!file.customLinkSet && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() =>
                                                        handleCustomLinkClick(
                                                            file,
                                                        )
                                                    }
                                                >
                                                    Customize Link
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                    handleDeleteClick(file)
                                                }
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                                            >
                                                Delete
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            <UploadDialog
                isOpen={uploadDialogOpen}
                onClose={() => setUploadDialogOpen(false)}
                onUploadComplete={fetchFiles}
                onQuotaUpdate={handleQuotaUpdate}
            />

            {selectedFileForCustomLink && (
                <CustomLinkDialog
                    isOpen={customLinkDialogOpen}
                    onClose={() => {
                        setCustomLinkDialogOpen(false);
                        setSelectedFileForCustomLink(null);
                    }}
                    fileName={selectedFileForCustomLink.fileName}
                    s3Location={selectedFileForCustomLink.key}
                    onSetCustomLink={setCustomLink}
                />
            )}

            {selectedFileForDelete && (
                <DeleteConfirmDialog
                    isOpen={deleteDialogOpen}
                    onClose={() => {
                        setDeleteDialogOpen(false);
                        setSelectedFileForDelete(null);
                    }}
                    fileName={selectedFileForDelete.fileName}
                    onConfirm={handleDeleteConfirm}
                />
            )}
        </div>
    );
}
