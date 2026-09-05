import { describe, expect, it } from "vitest";
import { mergeLessonProgress } from "../src/features/courses/lessonProgress";

describe("lesson progress", () => {
  it("does not undo completion when the lesson is opened again", () => {
    const completed = mergeLessonProgress("student", { courseId: "course", lessonId: "lesson", status: "completed" });
    const reopened = mergeLessonProgress("student", { courseId: "course", lessonId: "lesson", status: "in_progress", progress: 1 }, completed);
    expect(reopened.status).toBe("completed");
    expect(reopened.progress).toBe(100);
    expect(reopened.completedAt).toBe(completed.completedAt);
  });
  it.each([-10, 150, NaN, Infinity])("bounds invalid progress %s", (progress) => {
    const result = mergeLessonProgress("student", { courseId: "course", lessonId: "lesson", progress });
    expect(result.progress).toBeGreaterThanOrEqual(0);
    expect(result.progress).toBeLessThanOrEqual(100);
  });
  it("supports an explicit reset", () => {
    const existing = mergeLessonProgress("student", { courseId: "course", lessonId: "lesson", status: "completed" });
    const reset = mergeLessonProgress("student", { courseId: "course", lessonId: "lesson", status: "not_started", progress: 0 }, existing);
    expect(reset.status).toBe("not_started");
    expect(reset.completedAt).toBeNull();
  });
});
