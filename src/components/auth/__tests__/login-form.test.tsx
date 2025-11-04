import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { LoginForm } from "../login-form";

// Mock next-auth/react
vi.mock("next-auth/react", () => ({
  signIn: vi.fn(),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe("LoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders email and password fields", () => {
    render(<LoginForm />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it.skip("shows validation errors for invalid email", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole("button", { name: /sign in/i });

    await user.clear(emailInput);
    await user.type(emailInput, "invalid-email");
    await user.click(submitButton);

    // Wait for validation message to appear using findByText (async)
    const errorMessage = await screen.findByText(
      /please enter a valid email address/i,
      {},
      { timeout: 3000 }
    );
    expect(errorMessage).toBeInTheDocument();
  });

  it("shows validation errors for short password", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole("button", { name: /sign in/i });

    // Need valid email to get past email validation
    await user.type(emailInput, "test@example.com");
    await user.type(passwordInput, "123");
    await user.click(submitButton);

    await waitFor(
      () => {
        expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  it("renders OAuth provider buttons", () => {
    render(<LoginForm />);

    expect(screen.getByRole("button", { name: /github/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /google/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /discord/i })).toBeInTheDocument();
  });
});
