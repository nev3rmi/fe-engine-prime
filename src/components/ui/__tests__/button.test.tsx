import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@/test/utils/test-utils";
import { Button } from "../button";

describe("Button Component", () => {
  it("renders button with default variant", () => {
    render(<Button>Default Button</Button>);

    const button = screen.getByRole("button", { name: /default button/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("bg-primary", "text-primary-foreground");
  });

  it("renders button with different variants", () => {
    const variants = ["default", "destructive", "outline", "secondary", "ghost", "link"] as const;

    variants.forEach(variant => {
      const { rerender } = render(<Button variant={variant}>{variant} Button</Button>);
      const button = screen.getByRole("button", { name: `${variant} Button` });
      expect(button).toBeInTheDocument();

      // Clean up for next iteration
      rerender(<div />);
    });
  });

  it("renders button with different sizes", () => {
    const sizes = ["default", "sm", "lg", "icon"] as const;

    sizes.forEach(size => {
      const { rerender } = render(<Button size={size}>{size} Button</Button>);
      const button = screen.getByRole("button", { name: `${size} Button` });
      expect(button).toBeInTheDocument();

      // Verify size-specific classes
      switch (size) {
        case "sm":
          expect(button).toHaveClass("h-8", "px-3");
          break;
        case "lg":
          expect(button).toHaveClass("h-10", "px-6");
          break;
        case "icon":
          expect(button).toHaveClass("size-9");
          break;
        default:
          expect(button).toHaveClass("h-9", "px-4", "py-2");
      }

      // Clean up for next iteration
      rerender(<div />);
    });
  });

  it("handles click events", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Clickable Button</Button>);

    const button = screen.getByRole("button", { name: /clickable button/i });
    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("is disabled when disabled prop is true", () => {
    render(<Button disabled>Disabled Button</Button>);

    const button = screen.getByRole("button", { name: /disabled button/i });
    expect(button).toBeDisabled();
    expect(button).toHaveClass("disabled:pointer-events-none", "disabled:opacity-50");
  });

  it("renders as child element when asChild is true", () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    );

    const link = screen.getByRole("link", { name: /link button/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/test");

    // Should not render a button element
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(<Button className="custom-class">Custom Button</Button>);

    const button = screen.getByRole("button", { name: /custom button/i });
    expect(button).toHaveClass("custom-class");
  });

  it("forwards ref correctly", () => {
    const ref = vi.fn();
    render(<Button ref={ref}>Ref Button</Button>);

    expect(ref).toHaveBeenCalledWith(expect.any(HTMLButtonElement));
  });

  it("renders with icon and maintains proper styling", () => {
    render(
      <Button size="icon" aria-label="Icon button">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
        </svg>
      </Button>
    );

    const button = screen.getByRole("button", { name: /icon button/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("size-9");

    const svg = button.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("handles keyboard navigation", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Keyboard Button</Button>);

    const button = screen.getByRole("button", { name: /keyboard button/i });

    // Test focus
    button.focus();
    expect(button).toHaveFocus();

    // Test Enter key
    fireEvent.keyDown(button, { key: "Enter", code: "Enter" });

    // Test Space key
    fireEvent.keyDown(button, { key: " ", code: "Space" });
  });

  it("supports all HTML button attributes", () => {
    render(
      <Button
        type="submit"
        form="test-form"
        name="test-button"
        value="test-value"
        aria-describedby="button-description"
      >
        Attribute Button
      </Button>
    );

    const button = screen.getByRole("button", { name: /attribute button/i });
    expect(button).toHaveAttribute("type", "submit");
    expect(button).toHaveAttribute("form", "test-form");
    expect(button).toHaveAttribute("name", "test-button");
    expect(button).toHaveAttribute("value", "test-value");
    expect(button).toHaveAttribute("aria-describedby", "button-description");
  });

  it("renders with loading state", () => {
    render(
      <Button disabled aria-label="Loading button">
        <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        Loading...
      </Button>
    );

    const button = screen.getByRole("button", { name: /loading button/i });
    expect(button).toBeDisabled();
    expect(button.textContent).toContain("Loading...");
  });

  it("renders destructive variant with proper styling", () => {
    render(<Button variant="destructive">Delete Button</Button>);

    const button = screen.getByRole("button", { name: /delete button/i });
    expect(button).toHaveClass("bg-destructive", "text-white");
  });

  it("renders outline variant with proper styling", () => {
    render(<Button variant="outline">Outline Button</Button>);

    const button = screen.getByRole("button", { name: /outline button/i });
    expect(button).toHaveClass("border", "bg-background");
  });
});
