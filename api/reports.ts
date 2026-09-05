import { createClient } from "@supabase/supabase-js";
import { readAllRows } from "../server/readAllRows";
import { reportMetrics } from "../server/reportMetrics";

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export default {
  async fetch(request: Request) {
    if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
    const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return json({ error: "Требуется авторизация" }, 401);
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return json({ error: "Отчёты пока не подключены. Обратитесь к администратору." }, 503);
    try {
      const service = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
      const caller = await service.auth.getUser(token);
      if (caller.error || !caller.data.user) return json({ error: "Сессия истекла" }, 401);
      if (caller.data.user.app_metadata?.role !== "admin") return json({ error: "Недостаточно прав" }, 403);
      const [courses, enrollments, progress] = await Promise.all([
        readAllRows((from, to) => service.from("courses").select("id,title,status,content").order("id").range(from, to)),
        readAllRows((from, to) => service.from("course_enrollments").select("course_id,user_id").order("course_id").order("user_id").range(from, to)),
        readAllRows((from, to) => service.from("course_lesson_progress").select("course_id,user_id,lesson_id,status").order("course_id").order("user_id").order("lesson_id").range(from, to)),
      ]);
      return json({ ...reportMetrics(courses, enrollments, progress), updatedAt: new Date().toISOString() });
    } catch {
      return json({ error: "Не удалось сформировать отчёт. Попробуйте снова." }, 502);
    }
  },
};
