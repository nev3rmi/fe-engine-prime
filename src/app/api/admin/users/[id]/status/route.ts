import { NextResponse } from "next/server";

import { logUserStatusChange } from "@/lib/audit/audit-service";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { toggleUserStatus, getUserById } from "@/lib/auth/user-service";
import { Permission } from "@/types/auth";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Check MANAGE_USER_ROLES permission
    const canManageUsers = await hasPermission(session.user as any, Permission.MANAGE_USER_ROLES);

    if (!canManageUsers) {
      return NextResponse.json({ message: "Insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();
    const { isActive } = body;

    if (typeof isActive !== "boolean") {
      return NextResponse.json({ message: "Invalid status value" }, { status: 400 });
    }

    // Await params in Next.js 15
    const { id } = await params;

    // Prevent users from deactivating themselves
    if (id === session.user.id && !isActive) {
      return NextResponse.json({ message: "Cannot deactivate your own account" }, { status: 400 });
    }

    const targetUser = await getUserById(id);
    if (!targetUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const updatedUser = await toggleUserStatus(id, isActive);

    if (!updatedUser) {
      return NextResponse.json({ message: "Failed to update user status" }, { status: 500 });
    }

    // Log status change for audit trail
    await logUserStatusChange({
      userId: session.user.id!,
      targetUserId: id,
      action: isActive ? "activate" : "deactivate",
      ipAddress:
        request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? undefined,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    return NextResponse.json({
      message: `User ${isActive ? "activated" : "deactivated"} successfully`,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating user status:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
