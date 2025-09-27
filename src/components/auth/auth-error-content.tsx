"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { AlertCircle, ArrowLeft } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const errorMessages: Record<string, string> = {
  Configuration: "There is a problem with the server configuration.",
  AccessDenied: "Access denied. You do not have permission to access this resource.",
  Verification: "The verification token has expired or has already been used.",
  Default: "An error occurred during authentication.",
  CredentialsSignin: "Invalid email or password.",
  EmailSignin: "Check your email address.",
  OAuthSignin: "Error in constructing an authorization URL.",
  OAuthCallback: "Error in handling the response from an OAuth provider.",
  OAuthCreateAccount: "Could not create OAuth account.",
  EmailCreateAccount: "Could not create email account.",
  Callback: "Error in the OAuth callback handler route.",
  OAuthAccountNotLinked: "Email on the account is already linked, but not with this OAuth account.",
  SessionRequired: "You must be signed in to access this page.",
};

export function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams?.get("error") ?? "Default";

  const errorMessage = errorMessages[error] ?? errorMessages.Default;

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-destructive text-center text-2xl font-bold">
          Authentication Error
        </CardTitle>
        <CardDescription className="text-center">
          Something went wrong during authentication
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Button asChild className="w-full">
            <Link href="/login">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Try Again
            </Link>
          </Button>
          <Button variant="outline" asChild className="w-full">
            <Link href="/">Go Home</Link>
          </Button>
        </div>

        {error === "OAuthAccountNotLinked" && (
          <div className="text-muted-foreground text-center text-sm">
            <p>To confirm your identity, sign in with the same account you used originally.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
