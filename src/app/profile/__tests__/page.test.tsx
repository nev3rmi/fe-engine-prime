import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ProfilePage from "../page";

const mockPush = vi.fn();
const mockUseSession = vi.fn();
const mockUpdate = vi.fn();
const mockToast = vi.fn();

// Mock next-auth/react
vi.mock("next-auth/react", () => ({
  useSession: () => mockUseSession(),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock toast
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

describe("Profile Page", () => {
  const mockSession = {
    user: {
      id: "1",
      name: "Test User",
      email: "test@example.com",
      image: null,
      username: "testuser",
      role: "USER",
      provider: "credentials",
      emailVerified: true,
      createdAt: "2024-01-01T00:00:00Z",
      lastLoginAt: "2024-01-15T10:30:00Z",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Authentication State", () => {
    it("should show loading spinner when session is loading", () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: "loading",
        update: mockUpdate,
      });

      render(<ProfilePage />);

      const spinner = document.querySelector('[class*="animate-spin"]');
      expect(spinner).toBeInTheDocument();
    });

    it("should redirect to login when unauthenticated", () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: "unauthenticated",
        update: mockUpdate,
      });

      render(<ProfilePage />);

      expect(mockPush).toHaveBeenCalledWith("/login");
    });

    it("should render profile when authenticated", () => {
      mockUseSession.mockReturnValue({
        data: mockSession,
        status: "authenticated",
        update: mockUpdate,
      });

      render(<ProfilePage />);

      expect(screen.getByText("Profile Settings")).toBeInTheDocument();
      expect(screen.getByText("Test User")).toBeInTheDocument();
    });
  });

  describe("User Information Display", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: mockSession,
        status: "authenticated",
        update: mockUpdate,
      });
    });

    it("should display user name", () => {
      render(<ProfilePage />);
      expect(screen.getByText("Test User")).toBeInTheDocument();
    });

    it("should display user email", () => {
      render(<ProfilePage />);
      expect(screen.getByDisplayValue("test@example.com")).toBeInTheDocument();
    });

    it("should display user role badge", () => {
      render(<ProfilePage />);
      expect(screen.getByText("USER")).toBeInTheDocument();
    });

    it("should show avatar with initials fallback", () => {
      render(<ProfilePage />);
      const fallback = screen.getByText("TU"); // Test User initials
      expect(fallback).toBeInTheDocument();
    });
  });

  describe("Profile Edit Form", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: mockSession,
        status: "authenticated",
        update: mockUpdate,
      });
    });

    it("should render form with user data", () => {
      render(<ProfilePage />);

      const nameInput = screen.getByDisplayValue("Test User");
      const usernameInput = screen.getByDisplayValue("testuser");

      expect(nameInput).toBeInTheDocument();
      expect(usernameInput).toBeInTheDocument();
    });

    it("should disable email field (read-only)", () => {
      render(<ProfilePage />);

      const emailInput = screen.getByDisplayValue("test@example.com");
      expect(emailInput).toBeDisabled();
    });

    it("should disable submit button when form is pristine", () => {
      render(<ProfilePage />);

      const submitButton = screen.getByRole("button", { name: /save changes/i });
      expect(submitButton).toBeDisabled();
    });

    it("should enable submit button when form is dirty", async () => {
      render(<ProfilePage />);
      const user = userEvent.setup();

      const nameInput = screen.getByDisplayValue("Test User");
      const submitButton = screen.getByRole("button", { name: /save changes/i });

      await user.clear(nameInput);
      await user.type(nameInput, "Updated Name");

      expect(submitButton).not.toBeDisabled();
    });

    it("should validate name is required", async () => {
      render(<ProfilePage />);
      const user = userEvent.setup();

      const nameInput = screen.getByDisplayValue("Test User");
      const submitButton = screen.getByRole("button", { name: /save changes/i });

      await user.clear(nameInput);
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      });
    });

    it("should reset form when cancel button is clicked", async () => {
      render(<ProfilePage />);
      const user = userEvent.setup();

      const nameInput = screen.getByDisplayValue("Test User");
      const cancelButton = screen.getByRole("button", { name: /cancel/i });

      await user.clear(nameInput);
      await user.type(nameInput, "Changed Name");
      await user.click(cancelButton);

      expect(nameInput).toHaveValue("Test User");
    });
  });

  describe("Form Submission", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: mockSession,
        status: "authenticated",
        update: mockUpdate,
      });

      global.fetch = vi.fn();
    });

    it("should successfully update profile", async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          id: "1",
          name: "Updated Name",
          username: "testuser",
          email: "test@example.com",
          image: null,
          role: "USER",
          updatedAt: new Date().toISOString(),
        }),
      } as Response);

      render(<ProfilePage />);
      const user = userEvent.setup();

      const nameInput = screen.getByDisplayValue("Test User");
      const submitButton = screen.getByRole("button", { name: /save changes/i });

      await user.clear(nameInput);
      await user.type(nameInput, "Updated Name");
      await user.click(submitButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/user/profile",
          expect.objectContaining({
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
          })
        );
      });
    });

    it("should disable form during submission", async () => {
      vi.mocked(global.fetch).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      render(<ProfilePage />);
      const user = userEvent.setup();

      const nameInput = screen.getByDisplayValue("Test User");
      const submitButton = screen.getByRole("button", { name: /save changes/i });

      await user.clear(nameInput);
      await user.type(nameInput, "Updated Name");
      await user.click(submitButton);

      expect(submitButton).toBeDisabled();
      expect(nameInput).toBeDisabled();
    });
  });
});
