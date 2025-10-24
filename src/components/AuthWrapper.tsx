"use client";

import { useAuth } from "@/contexts/AuthContext";

interface AuthWrapperProps {
    authenticated: React.ReactNode;
    unauthenticated: React.ReactNode;
}

export default function AuthWrapper({
    authenticated,
    unauthenticated,
}: AuthWrapperProps) {
    const { isAuthenticated, loading, error } = useAuth();

    if (loading) {
        return <div className="text-sm">Loading...</div>;
    }

    if (error) {
        return (
            <div className="text-sm text-red-500">
                Authentication error: {error}
            </div>
        );
    }

    return isAuthenticated ? <>{authenticated}</> : <>{unauthenticated}</>;
}
