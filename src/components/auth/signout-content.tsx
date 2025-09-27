"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { Loader2, LogOut, ArrowLeft } from "lucide-react";
import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function SignoutContent() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await signOut({
        callbackUrl: "/",
        redirect: true,
      });
    } catch (error) {
      console.error("Error signing out:", error);
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-center text-2xl font-bold">Sign Out</CardTitle>
        <CardDescription className="text-center">
          Are you sure you want to sign out of your account?
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Button
            onClick={handleSignOut}
            disabled={isLoading}
            variant="destructive"
            className="w-full"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <LogOut className="mr-2 h-4 w-4" />
            Yes, Sign Out
          </Button>

          <Button onClick={handleCancel} variant="outline" disabled={isLoading} className="w-full">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Cancel
          </Button>
        </div>

        <div className="text-muted-foreground text-center text-sm">
          <p>You will need to sign in again to access your account.</p>
        </div>
      </CardContent>
    </Card>
  );
}
