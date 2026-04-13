import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Home from "@/app/page";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

describe("Home", () => {
  it("muestra el título, el enlace a /game y el pie con el autor", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { name: /Battlefront Engine System/i }),
    ).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Jugar/i });
    expect(link).toHaveAttribute("href", "/game");
    expect(screen.getByText("Sergio Veloza")).toBeInTheDocument();
  });
});
