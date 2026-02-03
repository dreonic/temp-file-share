import LandingContent from "@/components/LandingContent";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Link from "next/link";

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="flex flex-col items-center">
                    <h1 className="text-4xl font-bold mb-8">
                        About Temp File Share
                    </h1>

                    <Card className="mb-8 w-full">
                        <CardHeader>
                            <CardTitle>Solving a Real Problem</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <p className="text-muted-foreground">
                                Temp File Share is a secure, temporary file
                                sharing service built with modern cloud
                                technologies. I took this project on to address
                                a real need for easy, temporary file sharing and
                                get hands-on experience developing cloud-native
                                serverless AWS Services.
                            </p>
                            <p className="text-muted-foreground">
                                The project leverages AWS Lambda, S3, and
                                DynamoDB to provide a seamless and efficient way
                                to share files without the hassle of setting up
                                and managing traditional servers.
                            </p>
                            <p className="text-muted-foreground">
                                More information is pending writeup. Stay tuned!
                                Find me on{" "}
                                <a
                                    href="https://www.juanfrederick.com"
                                    className="text-blue-600 underline"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    my website
                                </a>
                                .
                            </p>
                        </CardContent>
                    </Card>

                    {/* <LandingContent showTitle={false} /> */}

                    <div className="">
                        <Button asChild>
                            <Link href="/">Back to Home</Link>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
