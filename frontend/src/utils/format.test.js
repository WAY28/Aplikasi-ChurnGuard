import { describe, expect, it } from "vitest";
import { contactStatusLabel, formatPercent, initials, riskLabel, riskTone } from "./format";

describe("riskLabel / riskTone", () => {
  it("churn_prediction=1 -> Risiko Tinggi / danger", () => {
    expect(riskLabel(1)).toBe("Risiko Tinggi");
    expect(riskTone(1)).toBe("danger");
  });

  it("churn_prediction=0 -> Aman / success", () => {
    expect(riskLabel(0)).toBe("Aman");
    expect(riskTone(0)).toBe("success");
  });
});

describe("formatPercent", () => {
  it("membulatkan angka 0-1 jadi persen", () => {
    expect(formatPercent(0.66)).toBe("66%");
    expect(formatPercent(0)).toBe("0%");
    expect(formatPercent(1)).toBe("100%");
  });

  it("balikin '-' kalau value null/undefined", () => {
    expect(formatPercent(null)).toBe("-");
    expect(formatPercent(undefined)).toBe("-");
  });
});

describe("contactStatusLabel", () => {
  it("menerjemahkan status yang dikenal", () => {
    expect(contactStatusLabel("belum_dihubungi")).toBe("Belum Dihubungi");
    expect(contactStatusLabel("retensi_berhasil")).toBe("Retensi Berhasil");
  });

  it("balikin apa adanya kalau status tidak dikenal", () => {
    expect(contactStatusLabel("status_asing")).toBe("status_asing");
  });
});

describe("initials", () => {
  it("ambil huruf depan nama pertama+terakhir", () => {
    expect(initials("Budi Santoso")).toBe("BS");
  });

  it("nama satu kata -> 1 huruf", () => {
    expect(initials("Budi")).toBe("B");
  });

  it("nama kosong/null -> '?'", () => {
    expect(initials("")).toBe("?");
    expect(initials(null)).toBe("?");
  });
});
