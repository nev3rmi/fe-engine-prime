"use client";

import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useSession } from "next-auth/react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SessionStatusIndicatorProps {
  className?: string;
}

export function SessionStatusIndicator({ className }: SessionStatusIndicatorProps) {
  const { status } = useSession();

  // Don't render during loading (handled by AuthLoadingSpinner)
  if (status === "loading") {
    return null;
  }

  const statusConfig = getStatusConfig(status);

  return (
    <Badge
      variant={statusConfig.variant as "default" | "destructive" | "secondary"}
      className={cn("flex items-center gap-1.5", className)}
    >
      <statusConfig.icon className="h-3 w-3" />
      <span>{statusConfig.label}</span>
    </Badge>
  );
}

function getStatusConfig(status: string): {
  variant: "default" | "destructive" | "secondary";
  icon: typeof CheckCircle2 | typeof XCircle | typeof Loader2;
  label: string;
} {
  switch (status) {
    case "authenticated":
      return {
        variant: "default",
        icon: CheckCircle2,
        label: "Authenticated",
      };

    case "unauthenticated":
      return {
        variant: "destructive",
        icon: XCircle,
        label: "Not Authenticated",
      };

    case "loading":
      return {
        variant: "secondary",
        icon: Loader2,
        label: "Loading...",
      };

    default:
      return {
        variant: "secondary",
        icon: XCircle,
        label: "Unknown",
      };
  }
}
