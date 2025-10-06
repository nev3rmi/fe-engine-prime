import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { WelcomeMessage } from "../welcome-message";
import { UserRole } from "@/types/auth";

const mockUseSession = vi.fn();

// Mock next-auth/react
vi.mock("next-auth/react", () => ({
  useSession: () => mockUseSession(),
}));

describe("WelcomeMessage", () => {
  const mockSession = {
    user: {
      name: "John Doe",
      role: UserRole.USER,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Authentication State", () => {
    it("should not render when unauthenticated", () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: "unauthenticated",
        update: vi.fn(),
      });

      const { container } = render(<WelcomeMessage />);

      expect(container.firstChild).toBeNull();
    });

    it("should not render during loading", () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: "loading",
        update: vi.fn(),
      });

      const { container } = render(<WelcomeMessage />);

      expect(container.firstChild).toBeNull();
    });

    it("should render when authenticated", () => {
      mockUseSession.mockReturnValue({
        data: mockSession,
        status: "authenticated",
        update: vi.fn(),
      });

      render(<WelcomeMessage />);

      expect(screen.getByText(/john doe/i)).toBeInTheDocument();
    });
  });

  describe("Default Variant", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: mockSession,
        status: "authenticated",
        update: vi.fn(),
      });
    });

    it("should display user name", () => {
      render(<WelcomeMessage />);

      expect(screen.getByText(/john doe/i)).toBeInTheDocument();
    });

    it("should display time-based greeting", () => {
      render(<WelcomeMessage />);

      // Should have one of the greetings
      const text = screen.getByText(/john doe/i).textContent;
      const hasGreeting =
        text?.includes("Good morning") ||
        text?.includes("Good afternoon") ||
        text?.includes("Good evening") ||
        text?.includes("Hello") ||
        text?.includes("Welcome back");

      expect(hasGreeting).toBe(true);
    });

    it("should display role badge", () => {
      render(<WelcomeMessage />);

      expect(screen.getByText("USER")).toBeInTheDocument();
    });

    it("should display role-based message", () => {
      render(<WelcomeMessage />);

      expect(screen.getByText(/welcome to your personalized dashboard/i)).toBeInTheDocument();
    });

    it("should not show stats by default", () => {
      render(<WelcomeMessage />);

      expect(screen.queryByText("Tasks Today")).not.toBeInTheDocument();
    });

    it("should show stats when enabled", () => {
      render(<WelcomeMessage showStats />);

      expect(screen.getByText("Tasks Today")).toBeInTheDocument();
      expect(screen.getByText("Completed")).toBeInTheDocument();
    });
  });

  describe("Compact Variant", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: mockSession,
        status: "authenticated",
        update: vi.fn(),
      });
    });

    it("should render compact layout", () => {
      render(<WelcomeMessage variant="compact" />);

      expect(screen.getByText(/john doe/i)).toBeInTheDocument();
    });

    it("should display compact message", () => {
      render(<WelcomeMessage variant="compact" />);

      const compactMessages = [
        "Let's make today productive!",
        "Hope you're having a great day!",
        "Finishing up for the day?",
        "Burning the midnight oil?",
        "Welcome back!",
      ];

      const hasCompactMessage = compactMessages.some(msg => screen.queryByText(msg));

      expect(hasCompactMessage).toBe(true);
    });

    it("should show role badge in compact variant", () => {
      render(<WelcomeMessage variant="compact" />);

      expect(screen.getByText("USER")).toBeInTheDocument();
    });

    it("should show sparkles icon in compact variant", () => {
      const { container } = render(<WelcomeMessage variant="compact" />);

      const icons = container.querySelectorAll("svg");
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe("Hero Variant", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: mockSession,
        status: "authenticated",
        update: vi.fn(),
      });
    });

    it("should render hero layout with large heading", () => {
      render(<WelcomeMessage variant="hero" />);

      const heading = screen.getByText(/john doe/i);
      expect(heading.tagName).toBe("H1");
    });

    it("should display time badge in hero variant", () => {
      render(<WelcomeMessage variant="hero" />);

      const timeBadges = ["Morning", "Afternoon", "Evening", "Night"];
      const hasTimeBadge = timeBadges.some(time => screen.queryByText(time));

      expect(hasTimeBadge).toBe(true);
    });

    it("should show stats in hero variant when enabled", () => {
      render(<WelcomeMessage variant="hero" showStats />);

      expect(screen.getByText("Tasks Completed")).toBeInTheDocument();
      expect(screen.getByText("Active Projects")).toBeInTheDocument();
      expect(screen.getByText("Achievements")).toBeInTheDocument();
    });

    it("should display role-based message in hero", () => {
      render(<WelcomeMessage variant="hero" />);

      expect(screen.getByText(/welcome to your personalized dashboard/i)).toBeInTheDocument();
    });

    it("should have background decoration elements", () => {
      const { container } = render(<WelcomeMessage variant="hero" />);

      const decoration = container.querySelector('[class*="opacity-10"]');
      expect(decoration).toBeInTheDocument();
    });
  });

  describe("Role-Based Behavior", () => {
    it("should display admin message for admin role", () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            name: "Admin User",
            role: UserRole.ADMIN,
          },
        },
        status: "authenticated",
        update: vi.fn(),
      });

      render(<WelcomeMessage />);

      expect(
        screen.getByText(/your dashboard shows all system activity and user management tools/i)
      ).toBeInTheDocument();
    });

    it("should display editor message for editor role", () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            name: "Editor User",
            role: UserRole.EDITOR,
          },
        },
        status: "authenticated",
        update: vi.fn(),
      });

      render(<WelcomeMessage />);

      expect(
        screen.getByText(/you have editing privileges across all projects and content/i)
      ).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle missing user name", () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            name: null,
            role: UserRole.USER,
          },
        },
        status: "authenticated",
        update: vi.fn(),
      });

      render(<WelcomeMessage />);

      // Should default to "User" in the greeting
      const greeting = screen.getByText(
        /good morning|good afternoon|good evening|hello|welcome back/i
      );
      expect(greeting.textContent).toContain("User");
    });

    it("should apply custom className", () => {
      mockUseSession.mockReturnValue({
        data: mockSession,
        status: "authenticated",
        update: vi.fn(),
      });

      const { container } = render(<WelcomeMessage className="custom-welcome" />);

      const element = container.querySelector(".custom-welcome");
      expect(element).toBeInTheDocument();
    });
  });
});
