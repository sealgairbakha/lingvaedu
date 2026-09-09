import type { CourseLessonProgress } from "./CourseProvider";
import type { Course } from "./types";

export const courseLessons = (course: Course) => course.modules.flatMap((module) => module.lessons);

export function getCourseProgress(course: Course, progress: CourseLessonProgress[]) {
  const lessons = courseLessons(course);
  const lessonIds = new Set(lessons.map((lesson) => lesson.id));
  const entries = progress.filter((item) => item.courseId === course.id && lessonIds.has(item.lessonId));
  const completed = new Set(entries.filter((item) => item.status === "completed").map((item) => item.lessonId)).size;
  const last = [...entries].sort((a, b) => Date.parse(b.lastOpenedAt) - Date.parse(a.lastOpenedAt))[0];
  const lastLesson = lessons.find((lesson) => lesson.id === last?.lessonId) || lessons[0];
  const percent = lessons.length ? Math.round((completed / lessons.length) * 100) : 0;
  const remainingMinutes = lessons.filter((lesson) => !entries.some((item) => item.lessonId === lesson.id && item.status === "completed")).reduce((sum, lesson) => sum + (lesson.estimatedMinutes || 0), 0);
  return { lessons, completed, last, lastLesson, percent, remainingMinutes };
}
