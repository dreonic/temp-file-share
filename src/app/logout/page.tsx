"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function LogoutPage() {
    const { isAuthenticated, loading, signIn } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    
    // Check if logout was due to expired token
    const reason = searchParams.get("reason");
    const isExpired = reason === "expired";

    // If user is somehow still authenticated, redirect to home
    useEffect(() => {
        if (!loading && isAuthenticated) {
            router.push("/home");
        }
    }, [isAuthenticated, loading, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-lg">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gray-50 dark:bg-gray-900">
            <div className="max-w-md w-full text-center">
                {/* Icon */}
                <div className="mb-6">
                    <div className={`w-16 h-16 ${
                        isExpired 
                            ? 'bg-yellow-100 dark:bg-yellow-900/30' 
                            : 'bg-green-100 dark:bg-green-900/30'
                    } rounded-full flex items-center justify-center mx-auto mb-4`}>
                        {isExpired ? (
                            <svg className="w-8 h-8 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        ) : (
                            <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        )}
                    </div>
                    
                    {/* Message */}
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        {isExpired ? "Session Expired" : "Logged Out Successfully"}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        {isExpired 
                            ? "Your session has expired for security. Please sign in again to continue."
                            : "You have been securely logged out of your account."
                        }
                    </p>
                </div>
                
                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    {isExpired ? (
                        <>
                            <Button onClick={signIn} size="lg">
                                Sign In Again
                            </Button>
                            <Button variant="outline" asChild size="lg">
                                <Link href="/">
                                    Return to Home
                                </Link>
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button asChild size="lg">
                                <Link href="/">
                                    Return to Home
                                </Link>
                            </Button>
                            <Button variant="outline" onClick={signIn} size="lg">
                                Sign In Again
                            </Button>
                        </>
                    )}
                </div>

                {/* Additional info for expired sessions */}
                {isExpired && (
                    <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                            💡 <strong>Tip:</strong> Sessions expire after a period of inactivity to protect your account.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
