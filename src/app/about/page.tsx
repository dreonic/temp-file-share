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
                        About File Share
                    </h1>

                    <Card className="mb-8 w-full">
                        <CardHeader>
                            <CardTitle>Our Mission</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-muted-foreground">
                                File Share is a secure, temporary file sharing
                                service built with modern cloud technologies. Upload
                                your files and share them with time-limited links
                                that expire automatically.
                            </p>
                            <p className="text-muted-foreground">
                                Our service uses AWS infrastructure to ensure your
                                files are stored securely and delivered quickly. All
                                uploads are protected with authentication, and links
                                are designed to be temporary for your privacy.
                            </p>
                        </CardContent>
                    </Card>

                    <LandingContent showTitle={false} />

                    <div className="mt-8">
                        <Button asChild>
                            <Link href="/">
                                Back to Home
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
