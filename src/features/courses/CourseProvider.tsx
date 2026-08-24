import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/AuthProvider";
import { isSupabaseConfigured, supabase } from "../../lib/supabase";
import { blankCourse, type Course } from "./types";

type Store = {
  courses: Course[]; loading: boolean; storage: "cloud" | "local"; enrolledCourseIds: string[];
  createCourse: () => Course; saveCourse: (course: Course) => Promise<void>;
  removeCourse: (id: string) => Promise<void>; duplicateCourse: (id: string) => Promise<void>;
};
const Context = createContext<Store | null>(null);
const KEY = "lingvaedu-courses-v1";

const readLocal = (): Course[] => {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]") as Course[]; } catch { return []; }
};

export function CourseProvider({ children }: { children: React.ReactNode }) {
  const { displayName, avatarUrl, user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
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
  const value = useMemo(() => ({ courses, loading, storage, enrolledCourseIds, createCourse, saveCourse, removeCourse, duplicateCourse }), [courses, loading, storage, enrolledCourseIds, createCourse, saveCourse, removeCourse, duplicateCourse]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCourses() { const value = useContext(Context); if (!value) throw new Error("useCourses must be used inside CourseProvider"); return value; }
