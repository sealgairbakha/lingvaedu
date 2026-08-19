const required = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD",
  "ADMIN_NAME",
];

const missing = required.filter((key) => !process.env[key]);

if (missing.length) {
  console.error(`Missing environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

if (process.env.ADMIN_PASSWORD.length < 12) {
  console.error("ADMIN_PASSWORD must contain at least 12 characters.");
  process.exit(1);
}

const SUPABASE_URL = process.env.SUPABASE_URL.replace(/\/$/, "");
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const email = process.env.ADMIN_EMAIL.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const fullName = process.env.ADMIN_NAME.trim();

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

async function request(url, options = {}) {
  const response = await fetch(`${SUPABASE_URL}${url}`, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {}),
    },
  });

  const text = await response.text();

  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    console.error("Supabase error:");
    console.error("Status:", response.status);
    console.error(data);
    process.exit(1);
  }

  return data;
}

// Получаем пользователей
const usersData = await request("/auth/v1/admin/users?page=1&per_page=1000");

const existing = usersData.users?.find(
  (user) => user.email?.toLowerCase() === email
);

let user;

if (existing) {
  console.log("User already exists. Updating to admin...");

  user = await request(`/auth/v1/admin/users/${existing.id}`, {
    method: "PUT",
    body: JSON.stringify({
      password,
      email_confirm: true,
      user_metadata: {
        ...(existing.user_metadata || {}),
        full_name: fullName,
      },
      app_metadata: {
        ...(existing.app_metadata || {}),
        role: "admin",
      },
    }),
  });
} else {
  console.log("Creating new admin...");

  user = await request("/auth/v1/admin/users", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
      app_metadata: {
        role: "admin",
      },
    }),
  });
}

console.log("");
console.log("Admin account is ready.");
console.log("Email:", user.email);
console.log("Role:", user.app_metadata?.role);