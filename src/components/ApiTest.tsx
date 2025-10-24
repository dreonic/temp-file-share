"use client";

import { useState } from "react";

export default function ApiTest() {
    const [testResult, setTestResult] = useState<string>("");
    const [isLoading, setIsLoading] = useState(false);

    const API_BASE_URL =
        "https://79l39etqkl.execute-api.ap-southeast-1.amazonaws.com";

    const testCorrectPaths = async () => {
        setIsLoading(true);
        setTestResult("Testing correct API paths with detailed diagnostics...");

        // Based on our PowerShell testing, the root path works!
        const pathsToTest = [
            `${API_BASE_URL}`, // Root without trailing slash
        ];

        const results = [];

        for (const path of pathsToTest) {
            results.push(`\n=== Testing: ${path} ===`);

            try {
                // First test simple GET without CORS headers
                console.log(`Testing simple GET on: ${path}`);
                const simpleResponse = await fetch(path, {
                    method: "GET",
                    mode: "cors",
                });

                const simpleText = await simpleResponse.text();
                results.push(
                    `Simple GET: ${simpleResponse.status} ${simpleResponse.statusText}`
                );
                results.push(
                    `Response: ${simpleText.slice(0, 200)}${
                        simpleText.length > 200 ? "..." : ""
                    }`
                );

                // Then test OPTIONS (CORS preflight)
                console.log(`Testing OPTIONS on: ${path}`);
                const optionsResponse = await fetch(path, {
                    method: "OPTIONS",
                    headers: {
                        Origin: "http://localhost:3000",
                        "Access-Control-Request-Method": "GET",
                        "Access-Control-Request-Headers":
                            "Authorization, Content-Type",
                    },
                });
                console.log(`OPTIONS response received`);

                const optionsText = await optionsResponse.text();
                const corsHeaders = Array.from(
                    optionsResponse.headers.entries()
                )
                    .filter(([key]) =>
                        key.toLowerCase().includes("access-control")
                    )
                    .map(([key, value]) => `  ${key}: ${value}`)
                    .join("\n");

                results.push(
                    `OPTIONS: ${optionsResponse.status} ${optionsResponse.statusText}`
                );
                results.push(
                    `CORS Headers:\n${corsHeaders || "  (none found)"}`
                );
                results.push(
                    `Response: ${optionsText.slice(0, 150)}${
                        optionsText.length > 150 ? "..." : ""
                    }`
                );

                // If OPTIONS succeeds, test GET
                if (optionsResponse.ok) {
                    results.push(`✅ OPTIONS successful! Testing GET...`);

                    try {
                        const getResponse = await fetch(path, {
                            method: "GET",
                            headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${accessToken}`,
                            },
                        });
                        const getText = await getResponse.text();
                        results.push(
                            `GET: ${getResponse.status} ${getResponse.statusText}`
                        );
                        results.push(
                            `GET Response: ${getText.slice(0, 200)}${
                                getText.length > 200 ? "..." : ""
                            }`
                        );

                        if (getResponse.ok || getResponse.status === 401) {
                            results.push(`🎉 WORKING ENDPOINT FOUND: ${path}`);
                        }
                    } catch (getError) {
                        results.push(
                            `GET Error: ${
                                getError instanceof Error
                                    ? getError.message
                                    : "Unknown"
                            }`
                        );
                    }
                } else {
                    results.push(`❌ OPTIONS failed`);
                }
            } catch (error) {
                results.push(
                    `❌ Error: ${
                        error instanceof Error ? error.message : "Unknown"
                    }`
                );
            }

            results.push(""); // Add spacing
        }

        setTestResult(results.join("\n"));
        setIsLoading(false);
    };

    const testBasicConnectivity = async () => {
        setIsLoading(true);
        setTestResult("Testing basic connectivity to API Gateway...");

        const endpoint = `${API_BASE_URL}`;

        try {
            // Test with no-cors mode first
            console.log(`Testing no-cors mode: ${endpoint}`);
            const noCorsResponse = await fetch(endpoint, {
                method: "GET",
                mode: "no-cors",
            });

            const results = [];
            results.push(
                `No-CORS Test: ${noCorsResponse.status} ${noCorsResponse.statusText}`
            );
            results.push(`Type: ${noCorsResponse.type}`);
            results.push(`OK: ${noCorsResponse.ok}`);

            // Test with different endpoints using basic fetch
            const testEndpoints = [`${API_BASE_URL}`, `${API_BASE_URL}/`];

            results.push(`\n=== Testing Multiple Endpoints ===`);

            for (const testUrl of testEndpoints) {
                try {
                    results.push(`\nTesting: ${testUrl}`);
                    const response = await fetch(testUrl, {
                        method: "GET",
                        mode: "cors",
                    });
                    results.push(
                        `Status: ${response.status} ${response.statusText}`
                    );
                    results.push(
                        `Headers: ${Array.from(response.headers.entries())
                            .map(([k, v]) => `${k}:${v}`)
                            .join(", ")}`
                    );

                    if (
                        response.ok ||
                        response.status === 401 ||
                        response.status === 403
                    ) {
                        const text = await response.text();
                        results.push(
                            `✅ Response received: ${text.slice(0, 100)}...`
                        );
                    }
                } catch (error) {
                    results.push(
                        `❌ Error: ${
                            error instanceof Error ? error.message : "Unknown"
                        }`
                    );
                }
            }

            setTestResult(results.join("\n"));
        } catch (error) {
            setTestResult(
                `Basic connectivity test failed:\n` +
                    `Error: ${
                        error instanceof Error ? error.message : "Unknown error"
                    }\n` +
                    `This suggests the API Gateway endpoint might be incorrect or not accessible.`
            );
        } finally {
            setIsLoading(false);
        }
    };

    const testSpecificEndpoint = async () => {
        setIsLoading(true);
        setTestResult("Testing the most likely endpoint...");

        // Based on your Lambda test, this is probably the correct endpoint
        const endpoint = `${API_BASE_URL}`;

        try {
            console.log(`Testing specific endpoint: ${endpoint}`);

            const response = await fetch(endpoint, {
                method: "OPTIONS",
                headers: {
                    Origin: "http://localhost:3000",
                    "Access-Control-Request-Method": "GET",
                    "Access-Control-Request-Headers":
                        "Authorization, Content-Type",
                },
            });

            const responseText = await response.text();
            const allHeaders = Array.from(response.headers.entries());
            const corsHeaders = allHeaders.filter(([key]) =>
                key.toLowerCase().includes("access-control")
            );

            setTestResult(
                `Endpoint: ${endpoint}\n` +
                    `Status: ${response.status} ${response.statusText}\n` +
                    `OK: ${response.ok}\n\n` +
                    `CORS Headers:\n${corsHeaders
                        .map(([k, v]) => `  ${k}: ${v}`)
                        .join("\n")}\n\n` +
                    `All Headers:\n${allHeaders
                        .map(([k, v]) => `  ${k}: ${v}`)
                        .join("\n")}\n\n` +
                    `Response Body:\n${responseText}`
            );
        } catch (error) {
            setTestResult(
                `Endpoint: ${endpoint}\n` +
                    `Error: ${
                        error instanceof Error ? error.message : "Unknown error"
                    }`
            );
        } finally {
            setIsLoading(false);
        }
    };

    const testProductionEndpoint = async () => {
        setIsLoading(true);
        setTestResult("Testing with production origin...");

        const endpoint = `${API_BASE_URL}`;

        try {
            const response = await fetch(endpoint, {
                method: "OPTIONS",
                headers: {
                    Origin: "https://file-share.juanfrederick.com",
                    "Access-Control-Request-Method": "GET",
                    "Access-Control-Request-Headers":
                        "Authorization, Content-Type",
                },
            });

            const responseText = await response.text();
            const corsHeaders = Array.from(response.headers.entries()).filter(
                ([key]) => key.toLowerCase().includes("access-control")
            );

            setTestResult(
                `Production Origin Test\n` +
                    `Endpoint: ${endpoint}\n` +
                    `Status: ${response.status} ${response.statusText}\n` +
                    `OK: ${response.ok}\n\n` +
                    `CORS Headers:\n${corsHeaders
                        .map(([k, v]) => `  ${k}: ${v}`)
                        .join("\n")}\n\n` +
                    `Response: ${responseText}`
            );
        } catch (error) {
            setTestResult(
                `Production test error: ${
                    error instanceof Error ? error.message : "Unknown error"
                }`
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-gray-100 p-4 rounded-lg mb-4">
            <h3 className="text-lg font-semibold mb-3">API Debug Tools</h3>
            <p className="text-sm text-gray-600 mb-3">
                Lambda test shows path=&quot;/&quot;, stage=&quot;prod&quot;, so
                testing likely endpoints...
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
                <button
                    onClick={testBasicConnectivity}
                    disabled={isLoading}
                    className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                >
                    Basic Test
                </button>
                <button
                    onClick={testCorrectPaths}
                    disabled={isLoading}
                    className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                    Test All Paths
                </button>
                <button
                    onClick={testSpecificEndpoint}
                    disabled={isLoading}
                    className="px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                >
                    Test /prod
                </button>
                <button
                    onClick={testProductionEndpoint}
                    disabled={isLoading}
                    className="px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
                >
                    Test Production
                </button>
            </div>
            {isLoading && (
                <div className="text-blue-600 mb-2 flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                    Testing endpoints...
                </div>
            )}
            {testResult && (
                <div className="bg-white p-3 rounded border max-h-96 overflow-y-auto">
                    <pre className="text-xs whitespace-pre-wrap font-mono">
                        {testResult}
                    </pre>
                </div>
            )}
        </div>
    );
}
