import { createClient, type User } from "@supabase/supabase-js";

type Role = "admin" | "staff" | "student";
type UserStatus = "active" | "invited" | "blocked";

const json = (body: Record<string, unknown>, status = 200) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });

function getConfiguration() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return { url, serviceKey };
}

function readRole(value: unknown): Role {
  return value === "admin" || value === "staff" ? value : "student";
}

function readStatus(user: User): UserStatus {
  if (user.banned_until && new Date(user.banned_until).getTime() > Date.now())
    return "blocked";
  return user.email_confirmed_at ? "active" : "invited";
}

function readUsername(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function validUsername(value: string) {
  return /^[a-z0-9._-]{3,32}$/.test(value);
}

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  return authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
}

async function parseBody(request: Request) {
  try {
    const body: unknown = await request.json();
    return body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

export default {
  async fetch(request: Request) {
    const configuration = getConfiguration();
    if (!configuration)
      return json(
        { error: "Серверное управление пользователями ещё не настроено" },
        503,
      );

    const service = createClient(configuration.url, configuration.serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const token = bearerToken(request);
    if (!token) return json({ error: "Требуется авторизация" }, 401);

    const { data: callerData, error: callerError } =
      await service.auth.getUser(token);
    const caller = callerData.user;
    if (callerError || !caller) return json({ error: "Сессия истекла" }, 401);
    if (caller.app_metadata?.role !== "admin")
      return json({ error: "Недостаточно прав" }, 403);

    if (request.method === "GET") {
      const [{ data, error }, enrollmentResult] = await Promise.all([
        service.auth.admin.listUsers({ page: 1, perPage: 1000 }),
        service.from("course_enrollments").select("user_id,course_id"),
      ]);
      if (error) return json({ error: error.message }, 502);

      const courseCounts = new Map<string, number>();
      if (!enrollmentResult.error) {
        for (const enrollment of enrollmentResult.data || []) {
          courseCounts.set(
            enrollment.user_id,
            (courseCounts.get(enrollment.user_id) || 0) + 1,
          );
        }
      }

      const users = data.users.map((user) => ({
        id: user.id,
        email: String(
          user.user_metadata?.contact_email ||
            (user.email?.endsWith("@no-email.lingvaedu.invalid") ? "" : user.email || ""),
        ),
        username: String(user.user_metadata?.username || user.email?.split("@")[0] || ""),
        fullName: String(
          user.user_metadata?.full_name ||
            user.email?.split("@")[0] ||
            "Пользователь",
        ),
        avatarUrl: String(user.user_metadata?.avatar_url || ""),
        group: String(user.user_metadata?.group_name || ""),
        role: readRole(user.app_metadata?.role),
        status: readStatus(user),
        createdAt: user.created_at,
        lastSignInAt: user.last_sign_in_at || null,
        courseCount: courseCounts.get(user.id) || 0,
        isCurrent: user.id === caller.id,
      }));
      return json({ users });
    }

    if (request.method === "POST") {
      const body = await parseBody(request);
      const email = String(body?.email || "")
        .trim()
        .toLowerCase();
      const fullName = String(body?.fullName || "").trim();
      const username = readUsername(body?.username);
      const password = String(body?.password || "");
      const group = String(body?.group || "").trim();
      const role = readRole(body?.role);
      if (!fullName || !username || !password)
        return json({ error: "Укажите имя, имя пользователя и пароль" }, 400);
      if (!validUsername(username))
        return json({ error: "Имя пользователя: 3–32 латинских символа, цифры, точка, дефис или подчёркивание" }, 400);
      if (password.length < 8)
        return json({ error: "Пароль должен содержать не менее 8 символов" }, 400);

      const existingUsers = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (existingUsers.error) return json({ error: existingUsers.error.message }, 502);
      if (existingUsers.data.users.some((user) =>
        readUsername(user.user_metadata?.username) === username
      )) return json({ error: "Имя пользователя уже занято" }, 409);

      const authEmail = email || `${crypto.randomUUID()}@no-email.lingvaedu.invalid`;
      const { data, error } = await service.auth.admin.createUser({
        email: authEmail,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          username,
          contact_email: email,
          group_name: group,
          must_change_password: true,
        },
        app_metadata: { role },
      });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true, userId: data.user?.id }, 201);
    }

    if (request.method === "PATCH") {
      const body = await parseBody(request);
      const id = String(body?.id || "");
      if (!id) return json({ error: "Пользователь не выбран" }, 400);
      const existingResult = await service.auth.admin.getUserById(id);
      const existing = existingResult.data.user;
      if (existingResult.error || !existing)
        return json({ error: "Пользователь не найден" }, 404);

      const role = readRole(body?.role ?? existing.app_metadata?.role);
      if (id === caller.id && role !== "admin")
        return json({ error: "Нельзя снять роль администратора с себя" }, 400);
      const status = String(body?.status || readStatus(existing));
      if (id === caller.id && status === "blocked")
        return json({ error: "Нельзя заблокировать собственный аккаунт" }, 400);

      const fullName = String(
        body?.fullName ?? existing.user_metadata?.full_name ?? "",
      ).trim();
      const username = readUsername(body?.username ?? existing.user_metadata?.username);
      if (!validUsername(username)) return json({ error: "Некорректное имя пользователя" }, 400);
      const usernameUsers = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (usernameUsers.error) return json({ error: usernameUsers.error.message }, 502);
      if (usernameUsers.data.users.some((user) =>
        user.id !== id && readUsername(user.user_metadata?.username) === username
      )) return json({ error: "Имя пользователя уже занято" }, 409);
      const group = String(
        body?.group ?? existing.user_metadata?.group_name ?? "",
      ).trim();
      const { error } = await service.auth.admin.updateUserById(id, {
        user_metadata: {
          ...existing.user_metadata,
          full_name: fullName,
          username,
          group_name: group,
        },
        app_metadata: { ...existing.app_metadata, role },
        ban_duration: status === "blocked" ? "876000h" : "none",
      });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (request.method === "DELETE") {
      const body = await parseBody(request);
      const id = String(body?.id || "");
      if (!id) return json({ error: "Пользователь не выбран" }, 400);
      if (id === caller.id)
        return json({ error: "Нельзя удалить собственный аккаунт" }, 400);
      const { error } = await service.auth.admin.deleteUser(id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: "Method not allowed" }, 405);
  },
};
