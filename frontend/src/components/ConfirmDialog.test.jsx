import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ConfirmDialog from "./ConfirmDialog";

describe("ConfirmDialog", () => {
  it("tidak render apa-apa saat open=false", () => {
    const { container } = render(
      <ConfirmDialog open={false} title="Hapus?" onConfirm={vi.fn()} onCancel={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("render title, message, dan children saat open=true", () => {
    render(
      <ConfirmDialog open title="Hapus akun?" message="Tindakan ini permanen." onConfirm={vi.fn()} onCancel={vi.fn()}>
        <input aria-label="password" />
      </ConfirmDialog>,
    );
    expect(screen.getByText("Hapus akun?")).toBeInTheDocument();
    expect(screen.getByText("Tindakan ini permanen.")).toBeInTheDocument();
    expect(screen.getByLabelText("password")).toBeInTheDocument();
  });

  it("menampilkan pesan error kalau diberikan", () => {
    render(<ConfirmDialog open title="Hapus?" error="Password salah." onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText("Password salah.")).toBeInTheDocument();
  });

  it("klik tombol konfirmasi memanggil onConfirm", async () => {
    const onConfirm = vi.fn();
    render(<ConfirmDialog open title="Hapus?" confirmLabel="Ya, Hapus" onConfirm={onConfirm} onCancel={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Ya, Hapus" }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("klik tombol batal memanggil onCancel", async () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog open title="Hapus?" onConfirm={vi.fn()} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole("button", { name: "Batal" }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("tombol nonaktif & spinner muncul saat loading=true", () => {
    render(<ConfirmDialog open title="Hapus?" loading onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Batal" })).toBeDisabled();
  });
});
