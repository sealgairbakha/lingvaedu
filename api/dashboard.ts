import { createClient } from "@supabase/supabase-js";

type UserRole = "admin" | "staff" | "student";

const json = (body: Record<string, unknown>, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

function configuration() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url, key } : null;
}

function bearer(request: Request) {
  const value = request.headers.get("authorization") || "";
  return value.startsWith("Bearer ") ? value.slice(7) : "";
}

function roleOf(value: unknown): UserRole {
  return value === "admin" || value === "staff" ? value : "student";
}

export default {
  async fetch(request: Request) {
    if (request.method !== "GET") return json({ error: "Метод не поддерживается" }, 405);
    const config = configuration();
    if (!config) return json({ error: "Серверная статистика не настроена" }, 503);

    const service = createClient(config.url, config.key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const token = bearer(request);
    if (!token) return json({ error: "Требуется авторизация" }, 401);
    const callerResult = await service.auth.getUser(token);
    const caller = callerResult.data.user;
    if (callerResult.error || !caller) return json({ error: "Сессия истекла" }, 401);
    if (!(roleOf(caller.app_metadata?.role) === "admin" || roleOf(caller.app_metadata?.role) === "staff"))
      return json({ error: "Недостаточно прав" }, 403);

    const [usersResult, groupsResult, enrollmentsResult] = await Promise.all([
      service.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      service.from("learning_groups").select("id", { count: "exact", head: true }),
      service.from("course_enrollments").select("course_id", { count: "exact", head: true }),
    ]);
    if (usersResult.error) return json({ error: usersResult.error.message }, 502);

    const now = Date.now();
    const activeWindow = 30 * 24 * 60 * 60 * 1000;
    const students = usersResult.data.users.filter((user) => roleOf(user.app_metadata?.role) === "student");
    const activeUsers30d = students.filter((user) => user.last_sign_in_at && now - new Date(user.last_sign_in_at).getTime() <= activeWindow).length;

    return json({
      stats: {
        studentCount: students.length,
        activeUsers30d,
        groupCount: groupsResult.error ? 0 : groupsResult.count || 0,
        enrollmentCount: enrollmentsResult.error ? 0 : enrollmentsResult.count || 0,
      },
    });
  },
};
