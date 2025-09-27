"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Github, Mail, User, UserCheck, Crown } from "lucide-react";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: "github" | "google" | "discord") => {
    setIsLoading(true);
    try {
      await signIn(provider, { callbackUrl: "/dashboard" });
    } catch (err) {
      setError(`Failed to sign in with ${provider}`);
      setIsLoading(false);
    }
  };

  // Test credential functions for development
  const handleTestCredentials = async (userType: "user" | "editor" | "admin") => {
    const testCredentials = {
      user: { email: "test@example.com", password: "testuser123" },
      editor: { email: "editor@example.com", password: "editoruser123" },
      admin: { email: "admin@example.com", password: "adminuser123" },
    };

    const credentials = testCredentials[userType];
    form.setValue("email", credentials.email);
    form.setValue("password", credentials.password);

    // Auto-submit the form
    setTimeout(() => {
      form.handleSubmit(onSubmit)();
    }, 100);
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    disabled={isLoading}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="Enter your password"
                    disabled={isLoading}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign In
          </Button>
        </form>
      </Form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <Separator className="w-full" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background text-muted-foreground px-2">Or continue with</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Button
          variant="outline"
          disabled={isLoading}
          onClick={() => handleOAuthSignIn("github")}
          className="w-full"
        >
          <Github className="mr-2 h-4 w-4" />
          GitHub
        </Button>
        <Button
          variant="outline"
          disabled={isLoading}
          onClick={() => handleOAuthSignIn("google")}
          className="w-full"
        >
          <Mail className="mr-2 h-4 w-4" />
          Google
        </Button>
        <Button
          variant="outline"
          disabled={isLoading}
          onClick={() => handleOAuthSignIn("discord")}
          className="w-full"
        >
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.120.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
          </svg>
          Discord
        </Button>
      </div>

      {/* Development Test Credentials */}
      {process.env.NODE_ENV !== "production" && (
        <>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background text-muted-foreground px-2">
                Test Accounts (Dev Only)
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-muted-foreground mb-3 text-center text-xs">
              Quick sign-in for testing different user roles
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Button
                variant="secondary"
                size="sm"
                disabled={isLoading}
                onClick={() => handleTestCredentials("user")}
                className="w-full text-xs"
              >
                <User className="mr-2 h-3 w-3" />
                Test User
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={isLoading}
                onClick={() => handleTestCredentials("editor")}
                className="w-full text-xs"
              >
                <UserCheck className="mr-2 h-3 w-3" />
                Test Editor
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={isLoading}
                onClick={() => handleTestCredentials("admin")}
                className="w-full text-xs"
              >
                <Crown className="mr-2 h-3 w-3" />
                Test Admin
              </Button>
            </div>

            <div className="text-muted-foreground mt-3 space-y-1 text-xs">
              <div className="text-center font-medium">Test Credentials:</div>
              <div className="grid grid-cols-1 gap-1 text-center">
                <div>
                  <strong>User:</strong> test@example.com / testuser123
                </div>
                <div>
                  <strong>Editor:</strong> editor@example.com / editoruser123
                </div>
                <div>
                  <strong>Admin:</strong> admin@example.com / adminuser123
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
