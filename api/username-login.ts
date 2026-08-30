import { createClient } from "@supabase/supabase-js";

const json = (body: Record<string, unknown>, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export default {
  async fetch(request: Request) {
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) return json({ error: "Авторизация не настроена" }, 503);

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return json({ error: "Некорректный запрос" }, 400);
    }

    const username = String(body.username || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!/^[a-z0-9._-]{3,32}$/.test(username) || !password)
      return json({ error: "Неверное имя пользователя или пароль" }, 400);

    const service = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const profile = await service
      .from("user_profiles")
      .select("user_id")
      .eq("username", username)
      .maybeSingle();

    let email = "";
    if (profile.data?.user_id) {
      const userResult = await service.auth.admin.getUserById(profile.data.user_id);
      email = userResult.data.user?.email || "";
    } else {
      // Username metadata is the source of truth for accounts created before
      // the user_profiles migration was applied.
      for (let page = 1; page <= 20 && !email; page += 1) {
        const usersResult = await service.auth.admin.listUsers({ page, perPage: 1000 });
        if (usersResult.error) break;
        const matched = usersResult.data.users.find(
          (user) => String(user.user_metadata?.username || "").toLowerCase() === username,
        );
        email = matched?.email || "";
        if (usersResult.data.users.length < 1000) break;
      }
    }

    if (!email)
      return json({ error: "Неверное имя пользователя или пароль" }, 401);

    const signedIn = await service.auth.signInWithPassword({ email, password });
    if (signedIn.error || !signedIn.data.session)
      return json({ error: "Неверное имя пользователя или пароль" }, 401);

    return json({
      accessToken: signedIn.data.session.access_token,
      refreshToken: signedIn.data.session.refresh_token,
    });
  },
};
