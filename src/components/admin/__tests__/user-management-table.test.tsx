import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { UserManagementTable } from "../user-management-table";
import { UserRole } from "@/types/auth";
import type { User } from "@/types/auth";

// Mock the dialogs
vi.mock("../role-change-dialog", () => ({
  RoleChangeDialog: ({ user, open }: any) =>
    open ? <div data-testid="role-dialog">Change role for {user.email}</div> : null,
}));

vi.mock("../user-status-dialog", () => ({
  UserStatusDialog: ({ user, open }: any) =>
    open ? <div data-testid="status-dialog">Change status for {user.email}</div> : null,
}));

const mockUsers: User[] = [
  {
    id: "1",
    email: "admin@example.com",
    name: "Admin User",
    image: null,
    username: "admin",
    role: UserRole.ADMIN,
    provider: "credentials",
    providerId: "1",
    isActive: true,
    emailVerified: true,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
  {
    id: "2",
    email: "editor@example.com",
    name: "Editor User",
    image: null,
    username: "editor",
    role: UserRole.EDITOR,
    provider: "credentials",
    providerId: "2",
    isActive: true,
    emailVerified: true,
    createdAt: new Date("2024-01-02"),
    updatedAt: new Date("2024-01-02"),
  },
  {
    id: "3",
    email: "user@example.com",
    name: "Regular User",
    image: null,
    username: "user",
    role: UserRole.USER,
    provider: "credentials",
    providerId: "3",
    isActive: false,
    emailVerified: true,
    createdAt: new Date("2024-01-03"),
    updatedAt: new Date("2024-01-03"),
  },
];

describe("UserManagementTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders user table with all users", () => {
    render(<UserManagementTable users={mockUsers} total={3} />);

    expect(screen.getByText("Admin User")).toBeInTheDocument();
    expect(screen.getByText("Editor User")).toBeInTheDocument();
    expect(screen.getByText("Regular User")).toBeInTheDocument();
  });

  it("displays user roles with correct badges", () => {
    render(<UserManagementTable users={mockUsers} total={3} />);

    expect(screen.getByText("ADMIN")).toBeInTheDocument();
    expect(screen.getByText("EDITOR")).toBeInTheDocument();
    expect(screen.getByText("USER")).toBeInTheDocument();
  });

  it("displays user status correctly", () => {
    render(<UserManagementTable users={mockUsers} total={3} />);

    const activeStatuses = screen.getAllByText("Active");
    expect(activeStatuses).toHaveLength(2);

    expect(screen.getByText("Inactive")).toBeInTheDocument();
  });

  it("displays formatted creation dates", () => {
    render(<UserManagementTable users={mockUsers} total={3} />);

    expect(screen.getByText("1/1/2024")).toBeInTheDocument();
    expect(screen.getByText("1/2/2024")).toBeInTheDocument();
    expect(screen.getByText("1/3/2024")).toBeInTheDocument();
  });

  it("shows total count correctly", () => {
    render(<UserManagementTable users={mockUsers} total={10} />);

    expect(screen.getByText("Showing 3 of 10 users")).toBeInTheDocument();
  });

  it("displays empty state when no users", () => {
    render(<UserManagementTable users={[]} total={0} />);

    expect(screen.getByText("No users found")).toBeInTheDocument();
  });

  it("opens role change dialog when clicking change role action", async () => {
    render(<UserManagementTable users={mockUsers} total={3} />);

    const actionButtons = screen.getAllByRole("button", { name: /open menu/i });
    fireEvent.click(actionButtons[0]);

    const changeRoleButton = screen.getByRole("menuitem", { name: /change role/i });
    fireEvent.click(changeRoleButton);

    expect(screen.getByTestId("role-dialog")).toBeInTheDocument();
    expect(screen.getByText("Change role for admin@example.com")).toBeInTheDocument();
  });

  it("opens status dialog when clicking deactivate action for active user", async () => {
    render(<UserManagementTable users={mockUsers} total={3} />);

    const actionButtons = screen.getAllByRole("button", { name: /open menu/i });
    fireEvent.click(actionButtons[0]);

    const deactivateButton = screen.getByRole("menuitem", { name: /deactivate/i });
    fireEvent.click(deactivateButton);

    expect(screen.getByTestId("status-dialog")).toBeInTheDocument();
    expect(screen.getByText("Change status for admin@example.com")).toBeInTheDocument();
  });

  it("shows activate action for inactive users", async () => {
    render(<UserManagementTable users={mockUsers} total={3} />);

    const actionButtons = screen.getAllByRole("button", { name: /open menu/i });
    fireEvent.click(actionButtons[2]); // Inactive user

    expect(screen.getByRole("menuitem", { name: /activate/i })).toBeInTheDocument();
  });

  it("displays all table headers correctly", () => {
    render(<UserManagementTable users={mockUsers} total={3} />);

    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("Username")).toBeInTheDocument();
    expect(screen.getByText("Role")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Created")).toBeInTheDocument();
    expect(screen.getByText("Actions")).toBeInTheDocument();
  });

  it("handles users without names gracefully", () => {
    const userWithoutName: User = {
      ...mockUsers[0],
      name: null,
    };

    render(<UserManagementTable users={[userWithoutName]} total={1} />);

    expect(screen.getByText("N/A")).toBeInTheDocument();
  });

  it("handles users without usernames gracefully", () => {
    const userWithoutUsername: User = {
      ...mockUsers[0],
      username: null,
    };

    render(<UserManagementTable users={[userWithoutUsername]} total={1} />);

    const cells = screen.getAllByText("N/A");
    expect(cells.length).toBeGreaterThan(0);
  });
});
