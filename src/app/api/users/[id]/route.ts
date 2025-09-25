import type { NextRequest} from "next/server";
import { NextResponse } from "next/server"

import { getUserById, updateUser, deleteUser, canDeleteUser } from "@/lib/auth/user-service"
import { withAuth } from "@/lib/middleware/auth"
import { Permission, UserRole } from "@/types/auth"

/**
 * GET /api/users/[id] - Get user by ID
 * Requires READ_USER permission
 */
export const GET = withAuth<any>(
  async (request: NextRequest, { user }) => {
    const id = request.nextUrl.pathname.split('/').pop()

    if (!id) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      )
    }

    try {
      const targetUser = await getUserById(id)

      if (!targetUser) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        )
      }

      return NextResponse.json(targetUser)
    } catch (error) {
      console.error("Error fetching user:", error)
      return NextResponse.json(
        { error: "Failed to fetch user" },
        { status: 500 }
      )
    }
  },
  {
    requiredPermissions: [Permission.READ_USER],
  }
)

/**
 * PATCH /api/users/[id] - Update user
 * Requires UPDATE_USER permission
 */
export const PATCH = withAuth<any>(
  async (request: NextRequest, { user }) => {
    const id = request.nextUrl.pathname.split('/').pop()

    if (!id) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      )
    }

    try {
      const updateData = await request.json()

      // Remove sensitive fields that shouldn't be updated via this endpoint
      delete updateData.id
      delete updateData.providerId
      delete updateData.createdAt

      // Role changes require additional permission
      if (updateData.role && updateData.role !== user.role) {
        const hasRolePermission = user.permissions?.includes(Permission.MANAGE_USER_ROLES)
        if (!hasRolePermission) {
          return NextResponse.json(
            { error: "Insufficient permissions to change user role" },
            { status: 403 }
          )
        }

        // Prevent non-admin from setting admin role
        if (updateData.role === UserRole.ADMIN && user.role !== UserRole.ADMIN) {
          return NextResponse.json(
            { error: "Only admins can assign admin role" },
            { status: 403 }
          )
        }
      }

      // Prevent users from updating their own role unless they are admin
      if (id === user.id && updateData.role && user.role !== UserRole.ADMIN) {
        return NextResponse.json(
          { error: "Cannot change your own role" },
          { status: 403 }
        )
      }

      updateData.updatedAt = new Date()

      const updatedUser = await updateUser(id, updateData)

      if (!updatedUser) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        )
      }

      return NextResponse.json(updatedUser)
    } catch (error) {
      console.error("Error updating user:", error)
      return NextResponse.json(
        { error: "Failed to update user" },
        { status: 500 }
      )
    }
  },
  {
    requiredPermissions: [Permission.UPDATE_USER],
  }
)

/**
 * DELETE /api/users/[id] - Delete user
 * Requires DELETE_USER permission
 */
export const DELETE = withAuth<any>(
  async (request: NextRequest, { user }) => {
    const id = request.nextUrl.pathname.split('/').pop()

    if (!id) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      )
    }

    try {
      // Check if user can be deleted
      const { canDelete, reason } = await canDeleteUser(id, user.id)

      if (!canDelete) {
        return NextResponse.json(
          { error: reason || "Cannot delete user" },
          { status: 403 }
        )
      }

      const deleted = await deleteUser(id)

      if (!deleted) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        )
      }

      return NextResponse.json({ message: "User deleted successfully" })
    } catch (error) {
      console.error("Error deleting user:", error)
      return NextResponse.json(
        { error: "Failed to delete user" },
        { status: 500 }
      )
    }
  },
  {
    requiredPermissions: [Permission.DELETE_USER],
  }
)