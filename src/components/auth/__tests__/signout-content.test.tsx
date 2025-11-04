import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SignoutContent } from "../signout-content";

// Mock next-auth/react
vi.mock("next-auth/react", () => ({
  signOut: vi.fn(),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    back: vi.fn(),
  })),
}));

// Import mocked modules after vi.mock
import { signOut as mockSignOut } from "next-auth/react";
import { useRouter as mockUseRouter } from "next/navigation";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("SignoutContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders signout confirmation content", () => {
    render(<SignoutContent />);

    expect(
      screen.getByText(/are you sure you want to sign out of your account/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /yes, sign out/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("calls signOut when Yes button is clicked", async () => {
    mockSignOut.mockResolvedValue({});

    render(<SignoutContent />);

    const signOutButton = screen.getByRole("button", { name: /yes, sign out/i });
    fireEvent.click(signOutButton);

    expect(mockSignOut).toHaveBeenCalledWith({
      callbackUrl: "/",
      redirect: true,
    });
  });

  it("shows loading state when signing out", async () => {
    mockSignOut.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<SignoutContent />);

    const signOutButton = screen.getByRole("button", { name: /yes, sign out/i });
    fireEvent.click(signOutButton);

    // Button should be disabled and show loading spinner
    expect(signOutButton).toBeDisabled();
  });

  it("calls router.back when Cancel button is clicked", () => {
    const mockBack = vi.fn();
    vi.mocked(mockUseRouter).mockReturnValue({ back: mockBack } as any);

    render(<SignoutContent />);

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(mockBack).toHaveBeenCalled();
  });
});
