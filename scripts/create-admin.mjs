import { createClient } from "@supabase/supabase-js";

const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ADMIN_EMAIL", "ADMIN_PASSWORD", "ADMIN_NAME"];
const missing = required.filter((key) => !process.env[key]);

if (missing.length) {
  console.error(`Missing environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

if (process.env.ADMIN_PASSWORD.length < 12) {
  console.error("ADMIN_PASSWORD must contain at least 12 characters.");
  process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const email = process.env.ADMIN_EMAIL.trim().toLowerCase();
const { data: usersData, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
if (listError) throw listError;

const existing = usersData.users.find((user) => user.email?.toLowerCase() === email);
let result;

if (existing) {
  result = await supabase.auth.admin.updateUserById(existing.id, {
    password: process.env.ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: { ...existing.user_metadata, full_name: process.env.ADMIN_NAME.trim() },
    app_metadata: { ...existing.app_metadata, role: "admin" },
  });
} else {
  result = await supabase.auth.admin.createUser({
    email,
    password: process.env.ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: process.env.ADMIN_NAME.trim() },
    app_metadata: { role: "admin" },
  });
}

if (result.error) throw result.error;
console.log(`Admin account is ready: ${result.data.user.email}`);
