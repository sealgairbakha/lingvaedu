import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { CourseProvider, useCourses } from "../src/features/courses/CourseProvider";
import { blankCourse } from "../src/features/courses/types";

const mock = vi.hoisted(() => ({ from: vi.fn(), canEdit: true }));
vi.mock("../src/lib/supabase", () => ({ isSupabaseConfigured: true, supabase: { from: mock.from } }));
vi.mock("../src/auth/AuthProvider", () => ({ useAuth: () => ({ user: { id: "admin" }, displayName: "Admin", avatarUrl: "", canEditCourses: mock.canEdit }) }));

function setup(courseError = false) {
  const course = blankCourse("Original author", "original-author");
  const upsert = vi.fn().mockImplementation(async (payload) => ({ data: { id: payload.id, updated_at: payload.updated_at }, error: null }));
  const versionFilter = vi.fn();
  const update = vi.fn((payload) => {
    const query = {
      eq: (field: string, value: string) => { versionFilter(field, value); return query; },
      select: () => ({ maybeSingle: () => upsert(payload) }),
    };
    return query;
  });
  const insert = vi.fn((payload) => ({ select: () => ({ single: () => upsert(payload) }) }));
  const remove = vi.fn().mockResolvedValue({ error: null });
  const progressWrite = vi.fn().mockResolvedValue({ error: null });
  const progressRead = vi.fn().mockResolvedValue({ data: [], error: null });
  mock.from.mockImplementation((table: string) => {
    if (table === "courses") return {
      select: () => ({ order: async () => ({ data: courseError ? null : [{ content: course, author_id: "original-author", updated_at: course.updatedAt }], error: courseError ? { message: "offline" } : null }) }),
      update,
      insert,
      delete: () => ({ eq: remove }),
    };
    if (table === "course_enrollments") return { select: async () => ({ data: [], error: null }) };
    return { select: () => ({ eq: () => ({ order: progressRead }) }), upsert: progressWrite };
  });
  return { course, upsert, update, insert, versionFilter, remove, progressWrite, progressRead };
}

beforeEach(() => { localStorage.clear(); mock.canEdit = true; });
afterEach(cleanup);

describe("cloud course persistence", () => {
  it.each(["response error", "network exception"])("restores the pending queue when loading progress fails: %s", async (mode) => {
    const { course, progressRead } = setup();
    const pending = { userId: "admin", courseId: course.id, lessonId: "lesson", status: "completed", progress: 100, completedAt: new Date().toISOString(), lastOpenedAt: new Date().toISOString() };
    localStorage.setItem("lingvaedu-pending-progress-admin", JSON.stringify([pending]));
    localStorage.setItem("lingvaedu-course-progress-admin", JSON.stringify([{ ...pending, userId: "another-user", lessonId: "private" }, { malformed: true }]));
    if (mode === "response error") progressRead.mockResolvedValueOnce({ data: null, error: { message: "offline" } });
    else progressRead.mockRejectedValueOnce(new Error("offline"));
    const { result } = renderHook(useCourses, { wrapper: CourseProvider });
    await waitFor(() => expect(result.current.progressLoading).toBe(false));
    expect(result.current.progress).toEqual([pending]);
    expect(result.current.progressError).not.toBe("");
  });
  it("does not let a slow initial read erase a completion already saved during loading", async () => {
    const { course, progressRead } = setup();
    let finish!: (value: unknown) => void;
    progressRead.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const { result } = renderHook(useCourses, { wrapper: CourseProvider });
    await waitFor(() => expect(progressRead).toHaveBeenCalledOnce());
    await act(async () => { await result.current.saveLessonProgress({ courseId: course.id, lessonId: "lesson", status: "completed" }); });
    expect(JSON.parse(localStorage.getItem("lingvaedu-pending-progress-admin") || "null")).toEqual([]);
    await act(async () => { finish({ data: [], error: null }); });
    await waitFor(() => expect(result.current.progressLoading).toBe(false));
    expect(result.current.progress[0]?.status).toBe("completed");
  });
  it("does not overwrite a course whose server version has changed", async () => {
    const { course, upsert, versionFilter } = setup();
    const { result } = renderHook(useCourses, { wrapper: CourseProvider });
    await waitFor(() => expect(result.current.loading).toBe(false));
    upsert.mockResolvedValueOnce({ data: null, error: null });
    await act(async () => { await expect(result.current.saveCourse({ ...course, title: "Stale draft" })).rejects.toThrow("изменён другим редактором"); });
    expect(versionFilter).toHaveBeenCalledWith("updated_at", course.updatedAt);
    expect(result.current.courses[0].title).toBe(course.title);
  });
  it("returns the saved version for subsequent edits", async () => {
    const { course, versionFilter } = setup();
    const { result } = renderHook(useCourses, { wrapper: CourseProvider });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      const saved = await result.current.saveCourse(course);
      expect(Date.parse(saved.updatedAt)).toBeGreaterThan(Date.parse(course.updatedAt));
      await result.current.saveCourse({ ...saved, title: "Next edit" });
      expect(versionFilter).toHaveBeenLastCalledWith("updated_at", saved.updatedAt);
    });
    expect(result.current.courses[0].title).toBe("Next edit");
  });
  it("rejects overlapping saves of the same course and releases the lock", async () => {
    const { course, upsert } = setup();
    const { result } = renderHook(useCourses, { wrapper: CourseProvider });
    await waitFor(() => expect(result.current.loading).toBe(false));
    let finish!: (value: unknown) => void;
    upsert.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    await act(async () => {
      const first = result.current.saveCourse(course);
      await expect(result.current.saveCourse(course)).rejects.toThrow("уже сохраняется");
      finish({ data: null, error: { message: "offline" } });
      await expect(first).rejects.toThrow("не сохранён");
      await result.current.saveCourse(course);
    });
    expect(upsert).toHaveBeenCalledTimes(2);
  });
  it("inserts a new course without an overwrite-capable upsert", async () => {
    const { insert, update } = setup();
    const { result } = renderHook(useCourses, { wrapper: CourseProvider });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.saveCourse(blankCourse("New")); });
    expect(insert).toHaveBeenCalledOnce();
    expect(update).not.toHaveBeenCalled();
  });
  it("restores pending completion after the page is reopened", async () => {
    const { course, progressWrite } = setup();
    localStorage.setItem("lingvaedu-pending-progress-admin", JSON.stringify([{ userId: "admin", courseId: course.id, lessonId: "lesson", status: "completed", progress: 100, completedAt: new Date().toISOString(), lastOpenedAt: new Date().toISOString() }]));
    const { result } = renderHook(useCourses, { wrapper: CourseProvider });
    await waitFor(() => expect(result.current.progressLoading).toBe(false));
    await waitFor(() => expect(progressWrite).toHaveBeenCalledTimes(1));
    expect(result.current.progress[0].status).toBe("completed");
    expect(JSON.parse(localStorage.getItem("lingvaedu-pending-progress-admin") || "null")).toEqual([]);
  });
  it("rejects course writes from a student", async () => {
    const { course, upsert } = setup();
    mock.canEdit = false;
    const { result } = renderHook(useCourses, { wrapper: CourseProvider });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await expect(result.current.saveCourse(course)).rejects.toThrow("Недостаточно прав");
    expect(upsert).not.toHaveBeenCalled();
  });
  it("does not expose local course data when cloud access fails", async () => {
    setup(true);
    localStorage.setItem("lingvaedu-courses-v1", JSON.stringify([blankCourse("Another account")]));
    const { result } = renderHook(useCourses, { wrapper: CourseProvider });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.courses).toEqual([]);
    expect(result.current.loadError).not.toBe("");
    expect(result.current.storage).toBe("cloud");
  });
  it("rejects a failed save and keeps the previous saved course", async () => {
    const { course, upsert } = setup();
    const { result } = renderHook(useCourses, { wrapper: CourseProvider });
    await waitFor(() => expect(result.current.loading).toBe(false));
    upsert.mockResolvedValue({ error: { message: "RLS denied" } });
    await act(async () => { await expect(result.current.saveCourse({ ...course, title: "Unsaved" })).rejects.toThrow("не сохранён"); });
    expect(result.current.courses[0].title).toBe(course.title);
    expect(result.current.storage).toBe("cloud");
  });
  it("keeps the course visible after a failed delete", async () => {
    const { course, remove } = setup();
    const { result } = renderHook(useCourses, { wrapper: CourseProvider });
    await waitFor(() => expect(result.current.loading).toBe(false));
    remove.mockResolvedValue({ error: { message: "offline" } });
    await act(async () => { await expect(result.current.removeCourse(course.id)).rejects.toThrow(); });
    expect(result.current.courses).toHaveLength(1);
  });
  it("preserves authorship when another editor saves the course", async () => {
    const { course, upsert } = setup();
    const { result } = renderHook(useCourses, { wrapper: CourseProvider });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.saveCourse({ ...course, title: "Updated" }); });
    expect(upsert.mock.calls[0][0].author_id).toBe("original-author");
    expect(result.current.courses[0].title).toBe("Updated");
    expect(result.current.loadError).toBe("");
  });
  it("keeps both concurrent course saves", async () => {
    setup();
    const { result } = renderHook(useCourses, { wrapper: CourseProvider });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await Promise.all([result.current.saveCourse(blankCourse("One")), result.current.saveCourse(blankCourse("Two"))]); });
    expect(result.current.courses).toHaveLength(3);
  });
  it("retries unsynced lesson completion without losing it", async () => {
    const { course, progressWrite } = setup();
    const { result } = renderHook(useCourses, { wrapper: CourseProvider });
    await waitFor(() => expect(result.current.progressLoading).toBe(false));
    progressWrite.mockResolvedValueOnce({ error: { message: "offline" } });
    await act(async () => { await result.current.saveLessonProgress({ courseId: course.id, lessonId: "lesson", status: "completed" }); });
    expect(result.current.progressError).not.toBe("");
    expect(result.current.progress[0].status).toBe("completed");
    await act(async () => { await result.current.retryProgress(); });
    expect(progressWrite).toHaveBeenCalledTimes(2);
    expect(progressWrite.mock.calls[1][0].progress).toBe(100);
    expect(result.current.progressError).toBe("");
  });
});
