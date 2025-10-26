"use client";

import Image from "next/image";
import LoginButton from "@/components/LoginButton";
import UserProfile from "@/components/UserProfile";
import AuthWrapper from "@/components/AuthWrapper";
import FileList from "@/components/FileList";
// import ApiTest from "@/components/ApiTest";

export default function Home() {
    return (
        <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
            <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start w-full max-w-6xl">
                <div className="flex justify-between items-center w-full">
                    <AuthWrapper
                        authenticated={<UserProfile />}
                        unauthenticated={<LoginButton />}
                    />
                </div>

                <AuthWrapper
                    authenticated={
                        <div className="w-full">
                            <h1 className="text-3xl font-bold mb-8 text-center">
                                Authenticated: File Share Dashboard
                            </h1>
                            {/* <ApiTest /> */}
                            <FileList />
                        </div>
                    }
                    unauthenticated={
                        <ol className="font-mono list-inside list-decimal text-sm/6 text-center sm:text-left">
                            <li>
                                Unauthenticated users cannot access the
                                dashboard
                            </li>
                            <li className="tracking-[-.01em]">
                                Sign in to access secure file sharing
                            </li>
                            <li className="tracking-[-.01em]">
                                Share files temporarily with others
                            </li>
                        </ol>
                    }
                />
            </main>
        </div>
    );
}
