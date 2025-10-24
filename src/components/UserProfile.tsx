"use client";

import { useAuth } from "@/contexts/AuthContext";

export default function UserProfile() {
    const { user, signOut, loading, error } = useAuth();

    if (loading) {
        return <div className="text-sm">Loading...</div>;
    }

    if (error) {
        return <div className="text-sm text-red-500">Error: {error}</div>;
    }

    if (!user) {
        return null;
    }

    // Get display name in order of preference
    const displayName =
        user.preferred_username ||
        user["cognito:username"] ||
        user.username ||
        user.email ||
        "User";

    return (
        <div className="flex items-center gap-4">
            <span className="text-sm">Welcome, {displayName}</span>
            <button
                onClick={signOut}
                className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
            >
                Sign Out
            </button>
        </div>
    );
}
