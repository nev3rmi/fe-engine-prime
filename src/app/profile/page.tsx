"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, CheckCircle2, Mail, Calendar, Shield } from "lucide-react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { UserRole } from "@/types/auth";

// Phase 2: Form Schema & Validation (Step 5)
const profileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  username: z
    .string()
    .regex(/^[a-zA-Z0-9_]*$/, "Username can only contain letters, numbers, and underscores")
    .max(50, "Username must be less than 50 characters")
    .optional()
    .or(z.literal("")),
  image: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

type ProfileFormData = z.infer<typeof profileSchema>;

// Helper Functions (Steps 28-31)
function getInitials(name: string): string {
  if (!name) {
    return "?";
  }

  const words = name.trim().split(/\s+/);

  if (words.length === 1 && words[0]) {
    return words[0].charAt(0).toUpperCase();
  }

  const firstWord = words[0];
  const lastWord = words[words.length - 1];

  if (firstWord && lastWord) {
    return firstWord.charAt(0).toUpperCase() + lastWord.charAt(0).toUpperCase();
  }

  return "?";
}

function getRoleVariant(role: UserRole): "destructive" | "default" | "secondary" {
  switch (role) {
    case UserRole.ADMIN:
      return "destructive"; // Red badge
    case UserRole.EDITOR:
      return "default"; // Yellow/blue badge
    case UserRole.USER:
      return "default"; // Blue badge
    default:
      return "secondary"; // Gray badge
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) {
    return "Just now";
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
  } else if (diffMins < 1440) {
    // 24 hours
    const hours = Math.floor(diffMins / 60);
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  } else {
    return formatDate(dateString);
  }
}

function getRoleMessage(role: UserRole): string {
  switch (role) {
    case UserRole.ADMIN:
      return "Your dashboard shows all system activity and user management tools.";
    case UserRole.EDITOR:
      return "You have editing privileges across all projects and content.";
    case UserRole.USER:
      return "Welcome to your personalized dashboard.";
    default:
      return "Welcome to FE-Engine Prime.";
  }
}

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Phase 1: Session & Data Loading (Steps 1-4)
  const { data: session, status, update } = useSession();

  // Step 4: Extract user data
  const user = session?.user as
    | {
        id: string;
        name?: string | null;
        email?: string | null;
        image?: string | null;
        username?: string | null;
        role: UserRole;
        provider?: string | null;
        emailVerified?: boolean;
        createdAt?: Date | string;
        lastLoginAt?: Date | string;
      }
    | undefined;

  // Phase 2: Form initialization (Step 6) - Must be before early returns
  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name ?? "",
      username: user?.username ?? "",
      image: user?.image ?? "",
    },
  });

  // Step 2: Handle loading state
  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Step 3: Redirect if not authenticated
  if (status === "unauthenticated" || !session?.user || !user) {
    router.push("/login");
    return null;
  }

  // Phase 3: Form Submission Logic (Steps 7-15)
  async function onSubmit(values: ProfileFormData) {
    try {
      // Step 8: Set loading state
      setIsSubmitting(true);

      // Step 9: Send PATCH request to API
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: values.name,
          username: values.username ?? null,
          image: values.image ?? null,
        }),
      });

      // Step 10: Check response
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message ?? "Failed to update profile");
      }

      // Step 11: Parse updated user data
      const updatedUser = await response.json();

      // Step 12: Update session with new data
      if (session) {
        await update({
          ...session,
          user: {
            ...session.user,
            ...updatedUser,
          },
        });
      }

      // Step 13: Show success toast
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });

      // Reset form with new values
      form.reset(values);
    } catch (error) {
      // Step 14: Handle errors
      toast({
        title: "Error updating profile",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      // Step 15: Clear loading state
      setIsSubmitting(false);
    }
  }

  // Phase 4: UI Rendering (Steps 16-27)
  return (
    <div className="container mx-auto max-w-4xl space-y-6 py-8">
      {/* Step 17: Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Profile Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences</p>
      </div>

      {/* Steps 18-21: Account Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle>Account Overview</CardTitle>
          <CardDescription>Your account information and status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 19: Avatar and basic info */}
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user.image ?? undefined} alt={user.name ?? "User"} />
              <AvatarFallback className="text-lg">
                {getInitials(user.name ?? "User")}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-semibold">{user.name ?? "User"}</h2>
                <Badge variant={getRoleVariant(user.role)}>
                  <Shield className="mr-1 h-3 w-3" />
                  {user.role}
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm">{getRoleMessage(user.role)}</p>
            </div>
          </div>

          {/* Step 20: Account details */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <Mail className="text-muted-foreground h-4 w-4" />
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-muted-foreground text-sm">{user.email}</p>
              </div>
            </div>
            {user.createdAt && (
              <div className="flex items-center gap-2">
                <Calendar className="text-muted-foreground h-4 w-4" />
                <div>
                  <p className="text-sm font-medium">Member Since</p>
                  <p className="text-muted-foreground text-sm">
                    {formatDate(user.createdAt.toString())}
                  </p>
                </div>
              </div>
            )}
            {user.lastLoginAt && (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="text-muted-foreground h-4 w-4" />
                <div>
                  <p className="text-sm font-medium">Last Login</p>
                  <p className="text-muted-foreground text-sm">
                    {formatRelativeTime(user.lastLoginAt.toString())}
                  </p>
                </div>
              </div>
            )}
            {user.provider && (
              <div className="flex items-center gap-2">
                <Shield className="text-muted-foreground h-4 w-4" />
                <div>
                  <p className="text-sm font-medium">Provider</p>
                  <p className="text-muted-foreground text-sm capitalize">
                    {user.provider}
                    {user.emailVerified && " (Verified)"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Steps 22-27: Profile Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle>Edit Profile</CardTitle>
          <CardDescription>Update your personal information</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Step 23: Display Name field */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your display name"
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Step 24: Username field */}
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your username" disabled={isSubmitting} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Step 25: Email field (read-only) */}
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input value={user.email ?? ""} disabled readOnly />
                </FormControl>
                <p className="text-muted-foreground text-xs">
                  Email is managed by your authentication provider
                </p>
              </FormItem>

              {/* Step 26: Profile Image URL field */}
              <FormField
                control={form.control}
                name="image"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Profile Image URL (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="https://example.com/avatar.jpg"
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Step 27: Action buttons */}
              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting || !form.formState.isDirty}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={() => form.reset()}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
