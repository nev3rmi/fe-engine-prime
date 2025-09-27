import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { SignoutContent } from "../signout-content";

// Mock next-auth/react
vi.mock("next-auth/react", () => ({
  signOut: vi.fn(),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    back: vi.fn(),
  }),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("SignoutContent", () => {
  it("renders signout confirmation content", () => {
    render(<SignoutContent />);

    expect(screen.getByText(/sign out/i)).toBeInTheDocument();
    expect(screen.getByText(/are you sure you want to sign out/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /yes, sign out/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("calls signOut when Yes button is clicked", async () => {
    const { signOut } = require("next-auth/react");
    signOut.mockResolvedValue({});

    render(<SignoutContent />);

    const signOutButton = screen.getByRole("button", { name: /yes, sign out/i });
    fireEvent.click(signOutButton);

    expect(signOut).toHaveBeenCalledWith({
      callbackUrl: "/",
      redirect: true,
    });
  });

  it("shows loading state when signing out", async () => {
    const { signOut } = require("next-auth/react");
    signOut.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<SignoutContent />);

    const signOutButton = screen.getByRole("button", { name: /yes, sign out/i });
    fireEvent.click(signOutButton);

    // Button should be disabled and show loading spinner
    expect(signOutButton).toBeDisabled();
  });

  it("calls router.back when Cancel button is clicked", () => {
    const mockBack = vi.fn();
    const { useRouter } = require("next/navigation");
    useRouter.mockReturnValue({ back: mockBack });

    render(<SignoutContent />);

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(mockBack).toHaveBeenCalled();
  });
});
