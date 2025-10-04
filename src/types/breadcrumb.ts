import type { Permission } from "./auth";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  requiredPermission?: Permission;
  isCurrentPage?: boolean;
}

export interface BreadcrumbConfig {
  [path: string]: BreadcrumbItem[];
}
