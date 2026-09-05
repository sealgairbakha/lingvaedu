import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AuthGate } from "../src/auth/AuthGate";

const mock = vi.hoisted(() => ({ updateUser: vi.fn(), finishRecovery: vi.fn() }));
vi.mock("../src/lib/supabase", () => ({ isSupabaseConfigured: true, supabase: { auth: { updateUser: mock.updateUser } } }));
vi.mock("../src/auth/AuthProvider", () => ({ useAuth: () => ({ user: { id: "test-user", user_metadata: {} }, loading: false, recovery: true, finishRecovery: mock.finishRecovery, signOut: vi.fn() }) }));
afterEach(cleanup);

describe("password recovery", () => {
  it("opens the new password form instead of the protected app", () => {
    render(<AuthGate><div>Protected course</div></AuthGate>);
    expect(screen.getByText("ВОССТАНОВЛЕНИЕ ДОСТУПА")).toBeTruthy();
    expect(screen.getByLabelText("Новый пароль")).toBeTruthy();
    expect(screen.queryByText("Protected course")).toBeNull();
  });
  it("keeps recovery open and releases the submit button after a network failure", async () => {
    mock.updateUser.mockRejectedValue(new Error("Network unavailable"));
    render(<AuthGate><div>Protected course</div></AuthGate>);
    fireEvent.change(screen.getByLabelText("Новый пароль"), { target: { value: "TestingOnly9" } });
    fireEvent.change(screen.getByLabelText("Повторите новый пароль"), { target: { value: "TestingOnly9" } });
    fireEvent.click(screen.getByRole("button", { name: "Сохранить новый пароль" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Network unavailable"));
    expect(mock.finishRecovery).not.toHaveBeenCalled();
    expect((screen.getByRole("button", { name: "Сохранить новый пароль" }) as HTMLButtonElement).disabled).toBe(false);
  });
});
