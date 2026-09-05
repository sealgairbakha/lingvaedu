// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import usernameLogin from "../api/username-login";
import translate from "../api/translate";
import groups from "../api/groups";

const mock = vi.hoisted(() => ({
  createClient: vi.fn(), from: vi.fn(), getUser: vi.fn(),
  getUserById: vi.fn(), updateUserById: vi.fn(), listUsers: vi.fn(),
  signInWithPassword: vi.fn(), refreshSession: vi.fn(),
}));
vi.mock("@supabase/supabase-js", () => ({ createClient: mock.createClient }));

const request = (body: unknown, token = "") => new Request("http://localhost/api/test", {
  method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body),
});

beforeEach(() => {
  vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-only-key");
  mock.createClient.mockReturnValue({ from: mock.from, auth: {
    getUser: mock.getUser, signInWithPassword: mock.signInWithPassword, refreshSession: mock.refreshSession,
    admin: { getUserById: mock.getUserById, updateUserById: mock.updateUserById, listUsers: mock.listUsers },
  } });
  mock.from.mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { user_id: "user" }, error: null }) }) }) });
  mock.getUserById.mockResolvedValue({ data: { user: { id: "user", email: "test@example.com", user_metadata: {} } }, error: null });
  mock.signInWithPassword.mockResolvedValue({ data: { session: null }, error: { message: "Invalid login credentials" } });
});

describe("username login", () => {
  it.each([null, [], 4, "text"])("rejects malformed JSON values: %s", async (value) => {
    expect((await usernameLogin.fetch(request(value))).status).toBe(400);
    expect(mock.createClient).not.toHaveBeenCalled();
  });
  it("never changes an account before the password has been verified", async () => {
    expect((await usernameLogin.fetch(request({ username: "student", password: "WrongPassword" }))).status).toBe(401);
    expect(mock.updateUserById).not.toHaveBeenCalled();
  });
  it("does not enumerate the user directory for an unknown username", async () => {
    mock.from.mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) });
    expect((await usernameLogin.fetch(request({ username: "missing", password: "anything" }))).status).toBe(401);
    expect(mock.listUsers).not.toHaveBeenCalled();
  });
  it("refreshes the session after marking a legacy temporary password", async () => {
    mock.signInWithPassword.mockResolvedValue({ data: { session: { access_token: "old-access", refresh_token: "old-refresh" } }, error: null });
    mock.updateUserById.mockResolvedValue({ error: null });
    mock.refreshSession.mockResolvedValue({ data: { session: { access_token: "new-access", refresh_token: "new-refresh" } }, error: null });
    const response = await usernameLogin.fetch(request({ username: "student", password: "VerifiedPassword" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ accessToken: "new-access", refreshToken: "new-refresh" });
    expect(mock.signInWithPassword.mock.invocationCallOrder[0]).toBeLessThan(mock.updateUserById.mock.invocationCallOrder[0]);
  });
});

describe("protected APIs", () => {
  it("rejects anonymous translation before contacting a provider", async () => {
    expect((await translate.fetch(request({ text: "Hello" }))).status).toBe(401);
    expect(mock.createClient).not.toHaveBeenCalled();
  });
  it("rejects invalid sessions for translation", async () => {
    mock.getUser.mockResolvedValue({ data: { user: null }, error: { message: "invalid" } });
    expect((await translate.fetch(request({ text: "Hello" }, "invalid"))).status).toBe(401);
  });
  it("rejects a student trying to manage groups", async () => {
    mock.getUser.mockResolvedValue({ data: { user: { id: "student", app_metadata: { role: "student" } } }, error: null });
    expect((await groups.fetch(request({ name: "Group" }, "student-token"))).status).toBe(403);
    expect(mock.from).not.toHaveBeenCalled();
  });
  it("rejects incomplete group updates before writing anything", async () => {
    mock.getUser.mockResolvedValue({ data: { user: { id: "admin", app_metadata: { role: "admin" } } }, error: null });
    const response = await groups.fetch(new Request("http://localhost/api/groups", { method: "PATCH", headers: { Authorization: "Bearer admin-token", "Content-Type": "application/json" }, body: JSON.stringify({ id: "group", name: "Group" }) }));
    expect(response.status).toBe(400);
    expect(mock.from).not.toHaveBeenCalled();
  });
});
