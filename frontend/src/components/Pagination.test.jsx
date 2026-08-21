import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Pagination from "./Pagination";

describe("Pagination", () => {
  it("tidak render apa-apa kalau cuma 1 halaman", () => {
    const { container } = render(<Pagination page={1} totalPages={1} onChange={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("tombol 'sebelumnya' disabled di halaman pertama", () => {
    render(<Pagination page={1} totalPages={3} onChange={vi.fn()} />);
    expect(screen.getByLabelText("Halaman sebelumnya")).toBeDisabled();
    expect(screen.getByLabelText("Halaman berikutnya")).toBeEnabled();
  });

  it("tombol 'berikutnya' disabled di halaman terakhir", () => {
    render(<Pagination page={3} totalPages={3} onChange={vi.fn()} />);
    expect(screen.getByLabelText("Halaman berikutnya")).toBeDisabled();
    expect(screen.getByLabelText("Halaman sebelumnya")).toBeEnabled();
  });

  it("menampilkan info halaman saat ini", () => {
    render(<Pagination page={2} totalPages={5} onChange={vi.fn()} />);
    expect(screen.getByText("Halaman 2 dari 5")).toBeInTheDocument();
  });

  it("klik 'berikutnya' memanggil onChange dengan halaman+1", async () => {
    const onChange = vi.fn();
    render(<Pagination page={2} totalPages={5} onChange={onChange} />);
    await userEvent.click(screen.getByLabelText("Halaman berikutnya"));
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it("klik 'sebelumnya' memanggil onChange dengan halaman-1", async () => {
    const onChange = vi.fn();
    render(<Pagination page={2} totalPages={5} onChange={onChange} />);
    await userEvent.click(screen.getByLabelText("Halaman sebelumnya"));
    expect(onChange).toHaveBeenCalledWith(1);
  });
});
