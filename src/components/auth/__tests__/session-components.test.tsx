import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SessionStatusIndicator } from "../session-status";
import { UserRoleBadge } from "../user-role-badge";
import { AuthLoadingSpinner } from "../auth-loading";
import { UserRole } from "@/types/auth";

const mockUseSession = vi.fn();

// Mock next-auth/react
vi.mock("next-auth/react", () => ({
  useSession: () => mockUseSession(),
}));

describe("SessionStatusIndicator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should show authenticated status when user is logged in", () => {
    mockUseSession.mockReturnValue({
      data: { user: { name: "Test" } },
      status: "authenticated",
      update: vi.fn(),
    });

    render(<SessionStatusIndicator />);

    expect(screen.getByText("Authenticated")).toBeInTheDocument();
  });

  it("should show not authenticated status when user is logged out", () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    });

    render(<SessionStatusIndicator />);

    expect(screen.getByText("Not Authenticated")).toBeInTheDocument();
  });

  it("should not render during loading", () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: "loading",
      update: vi.fn(),
    });

    const { container } = render(<SessionStatusIndicator />);

    expect(container.firstChild).toBeNull();
  });

  it("should display status icon", () => {
    mockUseSession.mockReturnValue({
      data: { user: { name: "Test" } },
      status: "authenticated",
      update: vi.fn(),
    });

    const { container } = render(<SessionStatusIndicator />);

    const icon = container.querySelector("svg");
    expect(icon).toBeInTheDocument();
  });
});

describe("UserRoleBadge", () => {
  it("should display admin role with red styling", () => {
    render(<UserRoleBadge role={UserRole.ADMIN} />);

    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("should display editor role", () => {
    render(<UserRoleBadge role={UserRole.EDITOR} />);

    expect(screen.getByText("Editor")).toBeInTheDocument();
  });

  it("should display user role", () => {
    render(<UserRoleBadge role={UserRole.USER} />);

    expect(screen.getByText("User")).toBeInTheDocument();
  });

  it("should show shield icon by default", () => {
    const { container } = render(<UserRoleBadge role={UserRole.USER} />);

    const icon = container.querySelector("svg");
    expect(icon).toBeInTheDocument();
  });

  it("should hide icon when showIcon is false", () => {
    const { container } = render(<UserRoleBadge role={UserRole.USER} showIcon={false} />);

    const icon = container.querySelector("svg");
    expect(icon).not.toBeInTheDocument();
  });

  it("should apply custom className", () => {
    const { container } = render(<UserRoleBadge role={UserRole.USER} className="custom-class" />);

    const badge = container.querySelector(".custom-class");
    expect(badge).toBeInTheDocument();
  });
});

describe("AuthLoadingSpinner", () => {
  it("should render with default message", () => {
    render(<AuthLoadingSpinner />);

    expect(screen.getByText("Checking authentication...")).toBeInTheDocument();
  });

  it("should render with custom message", () => {
    render(<AuthLoadingSpinner message="Please wait..." />);

    expect(screen.getByText("Please wait...")).toBeInTheDocument();
  });

  it("should render inline by default", () => {
    const { container } = render(<AuthLoadingSpinner />);

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain("flex items-center justify-center p-8");
  });

  it("should render fullscreen when specified", () => {
    const { container } = render(<AuthLoadingSpinner fullScreen />);

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain("fixed");
    expect(wrapper.className).toContain("backdrop-blur");
  });

  it("should display loading spinner with animation", () => {
    const { container } = render(<AuthLoadingSpinner />);

    const spinner = container.querySelector('[class*="animate-spin"]');
    expect(spinner).toBeInTheDocument();
  });

  it("should have ARIA label for accessibility", () => {
    const { container } = render(<AuthLoadingSpinner />);

    const spinner = container.querySelector('[aria-label="Loading"]');
    expect(spinner).toBeInTheDocument();
  });
});
