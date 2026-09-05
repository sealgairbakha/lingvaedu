import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

function localApi(): Plugin {
  const endpoints = new Set(["users", "username-login", "translate", "groups", "dashboard", "reports"]);
  return {
    name: "lingvaedu-local-api",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const pathname = new URL(request.url || "/", "http://127.0.0.1").pathname;
        const endpoint = pathname.match(/^\/api\/([a-z-]+)\/?$/)?.[1];
        if (!endpoint || !endpoints.has(endpoint)) return next();
        try {
          const chunks: Buffer[] = [];
          let size = 0;
          for await (const chunk of request) {
            const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            size += buffer.length;
            if (size > 1_048_576) {
              response.writeHead(413, { "Content-Type": "application/json" });
              response.end(JSON.stringify({ error: "Запрос слишком большой" }));
              return;
            }
            chunks.push(buffer);
          }
          const headers = new Headers();
          for (const [name, value] of Object.entries(request.headers)) {
            if (value) headers.set(name, Array.isArray(value) ? value.join(", ") : value);
          }
          const method = request.method || "GET";
          const input = new Request(`http://127.0.0.1${request.url}`, {
            method, headers,
            ...(method !== "GET" && method !== "HEAD" ? { body: Buffer.concat(chunks) } : {}),
          });
          const handler = await server.ssrLoadModule(`/api/${endpoint}.ts`);
          const result: Response = await handler.default.fetch(input);
          response.writeHead(result.status, Object.fromEntries(result.headers));
          response.end(Buffer.from(await result.arrayBuffer()));
        } catch (error) {
          server.config.logger.error(`Local API /${endpoint} failed: ${error instanceof Error ? error.message : "unknown error"}`);
          response.writeHead(500, { "Content-Type": "application/json", "Cache-Control": "no-store" });
          response.end(JSON.stringify({ error: "Не удалось выполнить запрос. Попробуйте снова." }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), "");
  // Only these server variables are exposed to local API handlers, never to client bundles.
  for (const key of ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "DEEPL_API_KEY", "VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"]) {
    if (!process.env[key] && environment[key]) process.env[key] = environment[key];
  }
  return { plugins: [react(), localApi()], server: { host: "127.0.0.1" } };
});
