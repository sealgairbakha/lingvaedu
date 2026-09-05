import type { CourseLessonProgress } from "./CourseProvider";

export type LessonProgressInput = Pick<CourseLessonProgress, "courseId" | "lessonId"> &
  Partial<Pick<CourseLessonProgress, "status" | "progress" | "completedAt" | "lastOpenedAt">>;

export function mergeLessonProgress(userId: string, value: LessonProgressInput, existing?: CourseLessonProgress): CourseLessonProgress {
  const now = new Date().toISOString();
  const completed = value.status === "completed" || (existing?.status === "completed" && value.status !== "not_started");
  const requestedProgress = value.progress ?? existing?.progress ?? 0;
  return {
    userId,
    courseId: value.courseId,
    lessonId: value.lessonId,
    status: completed ? "completed" : value.status || existing?.status || "in_progress",
    progress: completed ? 100 : Number.isFinite(requestedProgress) ? Math.min(100, Math.max(0, requestedProgress)) : 0,
    completedAt: completed ? value.completedAt || existing?.completedAt || now : null,
    lastOpenedAt: value.lastOpenedAt || now,
  };
}
