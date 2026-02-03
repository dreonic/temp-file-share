import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface LandingContentProps {
    showTitle?: boolean;
}

export default function LandingContent({
    showTitle = true,
}: LandingContentProps) {
    return (
        <div className="max-w-2xl w-full text-center">
            {showTitle && (
                <>
                    <h1 className="text-5xl font-bold mb-6">Temp File Share</h1>
                    <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                        A secure, time-limited file sharing solution to share
                        and access files through shortened URLs. Easily share
                        and open files on any browser.
                    </p>
                </>
            )}

            <Card className="mb-8">
                <CardHeader>
                    <CardTitle className="text-xl font-bold">
                        Key Features
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="text-left space-y-4">
                        <li className="flex items-start gap-3">
                            <span className="text-primary font-bold">•</span>
                            <span>
                                <strong>Secure File Upload:</strong> Upload
                                files safely with encryption and secure storage
                            </span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-primary font-bold">•</span>
                            <span>
                                <strong>Time-Limited Links:</strong> Generate
                                shareable links with customizable expiration
                                dates
                            </span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-primary font-bold">•</span>
                            <span>
                                <strong>Custom Short Links:</strong> Set your
                                own custom short links for easy sharing
                            </span>
                        </li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}
