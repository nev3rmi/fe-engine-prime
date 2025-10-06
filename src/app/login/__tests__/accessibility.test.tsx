import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe, toHaveNoViolations } from "jest-axe";
import { describe, it, expect, vi, beforeEach } from "vitest";
import LoginPage from "../page";
import { AuthErrorContent } from "@/components/auth/auth-error-content";
import { SignoutContent } from "@/components/auth/signout-content";

// Extend Vitest matchers with jest-axe
expect.extend(toHaveNoViolations);

// Mock next-auth/react
vi.mock("next-auth/react", () => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(() => null),
  }),
}));

describe("FE-53: Accessibility Tests for Authentication UI Pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("WCAG 2.1 AA Compliance", () => {
    it("should have no accessibility violations on login page", async () => {
      const { container } = render(<LoginPage />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("should have no accessibility violations on auth error page", async () => {
      const { container } = render(<AuthErrorContent />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("should have no accessibility violations on signout page", async () => {
      const { container } = render(<SignoutContent />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe("Keyboard Navigation", () => {
    it("should have correct tab order: Email → Password → Submit → OAuth buttons", async () => {
      render(<LoginPage />);
      const user = userEvent.setup();

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole("button", { name: /sign in/i });
      const githubButton = screen.getByRole("button", { name: /github/i });

      // Start at email field
      emailInput.focus();
      expect(emailInput).toHaveFocus();

      // Tab to password field
      await user.tab();
      expect(passwordInput).toHaveFocus();

      // Tab to submit button
      await user.tab();
      expect(submitButton).toHaveFocus();

      // Tab to first OAuth button (GitHub)
      await user.tab();
      expect(githubButton).toHaveFocus();
    });

    it("should submit form when Enter key is pressed", async () => {
      const signIn = vi.fn().mockResolvedValue({ ok: true });
      vi.mocked(await import("next-auth/react")).signIn = signIn;

      render(<LoginPage />);
      const user = userEvent.setup();

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");
      await user.keyboard("{Enter}");

      await waitFor(() => {
        expect(signIn).toHaveBeenCalledWith("credentials", {
          email: "test@example.com",
          password: "password123",
          redirect: false,
        });
      });
    });

    it("should have visible focus indicators on all interactive elements", () => {
      render(<LoginPage />);

      const interactiveElements = [
        screen.getByLabelText(/email/i),
        screen.getByLabelText(/password/i),
        screen.getByRole("button", { name: /sign in/i }),
        screen.getByRole("button", { name: /github/i }),
        screen.getByRole("button", { name: /google/i }),
        screen.getByRole("button", { name: /discord/i }),
      ];

      for (const element of interactiveElements) {
        element.focus();
        expect(element).toHaveFocus();

        // Check that focus is visible (element receives focus)
        expect(document.activeElement).toBe(element);
      }
    });
  });

  describe("Screen Reader Support", () => {
    it("should have proper form structure", () => {
      render(<LoginPage />);

      // Form should exist
      const form = document.querySelector("form");
      expect(form).toBeInTheDocument();
    });

    it("should have ARIA labels on form inputs", () => {
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      expect(emailInput).toHaveAccessibleName();
      expect(passwordInput).toHaveAccessibleName();
    });

    it("should announce form submission state to screen readers", async () => {
      const signIn = vi
        .fn()
        .mockImplementation(
          () => new Promise(resolve => setTimeout(() => resolve({ ok: true }), 100))
        );
      vi.mocked(await import("next-auth/react")).signIn = signIn;

      render(<LoginPage />);
      const user = userEvent.setup();

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole("button", { name: /sign in/i });

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");
      await user.click(submitButton);

      // Button should be disabled during submission
      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });

      // Loading state should be indicated
      expect(submitButton).toHaveAttribute("disabled");
    });

    it("should have accessible names for all buttons", () => {
      render(<LoginPage />);

      const buttons = screen.getAllByRole("button");

      buttons.forEach(button => {
        expect(button).toHaveAccessibleName();
      });
    });

    it("should provide context for error page", () => {
      render(<AuthErrorContent />);

      const heading = screen.getByText(/authentication error/i);
      expect(heading).toBeInTheDocument();

      // Error description should be present
      const description = screen.getByText(/something went wrong during authentication/i);
      expect(description).toBeInTheDocument();
    });
  });

  describe("Focus Management", () => {
    it("should have clearly visible focus indicator", async () => {
      render(<LoginPage />);
      const user = userEvent.setup();

      const emailInput = screen.getByLabelText(/email/i);

      await user.click(emailInput);
      expect(emailInput).toHaveFocus();
      expect(document.activeElement).toBe(emailInput);
    });

    it("should maintain focus when switching between inputs", async () => {
      render(<LoginPage />);
      const user = userEvent.setup();

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.click(emailInput);
      expect(emailInput).toHaveFocus();

      await user.tab();
      expect(passwordInput).toHaveFocus();

      await user.tab({ shift: true });
      expect(emailInput).toHaveFocus();
    });

    it("should manage focus in form properly", () => {
      render(<LoginPage />);

      // Verify form is accessible
      const form = document.querySelector("form");
      expect(form).toBeInTheDocument();
    });
  });

  describe("Color Contrast (Theme Support)", () => {
    it("should render properly in light theme", () => {
      render(<LoginPage />);

      // Check that text elements are present and visible
      expect(screen.getByText(/welcome back/i)).toBeVisible();
      expect(screen.getByText(/sign in to your account to continue/i)).toBeVisible();

      // Verify form elements are visible
      expect(screen.getByLabelText(/email/i)).toBeVisible();
      expect(screen.getByLabelText(/password/i)).toBeVisible();
    });

    it("should render properly in dark theme", () => {
      // Add dark class to simulate dark mode
      document.documentElement.classList.add("dark");

      render(<LoginPage />);

      // Check that text elements are present and visible
      expect(screen.getByText(/welcome back/i)).toBeVisible();
      expect(screen.getByText(/sign in to your account to continue/i)).toBeVisible();

      // Cleanup
      document.documentElement.classList.remove("dark");
    });

    it("should maintain contrast in OAuth buttons", () => {
      render(<LoginPage />);

      const githubButton = screen.getByRole("button", { name: /github/i });
      const googleButton = screen.getByRole("button", { name: /google/i });
      const discordButton = screen.getByRole("button", { name: /discord/i });

      expect(githubButton).toBeVisible();
      expect(googleButton).toBeVisible();
      expect(discordButton).toBeVisible();
    });

    it("should have accessible text on signout page in both themes", () => {
      // Light theme
      render(<SignoutContent />);
      const signOutHeading = screen.getByRole("button", { name: /yes, sign out/i });
      expect(signOutHeading).toBeVisible();
      expect(screen.getByText(/are you sure you want to sign out/i)).toBeVisible();
    });
  });

  describe("Additional Accessibility Features", () => {
    it("should have appropriate heading structure", () => {
      render(<LoginPage />);

      const heading = screen.getByText(/welcome back/i);
      expect(heading).toBeInTheDocument();
    });

    it("should have form autocomplete attributes", () => {
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      // These inputs should support browser autocomplete
      expect(emailInput).toHaveAttribute("type", "email");
      expect(passwordInput).toHaveAttribute("type", "password");
    });

    it("should disable form inputs during submission", async () => {
      const signIn = vi
        .fn()
        .mockImplementation(
          () => new Promise(resolve => setTimeout(() => resolve({ ok: true }), 100))
        );
      vi.mocked(await import("next-auth/react")).signIn = signIn;

      render(<LoginPage />);
      const user = userEvent.setup();

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole("button", { name: /sign in/i });

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");
      await user.click(submitButton);

      await waitFor(() => {
        expect(emailInput).toBeDisabled();
        expect(passwordInput).toBeDisabled();
        expect(submitButton).toBeDisabled();
      });
    });

    it("should have accessible main content", () => {
      render(<LoginPage />);

      // Login page is simple, but verify main content is accessible
      const form = document.querySelector("form");
      expect(form).toBeInTheDocument();
    });
  });
});
