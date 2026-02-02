"use client";

import Navbar from "@/components/Navbar";
import FileList from "@/components/FileList";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
    const { isAuthenticated, loading } = useAuth();
    const router = useRouter();

    // Redirect unauthenticated users to landing page
    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push("/");
        }
    }, [isAuthenticated, loading, router]);

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
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
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
                    <FileList />
                </div>
            </main>
        </div>
    );
}
