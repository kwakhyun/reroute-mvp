// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { Modal } from "./modal";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  });
  HTMLDialogElement.prototype.close = vi.fn(function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
  });
});

function ModalHarness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} type="button">조건 다시 계산</button>
      {open ? (
        <Modal onClose={() => setOpen(false)} open title="매칭 조건 다시 계산">
          <button onClick={() => setOpen(false)} type="button">취소</button>
        </Modal>
      ) : null}
    </>
  );
}

describe("Modal", () => {
  it("returns focus to the button that opened it", async () => {
    render(<ModalHarness />);
    const trigger = screen.getByRole("button", { name: "조건 다시 계산" });
    trigger.focus();
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
