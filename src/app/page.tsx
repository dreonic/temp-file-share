"use client";

import Image from "next/image";
import LoginButton from "@/components/LoginButton";
import UserProfile from "@/components/UserProfile";
import AuthWrapper from "@/components/AuthWrapper";
import FileList from "@/components/FileList";
import ApiTest from "@/components/ApiTest";

export default function Home() {
    return (
        <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
            <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start w-full max-w-6xl">
                <div className="flex justify-between items-center w-full">
                    <Image
                        className="dark:invert"
                        src="/next.svg"
                        alt="Next.js logo"
                        width={180}
                        height={38}
                        priority
                    />
                    <AuthWrapper
                        authenticated={<UserProfile />}
                        unauthenticated={<LoginButton />}
                    />
                </div>

                <AuthWrapper
                    authenticated={
                        <div className="w-full">
                            <h1 className="text-3xl font-bold mb-8 text-center">
                                File Share Dashboard
                            </h1>
                            <ApiTest />
                            <FileList />
                        </div>
                    }
                    unauthenticated={
                        <ol className="font-mono list-inside list-decimal text-sm/6 text-center sm:text-left">
                            <li className="mb-2 tracking-[-.01em]">
                                Sign in to access secure file sharing
                            </li>
                            <li className="tracking-[-.01em]">
                                Share files temporarily with others
                            </li>
                        </ol>
                    }
                />
            </main>

            <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
                <a
                    className="flex items-center gap-2 hover:underline hover:underline-offset-4"
                    href="https://nextjs.org/learn"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <Image
                        aria-hidden
                        src="/file.svg"
                        alt="File icon"
                        width={16}
                        height={16}
                    />
                    Learn
                </a>
            </footer>
        </div>
    );
}
