import Cookies from "js-cookie";
import { cognitoConfig } from "./cognito-config";

interface TokenResponse {
    access_token: string;
    id_token: string;
    refresh_token?: string;
    token_type: string;
    expires_in: number;
}

import UserInfo from "@/types/user-info";

// Exchange authorization code for tokens directly with Cognito
// This is safe for public clients (no client secret required)
export const exchangeCodeForTokens = async (
    code: string,
): Promise<TokenResponse> => {
    const response = await fetch(
        `https://${cognitoConfig.domain}/oauth2/token`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                grant_type: "authorization_code",
                client_id: cognitoConfig.clientId,
                code: code,
                redirect_uri: cognitoConfig.redirectUri,
            }),
        },
    );

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Token exchange failed:", errorText);
        throw new Error("Failed to exchange code for tokens");
    }

    return response.json();
};

// Get user info from Cognito using access token
export const getUserInfo = async (accessToken: string): Promise<UserInfo> => {
    const response = await fetch(
        `https://${cognitoConfig.domain}/oauth2/userInfo`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        },
    );

    if (!response.ok) {
        const errorText = await response.text();
        console.error("UserInfo fetch failed:", errorText);
        throw new Error("Failed to get user info");
    }

    return response.json();
};

// Store tokens securely in cookies
export const storeTokens = (tokens: TokenResponse): void => {
    const expiresInDays = tokens.expires_in / (24 * 60 * 60); // Convert seconds to days

    Cookies.set("access_token", tokens.access_token, {
        expires: expiresInDays,
        secure: true,
        sameSite: "strict",
    });

    Cookies.set("id_token", tokens.id_token, {
        expires: expiresInDays,
        secure: true,
        sameSite: "strict",
    });

    if (tokens.refresh_token) {
        Cookies.set("refresh_token", tokens.refresh_token, {
            expires: 30, // 30 days for refresh token
            secure: true,
            sameSite: "strict",
        });
    }
};

// Handle the OAuth callback from Cognito
export const handleAuthCallback = async (): Promise<UserInfo | null> => {
    if (typeof window === "undefined") return null;

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const state = urlParams.get("state");
    const error = urlParams.get("error");

    if (error) {
        console.error("Auth error:", error);
        throw new Error(`Authentication error: ${error}`);
    }

    if (!code || !state) {
        return null; // No callback parameters
    }

    const storedState = localStorage.getItem("cognito_state");

    if (state !== storedState) {
        console.error("State mismatch - possible CSRF attack");
        throw new Error("State mismatch");
    }

    try {
        // Exchange code for tokens
        const tokens = await exchangeCodeForTokens(code);
        storeTokens(tokens);

        // Get user info
        const userInfo = await getUserInfo(tokens.access_token);

        // Clean up
        localStorage.removeItem("cognito_state");

        // Clean URL parameters
        window.history.replaceState(
            {},
            document.title,
            window.location.pathname,
        );

        return userInfo;
    } catch (error) {
        console.error("Error during auth callback:", error);
        throw error;
    }
};

// Get stored tokens from cookies
export const getStoredTokens = () => {
    return {
        accessToken: Cookies.get("access_token"),
        idToken: Cookies.get("id_token"),
        refreshToken: Cookies.get("refresh_token"),
    };
};

// Clear all stored tokens
export const clearTokens = (): void => {
    Cookies.remove("access_token");
    Cookies.remove("id_token");
    Cookies.remove("refresh_token");
};

// Check if user is currently authenticated
export const isAuthenticated = (): boolean => {
    const tokens = getStoredTokens();
    return !!tokens.accessToken && !!tokens.idToken;
};
