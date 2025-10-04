import type { Permission } from "./auth";

export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  requiredPermission?: Permission;
  children?: NavigationItem[];
  badge?: string | number;
  external?: boolean;
}

export interface NavigationConfig {
  main: NavigationItem[];
  footer?: NavigationItem[];
}
