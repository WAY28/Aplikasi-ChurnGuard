import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import MetricCard from "./MetricCard";

// useCountUp menganimasikan angka lewat requestAnimationFrame, yang tidak
// pernah "selesai" secara sinkron di jsdom -- test di bawah mensimulasikan
// prefers-reduced-motion supaya nilainya langsung final tanpa animasi
// (hook memang sengaja begitu untuk aksesibilitas, jadi ini juga menguji
// jalur kode itu, bukan cuma workaround test).
beforeEach(() => {
  window.matchMedia = (query) => ({
    matches: query === "(prefers-reduced-motion: reduce)",
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  });
});

describe("MetricCard", () => {
  it("angka biasa dianimasikan lewat count-up (berakhir di nilai yang benar)", () => {
    render(<MetricCard label="Total Pelanggan" value={42} />);
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("string berformat koma (mis. akurasi model) ditampilkan APA ADANYA, tidak dibulatkan/dipotong", () => {
    // Regresi: parseFloat("98,05%") == 98 (koma bukan desimal valid di JS) dan
    // count-up membulatkan ke integer -- kombinasi keduanya dulu diam-diam
    // membuang ",05" dan menampilkan "98%" alih-alih "98,05%".
    render(<MetricCard label="Akurasi Model" value="98,05%" />);
    expect(screen.getByText("98,05%")).toBeInTheDocument();
  });

  it("string persen tanpa koma (integer) tetap dianimasikan seperti biasa", () => {
    render(<MetricCard label="Skor" value="75%" />);
    expect(screen.getByText("75%")).toBeInTheDocument();
  });
});
