import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MatchEndModal } from "@/components/game/MatchEndModal";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe("MatchEndModal", () => {
  afterEach(() => {
    cleanup();
  });

  it("victoria muestra mensaje y enlace al menú", () => {
    render(<MatchEndModal outcome="victory" />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Victoria")).toBeInTheDocument();
    expect(
      screen.getByText("Has destruido la base enemiga."),
    ).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /volver al menú/i });
    expect(link).toHaveAttribute("href", "/");
  });

  it("derrota muestra mensaje y enlace al menú", () => {
    render(<MatchEndModal outcome="defeat" />);
    expect(screen.getByText("Derrota")).toBeInTheDocument();
    expect(
      screen.getByText("Tu base ha sido destruida."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /volver al menú/i }),
    ).toHaveAttribute("href", "/");
  });
});
