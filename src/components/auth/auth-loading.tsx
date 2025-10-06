"use client";

import { Loader2 } from "lucide-react";

interface AuthLoadingSpinnerProps {
  fullScreen?: boolean;
  message?: string;
}

export function AuthLoadingSpinner({
  fullScreen = false,
  message = "Checking authentication...",
}: AuthLoadingSpinnerProps) {
  const containerClass = fullScreen
    ? "fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50"
    : "flex items-center justify-center p-8";

  return (
    <div className={containerClass}>
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="text-primary h-8 w-8 animate-spin" aria-label="Loading" />
        <p className="text-muted-foreground text-sm">{message}</p>
      </div>
    </div>
  );
}
