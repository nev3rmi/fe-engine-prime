"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ChevronDown, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";

import { filterNavigationItems } from "@/lib/navigation/filter-navigation";
import { cn } from "@/lib/utils";
import type { User } from "@/types/auth";
import type { NavigationItem } from "@/types/navigation";

interface DynamicNavProps {
  items: NavigationItem[];
  orientation?: "horizontal" | "vertical";
  className?: string;
}

export function DynamicNav({ items, orientation = "horizontal", className }: DynamicNavProps) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [filteredItems, setFilteredItems] = useState<NavigationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function loadNavigation() {
      setIsLoading(true);
      try {
        const user = session?.user as User | null;
        const filtered = await filterNavigationItems(items, user);
        setFilteredItems(filtered);
      } catch (error) {
        console.error("Error filtering navigation:", error);
        setFilteredItems([]);
      } finally {
        setIsLoading(false);
      }
    }

    if (status !== "loading") {
      loadNavigation();
    }
  }, [session, status, items]);

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const isActive = (item: NavigationItem): boolean => {
    if (pathname === item.href) {
      return true;
    }
    if (item.children) {
      return item.children.some(child => pathname === child.href);
    }
    return false;
  };

  if (isLoading || status === "loading") {
    return (
      <div className={cn("flex items-center justify-center p-4", className)}>
        <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
        <span className="text-muted-foreground ml-2 text-sm">Loading navigation...</span>
      </div>
    );
  }

  if (filteredItems.length === 0) {
    return null;
  }

  return (
    <nav
      className={cn(
        "flex",
        orientation === "horizontal" ? "flex-row gap-6" : "flex-col gap-1",
        className
      )}
    >
      {filteredItems.map(item => (
        <div key={item.id}>
          {item.children && item.children.length > 0 ? (
            <div>
              <button
                onClick={() => toggleExpanded(item.id)}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  isActive(item) && "bg-accent text-accent-foreground"
                )}
              >
                {item.icon && <item.icon className="h-4 w-4" />}
                <span>{item.label}</span>
                {item.badge && (
                  <span className="bg-primary text-primary-foreground ml-auto rounded-full px-2 py-0.5 text-xs">
                    {item.badge}
                  </span>
                )}
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    expandedItems.has(item.id) && "rotate-180"
                  )}
                />
              </button>
              {expandedItems.has(item.id) && (
                <div className="mt-1 ml-4 space-y-1">
                  {item.children.map(child => (
                    <Link
                      key={child.id}
                      href={child.href}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                        "hover:bg-accent hover:text-accent-foreground",
                        pathname === child.href && "bg-accent text-accent-foreground"
                      )}
                    >
                      {child.icon && <child.icon className="h-4 w-4" />}
                      <span>{child.label}</span>
                      {child.badge && (
                        <span className="bg-primary text-primary-foreground ml-auto rounded-full px-2 py-0.5 text-xs">
                          {child.badge}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <Link
              href={item.href}
              target={item.external ? "_blank" : undefined}
              rel={item.external ? "noopener noreferrer" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                pathname === item.href && "bg-accent text-accent-foreground"
              )}
            >
              {item.icon && <item.icon className="h-4 w-4" />}
              <span>{item.label}</span>
              {item.badge && (
                <span className="bg-primary text-primary-foreground ml-auto rounded-full px-2 py-0.5 text-xs">
                  {item.badge}
                </span>
              )}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}
