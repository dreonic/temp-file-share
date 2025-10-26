import { NextRequest, NextResponse } from "next/server";
import { cognitoConfig } from "@/lib/cognito-config";

// IMPORTANT: Client secret is now only in the backend
const COGNITO_CLIENT_SECRET = process.env.COGNITO_CLIENT_SECRET || "";

interface TokenResponse {
    access_token: string;
    id_token: string;
    refresh_token?: string;
    token_type: string;
    expires_in: number;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { code } = body;

        if (!code) {
            return NextResponse.json(
                { error: "Authorization code is required" },
                { status: 400 }
            );
        }

        // Exchange code for tokens with Cognito
        const tokenResponse = await fetch(
            `https://${cognitoConfig.domain}/oauth2/token`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({
                    grant_type: "authorization_code",
                    client_id: cognitoConfig.clientId,
                    client_secret: COGNITO_CLIENT_SECRET,
                    code: code,
                    redirect_uri: cognitoConfig.redirectUri,
                }),
            }
        );

        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            console.error("Token exchange failed:", errorText);
            return NextResponse.json(
                { error: "Failed to exchange code for tokens" },
                { status: 500 }
            );
        }

        const tokens: TokenResponse = await tokenResponse.json();

        return NextResponse.json(tokens);
    } catch (error) {
        console.error("Error in exchange-token:", error);
        return NextResponse.json(
            {
                error: "Internal server error",
                details:
                    error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        },
    });
}
