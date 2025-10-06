import { type NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { auth } from "@/lib/auth";
import { updateUser } from "@/lib/auth/user-service";

// Request validation schema
const updateProfileSchema = z.object({
  name: z.string().min(1).max(100),
  username: z
    .string()
    .regex(/^[a-zA-Z0-9_]*$/)
    .max(50)
    .nullable()
    .optional(),
  image: z.string().url().nullable().optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    // Step 1: Verify authentication
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Step 2: Parse and validate request body
    const body = await request.json();
    const validationResult = updateProfileSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { name, username, image } = validationResult.data;

    // Step 3: Check if username is taken (if username is being updated)
    if (username) {
      // In production, check if username exists for other users
      // For now, we'll allow the update
    }

    // Step 4: Update user in database
    const updateData: {
      name: string;
      username?: string | null;
      image?: string | null;
      updatedAt: Date;
    } = {
      name,
      updatedAt: new Date(),
    };

    if (username !== undefined) {
      updateData.username = username ?? null;
    }

    if (image !== undefined) {
      updateData.image = image ?? null;
    }

    const updatedUser = await updateUser(session.user.id, updateData);

    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Step 5: Return updated user data
    return NextResponse.json({
      id: updatedUser.id,
      name: updatedUser.name,
      username: updatedUser.username,
      email: updatedUser.email,
      image: updatedUser.image,
      role: updatedUser.role,
      updatedAt: updatedUser.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
