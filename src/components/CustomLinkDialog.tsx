"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { validateCustomLink } from "@/lib/validators";

interface CustomLinkDialogProps {
    isOpen: boolean;
    onClose: () => void;
    fileName: string;
    s3Location: string;
    onSetCustomLink: (s3Location: string, customLink: string) => Promise<void>;
}

export default function CustomLinkDialog({
    isOpen,
    onClose,
    fileName,
    s3Location,
    onSetCustomLink,
}: CustomLinkDialogProps) {
    const [customLink, setCustomLink] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        // Validate input
        const validationError = validateCustomLink(customLink);
        if (validationError) {
            setError(validationError);
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            await onSetCustomLink(s3Location, customLink);
            // Success - close dialog and reset
            setCustomLink("");
            onClose();
        } catch (err: any) {
            // Handle errors from backend
            if (err.error === "Short link already exists") {
                setError(
                    "This link is already taken. Please choose a different one.",
                );
            } else if (err.error === "Custom short link already set") {
                setError("Custom link already set for this file.");
            } else if (err.error === "Invalid custom short link") {
                setError(err.message || "Invalid custom link format.");
            } else {
                setError(
                    err.message ||
                        "Failed to set custom link. Please try again.",
                );
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleInputChange = (value: string) => {
        setCustomLink(value);
        // Clear error when user starts typing
        if (error) setError(null);
    };

    const handleClose = () => {
        if (!isSubmitting) {
            setCustomLink("");
            setError(null);
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Set Custom Short Link</DialogTitle>
                    <DialogDescription className="text-wrap">
                        Create a custom short link for{" "}
                        <strong className="break-all">{fileName}</strong>.
                        <br />
                        <br />
                        Note: This can only be set once and cannot be changed
                        later.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <label
                            htmlFor="custom-link"
                            className="text-sm font-medium"
                        >
                            Custom Link
                        </label>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                                tmpf.link/
                            </span>
                            <input
                                id="custom-link"
                                type="text"
                                value={customLink}
                                onChange={(e) =>
                                    handleInputChange(e.target.value)
                                }
                                placeholder="mycustomlink"
                                className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                disabled={isSubmitting}
                                autoComplete="off"
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Must be at least 6 characters, letters and numbers
                            only
                        </p>
                        {error && (
                            <p className="text-sm text-red-600 dark:text-red-400">
                                {error}
                            </p>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={handleClose}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !customLink}
                    >
                        {isSubmitting ? "Setting..." : "Set Custom Link"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
