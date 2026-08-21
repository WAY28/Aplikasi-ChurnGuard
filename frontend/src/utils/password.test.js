import { describe, expect, it } from "vitest";
import { passwordError } from "./password";

describe("passwordError", () => {
  it("menolak password kurang dari 8 karakter", () => {
    expect(passwordError("abc123")).toMatch(/minimal 8 karakter/i);
  });

  it("menolak password tanpa huruf", () => {
    expect(passwordError("12345678")).toMatch(/minimal satu huruf/i);
  });

  it("menolak password tanpa angka", () => {
    expect(passwordError("abcdefgh")).toMatch(/minimal satu angka/i);
  });

  it("menerima password yang memenuhi semua syarat", () => {
    expect(passwordError("Passw0rd1")).toBeNull();
  });
});
