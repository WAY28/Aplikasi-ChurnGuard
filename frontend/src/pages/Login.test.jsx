import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Login from "./Login";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../api/client";

// Mock di level context, bukan api/endpoints -- Login.jsx cuma peduli
// kontrak useAuth() (login(), isAuthenticated), bukan detail HTTP di baliknya.
vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

function renderLogin() {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  );
}

describe("Login page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirect (tidak render form) kalau sudah isAuthenticated", () => {
    useAuth.mockReturnValue({ isAuthenticated: true, login: vi.fn() });
    renderLogin();
    expect(screen.queryByRole("button", { name: "Masuk" })).not.toBeInTheDocument();
  });

  it("menampilkan pesan error saat login gagal (401)", async () => {
    const login = vi.fn().mockRejectedValue(new ApiError("Email atau password salah", 401));
    useAuth.mockReturnValue({ isAuthenticated: false, login });

    renderLogin();
    await userEvent.type(screen.getByLabelText("Email"), "test@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "salah");
    await userEvent.click(screen.getByRole("button", { name: "Masuk" }));

    expect(await screen.findByText(/email atau password salah/i)).toBeInTheDocument();
  });

  it("memanggil login() dengan email & password yang diisi user", async () => {
    const login = vi.fn().mockResolvedValue({});
    useAuth.mockReturnValue({ isAuthenticated: false, login });

    renderLogin();
    await userEvent.type(screen.getByLabelText("Email"), "test@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "Passw0rd1");
    await userEvent.click(screen.getByRole("button", { name: "Masuk" }));

    expect(login).toHaveBeenCalledWith("test@example.com", "Passw0rd1");
  });
});
