import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/AuthProvider";
import { isSupabaseConfigured, supabase } from "../../lib/supabase";
import { blankCourse, type Course } from "./types";

type Store = {
  courses: Course[]; loading: boolean; storage: "cloud" | "local"; enrolledCourseIds: string[];
  progress: CourseLessonProgress[]; progressLoading: boolean;
  createCourse: () => Course; saveCourse: (course: Course) => Promise<void>;
  removeCourse: (id: string) => Promise<void>; duplicateCourse: (id: string) => Promise<void>;
  saveLessonProgress: (value: LessonProgressInput) => Promise<void>;
};
export type CourseLessonProgress = {
  userId: string;
  courseId: string;
  lessonId: string;
  status: "not_started" | "in_progress" | "completed";
  progress: number;
  completedAt: string | null;
  lastOpenedAt: string;
};
type LessonProgressInput = Pick<CourseLessonProgress, "courseId" | "lessonId"> &
  Partial<Pick<CourseLessonProgress, "status" | "progress" | "completedAt" | "lastOpenedAt">>;
const Context = createContext<Store | null>(null);
const KEY = "lingvaedu-courses-v1";
const progressKey = (userId: string) => `lingvaedu-course-progress-${userId}`;

const readLocal = (): Course[] => {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]") as Course[]; } catch { return []; }
};

export function CourseProvider({ children }: { children: React.ReactNode }) {
  const { displayName, avatarUrl, user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<CourseLessonProgress[]>([]);
  const [progressLoading, setProgressLoading] = useState(true);
  const [storage, setStorage] = useState<"cloud" | "local">("local");

  useEffect(() => {
    let active = true;
    (async () => {
      if (supabase) {
        const { data, error } = await supabase.from("courses").select("content,author_id").order("updated_at", { ascending: false });
        if (!error && active) { const {data:enrollments}=await supabase.from("course_enrollments").select("course_id");const counts=new Map<string,number>();for(const row of enrollments||[])counts.set(row.course_id,(counts.get(row.course_id)||0)+1);setEnrolledCourseIds([...(new Set((enrollments||[]).map((row)=>row.course_id)))]);setCourses((data || []).map((x) => {const course=x.content as Course;return {...course,authorId:course.authorId||x.author_id||undefined,students:enrollments?counts.get(course.id)||0:course.students};})); setStorage("cloud"); setLoading(false); return; }
      }
      if (active) { setCourses(readLocal()); setStorage("local"); setLoading(false); }
    })();
    return () => { active = false; };
  }, [user?.id]);

  useEffect(() => {
    let active = true;
    if (!user) {
      const timer = window.setTimeout(() => {
        if (active) {
          setProgress([]);
          setProgressLoading(false);
        }
      }, 0);
      return () => {
        active = false;
        window.clearTimeout(timer);
      };
    }
    const load = async () => {
      setProgressLoading(true);
      if (supabase) {
        const { data, error } = await supabase
          .from("course_lesson_progress")
          .select("user_id,course_id,lesson_id,status,progress,completed_at,last_opened_at")
          .eq("user_id", user.id)
          .order("last_opened_at", { ascending: false });
        if (!error && active) {
          setProgress((data || []).map((row) => ({
            userId: row.user_id,
            courseId: row.course_id,
            lessonId: row.lesson_id,
            status: row.status as CourseLessonProgress["status"],
            progress: row.progress,
            completedAt: row.completed_at,
            lastOpenedAt: row.last_opened_at,
          })));
          setProgressLoading(false);
          return;
        }
        if (error) console.error("Could not load course progress", error.message);
      }
      try {
        const stored = JSON.parse(localStorage.getItem(progressKey(user.id)) || "[]");
        if (active) setProgress(Array.isArray(stored) ? stored : []);
      } catch {
        if (active) setProgress([]);
      }
      if (active) setProgressLoading(false);
    };
    void load();
    return () => { active = false; };
  }, [user]);

  const cache = useCallback((next: Course[]) => { setCourses(next); localStorage.setItem(KEY, JSON.stringify(next)); }, []);
  const createCourse = useCallback(() => {
    const course = blankCourse(displayName, user?.id, avatarUrl);
    cache([course, ...courses]);
    return course;
  }, [avatarUrl, cache, courses, displayName, user?.id]);
  const saveCourse = useCallback(async (value: Course) => {
    const course = { ...value, authorId: value.authorId || user?.id, author: value.author || displayName, mentor: value.mentor || displayName, mentorAvatar: value.mentorAvatar || avatarUrl, updatedAt: new Date().toISOString() };
    cache([course, ...courses.filter((x) => x.id !== course.id)]);
    if (supabase && isSupabaseConfigured) {
      const { error } = await supabase.from("courses").upsert({ id: course.id, title: course.title, status: course.status, language: course.language, author_id: user?.id, content: course, updated_at: course.updatedAt });
      if (!error) setStorage("cloud"); else setStorage("local");
    }
  }, [avatarUrl, cache, courses, displayName, user?.id]);
  const removeCourse = useCallback(async (id: string) => {
    cache(courses.filter((x) => x.id !== id));
    if (supabase && storage === "cloud") await supabase.from("courses").delete().eq("id", id);
  }, [cache, courses, storage]);
  const duplicateCourse = useCallback(async (id: string) => {
    const source = courses.find((x) => x.id === id); if (!source) return;
    const copy = { ...structuredClone(source), id: crypto.randomUUID(), title: `${source.title} — копия`, status: "draft" as const, students: 0 };
    await saveCourse(copy);
  }, [courses, saveCourse]);
  const saveLessonProgress = useCallback(async (value: LessonProgressInput) => {
    if (!user) return;
    const now = new Date().toISOString();
    const existing = progress.find(
      (item) => item.courseId === value.courseId && item.lessonId === value.lessonId,
    );
    const next: CourseLessonProgress = {
      userId: user.id,
      courseId: value.courseId,
      lessonId: value.lessonId,
      status: value.status || existing?.status || "in_progress",
      progress: value.progress ?? existing?.progress ?? 0,
      completedAt: value.completedAt === undefined ? existing?.completedAt || null : value.completedAt,
      lastOpenedAt: value.lastOpenedAt || now,
    };
    const nextProgress = [
      next,
      ...progress.filter(
        (item) => item.courseId !== next.courseId || item.lessonId !== next.lessonId,
      ),
    ];
    setProgress(nextProgress);
    localStorage.setItem(progressKey(user.id), JSON.stringify(nextProgress));
    if (supabase) {
      const { error } = await supabase.from("course_lesson_progress").upsert({
        user_id: next.userId,
        course_id: next.courseId,
        lesson_id: next.lessonId,
        status: next.status,
        progress: next.progress,
        completed_at: next.completedAt,
        last_opened_at: next.lastOpenedAt,
      }, { onConflict: "user_id,course_id,lesson_id" });
      if (error) console.error("Could not save course progress", error.message);
    }
  }, [progress, user]);
  const value = useMemo(() => ({ courses, loading, storage, enrolledCourseIds, progress, progressLoading, createCourse, saveCourse, removeCourse, duplicateCourse, saveLessonProgress }), [courses, loading, storage, enrolledCourseIds, progress, progressLoading, createCourse, saveCourse, removeCourse, duplicateCourse, saveLessonProgress]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCourses() { const value = useContext(Context); if (!value) throw new Error("useCourses must be used inside CourseProvider"); return value; }
