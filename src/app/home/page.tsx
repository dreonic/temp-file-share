"use client";

import Navbar from "@/components/Navbar";
import FileList from "@/components/FileList";
import UploadDialog from "@/components/UploadDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";

export default function HomePage() {
    const { isAuthenticated, loading, accessToken } = useAuth();
    const router = useRouter();
    const [isDragging, setIsDragging] = useState(false);
    const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
    const [draggedFiles, setDraggedFiles] = useState<File[]>([]);
    const [refreshKey, setRefreshKey] = useState(0);

    // Redirect unauthenticated users to landing page
    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push("/");
        }
    }, [isAuthenticated, loading, router]);

    // Drag and drop handlers
    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            setIsDragging(true);
        }
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        // Only set dragging to false if we're leaving the main container
        if (e.currentTarget === e.target) {
            setIsDragging(false);
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files || []);
        if (files.length > 0) {
            setDraggedFiles(files);
            setIsUploadDialogOpen(true);
        }
    }, []);

    const handleUploadComplete = () => {
        setRefreshKey((prev) => prev + 1);
        setDraggedFiles([]);
    };

    const handleCloseUploadDialog = () => {
        setIsUploadDialogOpen(false);
        setDraggedFiles([]);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-lg">Loading...</div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return null; // Will redirect
    }

    return (
        <div
            className="min-h-screen bg-gray-50 dark:bg-gray-900 relative"
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <Navbar />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                            Your Files
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400">
                            Securely share files with time-limited links
                        </p>
                    </div>
                    <FileList key={refreshKey} />
                </div>
            </main>

            {/* Drag and Drop Overlay */}
            {isDragging && (
                <div className="fixed inset-0 bg-blue-50/80 dark:bg-blue-900/40 backdrop-blur-sm z-40 pointer-events-none">
                    <div className="absolute inset-8 border-2 border-dashed border-blue-500 rounded-2xl flex items-center justify-center">
                        <div className="text-center">
                            <div className="flex gap-4 mb-4 justify-center">
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
                                Drop your files here
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Release to upload
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <UploadDialog
                isOpen={isUploadDialogOpen}
                onClose={handleCloseUploadDialog}
                onUploadComplete={handleUploadComplete}
                initialFiles={draggedFiles}
            />
        </div>
    );
}
