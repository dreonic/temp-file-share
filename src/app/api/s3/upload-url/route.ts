import { NextRequest, NextResponse } from "next/server";

const DATA_AUTH_LAMBDA_URL = process.env.NEXT_PUBLIC_DATA_AUTH_LAMBDA_URL;

export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get("Authorization");
        
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json(
                { error: "Missing or invalid authorization header" },
                { status: 401 }
            );
        }

        const { fileName, fileType, fileSize } = await request.json();

        if (!DATA_AUTH_LAMBDA_URL) {
            console.error("NEXT_PUBLIC_DATA_AUTH_LAMBDA_URL is not defined");
            return NextResponse.json(
                { error: "Server configuration error: Lambda URL not configured" },
                { status: 500 }
            );
        }
        
        const response = await fetch(DATA_AUTH_LAMBDA_URL, {
            method: 'POST',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fileName,
                contentType: fileType || 'application/octet-stream',
                fileSize: fileSize || 0
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Lambda error response:', errorText);
            
            try {
                const error = JSON.parse(errorText);
                return NextResponse.json(error, { status: response.status });
            } catch {
                return NextResponse.json(
                    { error: 'Lambda returned non-JSON error', details: errorText },
                    { status: response.status }
                );
            }
        }

        const responseText = await response.text();
        
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error('Failed to parse Lambda response as JSON:', parseError);
            return NextResponse.json(
                { error: 'Invalid response from Lambda', details: responseText.substring(0, 200) },
                { status: 500 }
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("Error generating presigned URL:", error);
        return NextResponse.json(
            { 
                error: "Failed to generate upload URL",
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}