import { redirect } from "next/navigation";

import { UserManagementTable } from "@/components/admin/user-management-table";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { getUsers } from "@/lib/auth/user-service";
import { Permission } from "@/types/auth";

export default async function AdminPage() {
  const session = await auth();

  // Check authentication
  if (!session?.user) {
    redirect("/login");
  }

  // Check MANAGE_USER_ROLES permission
  const canManageUsers = await hasPermission(session.user as any, Permission.MANAGE_USER_ROLES);

  if (!canManageUsers) {
    redirect("/dashboard");
  }

  // Fetch users
  const { users, total } = await getUsers({ limit: 100 });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground">Manage user accounts, roles, and permissions</p>
      </div>

      <UserManagementTable users={users} total={total} />
    </div>
  );
}
