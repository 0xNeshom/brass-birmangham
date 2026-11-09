// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { makeTournament } from "@/domain/testing";
import { Dashboard } from "./dashboard";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.open = true; this.querySelector<HTMLElement>("button, input, select")?.focus(); };
  HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new Event("close")); };
});
afterEach(cleanup);
const props = () => ({ tournament: makeTournament(), onSave: vi.fn().mockResolvedValue(undefined), onRename: vi.fn().mockResolvedValue(undefined) });
async function fillPodium() {
  const user = userEvent.setup();
  await user.selectOptions(screen.getByLabelText("1st place · 10 points"), "1");
  await user.selectOptions(screen.getByLabelText("2nd place · 5 points"), "2");
  await user.selectOptions(screen.getByLabelText("3rd place · 0 points"), "3");
}

describe("tournament dashboard", () => {
  it("records only the next match, prevents duplicate selections, and restores focus", async () => {
    const values = props();
    const user = userEvent.setup();
    render(<Dashboard {...values} />);
    const action = screen.getByRole("button", { name: "Record match 1" });
    action.focus();
    await user.click(action);
    await fillPodium();
    const second = screen.getByLabelText("2nd place · 5 points") as HTMLSelectElement;
    expect(second.querySelector<HTMLOptionElement>('option[value="1"]')?.disabled).toBe(true);
    await user.click(screen.getByRole("button", { name: "Save result" }));
    await waitFor(() => expect(values.onSave).toHaveBeenCalledWith(1, [1, 2, 3], 1));
    expect(document.activeElement).toBe(action);
    expect(screen.queryByRole("button", { name: "Edit match 2" })).toBeNull();
  });

  it("preserves a draft across background updates and demands explicit review", async () => {
    const values = props();
    const user = userEvent.setup();
    const view = render(<Dashboard {...values} />);
    await user.click(screen.getByRole("button", { name: "Record match 1" }));
    await fillPodium();
    const updated = { ...makeTournament([[3, 2, 1]]), version: 2 };
    view.rerender(<Dashboard {...values} tournament={updated} />);
    expect((screen.getByLabelText("1st place · 10 points") as HTMLSelectElement).value).toBe("1");
    expect((screen.getByRole("button", { name: "Save result" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("1st Cy / 2nd Bea / 3rd Ada")).toBeDefined();
    await user.click(screen.getByRole("button", { name: "I reviewed revision 2 — keep my draft" }));
    await user.click(screen.getByRole("button", { name: "Save result" }));
    await waitFor(() => expect(values.onSave).toHaveBeenCalledWith(1, [1, 2, 3], 2));
  });

  it("retains failed submissions and blocks conflict retries until refreshed", async () => {
    const values = props();
    values.onSave.mockRejectedValue(new Error("Tournament version conflict. Refresh and try again."));
    const refresh = vi.fn();
    const user = userEvent.setup();
    render(<Dashboard {...values} onRefresh={refresh} />);
    await user.click(screen.getByRole("button", { name: "Record match 1" }));
    await fillPodium();
    await user.click(screen.getByRole("button", { name: "Save result" }));
    await screen.findByText("Tournament version conflict. Refresh and try again.");
    expect((screen.getByLabelText("1st place · 10 points") as HTMLSelectElement).value).toBe("1");
    expect((screen.getByRole("button", { name: "Save result" }) as HTMLButtonElement).disabled).toBe(true);
    await user.click(screen.getByRole("button", { name: "Refresh persisted record" }));
    expect(refresh).toHaveBeenCalledOnce();
    expect(values.onSave).toHaveBeenCalledOnce();
  });

  it("prefills corrections, validates unique names, and supports Escape cancellation", async () => {
    const values = { ...props(), tournament: makeTournament([[2, 3, 1]]) };
    const user = userEvent.setup();
    render(<Dashboard {...values} />);
    await user.click(screen.getByRole("button", { name: "Edit match 1" }));
    expect((screen.getByLabelText("1st place · 10 points") as HTMLSelectElement).value).toBe("2");
    fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
    await user.click(screen.getByRole("button", { name: "Edit player names" }));
    await user.clear(screen.getByLabelText("Player 2"));
    await user.type(screen.getByLabelText("Player 2"), "ada");
    await user.click(screen.getByRole("button", { name: "Save names" }));
    expect(await screen.findByText("Player names must be unique, ignoring case.")).toBeDefined();
    expect(values.onRename).not.toHaveBeenCalled();
  });

  it("shows shared winners and preserves all ten editable results", () => {
    const cycle: (1 | 2 | 3)[][] = [[1, 2, 3], [2, 3, 1], [3, 1, 2]];
    // Four wins each for Ada and Bea, matching seconds: both share victory.
    const tournament = makeTournament([...cycle, ...cycle, [1, 2, 3], [2, 1, 3], [1, 2, 3], [2, 1, 3]]);
    render(<Dashboard {...props()} tournament={tournament} />);
    expect(screen.getByRole("heading", { name: "Ada & Bea" })).toBeDefined();
    expect(screen.getByText(/Share the victory/)).toBeDefined();
    expect(screen.getAllByRole("button", { name: /Edit match/ })).toHaveLength(10);
    expect(screen.getByRole("link", { name: /Begin the next tournament/ }).getAttribute("href")).toBe("/tournaments/new");
  });
});
