import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AuthErrorContent } from "../auth-error-content";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("AuthErrorContent", () => {
  it("displays default error message when no error parameter", () => {
    const { useSearchParams } = require("next/navigation");
    useSearchParams.mockReturnValue({
      get: vi.fn().mockReturnValue(null),
    });

    render(<AuthErrorContent />);

    expect(screen.getByText(/authentication error/i)).toBeInTheDocument();
    expect(screen.getByText(/an error occurred during authentication/i)).toBeInTheDocument();
  });

  it("displays specific error message for CredentialsSignin", () => {
    const { useSearchParams } = require("next/navigation");
    useSearchParams.mockReturnValue({
      get: vi.fn().mockReturnValue("CredentialsSignin"),
    });

    render(<AuthErrorContent />);

    expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
  });

  it("displays specific error message for OAuthAccountNotLinked with additional info", () => {
    const { useSearchParams } = require("next/navigation");
    useSearchParams.mockReturnValue({
      get: vi.fn().mockReturnValue("OAuthAccountNotLinked"),
    });

    render(<AuthErrorContent />);

    expect(screen.getByText(/email on the account is already linked/i)).toBeInTheDocument();
    expect(screen.getByText(/to confirm your identity/i)).toBeInTheDocument();
  });

  it("renders Try Again and Go Home buttons", () => {
    const { useSearchParams } = require("next/navigation");
    useSearchParams.mockReturnValue({
      get: vi.fn().mockReturnValue(null),
    });

    render(<AuthErrorContent />);

    expect(screen.getByRole("link", { name: /try again/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /go home/i })).toBeInTheDocument();
  });
});
