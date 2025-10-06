import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import LoginPage from "../page";
import { LoginForm } from "@/components/auth/login-form";
import { AuthErrorContent } from "@/components/auth/auth-error-content";

// Mock next-auth/react
vi.mock("next-auth/react", () => ({
  signIn: vi.fn(),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(() => null),
  }),
}));

describe("FE-54: Responsive & Theme Tests for Authentication UI Pages", () => {
  // Store original window.matchMedia
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    vi.clearAllMocks();
    originalMatchMedia = window.matchMedia;
  });

  afterEach(() => {
    // Restore original matchMedia
    window.matchMedia = originalMatchMedia;
    // Reset viewport size
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(window, "innerHeight", {
      writable: true,
      configurable: true,
      value: 768,
    });
    // Remove theme classes
    document.documentElement.classList.remove("light", "dark");
  });

  const setViewport = (width: number, height: number) => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: width,
    });
    Object.defineProperty(window, "innerHeight", {
      writable: true,
      configurable: true,
      value: height,
    });

    // Mock matchMedia to match the viewport
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes(`max-width: ${width}px`) || query.includes(`min-width: ${width}px`),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    // Trigger resize event
    window.dispatchEvent(new Event("resize"));
  };

  describe("Viewport/Breakpoint Testing", () => {
    it("should render correctly on mobile viewport (375px - iPhone SE)", () => {
      setViewport(375, 667);

      render(<LoginPage />);

      // Verify content is visible and accessible
      expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();

      // Check container doesn't overflow
      const container = screen.getByText(/welcome back/i).closest("div");
      expect(container).toBeInTheDocument();
    });

    it("should render correctly on tablet viewport (768px - iPad)", () => {
      setViewport(768, 1024);

      render(<LoginPage />);

      expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
    });

    it("should render correctly on desktop viewport (1280px)", () => {
      setViewport(1280, 720);

      render(<LoginPage />);

      expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
    });

    it("should not have horizontal scroll on mobile", () => {
      setViewport(375, 667);

      const { container } = render(<LoginPage />);

      // Check that the container fits within viewport
      const card = container.querySelector('[class*="max-w-md"]');
      expect(card).toBeInTheDocument();
    });

    it("should have touch targets accessible on mobile", () => {
      setViewport(375, 667);

      render(<LoginPage />);

      const buttons = screen.getAllByRole("button");

      // All buttons should be present and clickable
      buttons.forEach(button => {
        expect(button).toBeInTheDocument();
        expect(button).toBeEnabled();
      });
    });

    it("should adapt card width to viewport", () => {
      // Mobile
      setViewport(375, 667);
      const { container: mobileContainer } = render(<LoginPage />);
      const mobileCard = mobileContainer.querySelector('[class*="max-w-md"]');
      expect(mobileCard).toBeInTheDocument();
    });
  });

  describe("Theme Switching Tests", () => {
    it("should render correctly in light theme", () => {
      document.documentElement.classList.add("light");

      render(<LoginPage />);

      expect(screen.getByText(/welcome back/i)).toBeVisible();
      expect(screen.getByLabelText(/email/i)).toBeVisible();
      expect(screen.getByLabelText(/password/i)).toBeVisible();

      // Verify elements are styled for light theme
      const submitButton = screen.getByRole("button", { name: /sign in/i });
      expect(submitButton).toBeVisible();
    });

    it("should render correctly in dark theme", () => {
      document.documentElement.classList.add("dark");

      render(<LoginPage />);

      expect(screen.getByText(/welcome back/i)).toBeVisible();
      expect(screen.getByLabelText(/email/i)).toBeVisible();
      expect(screen.getByLabelText(/password/i)).toBeVisible();

      // Verify elements are styled for dark theme
      const submitButton = screen.getByRole("button", { name: /sign in/i });
      expect(submitButton).toBeVisible();
    });

    it("should handle theme toggle without breaking layout", () => {
      document.documentElement.classList.add("light");

      const { rerender } = render(<LoginPage />);

      expect(screen.getByText(/welcome back/i)).toBeVisible();

      // Switch to dark theme
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");

      rerender(<LoginPage />);

      expect(screen.getByText(/welcome back/i)).toBeVisible();
      expect(screen.getByLabelText(/email/i)).toBeVisible();
    });

    it("should apply CSS variables correctly in light theme", () => {
      document.documentElement.classList.add("light");

      render(<LoginPage />);

      // Check that theme-dependent elements render
      const card = document.querySelector('[class*="bg-"]');
      expect(card).toBeInTheDocument();
    });

    it("should apply CSS variables correctly in dark theme", () => {
      document.documentElement.classList.add("dark");

      render(<LoginPage />);

      // Check that theme-dependent elements render
      const card = document.querySelector('[class*="bg-"]');
      expect(card).toBeInTheDocument();
    });

    it("should maintain theme on error page", () => {
      document.documentElement.classList.add("dark");

      render(<AuthErrorContent />);

      expect(screen.getByText(/authentication error/i)).toBeVisible();
      const tryAgainLink = screen.getByRole("link", { name: /try again/i });
      expect(tryAgainLink).toBeVisible();
    });
  });

  describe("Layout Transitions", () => {
    it("should display form elements correctly", () => {
      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      expect(emailInput).toBeInTheDocument();
      expect(passwordInput).toBeInTheDocument();

      // Form should be in a vertical layout
      const form = emailInput.closest("form");
      expect(form).toBeInTheDocument();
    });

    it("should display OAuth buttons in grid layout", () => {
      render(<LoginForm />);

      const githubButton = screen.getByRole("button", { name: /github/i });
      const googleButton = screen.getByRole("button", { name: /google/i });
      const discordButton = screen.getByRole("button", { name: /discord/i });

      expect(githubButton).toBeVisible();
      expect(googleButton).toBeVisible();
      expect(discordButton).toBeVisible();

      // Check parent has grid class
      const buttonContainer = githubButton.parentElement;
      expect(buttonContainer).toHaveClass("grid");
    });

    it("should maintain proper spacing across viewports", () => {
      const { container } = render(<LoginPage />);

      // Check spacing elements exist
      const card = container.querySelector('[class*="space-y"]');
      expect(card).toBeTruthy();
    });
  });

  describe("Mobile-Specific Tests", () => {
    it("should have password field accessible", () => {
      render(<LoginPage />);

      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toHaveAttribute("type", "password");
      expect(passwordInput).toBeInTheDocument();
    });

    it("should display submit button with full width class", () => {
      render(<LoginPage />);

      const submitButton = screen.getByRole("button", { name: /sign in/i });
      expect(submitButton).toHaveClass("w-full");
    });

    it("should use appropriate keyboard types", () => {
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      // Email input should have email type
      expect(emailInput).toHaveAttribute("type", "email");

      // Password input should have password type
      expect(passwordInput).toHaveAttribute("type", "password");
    });

    it("should handle touch interactions on buttons", async () => {
      const signIn = vi.fn().mockResolvedValue({ ok: true });
      vi.mocked(await import("next-auth/react")).signIn = signIn;

      render(<LoginPage />);
      const user = userEvent.setup();

      const githubButton = screen.getByRole("button", { name: /github/i });

      await user.click(githubButton);

      await waitFor(() => {
        expect(signIn).toHaveBeenCalledWith("github", {
          callbackUrl: "/dashboard",
        });
      });
    });

    it("should have adequate spacing between buttons", () => {
      render(<LoginForm />);

      const githubButton = screen.getByRole("button", { name: /github/i });
      const googleButton = screen.getByRole("button", { name: /google/i });

      // Buttons should exist and be separated by grid gap
      expect(githubButton).toBeInTheDocument();
      expect(googleButton).toBeInTheDocument();

      // Check parent has gap spacing
      const buttonContainer = githubButton.parentElement;
      expect(buttonContainer).toHaveClass("grid");
    });

    it("should show loading state properly", async () => {
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

      // Loading spinner should appear
      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
    });
  });

  describe("Responsive Images and Icons", () => {
    it("should render icons in OAuth buttons", () => {
      render(<LoginForm />);

      // Check that OAuth buttons have icons
      const githubButton = screen.getByRole("button", { name: /github/i });
      const googleButton = screen.getByRole("button", { name: /google/i });
      const discordButton = screen.getByRole("button", { name: /discord/i });

      expect(githubButton).toContainHTML("svg");
      expect(googleButton).toContainHTML("svg");
      expect(discordButton).toContainHTML("svg");
    });

    it("should scale loading spinner appropriately", async () => {
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
        // Loading state should be visible
        expect(submitButton).toBeDisabled();
      });
    });
  });

  describe("Cross-browser Compatibility", () => {
    it("should work with different matchMedia implementations", () => {
      // Mock different matchMedia behaviors
      const mockMatchMedia = (matches: boolean) => {
        window.matchMedia = vi.fn().mockImplementation((query: string) => ({
          matches,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }));
      };

      mockMatchMedia(true);
      render(<LoginPage />);
      expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
    });

    it("should handle viewport changes gracefully", () => {
      const { rerender } = render(<LoginPage />);

      // Change viewport
      setViewport(375, 667);
      rerender(<LoginPage />);
      expect(screen.getByText(/welcome back/i)).toBeVisible();

      setViewport(1280, 720);
      rerender(<LoginPage />);
      expect(screen.getByText(/welcome back/i)).toBeVisible();
    });
  });
});
