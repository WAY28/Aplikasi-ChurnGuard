import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Badge from "./Badge";

describe("Badge", () => {
  it("render children dan class sesuai tone", () => {
    render(<Badge tone="danger">Risiko Tinggi</Badge>);
    const badge = screen.getByText("Risiko Tinggi");
    expect(badge).toHaveClass("badge", "badge-danger");
  });

  it("default tone = neutral kalau tidak diberikan", () => {
    render(<Badge>Netral</Badge>);
    expect(screen.getByText("Netral")).toHaveClass("badge-neutral");
  });
});
