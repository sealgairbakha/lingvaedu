import { supabase } from "../../lib/supabase";
import type { CourseLesson } from "../courses/types";

export type GuestCourse = {
  courseId: string;
  title: string;
  description: string;
  language: string;
  level: string;
  coverImage: string;
  lessonId: string;
  lessonTitle: string;
};

export type GuestTrial = {
  courseId: string;
  courseTitle: string;
  courseLanguage: string;
  lesson: CourseLesson;
};

export function parseGuestCourse(value: unknown): GuestCourse | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.course_id !== "string" || typeof row.course_title !== "string" ||
      typeof row.lesson_id !== "string" || typeof row.lesson_title !== "string") return null;
  return {
    courseId: row.course_id,
    title: row.course_title,
    description: typeof row.course_description === "string" ? row.course_description : "",
    language: typeof row.course_language === "string" ? row.course_language : "",
    level: typeof row.course_level === "string" ? row.course_level : "",
    coverImage: typeof row.course_cover_image === "string" ? row.course_cover_image : "",
    lessonId: row.lesson_id,
    lessonTitle: row.lesson_title,
  };
}

export function parseGuestTrial(value: unknown): GuestTrial | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const lesson = row.lesson;
  if (typeof row.courseId !== "string" || typeof row.courseTitle !== "string" ||
      typeof row.courseLanguage !== "string" || !lesson || typeof lesson !== "object") return null;
  const typedLesson = lesson as Record<string, unknown>;
  if (typeof typedLesson.id !== "string" || typeof typedLesson.title !== "string" ||
      !Array.isArray(typedLesson.blocks)) return null;
  return {
    courseId: row.courseId,
    courseTitle: row.courseTitle,
    courseLanguage: row.courseLanguage,
    lesson: typedLesson as CourseLesson,
  };
}

export async function loadGuestCourses(): Promise<GuestCourse[]> {
  if (!supabase) throw new Error("Каталог пока недоступен: подключение к курсам не настроено.");
  const { data, error } = await supabase.rpc("guest_trial_catalog");
  if (error) throw new Error("Не удалось загрузить пробные уроки. Попробуйте ещё раз.");
  if (!Array.isArray(data)) throw new Error("Каталог вернул неожиданный ответ.");
  return data.map(parseGuestCourse).filter((course): course is GuestCourse => course !== null);
}

export async function loadGuestTrial(courseId: string): Promise<GuestTrial> {
  if (!supabase) throw new Error("Пробный урок пока недоступен: подключение к курсам не настроено.");
  const { data, error } = await supabase.rpc("guest_trial_lesson", { target_course_id: courseId });
  if (error) throw new Error("Не удалось открыть пробный урок. Попробуйте ещё раз.");
  const trial = parseGuestTrial(data);
  if (!trial) throw new Error("Пробный урок не найден или курс больше не опубликован.");
  return trial;
}
