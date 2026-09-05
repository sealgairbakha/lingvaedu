import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

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

function roleOf(user: User): UserRole {
  const role = user.app_metadata?.role;
  return role === "admin" || role === "staff" ? role : "student";
}

function publicUser(user: User) {
  const fullName = String(
    user.user_metadata?.full_name || user.email?.split("@")[0] || "Пользователь",
  );
  return {
    id: user.id,
    email: user.email || "",
    fullName,
    avatarUrl: String(user.user_metadata?.avatar_url || ""),
    role: roleOf(user),
    active: Boolean(user.email_confirmed_at) &&
      (!user.banned_until || new Date(user.banned_until).getTime() <= Date.now()),
  };
}

async function bodyOf(request: Request) {
  try {
    const body: unknown = await request.json();
    return body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function ids(value: unknown) {
  return Array.isArray(value)
    ? [...new Set(value.map(String).filter(Boolean))]
    : [];
}

async function syncGroupEnrollments(service: SupabaseClient) {
  const [members, assignments, enrollments] = await Promise.all([
    service.from("learning_group_members").select("group_id,user_id"),
    service.from("learning_group_courses").select("group_id,course_id"),
    service.from("course_enrollments").select("user_id,course_id"),
  ]);
  const error = members.error || assignments.error || enrollments.error;
  if (error) return error;

  const usersByGroup = new Map<string, string[]>();
  for (const row of members.data || []) {
    usersByGroup.set(row.group_id, [...(usersByGroup.get(row.group_id) || []), row.user_id]);
  }
  const desired = new Set<string>();
  for (const row of assignments.data || []) {
    for (const userId of usersByGroup.get(row.group_id) || []) desired.add(`${userId}:${row.course_id}`);
  }
  const existing = new Set((enrollments.data || []).map((row) => `${row.user_id}:${row.course_id}`));
  const missing = [...desired].filter((key) => !existing.has(key)).map((key) => {
    const [user_id, course_id] = key.split(":");
    return { user_id, course_id };
  });
  const obsolete = (enrollments.data || []).filter((row) => !desired.has(`${row.user_id}:${row.course_id}`));
  for (const row of obsolete) {
    const result = await service.from("course_enrollments").delete()
      .eq("user_id", row.user_id).eq("course_id", row.course_id);
    if (result.error) return result.error;
  }
  if (missing.length) {
    const result = await service.from("course_enrollments").upsert(missing, { onConflict: "course_id,user_id" });
    if (result.error) return result.error;
  }
  return null;
}

export default {
  async fetch(request: Request) {
    const config = configuration();
    if (!config)
      return json({ error: "Серверное управление группами ещё не настроено" }, 503);

    const service = createClient(config.url, config.key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const token = bearer(request);
    if (!token) return json({ error: "Требуется авторизация" }, 401);
    const callerResult = await service.auth.getUser(token);
    const caller = callerResult.data.user;
    if (callerResult.error || !caller)
      return json({ error: "Сессия истекла" }, 401);
    if (!(["admin", "staff"] as UserRole[]).includes(roleOf(caller)))
      return json({ error: "Недостаточно прав" }, 403);

    if (request.method === "GET") {
      const [groupsResult, membersResult, coursesResult, usersResult, catalogResult] =
        await Promise.all([
          service.from("learning_groups").select("*").order("updated_at", { ascending: false }),
          service.from("learning_group_members").select("group_id,user_id"),
          service.from("learning_group_courses").select("group_id,course_id"),
          service.auth.admin.listUsers({ page: 1, perPage: 1000 }),
          service.from("courses").select("id,title,status,content").order("updated_at", { ascending: false }),
        ]);
      const firstError = groupsResult.error || membersResult.error || coursesResult.error ||
        usersResult.error || catalogResult.error;
      if (firstError) {
        const permissionHint = firstError.message.toLowerCase().includes("permission denied")
          ? " Проверьте, что SUPABASE_SERVICE_ROLE_KEY содержит именно service_role key, и выполните миграцию 008_groups_service_permissions.sql."
          : "";
        return json({ error: `${firstError.message}.${permissionHint}` }, 502);
      }

      const users = usersResult.data.users.map(publicUser);
      const userMap = new Map(users.map((user) => [user.id, user]));
      const memberMap = new Map<string, string[]>();
      const courseMap = new Map<string, string[]>();
      for (const row of membersResult.data || []) {
        memberMap.set(row.group_id, [...(memberMap.get(row.group_id) || []), row.user_id]);
      }
      for (const row of coursesResult.data || []) {
        courseMap.set(row.group_id, [...(courseMap.get(row.group_id) || []), row.course_id]);
      }
      const groups = (groupsResult.data || []).map((group) => ({
        id: group.id,
        name: group.name,
        description: group.description || "",
        mentorId: group.mentor_id || "",
        mentor: group.mentor_id ? userMap.get(group.mentor_id) || null : null,
        memberIds: memberMap.get(group.id) || [],
        courseIds: courseMap.get(group.id) || [],
        updatedAt: group.updated_at,
      }));
      const courses = (catalogResult.data || []).map((row) => ({
        id: row.id,
        title: row.title,
        status: row.status,
        language: String((row.content as { language?: string } | null)?.language || ""),
      }));
      return json({ groups, users, courses });
    }

    const body = await bodyOf(request);
    if (!body) return json({ error: "Некорректные данные" }, 400);

    if (request.method === "POST") {
      const name = String(body.name || "").trim();
      if (name.length < 2) return json({ error: "Введите название группы" }, 400);
      const result = await service.from("learning_groups").insert({
        name,
        description: String(body.description || "").trim(),
        mentor_id: body.mentorId ? String(body.mentorId) : null,
        created_by: caller.id,
      }).select("id").single();
      if (result.error) return json({ error: result.error.message }, 400);
      return json({ id: result.data.id }, 201);
    }

    const groupId = String(body.id || "");
    if (!groupId) return json({ error: "Группа не выбрана" }, 400);

    if (request.method === "PATCH") {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      const validIds = (value: unknown) => Array.isArray(value) && value.length <= 1000 && value.every((id) => typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));
      if (name.length < 2 || name.length > 160 || !validIds(body.memberIds) || !validIds(body.courseIds))
        return json({ error: "Укажите название группы и корректные списки участников и курсов" }, 400);
      const memberIds = ids(body.memberIds);
      const courseIds = ids(body.courseIds);
      // Read the current associations first; never empty a group before new data is accepted.
      const [existingMembers, existingCourses] = await Promise.all([
        service.from("learning_group_members").select("user_id").eq("group_id", groupId),
        service.from("learning_group_courses").select("course_id").eq("group_id", groupId),
      ]);
      if (existingMembers.error || existingCourses.error)
        return json({ error: "Не удалось прочитать состав группы. Изменения не сохранены." }, 502);
      const update = await service.from("learning_groups").update({
        name,
        description: String(body.description || "").trim(),
        mentor_id: body.mentorId ? String(body.mentorId) : null,
        updated_at: new Date().toISOString(),
      }).eq("id", groupId);
      if (update.error) return json({ error: update.error.message }, 400);

      const writes = [];
      if (memberIds.length) writes.push(service.from("learning_group_members").upsert(
        memberIds.map((userId) => ({ group_id: groupId, user_id: userId })),
        { onConflict: "group_id,user_id", ignoreDuplicates: true },
      ));
      if (courseIds.length) writes.push(service.from("learning_group_courses").upsert(
        courseIds.map((courseId) => ({ group_id: groupId, course_id: courseId })),
        { onConflict: "group_id,course_id", ignoreDuplicates: true },
      ));
      const results = await Promise.all(writes);
      const writeError = results.find((result) => result.error)?.error;
      if (writeError) return json({ error: writeError.message }, 400);
      const removedMembers = (existingMembers.data || []).map((row) => row.user_id).filter((id) => !memberIds.includes(id));
      const removedCourses = (existingCourses.data || []).map((row) => row.course_id).filter((id) => !courseIds.includes(id));
      const removals = [];
      if (removedMembers.length) removals.push(service.from("learning_group_members").delete().eq("group_id", groupId).in("user_id", removedMembers));
      if (removedCourses.length) removals.push(service.from("learning_group_courses").delete().eq("group_id", groupId).in("course_id", removedCourses));
      const removalResults = await Promise.all(removals);
      const removalError = removalResults.find((result) => result.error)?.error;
      if (removalError) return json({ error: removalError.message }, 400);
      const syncError = await syncGroupEnrollments(service);
      if (syncError) return json({ error: syncError.message }, 400);
      return json({ ok: true });
    }

    if (request.method === "DELETE") {
      const result = await service.from("learning_groups").delete().eq("id", groupId);
      if (result.error) return json({ error: result.error.message }, 400);
      const syncError = await syncGroupEnrollments(service);
      if (syncError) return json({ error: syncError.message }, 400);
      return json({ ok: true });
    }

    return json({ error: "Method not allowed" }, 405);
  },
};
