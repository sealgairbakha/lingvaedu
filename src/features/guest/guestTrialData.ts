import { supabase } from "../../lib/supabase";
import type { CourseLesson, LessonPattern } from "../courses/types";

export type GuestCourse = {
  courseId: string;
  title: string;
  description: string;
  language: string;
  level: string;
  coverImage: string;
  lessonId: string;
  lessonTitle: string;
  selfPacedPriceKzt: number | null;
  withTeacherPriceKzt: number | null;
  code: string;
  color: string;
  coverStyle: "orbit" | "grid" | "waves";
  showNewRibbon?: boolean;
};

export type StudentCategory = "free" | "self-paced" | "with-teacher";

export function courseMatchesCategory(course: GuestCourse, category: StudentCategory): boolean {
  if (category === "self-paced") return course.selfPacedPriceKzt !== null;
  if (category === "with-teacher") return course.withTeacherPriceKzt !== null;
  return true;
}

export type GuestTrial = {
  courseId: string;
  courseTitle: string;
  courseLanguage: string;
  moduleTitle: string;
  lessonPattern: LessonPattern;
  lessonCount: number;
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
    selfPacedPriceKzt: typeof row.self_paced_price_kzt === "number" && row.self_paced_price_kzt >= 30000 ? row.self_paced_price_kzt : null,
    withTeacherPriceKzt: typeof row.with_teacher_price_kzt === "number" && row.with_teacher_price_kzt >= 50000 ? row.with_teacher_price_kzt : null,
    code: typeof row.course_code === "string" ? row.course_code : "",
    color: typeof row.course_color === "string" && ["purple", "blue", "green", "orange", "pink", "dark"].includes(row.course_color) ? row.course_color : "purple",
    coverStyle: row.course_cover_style === "grid" || row.course_cover_style === "waves" ? row.course_cover_style : "orbit",
    showNewRibbon: typeof row.course_show_new_ribbon === "boolean" ? row.course_show_new_ribbon : undefined,
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
    moduleTitle: typeof row.moduleTitle === "string" ? row.moduleTitle : "Первый модуль",
    lessonPattern: row.lessonPattern === "none" || row.lessonPattern === "dinosaurs" || row.lessonPattern === "cars" ? row.lessonPattern : "space",
    lessonCount: typeof row.lessonCount === "number" && Number.isInteger(row.lessonCount) && row.lessonCount > 0 ? row.lessonCount : 1,
    lesson: typedLesson as CourseLesson,
  };
}

export async function loadGuestCourses(category: StudentCategory = "free"): Promise<GuestCourse[]> {
  if (!supabase) throw new Error("Каталог пока недоступен: подключение к курсам не настроено.");
  let { data, error } = await supabase.rpc("guest_course_catalog_visuals");
  if (error?.code === "PGRST202") {
    ({ data, error } = await supabase.rpc("guest_course_catalog"));
  }
  if (error?.code === "PGRST202" && category === "free") {
    ({ data, error } = await supabase.rpc("guest_trial_catalog"));
  }
  if (error?.code === "PGRST202") throw new Error("Каталог платных курсов пока недоступен. Попробуйте позже.");
  if (error) throw new Error("Не удалось загрузить пробные уроки. Попробуйте ещё раз.");
  if (!Array.isArray(data)) throw new Error("Каталог вернул неожиданный ответ.");
  return data.map(parseGuestCourse).filter((course): course is GuestCourse => course !== null).filter((course) => courseMatchesCategory(course, category));
}

export async function loadGuestTrial(courseId: string): Promise<GuestTrial> {
  if (!supabase) throw new Error("Пробный урок пока недоступен: подключение к курсам не настроено.");
  const { data, error } = await supabase.rpc("guest_trial_lesson", { target_course_id: courseId });
  if (error) throw new Error("Не удалось открыть пробный урок. Попробуйте ещё раз.");
  const trial = parseGuestTrial(data);
  if (!trial) throw new Error("Пробный урок не найден или курс больше не опубликован.");
  return trial;
}
