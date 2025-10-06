"use client";

import { Shield } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { UserRole } from "@/types/auth";

interface UserRoleBadgeProps {
  role: UserRole;
  showIcon?: boolean;
  className?: string;
}

export function UserRoleBadge({ role, showIcon = true, className }: UserRoleBadgeProps) {
  const roleConfig = getRoleConfig(role);

  return (
    <Badge
      variant={roleConfig.variant as "default" | "destructive" | "secondary"}
      className={cn("flex items-center gap-1.5", className)}
    >
      {showIcon && <Shield className="h-3 w-3" />}
      <span>{roleConfig.label}</span>
    </Badge>
  );
}

function getRoleConfig(role: UserRole): {
  variant: "default" | "destructive" | "secondary";
  label: string;
  color: string;
} {
  switch (role) {
    case UserRole.ADMIN:
      return {
        variant: "destructive", // Red badge
        label: "Admin",
        color: "text-red-500",
      };

    case UserRole.EDITOR:
      return {
        variant: "default", // Yellow badge (using default as warning not available)
        label: "Editor",
        color: "text-yellow-500",
      };

    case UserRole.USER:
      return {
        variant: "default", // Blue badge
        label: "User",
        color: "text-blue-500",
      };

    default:
      return {
        variant: "secondary", // Gray badge
        label: "Unknown",
        color: "text-gray-500",
      };
  }
}
