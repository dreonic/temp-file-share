"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import LandingContent from "@/components/LandingContent";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Home() {
    const { signIn, isAuthenticated, loading } = useAuth();
    const router = useRouter();

    // Redirect authenticated users to /home
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

    // Only show landing page for unauthenticated users
    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4">
            <LandingContent />

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8">
                <Button variant="outline" asChild>
                    <Link href="/about">
                        Read More
                    </Link>
                </Button>
                <Button onClick={signIn}>
                    Sign In
                </Button>
            </div>
        </div>
    );
}
