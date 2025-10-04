"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ChevronRight, Home, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";

import { generateBreadcrumbs } from "@/lib/navigation/breadcrumb-config";
import { filterBreadcrumbs } from "@/lib/navigation/filter-breadcrumbs";
import { cn } from "@/lib/utils";
import type { User } from "@/types/auth";
import type { BreadcrumbItem } from "@/types/breadcrumb";

interface BreadcrumbsProps {
  className?: string;
  separator?: React.ReactNode;
  showHome?: boolean;
}

export function Breadcrumbs({ className, separator, showHome = true }: BreadcrumbsProps) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [items, setItems] = useState<BreadcrumbItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadBreadcrumbs() {
      setIsLoading(true);
      try {
        const generated = generateBreadcrumbs(pathname ?? "/") ?? [];
        if (generated.length === 0) {
          setItems([]);
          return;
        }

        const user = session?.user as User | null;
        const filtered = await filterBreadcrumbs(generated, user);

        // Optionally hide home if requested
        const finalItems = showHome ? filtered : filtered.filter(item => item.label !== "Home");

        setItems(finalItems);
      } catch (error) {
        console.error("Error loading breadcrumbs:", error);
        setItems([]);
      } finally {
        setIsLoading(false);
      }
    }

    if (status !== "loading") {
      loadBreadcrumbs();
    }
  }, [pathname, session, status, showHome]);

  if (isLoading || status === "loading") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
      </div>
    );
  }

  if (items.length === 0) {
    return null;
  }

  const defaultSeparator = <ChevronRight className="text-muted-foreground h-4 w-4" />;

  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center gap-2 text-sm", className)}>
      <ol className="flex items-center gap-2">
        {items.map((item, index) => {
          return (
            <li key={item.href ?? `breadcrumb-${index}`} className="flex items-center gap-2">
              {index > 0 && (
                <span className="flex items-center" aria-hidden="true">
                  {separator ?? defaultSeparator}
                </span>
              )}

              {item.isCurrentPage || !item.href ? (
                <span
                  className="text-foreground font-medium"
                  aria-current={item.isCurrentPage ? "page" : undefined}
                >
                  {item.label === "Home" && <Home className="h-4 w-4" />}
                  {item.label !== "Home" && item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  {item.label === "Home" && <Home className="h-4 w-4" />}
                  {item.label !== "Home" && item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
