import { createClient } from "@supabase/supabase-js";

type DeepLResponse = {
  translations?: Array<{ text?: string; detected_source_language?: string }>;
};

const json = (body: Record<string, unknown>, status = 200, headers?: HeadersInit) => Response.json(body, {
  status,
  headers: { "Cache-Control": "no-store", ...headers },
});

export default {
  async fetch(request: Request) {
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, { Allow: "POST" });
    const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return json({ error: "Требуется авторизация" }, 401);
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) return json({ error: "Авторизация не настроена" }, 503);
    const auth = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: caller, error: authError } = await auth.auth.getUser(token);
    if (authError || !caller.user) return json({ error: "Сессия истекла. Войдите снова." }, 401);
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid request" }, 400);
    }
    const text = typeof body === "object" && body !== null && "text" in body && typeof body.text === "string"
      ? body.text.replace(/\s+/g, " ").trim()
      : "";
    if (!text || text.length > 100) return json({ error: "Text must contain from 1 to 100 characters" }, 400);

    const apiKey = process.env.DEEPL_API_KEY;
    if (!apiKey) return json({ error: "Translation service is not configured" }, 503);
    const latinCharacters = text.match(/[a-z]/gi)?.length || 0;
    const cyrillicCharacters = text.match(/[а-яё]/gi)?.length || 0;
    const targetLanguage = cyrillicCharacters > latinCharacters ? "EN" : "RU";
    const host = apiKey.endsWith(":fx") ? "https://api-free.deepl.com" : "https://api.deepl.com";

    try {
      const response = await fetch(`${host}/v2/translate`, {
        method: "POST",
        headers: {
          Authorization: `DeepL-Auth-Key ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: [text], target_lang: targetLanguage }),
        signal: AbortSignal.timeout(8_000),
      });
      if (!response.ok) return json({ error: "Translation service is unavailable" }, 502);
      const data = await response.json() as DeepLResponse;
      const translation = data.translations?.[0]?.text?.trim();
      if (!translation) return json({ error: "Translation service returned an empty result" }, 502);
      return json({ translation, targetLanguage: targetLanguage.toLowerCase() });
    } catch {
      return json({ error: "Translation service is unavailable" }, 502);
    }
  },
};
