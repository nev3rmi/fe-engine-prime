"use client";

import { Sparkles, TrendingUp, CheckCircle, type LucideIcon } from "lucide-react";
import { useSession } from "next-auth/react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { UserRole } from "@/types/auth";

interface WelcomeMessageProps {
  variant?: "default" | "compact" | "hero";
  showStats?: boolean;
  className?: string;
}

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
}

// Helper Functions
function getTimeOfDay(): string {
  const currentHour = new Date().getHours();

  if (currentHour >= 5 && currentHour < 12) {
    return "Morning";
  } else if (currentHour >= 12 && currentHour < 17) {
    return "Afternoon";
  } else if (currentHour >= 17 && currentHour < 21) {
    return "Evening";
  } else {
    return "Night";
  }
}

function getPersonalizedGreeting(timeOfDay: string): string {
  const greetings: Record<string, string[]> = {
    Morning: ["Good morning", "Rise and shine", "Top of the morning"],
    Afternoon: ["Good afternoon", "Hello", "Welcome back"],
    Evening: ["Good evening", "Hello", "Welcome back"],
    Night: ["Good evening", "Working late", "Hello night owl"],
  };

  const timeGreetings = greetings[timeOfDay] ?? ["Hello"];
  const randomIndex = Math.floor(Math.random() * timeGreetings.length);
  const selectedGreeting = timeGreetings[randomIndex];

  return selectedGreeting ?? "Hello";
}

function getRoleBasedMessage(role: UserRole): string {
  switch (role) {
    case UserRole.ADMIN:
      return "Your dashboard shows all system activity and user management tools.";
    case UserRole.EDITOR:
      return "You have editing privileges across all projects and content.";
    case UserRole.USER:
      return "Welcome to your personalized dashboard.";
    default:
      return "Welcome to the application.";
  }
}

function getRoleVariant(role: UserRole): "destructive" | "default" | "secondary" {
  switch (role) {
    case UserRole.ADMIN:
      return "destructive";
    case UserRole.EDITOR:
      return "default";
    case UserRole.USER:
      return "default";
    default:
      return "secondary";
  }
}

function getCompactMessage(timeOfDay: string): string {
  const messages: Record<string, string> = {
    Morning: "Let's make today productive!",
    Afternoon: "Hope you're having a great day!",
    Evening: "Finishing up for the day?",
    Night: "Burning the midnight oil?",
  };

  return messages[timeOfDay] ?? "Welcome back!";
}

function StatCard({ icon: Icon, label, value }: StatCardProps) {
  return (
    <div className="bg-card rounded-lg border p-4">
      <div className="mb-2 flex items-center gap-2">
        <div className="bg-primary/10 rounded-md p-2">
          <Icon className="text-primary h-4 w-4" />
        </div>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-muted-foreground text-xs">{label}</p>
    </div>
  );
}

export function WelcomeMessage({
  variant = "default",
  showStats = false,
  className,
}: WelcomeMessageProps) {
  const { data: session, status } = useSession();

  // Don't render if not authenticated
  if (status !== "authenticated" || !session?.user) {
    return null;
  }

  const user = session.user as { name?: string | null; role: UserRole };
  const userName: string = user?.name ?? "User";
  const userRole = user?.role ?? UserRole.USER;

  const timeOfDay = getTimeOfDay();
  const greeting = getPersonalizedGreeting(timeOfDay);

  // Mock stats for now (will be replaced with real API call)
  const userStats = showStats
    ? {
        tasksToday: 8,
        tasksCompleted: 5,
        activeProjects: 3,
        achievements: 12,
      }
    : null;

  // Variant: Hero (full-width banner)
  if (variant === "hero") {
    return (
      <div
        className={cn(
          "from-primary/10 via-primary/5 to-background relative overflow-hidden rounded-lg bg-gradient-to-r p-8",
          className
        )}
      >
        <div className="relative z-10">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="text-primary h-5 w-5" />
            <Badge variant="outline">{timeOfDay}</Badge>
          </div>

          <h1 className="mb-2 text-4xl font-bold">
            {greeting}, {userName}!
          </h1>

          <p className="text-muted-foreground text-lg">{getRoleBasedMessage(userRole)}</p>

          {showStats && userStats && (
            <div className="mt-6 grid grid-cols-3 gap-4">
              <StatCard
                icon={CheckCircle}
                label="Tasks Completed"
                value={userStats.tasksCompleted}
              />
              <StatCard
                icon={TrendingUp}
                label="Active Projects"
                value={userStats.activeProjects}
              />
              <StatCard icon={Sparkles} label="Achievements" value={userStats.achievements} />
            </div>
          )}
        </div>

        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="bg-primary absolute top-0 right-0 h-64 w-64 rounded-full blur-3xl" />
          <div className="bg-primary absolute bottom-0 left-0 h-48 w-48 rounded-full blur-3xl" />
        </div>
      </div>
    );
  }

  // Variant: Compact (single-line)
  if (variant === "compact") {
    return (
      <div className={cn("bg-card flex items-center gap-3 rounded-lg border p-4", className)}>
        <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full">
          <Sparkles className="text-primary h-5 w-5" />
        </div>

        <div className="flex-1">
          <p className="font-medium">
            {greeting}, {userName}!
          </p>
          <p className="text-muted-foreground text-sm">{getCompactMessage(timeOfDay)}</p>
        </div>

        <Badge variant={getRoleVariant(userRole)}>{userRole}</Badge>
      </div>
    );
  }

  // Variant: Default (card with optional stats)
  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-semibold">
                {greeting}, {userName}!
              </h2>
              <Badge variant="outline" className="gap-1.5">
                <Sparkles className="h-3 w-3" />
                {timeOfDay}
              </Badge>
            </div>

            <p className="text-muted-foreground">{getRoleBasedMessage(userRole)}</p>
          </div>

          <Badge variant={getRoleVariant(userRole)} className="gap-1.5">
            {userRole}
          </Badge>
        </div>

        {showStats && userStats && (
          <div className="mt-6 grid grid-cols-2 gap-4 border-t pt-4">
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm">Tasks Today</p>
              <p className="text-2xl font-bold">{userStats.tasksToday}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm">Completed</p>
              <p className="text-2xl font-bold text-green-500">{userStats.tasksCompleted}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
