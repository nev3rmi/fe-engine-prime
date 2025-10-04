import { Home, Users, Settings, FileText, Shield } from "lucide-react";

import { Permission } from "@/types/auth";
import type { NavigationConfig } from "@/types/navigation";

export const navigationConfig: NavigationConfig = {
  main: [
    {
      id: "dashboard",
      label: "Dashboard",
      href: "/dashboard",
      icon: Home,
    },
    {
      id: "content",
      label: "Content",
      href: "/content",
      icon: FileText,
      requiredPermission: Permission.READ_CONTENT,
    },
    {
      id: "admin",
      label: "Administration",
      href: "/admin",
      icon: Shield,
      requiredPermission: Permission.MANAGE_USER_ROLES,
      children: [
        {
          id: "admin-users",
          label: "User Management",
          href: "/admin",
          icon: Users,
          requiredPermission: Permission.MANAGE_USER_ROLES,
        },
        {
          id: "admin-settings",
          label: "Settings",
          href: "/admin/settings",
          icon: Settings,
          requiredPermission: Permission.MANAGE_USER_ROLES,
        },
      ],
    },
  ],
  footer: [
    {
      id: "help",
      label: "Help",
      href: "/help",
    },
    {
      id: "privacy",
      label: "Privacy",
      href: "/privacy",
    },
  ],
};
