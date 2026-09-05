import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../auth/AuthProvider";
import { isSupabaseConfigured, supabase } from "../../lib/supabase";
import { blankCourse, type Course } from "./types";
import { mergeLessonProgress, type LessonProgressInput } from "./lessonProgress";

type Store = {
  courses: Course[]; loading: boolean; storage: "cloud" | "local"; enrolledCourseIds: string[];
  progress: CourseLessonProgress[]; progressLoading: boolean;
  loadError: string; progressError: string; reload: () => void; retryProgress: () => Promise<void>;
  createCourse: () => Course; saveCourse: (course: Course) => Promise<Course>;
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
const Context = createContext<Store | null>(null);
const KEY = "lingvaedu-courses-v1";
const progressKey = (userId: string) => `lingvaedu-course-progress-${userId}`;
const pendingProgressKey = (userId: string) => `lingvaedu-pending-progress-${userId}`;

const readLocal = (): Course[] => {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(stored) ? stored.filter((course): course is Course => course && typeof course.id === "string" && typeof course.title === "string" && Array.isArray(course.modules)) : [];
  } catch { return []; }
};

const readProgressBackup = (key: string, userId: string): CourseLessonProgress[] => {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(stored) ? stored.filter((row): row is CourseLessonProgress => row && row.userId === userId && typeof row.courseId === "string" && typeof row.lessonId === "string" && ["not_started", "in_progress", "completed"].includes(row.status) && Number.isFinite(row.progress) && typeof row.lastOpenedAt === "string" && (row.completedAt === null || typeof row.completedAt === "string")) : [];
  } catch { return []; }
};

export function CourseProvider({ children }: { children: React.ReactNode }) {
  const { displayName, avatarUrl, user, canEditCourses } = useAuth();
  const userId = user?.id;
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<CourseLessonProgress[]>([]);
  const [progressLoading, setProgressLoading] = useState(true);
  const [storage, setStorage] = useState<"cloud" | "local">(isSupabaseConfigured ? "cloud" : "local");
  const [loadError, setLoadError] = useState("");
  const [progressError, setProgressError] = useState("");
  const [reloadVersion, setReloadVersion] = useState(0);
  const [progressReloadVersion, setProgressReloadVersion] = useState(0);
  const reload = useCallback(() => setReloadVersion((version) => version + 1), []);
  const progressRef = useRef<CourseLessonProgress[]>([]);
  const progressRevision = useRef(0);
  const progressEditVersions = useRef(new Map<string, number>());
  const persistedCourseIds = useRef(new Set<string>());
  const savingCourseIds = useRef(new Set<string>());
  const [initialPending] = useState(() => {
    const entries = readProgressBackup(pendingProgressKey(userId || ""), userId || "");
    return new Map(entries.map((row) => [`${row.courseId}:${row.lessonId}`, row]));
  });
  const pendingProgress = useRef(initialPending);
  const persistPending = useCallback(() => {
    if (!userId) return;
    try { localStorage.setItem(pendingProgressKey(userId), JSON.stringify([...pendingProgress.current.values()])); }
    catch { console.warn("Pending progress backup is unavailable"); }
  }, [userId]);
  const flushingProgress = useRef(false);
  const retryProgress = useCallback(async () => {
    if (!supabase || flushingProgress.current) return;
    if (!pendingProgress.current.size) { setProgressReloadVersion((version) => version + 1); return; }
    flushingProgress.current = true;
    try {
      while (pendingProgress.current.size) {
        const [key, next] = pendingProgress.current.entries().next().value!;
        const { error } = await supabase.from("course_lesson_progress").upsert({
          user_id: next.userId, course_id: next.courseId, lesson_id: next.lessonId,
          status: next.status, progress: next.progress, completed_at: next.completedAt,
          last_opened_at: next.lastOpenedAt,
        }, { onConflict: "user_id,course_id,lesson_id" });
        if (error) throw error;
        if (pendingProgress.current.get(key) === next) pendingProgress.current.delete(key);
        persistPending();
      }
      setProgressError("");
    } catch {
      setProgressError("Прогресс ещё не синхронизирован. Восстановите связь и нажмите «Повторить». Оставьте страницу открытой.");
    } finally { flushingProgress.current = false; }
  }, [persistPending]);
  useEffect(() => {
    const retry = () => { void retryProgress(); };
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, [retryProgress]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setLoadError("");
      try {
      if (supabase) {
        const { data, error } = await supabase.from("courses").select("content,author_id,updated_at").order("updated_at", { ascending: false });
        if (!error && active) {
          const { data: enrollments } = await supabase.from("course_enrollments").select("course_id");
          if (!active) return;
          const counts = new Map<string, number>();
          for (const row of enrollments || []) counts.set(row.course_id, (counts.get(row.course_id) || 0) + 1);
          const visibleCourses = (data || []).map((x) => {
            const course = x.content as Course;
            persistedCourseIds.current.add(course.id);
            return { ...course, updatedAt: x.updated_at || course.updatedAt, authorId: x.author_id || course.authorId || undefined, students: enrollments ? counts.get(course.id) || 0 : course.students };
          });
          setEnrolledCourseIds(canEditCourses ? [] : visibleCourses.map((course) => course.id));
          setCourses(visibleCourses);
          setStorage("cloud");
          setLoading(false);
          return;
        }
        // Never expose a cache that may belong to another account when the
        // protected cloud query fails in a configured environment.
        if (isSupabaseConfigured && active) {
          setCourses([]);
          setEnrolledCourseIds([]);
          setStorage("cloud");
          setLoadError("Не удалось загрузить курсы. Проверьте подключение и попробуйте снова.");
          setLoading(false);
          return;
        }
      }
      if (active) { setCourses(readLocal()); setStorage("local"); setLoading(false); }
      } catch {
        if (active) {
          setLoadError("Не удалось загрузить курсы. Проверьте подключение и попробуйте снова.");
          setLoading(false);
        }
      }
    })();
    return () => { active = false; };
  }, [canEditCourses, user?.id, reloadVersion]);

  useEffect(() => {
    let active = true;
    if (!userId) {
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
    const restoreBackup = () => {
      if (!active) return;
      const backup = new Map(readProgressBackup(progressKey(userId), userId).map((row) => [`${row.courseId}:${row.lessonId}`, row]));
      for (const [key, row] of pendingProgress.current) backup.set(key, row);
      progressRef.current = [...backup.values()];
      setProgress(progressRef.current);
    };
    const load = async () => {
      const requestRevision = progressRevision.current;
      setProgressLoading(true);
      try {
      if (supabase) {
        const { data, error } = await supabase
          .from("course_lesson_progress")
          .select("user_id,course_id,lesson_id,status,progress,completed_at,last_opened_at")
          .eq("user_id", userId)
          .order("last_opened_at", { ascending: false });
        if (!error && active) {
          const loaded = (data || []).map((row) => ({
            userId: row.user_id,
            courseId: row.course_id,
            lessonId: row.lesson_id,
            status: row.status as CourseLessonProgress["status"],
            progress: row.progress,
            completedAt: row.completed_at,
            lastOpenedAt: row.last_opened_at,
          }));
          const merged = new Map(loaded.map((row) => [`${row.courseId}:${row.lessonId}`, row]));
          for (const [key, row] of pendingProgress.current) merged.set(key, row);
          // A slow read may finish after a newly completed lesson was synced.
          // Preserve edits made since this request began, even if the queue is empty.
          for (const row of progressRef.current) {
            const key = `${row.courseId}:${row.lessonId}`;
            if ((progressEditVersions.current.get(key) || 0) > requestRevision) merged.set(key, row);
          }
          progressRef.current = [...merged.values()];
          setProgress(progressRef.current);
          try { localStorage.setItem(progressKey(userId), JSON.stringify(progressRef.current)); }
          catch { console.warn("Local progress backup is unavailable"); }
          if (pendingProgress.current.size) void retryProgress();
          else setProgressError("");
          setProgressLoading(false);
          return;
        }
        if (error && active) setProgressError("Не удалось загрузить прогресс с сервера. Показана резервная копия с этого устройства.");
      }
      restoreBackup();
      if (active) setProgressLoading(false);
      } catch {
        if (active) {
          restoreBackup();
          setProgressError("Не удалось загрузить прогресс. Показана резервная копия с этого устройства.");
          setProgressLoading(false);
        }
      }
    };
    void load();
    return () => { active = false; };
  }, [userId, progressReloadVersion, retryProgress]);

  const cache = useCallback((change: (current: Course[]) => Course[]) => {
    setCourses((current) => change(current));
  }, []);
  useEffect(() => {
    if (isSupabaseConfigured || loading) return;
    try { localStorage.setItem(KEY, JSON.stringify(courses)); }
    catch { console.warn("Local course storage is unavailable"); }
  }, [courses, loading]);
  const createCourse = useCallback(() => {
    const course = blankCourse(displayName, user?.id, avatarUrl);
    if (!canEditCourses) throw new Error("Недостаточно прав для создания курса");
    cache((current) => [course, ...current]);
    return course;
  }, [avatarUrl, cache, canEditCourses, displayName, user?.id]);
  const saveCourse = useCallback(async (value: Course) => {
    if (!canEditCourses) throw new Error("Недостаточно прав для сохранения курса");
    if (savingCourseIds.current.has(value.id)) throw new Error("Курс уже сохраняется. Дождитесь завершения и повторите попытку.");
    savingCourseIds.current.add(value.id);
    // Advance even when two saves share a millisecond or the device clock lags.
    const updatedAt = new Date(Math.max(Date.now(), (Date.parse(value.updatedAt) || 0) + 1)).toISOString();
    const course = { ...value, authorId: value.authorId || user?.id, author: value.author || displayName, mentor: value.mentor || displayName, mentorAvatar: value.mentorAvatar || avatarUrl, updatedAt };
    try {
    if (supabase && isSupabaseConfigured) {
      const payload = { id: course.id, title: course.title, status: course.status, language: course.language, author_id: course.authorId, content: course, updated_at: course.updatedAt };
      if (persistedCourseIds.current.has(course.id)) {
        // Compare with the editor's original version, never the latest cache:
        // refreshing the course list must not permit a stale draft to overwrite it.
        const { data, error } = await supabase.from("courses").update(payload)
          .eq("id", course.id).eq("updated_at", value.updatedAt).select("id,updated_at").maybeSingle();
        if (error) throw new Error("Курс не сохранён на сервере. Проверьте подключение и повторите сохранение.");
        if (!data) throw new Error("Курс изменён другим редактором, удалён или больше недоступен. Ваши правки остались на странице. Скопируйте их перед обновлением страницы, затем откройте актуальную версию курса.");
        course.updatedAt = data.updated_at;
      } else {
        const { data, error } = await supabase.from("courses").insert(payload).select("id,updated_at").single();
        if (error || !data) throw new Error("Курс не сохранён на сервере. Проверьте подключение и повторите сохранение.");
        course.updatedAt = data.updated_at;
      }
      persistedCourseIds.current.add(course.id);
      setStorage("cloud");
    }
    cache((current) => [course, ...current.filter((x) => x.id !== course.id)]);
    return course;
    } finally { savingCourseIds.current.delete(value.id); }
  }, [avatarUrl, cache, canEditCourses, displayName, user?.id]);
  const removeCourse = useCallback(async (id: string) => {
    if (!canEditCourses) throw new Error("Недостаточно прав для удаления курса");
    if (supabase && isSupabaseConfigured) {
      const { error } = await supabase.from("courses").delete().eq("id", id);
      if (error) throw new Error("Не удалось удалить курс. Попробуйте снова.");
    }
    cache((current) => current.filter((x) => x.id !== id));
  }, [cache, canEditCourses]);
  const duplicateCourse = useCallback(async (id: string) => {
    const source = courses.find((x) => x.id === id); if (!source) return;
    const copy = { ...structuredClone(source), id: crypto.randomUUID(), title: `${source.title} — копия`, authorId: user?.id, author: displayName, mentor: displayName, mentorAvatar: avatarUrl, status: "draft" as const, students: 0 };
    await saveCourse(copy);
  }, [avatarUrl, courses, displayName, saveCourse, user?.id]);
  const saveLessonProgress = useCallback(async (value: LessonProgressInput) => {
    if (!user) return;
    const existing = progressRef.current.find(
      (item) => item.courseId === value.courseId && item.lessonId === value.lessonId,
    );
    const next = mergeLessonProgress(user.id, value, existing);
    progressEditVersions.current.set(`${next.courseId}:${next.lessonId}`, ++progressRevision.current);
    const nextProgress = [
      next,
      ...progressRef.current.filter(
        (item) => item.courseId !== next.courseId || item.lessonId !== next.lessonId,
      ),
    ];
    progressRef.current = nextProgress;
    setProgress(nextProgress);
    try { localStorage.setItem(progressKey(user.id), JSON.stringify(nextProgress)); }
    catch { console.warn("Local progress backup is unavailable"); }
    if (supabase) {
      pendingProgress.current.set(`${next.courseId}:${next.lessonId}`, next);
      persistPending();
      await retryProgress();
    }
  }, [user, retryProgress, persistPending]);
  const value = useMemo(() => ({ courses, loading, storage, enrolledCourseIds, progress, progressLoading, loadError, progressError, reload, retryProgress, createCourse, saveCourse, removeCourse, duplicateCourse, saveLessonProgress }), [courses, loading, storage, enrolledCourseIds, progress, progressLoading, loadError, progressError, reload, retryProgress, createCourse, saveCourse, removeCourse, duplicateCourse, saveLessonProgress]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCourses() { const value = useContext(Context); if (!value) throw new Error("useCourses must be used inside CourseProvider"); return value; }
