import { User, CreateUserData, UpdateUserData, UserRole } from "@/types/auth";

// Mock database - replace with actual database implementation
let users: User[] = [
  {
    id: "1",
    email: "admin@example.com",
    name: "System Administrator",
    image: null,
    username: "admin",
    role: UserRole.ADMIN,
    provider: "credentials",
    providerId: "1",
    isActive: true,
    emailVerified: true,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    metadata: {},
  },
];

/**
 * Get user by ID
 */
export async function getUserById(id: string): Promise<User | null> {
  try {
    const user = users.find(u => u.id === id);
    return user || null;
  } catch (error) {
    console.error("Error getting user by ID:", error);
    return null;
  }
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const user = users.find(u => u.email === email);
    return user || null;
  } catch (error) {
    console.error("Error getting user by email:", error);
    return null;
  }
}

/**
 * Get user by username
 */
export async function getUserByUsername(username: string): Promise<User | null> {
  try {
    const user = users.find(u => u.username === username);
    return user || null;
  } catch (error) {
    console.error("Error getting user by username:", error);
    return null;
  }
}

/**
 * Create new user
 */
export async function createUser(userData: CreateUserData): Promise<User> {
  try {
    // Check if user already exists
    const existingUser = await getUserByEmail(userData.email);
    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    const newUser: User = {
      ...userData,
      id: userData.id || generateUserId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    users.push(newUser);
    return newUser;
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
}

/**
 * Update existing user
 */
export async function updateUser(id: string, updateData: UpdateUserData): Promise<User | null> {
  try {
    const userIndex = users.findIndex(u => u.id === id);
    if (userIndex === -1) {
      return null;
    }

    users[userIndex] = {
      ...users[userIndex],
      ...updateData,
      updatedAt: new Date(),
    };

    return users[userIndex];
  } catch (error) {
    console.error("Error updating user:", error);
    return null;
  }
}

/**
 * Delete user
 */
export async function deleteUser(id: string): Promise<boolean> {
  try {
    const userIndex = users.findIndex(u => u.id === id);
    if (userIndex === -1) {
      return false;
    }

    users.splice(userIndex, 1);
    return true;
  } catch (error) {
    console.error("Error deleting user:", error);
    return false;
  }
}

/**
 * Get all users (with pagination)
 */
export async function getUsers(
  options: {
    page?: number;
    limit?: number;
    role?: UserRole;
    isActive?: boolean;
  } = {}
): Promise<{ users: User[]; total: number; page: number; limit: number }> {
  try {
    const { page = 1, limit = 10, role, isActive } = options;
    let filteredUsers = users;

    // Apply filters
    if (role !== undefined) {
      filteredUsers = filteredUsers.filter(u => u.role === role);
    }
    if (isActive !== undefined) {
      filteredUsers = filteredUsers.filter(u => u.isActive === isActive);
    }

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const paginatedUsers = filteredUsers.slice(startIndex, startIndex + limit);

    return {
      users: paginatedUsers,
      total: filteredUsers.length,
      page,
      limit,
    };
  } catch (error) {
    console.error("Error getting users:", error);
    return { users: [], total: 0, page: 1, limit: 10 };
  }
}

/**
 * Update user role
 */
export async function updateUserRole(id: string, role: UserRole): Promise<User | null> {
  try {
    return await updateUser(id, { role, updatedAt: new Date() });
  } catch (error) {
    console.error("Error updating user role:", error);
    return null;
  }
}

/**
 * Activate/deactivate user
 */
export async function toggleUserStatus(id: string, isActive: boolean): Promise<User | null> {
  try {
    return await updateUser(id, { isActive, updatedAt: new Date() });
  } catch (error) {
    console.error("Error toggling user status:", error);
    return null;
  }
}

/**
 * Get users by role
 */
export async function getUsersByRole(role: UserRole): Promise<User[]> {
  try {
    return users.filter(u => u.role === role && u.isActive);
  } catch (error) {
    console.error("Error getting users by role:", error);
    return [];
  }
}

/**
 * Search users
 */
export async function searchUsers(query: string): Promise<User[]> {
  try {
    const lowercaseQuery = query.toLowerCase();
    return users.filter(
      u =>
        u.name?.toLowerCase().includes(lowercaseQuery) ||
        u.email.toLowerCase().includes(lowercaseQuery) ||
        u.username?.toLowerCase().includes(lowercaseQuery)
    );
  } catch (error) {
    console.error("Error searching users:", error);
    return [];
  }
}

/**
 * Generate unique user ID
 */
function generateUserId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate user data
 */
export function validateUserData(userData: Partial<CreateUserData>): string[] {
  const errors: string[] = [];

  if (!userData.email) {
    errors.push("Email is required");
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
    errors.push("Email format is invalid");
  }

  if (!userData.role) {
    errors.push("Role is required");
  } else if (!Object.values(UserRole).includes(userData.role)) {
    errors.push("Invalid role");
  }

  if (userData.username && userData.username.length < 3) {
    errors.push("Username must be at least 3 characters long");
  }

  return errors;
}

/**
 * Check if user can be deleted
 */
export async function canDeleteUser(
  id: string,
  requestingUserId: string
): Promise<{ canDelete: boolean; reason?: string }> {
  try {
    const user = await getUserById(id);
    const requestingUser = await getUserById(requestingUserId);

    if (!user) {
      return { canDelete: false, reason: "User not found" };
    }

    if (!requestingUser) {
      return { canDelete: false, reason: "Requesting user not found" };
    }

    if (user.id === requestingUser.id) {
      return { canDelete: false, reason: "Cannot delete your own account" };
    }

    if (user.role === UserRole.ADMIN && requestingUser.role !== UserRole.ADMIN) {
      return { canDelete: false, reason: "Only admins can delete admin accounts" };
    }

    return { canDelete: true };
  } catch (error) {
    console.error("Error checking if user can be deleted:", error);
    return { canDelete: false, reason: "Internal error" };
  }
}
