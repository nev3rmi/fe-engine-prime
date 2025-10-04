import { NextResponse } from "next/server";

import { logRoleChange } from "@/lib/audit/audit-service";
import { auth } from "@/lib/auth";
import { hasPermission, canManageRole } from "@/lib/auth/permissions";
import { updateUserRole, getUserById } from "@/lib/auth/user-service";
import { Permission, UserRole } from "@/types/auth";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
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
    const { role } = body;

    if (!role || !Object.values(UserRole).includes(role)) {
      return NextResponse.json({ message: "Invalid role" }, { status: 400 });
    }

    // Check if user can manage the target role
    const currentUserRole = session.user.role as UserRole;
    if (!canManageRole(currentUserRole, role)) {
      return NextResponse.json(
        { message: `${currentUserRole} role cannot assign ${role} role` },
        { status: 403 }
      );
    }

    // Get current user data before update for audit log
    const targetUser = await getUserById(params.id);
    if (!targetUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const oldRole = targetUser.role;
    const updatedUser = await updateUserRole(params.id, role);

    // Log role change for audit trail
    await logRoleChange({
      userId: session.user.id!,
      targetUserId: params.id,
      oldRole,
      newRole: role,
      ipAddress:
        request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? undefined,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    return NextResponse.json({
      message: "User role updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating user role:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
