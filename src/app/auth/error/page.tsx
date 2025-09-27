import { Suspense } from "react";

import { AuthErrorContent } from "@/components/auth/auth-error-content";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Authentication Error | FE-Engine Prime",
  description: "Authentication error occurred",
};

export default function AuthErrorPage() {
  return (
    <div className="bg-background flex min-h-screen items-center justify-center px-4">
      <Suspense fallback={<div>Loading...</div>}>
        <AuthErrorContent />
      </Suspense>
    </div>
  );
}
