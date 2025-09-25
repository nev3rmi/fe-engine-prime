import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/middleware/auth"
import { Permission } from "@/types/auth"
import { getUsers } from "@/lib/auth/user-service"

/**
 * GET /api/users - Get all users (with pagination and filtering)
 * Requires READ_USER permission
 */
export const GET = withAuth<any>(
  async (request: NextRequest, { user }) => {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const role = searchParams.get("role") as any
    const isActive = searchParams.get("isActive")

    try {
      const result = await getUsers({
        page,
        limit,
        role,
        ...(isActive !== null && { isActive: isActive === "true" }),
      })

      return NextResponse.json(result)
    } catch (error) {
      console.error("Error fetching users:", error)
      return NextResponse.json(
        { error: "Failed to fetch users" },
        { status: 500 }
      )
    }
  },
  {
    requiredPermissions: [Permission.READ_USER],
  }
)