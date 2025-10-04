"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { AlertCircle } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@/types/auth";

interface UserStatusDialogProps {
  user: User;
  open: boolean;
  onClose: () => void;
}

export function UserStatusDialog({ user, open, onClose }: UserStatusDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const newStatus = !user.isActive;
  const action = newStatus ? "activate" : "deactivate";

  const handleSubmit = async () => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/admin/users/${user.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive: newStatus }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message ?? `Failed to ${action} user`);
      }

      toast({
        title: `User ${action}d`,
        description: `${user.name ?? user.email} has been ${action}d`,
      });

      router.refresh();
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : `Failed to ${action} user`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="capitalize">{action} User</DialogTitle>
          <DialogDescription>
            {newStatus
              ? `Restore access for ${user.name ?? user.email}`
              : `Suspend access for ${user.name ?? user.email}`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {!newStatus && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This user will no longer be able to sign in or access the system. You can reactivate
                them at any time.
              </AlertDescription>
            </Alert>
          )}

          <div className="text-sm">
            <p className="mb-1 font-medium">User Details:</p>
            <ul className="text-muted-foreground list-inside list-disc space-y-1">
              <li>Email: {user.email}</li>
              <li>Role: {user.role}</li>
              <li>Current Status: {user.isActive ? "Active" : "Inactive"}</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            variant={newStatus ? "default" : "destructive"}
          >
            {isLoading
              ? `${action.charAt(0).toUpperCase() + action.slice(1)}ing...`
              : `${action.charAt(0).toUpperCase() + action.slice(1)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
