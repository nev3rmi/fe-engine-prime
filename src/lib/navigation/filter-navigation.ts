import { hasPermission } from "@/lib/auth/permissions";
import type { User } from "@/types/auth";
import type { NavigationItem } from "@/types/navigation";

/**
 * Filter navigation items based on user permissions
 */
export async function filterNavigationItems(
  items: NavigationItem[],
  user: User | null
): Promise<NavigationItem[]> {
  if (!user) {
    // Only show items without permission requirements
    return items.filter(item => !item.requiredPermission);
  }

  const filteredItems: NavigationItem[] = [];

  for (const item of items) {
    // Check if user has required permission
    if (item.requiredPermission) {
      const allowed = await hasPermission(user, item.requiredPermission);
      if (!allowed) {
        continue; // Skip this item
      }
    }

    // Filter children recursively
    const filteredItem = { ...item };
    if (item.children && item.children.length > 0) {
      const filteredChildren = await filterNavigationItems(item.children, user);
      if (filteredChildren.length === 0 && item.requiredPermission) {
        // Skip parent if no children are accessible
        continue;
      }
      filteredItem.children = filteredChildren;
    }

    filteredItems.push(filteredItem);
  }

  return filteredItems;
}

/**
 * Check if a navigation item is accessible to the user
 */
export async function isNavigationItemAccessible(
  item: NavigationItem,
  user: User | null
): Promise<boolean> {
  if (!item.requiredPermission) {
    return true; // Public item
  }

  if (!user) {
    return false; // Requires permission but no user
  }

  return hasPermission(user, item.requiredPermission);
}
