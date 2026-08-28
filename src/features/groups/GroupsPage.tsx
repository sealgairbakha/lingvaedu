import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/AuthProvider";

type GroupUser = {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string;
  role: "admin" | "staff" | "student";
  active: boolean;
};

type GroupCourse = {
  id: string;
  title: string;
  status: "published" | "draft" | "archived";
  language: string;
};

type LearningGroup = {
  id: string;
  name: string;
  description: string;
  mentorId: string;
  mentor: GroupUser | null;
  memberIds: string[];
  courseIds: string[];
  updatedAt: string;
};

type GroupPayload = {
  groups?: LearningGroup[];
  users?: GroupUser[];
  courses?: GroupCourse[];
  id?: string;
  error?: string;
};

const roleLabels = {
  admin: "Администратор",
  staff: "Сотрудник",
  student: "Ученик",
};

function initials(value: string) {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function Avatar({ user, small = false }: { user: GroupUser; small?: boolean }) {
  return (
    <span className={`groupsAvatar${small ? " small" : ""}`}>
      {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : initials(user.fullName)}
    </span>
  );
}

function GroupIcon({ kind }: { kind: "groups" | "members" | "courses" }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true">
    {kind === "groups" && <><path d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" /><path d="M2.5 20a5.5 5.5 0 0 1 11 0M10.5 20a5.5 5.5 0 0 1 11 0" /></>}
    {kind === "members" && <><circle cx="12" cy="8" r="4" /><path d="M5 21a7 7 0 0 1 14 0" /><path d="M18.5 5.5h3M20 4v3" /></>}
    {kind === "courses" && <><path d="M5 4.5h11a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3V4.5Z" /><path d="M8 20a3 3 0 0 1 0-6h11M9 8h6" /></>}
  </svg>;
}

export function GroupsPage() {
  const { session } = useAuth();
  const [groups, setGroups] = useState<LearningGroup[]>([]);
  const [users, setUsers] = useState<GroupUser[]>([]);
  const [courses, setCourses] = useState<GroupCourse[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [memberQuery, setMemberQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", description: "", mentorId: "" });
  const [draft, setDraft] = useState({ name: "", description: "", mentorId: "", memberIds: [] as string[], courseIds: [] as string[] });

  const request = useCallback(async (method = "GET", body?: Record<string, unknown>) => {
    if (!session?.access_token) throw new Error("Сессия авторизации истекла");
    const response = await fetch("/api/groups", {
      method,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json"))
      throw new Error("API групп недоступен локально. Для серверных функций используйте vercel dev.");
    const payload = await response.json() as GroupPayload;
    if (!response.ok) throw new Error(payload.error || "Не удалось выполнить запрос");
    return payload;
  }, [session]);

  const load = useCallback(async (preferredId?: string) => {
    setLoading(true);
    setError("");
    try {
      const payload = await request();
      const nextGroups = payload.groups || [];
      setGroups(nextGroups);
      setUsers(payload.users || []);
      setCourses(payload.courses || []);
      setSelectedId((current) => {
        const candidate = preferredId || current;
        return nextGroups.some((group) => group.id === candidate) ? candidate : nextGroups[0]?.id || "";
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось загрузить группы");
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const selected = groups.find((group) => group.id === selectedId) || null;
  useEffect(() => {
    if (!selected) return;
    const timer = window.setTimeout(() => {
      setDraft({
        name: selected.name,
        description: selected.description,
        mentorId: selected.mentorId,
        memberIds: [...selected.memberIds],
        courseIds: [...selected.courseIds],
      });
      setMemberQuery("");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [selected]);

  const mentors = users.filter((user) => user.active && (user.role === "admin" || user.role === "staff"));
  const filteredGroups = useMemo(() => {
    const value = query.trim().toLowerCase();
    return groups.filter((group) => !value || `${group.name} ${group.description}`.toLowerCase().includes(value));
  }, [groups, query]);
  const filteredUsers = useMemo(() => {
    const value = memberQuery.trim().toLowerCase();
    return users.filter((user) => user.active && (!value || `${user.fullName} ${user.email}`.toLowerCase().includes(value)));
  }, [memberQuery, users]);
  const publishedCourses = courses.filter((course) => course.status === "published");
  const hasChanges = Boolean(selected && (
    draft.name !== selected.name || draft.description !== selected.description || draft.mentorId !== selected.mentorId ||
    [...draft.memberIds].sort().join() !== [...selected.memberIds].sort().join() ||
    [...draft.courseIds].sort().join() !== [...selected.courseIds].sort().join()
  ));

  const createGroup = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      const payload = await request("POST", createForm);
      setCreateOpen(false);
      setCreateForm({ name: "", description: "", mentorId: "" });
      setNotice("Группа создана. Теперь добавьте участников и курсы.");
      await load(payload.id);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Не удалось создать группу"); }
    finally { setBusy(false); }
  };

  const saveGroup = async () => {
    if (!selected || !draft.name.trim()) return;
    setBusy(true); setError("");
    try {
      await request("PATCH", { id: selected.id, ...draft });
      setNotice("Изменения сохранены, доступ к курсам обновлён.");
      await load(selected.id);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Не удалось сохранить группу"); }
    finally { setBusy(false); }
  };

  const deleteGroup = async () => {
    if (!selected || !confirm(`Удалить группу «${selected.name}»?`)) return;
    setBusy(true); setError("");
    try {
      await request("DELETE", { id: selected.id });
      setNotice("Группа удалена.");
      await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Не удалось удалить группу"); }
    finally { setBusy(false); }
  };

  const toggleId = (key: "memberIds" | "courseIds", id: string) => {
    setDraft((current) => ({
      ...current,
      [key]: current[key].includes(id) ? current[key].filter((value) => value !== id) : [...current[key], id],
    }));
  };

  return (
    <main className="content fade groupsPage">
      <div className="groupsTitle">
        <div><h1>Группы</h1><p>Объединяйте учеников, назначайте наставников и открывайте доступ к курсам.</p></div>
        <button className="btn primary" onClick={() => setCreateOpen(true)}>＋ Создать группу</button>
      </div>
      {error && <div className="groupsAlert error"><b>Не удалось выполнить действие</b><span>{error}</span><button onClick={() => void load()}>Повторить</button></div>}
      {notice && <div className="groupsAlert success"><span>{notice}</span><button onClick={() => setNotice("")}>×</button></div>}

      <div className="groupsSummary">
        <div><span className="groupsMetricIcon violet"><GroupIcon kind="groups" /></span><p>Всего групп<b>{groups.length}</b></p></div>
        <div><span className="groupsMetricIcon green"><GroupIcon kind="members" /></span><p>Участников в группах<b>{new Set(groups.flatMap((group) => group.memberIds)).size}</b></p></div>
        <div><span className="groupsMetricIcon blue"><GroupIcon kind="courses" /></span><p>Назначено курсов<b>{groups.reduce((sum, group) => sum + group.courseIds.length, 0)}</b></p></div>
      </div>

      <div className="groupsWorkspace">
        <section className="groupsList panel">
          <div className="groupsListHead"><div><h2>Учебные группы</h2><span>{groups.length}</span></div><label>⌕<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти группу" /></label></div>
          {loading ? <div className="groupsEmpty">Загружаем группы…</div> : filteredGroups.length ? filteredGroups.map((group) => (
            <button key={group.id} className={`groupListItem${group.id === selectedId ? " active" : ""}`} onClick={() => setSelectedId(group.id)}>
              <span className="groupListMark">{initials(group.name)}</span>
              <span><b>{group.name}</b><small>{group.memberIds.length} участников · {group.courseIds.length} курсов</small></span>
              <i>›</i>
            </button>
          )) : <div className="groupsEmpty"><b>{groups.length ? "Ничего не найдено" : "Групп пока нет"}</b><span>{groups.length ? "Попробуйте другой запрос." : "Создайте первую группу и добавьте учеников."}</span></div>}
        </section>

        <section className="groupEditor panel">
          {!selected ? <div className="groupEditorPlaceholder"><span><GroupIcon kind="groups" /></span><h2>Выберите группу</h2><p>Здесь появятся участники, наставник и доступные курсы.</p></div> : <>
            <header className="groupEditorHead"><div><span className="groupListMark large">{initials(selected.name)}</span><div><small>НАСТРОЙКА ГРУППЫ</small><h2>{selected.name}</h2></div></div><button className="groupsDelete" onClick={() => void deleteGroup()} disabled={busy} aria-label="Удалить группу">Удалить</button></header>
            <div className="groupEditorBody">
              <section className="groupFormSection">
                <div className="groupSectionHead"><div><span>1</span><h3>Основная информация</h3></div><p>Название, описание и ответственный наставник</p></div>
                <div className="groupFields">
                  <label>Название группы<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} maxLength={120} /></label>
                  <label>Наставник<select value={draft.mentorId} onChange={(event) => setDraft({ ...draft, mentorId: event.target.value })}><option value="">Без наставника</option>{mentors.map((mentor) => <option key={mentor.id} value={mentor.id}>{mentor.fullName}</option>)}</select></label>
                  <label className="wide">Описание<textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Например: разговорный английский, уровень B1" maxLength={500} /></label>
                </div>
              </section>

              <section className="groupFormSection">
                <div className="groupSectionHead"><div><span>2</span><h3>Участники</h3><em>{draft.memberIds.length}</em></div><p>Выберите людей, которых нужно добавить в группу</p></div>
                <label className="groupPickerSearch">⌕<input value={memberQuery} onChange={(event) => setMemberQuery(event.target.value)} placeholder="Имя или электронная почта" /></label>
                <div className="groupPickerList members">{filteredUsers.map((user) => {
                  const checked = draft.memberIds.includes(user.id);
                  return <label key={user.id} className={checked ? "checked" : ""}><input type="checkbox" checked={checked} onChange={() => toggleId("memberIds", user.id)} /><Avatar user={user} /><span><b>{user.fullName}</b><small>{user.email} · {roleLabels[user.role]}</small></span><i>{checked ? "✓" : "＋"}</i></label>;
                })}</div>
              </section>

              <section className="groupFormSection">
                <div className="groupSectionHead"><div><span>3</span><h3>Доступные курсы</h3><em>{draft.courseIds.length}</em></div><p>Участники получат доступ сразу после сохранения</p></div>
                <div className="groupPickerList courses">{publishedCourses.length ? publishedCourses.map((course) => {
                  const checked = draft.courseIds.includes(course.id);
                  return <label key={course.id} className={checked ? "checked" : ""}><input type="checkbox" checked={checked} onChange={() => toggleId("courseIds", course.id)} /><span className="groupCourseGlyph"><GroupIcon kind="courses" /></span><span><b>{course.title}</b><small>{course.language || "Язык не указан"}</small></span><i>{checked ? "✓" : "＋"}</i></label>;
                }) : <div className="groupPickerEmpty">Сначала опубликуйте хотя бы один курс.</div>}</div>
              </section>
            </div>
            <footer className="groupEditorFooter"><span>{hasChanges ? "Есть несохранённые изменения" : "Все изменения сохранены"}</span><button className="btn primary" disabled={!hasChanges || busy || !draft.name.trim()} onClick={() => void saveGroup()}>{busy ? "Сохраняем…" : hasChanges ? "Сохранить изменения" : "Сохранено"}</button></footer>
          </>}
        </section>
      </div>

      {createOpen && <div className="modalLayer"><button className="modalScrim" onClick={() => setCreateOpen(false)} aria-label="Закрыть" /><form className="modal groupsCreateModal" onSubmit={createGroup}><div className="modalHead"><div><small>НОВАЯ УЧЕБНАЯ ГРУППА</small><h2>Создать группу</h2></div><button type="button" onClick={() => setCreateOpen(false)}>×</button></div><label>Название<input autoFocus required minLength={2} maxLength={120} value={createForm.name} onChange={(event) => setCreateForm({ ...createForm, name: event.target.value })} placeholder="Например: English B1 · Осень" /></label><label>Описание<textarea value={createForm.description} onChange={(event) => setCreateForm({ ...createForm, description: event.target.value })} placeholder="Кратко опишите цель группы" /></label><label>Наставник<select value={createForm.mentorId} onChange={(event) => setCreateForm({ ...createForm, mentorId: event.target.value })}><option value="">Назначить позже</option>{mentors.map((mentor) => <option key={mentor.id} value={mentor.id}>{mentor.fullName}</option>)}</select></label><button className="btn primary full" disabled={busy}>{busy ? "Создаём…" : "Создать и настроить"}</button></form></div>}
    </main>
  );
}
