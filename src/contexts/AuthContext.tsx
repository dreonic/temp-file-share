"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
    getStoredTokens,
    clearTokens,
    getUserInfo,
    handleAuthCallback as handleAuthCallbackUtil,
} from "@/lib/auth-utils";
import { getLogoutUrl } from "@/lib/cognito-config";

interface UserInfo {
    sub: string;
    email?: string;
    email_verified?: boolean;
    phone_number?: string;
    phone_number_verified?: boolean;
    username?: string;
    preferred_username?: string;
    "cognito:username"?: string;
}

interface AuthContextType {
    user: UserInfo | null;
    loading: boolean;
    signOut: () => void;
    isAuthenticated: boolean;
    error: string | null;
    accessToken: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<UserInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);

    useEffect(() => {
        initializeAuth();
    }, []);

    const initializeAuth = async () => {
        try {
            setError(null);

            // First, try to handle OAuth callback if present
            const callbackUser = await handleAuthCallbackUtil();
            if (callbackUser) {
                setUser(callbackUser);
                // Also set the access token from stored tokens after callback
                const tokens = getStoredTokens();
                setAccessToken(tokens.accessToken || null);
                setLoading(false);
                return;
            }

            // If no callback, check for existing tokens
            const tokens = getStoredTokens();
            if (tokens.accessToken) {
                try {
                    setAccessToken(tokens.accessToken);
                    const userInfo = await getUserInfo(tokens.accessToken);
                    setUser(userInfo);
                } catch (error) {
                    console.error(
                        "Error getting user info with stored token:",
                        error
                    );
                    // Token might be expired, clear it
                    clearTokens();
                    setUser(null);
                    setAccessToken(null);
                }
            }
        } catch (error) {
            console.error("Auth initialization error:", error);
            setError(
                error instanceof Error ? error.message : "Authentication failed"
            );
            clearTokens();
            setUser(null);
            setAccessToken(null);
        } finally {
            setLoading(false);
        }
    };

    const signOut = () => {
        clearTokens();
        setUser(null);
        setAccessToken(null);
        setError(null);
        window.location.href = getLogoutUrl();
    };

    const value = {
        user,
        loading,
        signOut,
        isAuthenticated: !!user,
        error,
        accessToken,
    };

    return (
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
