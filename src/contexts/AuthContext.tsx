"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
    getStoredTokens,
    clearTokens,
    getUserInfo,
    handleAuthCallback as handleAuthCallbackUtil,
    isTokenExpired,
} from "@/lib/auth-utils";
import { getLoginUrl, getLogoutUrl } from "@/lib/cognito-config";

import UserInfo from "@/types/user-info";

/*
This is the AuthContext providing authentication state and methods across the React application using Context API.
It handles initialization, sign-out, and exposes user info and loading state.
*/

interface AuthContextType {
    user: UserInfo | null;
    loading: boolean;
    signIn: () => void;
    signOut: () => void;
    isAuthenticated: boolean;
    error: string | null;
    accessToken: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Function that wraps children with AuthContext provider.
// It manages authentication state, including user info, loading state, errors, and access token.
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
                // Check if token is expired
                if (isTokenExpired()) {
                    console.log("Token expired, redirecting to logout");
                    clearTokens();
                    setUser(null);
                    setAccessToken(null);
                    // Redirect to logout page with expired reason
                    if (typeof window !== "undefined") {
                        window.location.href = "/logout?reason=expired";
                    }
                    return;
                }

                try {
                    setAccessToken(tokens.accessToken);
                    const userInfo = await getUserInfo(tokens.accessToken);
                    setUser(userInfo);
                } catch (error) {
                    console.error(
                        "Error getting user info with stored token:",
                        error,
                    );
                    // Token might be expired or invalid, clear it
                    clearTokens();
                    setUser(null);
                    setAccessToken(null);
                    // Redirect to logout page with expired reason
                    if (typeof window !== "undefined") {
                        window.location.href = "/logout?reason=expired";
                    }
                }
            }
        } catch (error) {
            console.error("Auth initialization error:", error);
            setError(
                error instanceof Error
                    ? error.message
                    : "Authentication failed",
            );
            clearTokens();
            setUser(null);
            setAccessToken(null);
        } finally {
            setLoading(false);
        }
    };

    const signIn = () => {
        window.location.href = getLoginUrl();
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
        signIn,
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
