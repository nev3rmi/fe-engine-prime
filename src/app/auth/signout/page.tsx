import { SignoutContent } from "@/components/auth/signout-content";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Out | FE-Engine Prime",
  description: "Sign out of your FE-Engine Prime account",
};

export default function SignoutPage() {
  return (
    <div className="bg-background flex min-h-screen items-center justify-center px-4">
      <SignoutContent />
    </div>
  );
}
