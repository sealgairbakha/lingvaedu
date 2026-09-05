import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AssignmentReviewPage } from "../src/features/courses/AssignmentReviewPage";

const mock = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("../src/lib/supabase", () => ({ supabase: { from: mock.from } }));
const user = { id: "admin" };
vi.mock("../src/auth/AuthProvider", () => ({ useAuth: () => ({ user, displayName: "Admin" }) }));
vi.mock("../src/features/courses/CourseProvider", () => ({ useCourses: () => ({ courses: [{ id: "course", title: "English", modules: [{ title: "Module", lessons: [{ id: "lesson", title: "Lesson", blocks: [] }] }] }] }) }));

beforeEach(() => { localStorage.clear(); });
afterEach(cleanup);

describe("assignment review interactions", () => {
  it("shows an actionable error instead of another account's local submissions", async () => {
    localStorage.setItem("lingvaedu-assignment-submissions-v1", JSON.stringify({ submissions: [{ studentName: "Private local student" }] }));
    mock.from.mockReturnValue({ select: () => ({ order: async () => ({ data: null, error: { message: "Permission denied" } }) }) });
    render(<MemoryRouter><AssignmentReviewPage /></MemoryRouter>);
    await screen.findByRole("heading", { name: "Работы временно недоступны" });
    expect(screen.queryByText("Private local student")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Попробовать снова" }));
    await waitFor(() => expect(mock.from).toHaveBeenCalledTimes(2));
  });
  it("filters the list and preview together and can reset an empty search", async () => {
    const rows = [{ id: "one", student_name: "Алия" }, { id: "two", student_name: "Марат" }].map((row) => ({ ...row, user_id: row.id, course_id: "course", lesson_id: "lesson", block_id: "block", body: "Answer", updated_at: new Date().toISOString(), created_at: new Date().toISOString() }));
    mock.from.mockImplementation((table: string) => table === "course_assignment_submissions"
      ? { select: () => ({ order: async () => ({ data: rows, error: null }) }) }
      : { select: () => ({ in: async () => ({ data: [{ id: "reply", submission_id: "two", body: "Reviewed", updated_at: new Date().toISOString() }], error: null }) }) });
    render(<MemoryRouter><AssignmentReviewPage /></MemoryRouter>);
    await screen.findByRole("heading", { name: "Алия" });
    fireEvent.click(screen.getByRole("button", { name: "Проверены 1" }));
    await screen.findByRole("heading", { name: "Марат" });
    expect(screen.queryByRole("heading", { name: "Алия" })).toBeNull();
    fireEvent.change(screen.getByRole("textbox", { name: "Поиск по работам учеников" }), { target: { value: "no-results" } });
    expect(screen.getByRole("heading", { name: "Подходящих работ нет" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Сбросить фильтры" }));
    expect(screen.getByRole("button", { name: "Все 2" }).getAttribute("aria-pressed")).toBe("true");
  });
});
