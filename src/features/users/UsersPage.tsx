import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";

type UserRole = "admin" | "staff" | "student";
type UserStatus = "active" | "invited" | "blocked";

type ManagedUser = {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string;
  group: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  lastSignInAt: string | null;
  courseCount: number;
  isCurrent: boolean;
};

const roleLabels: Record<UserRole, string> = {
  admin: "Администратор",
  staff: "Сотрудник",
  student: "Ученик",
};

const statusLabels: Record<UserStatus, string> = {
  active: "Активен",
  invited: "Ожидает приглашения",
  blocked: "Заблокирован",
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function activityLabel(value: string | null) {
  if (!value) return "Ещё не входил";
  const date = new Date(value);
  const difference = Date.now() - date.getTime();
  if (difference < 60_000) return "Только что";
  if (difference < 3_600_000)
    return `${Math.max(1, Math.floor(difference / 60_000))} мин назад`;
  if (difference < 86_400_000)
    return `${Math.floor(difference / 3_600_000)} ч назад`;
  if (difference < 172_800_000) return "Вчера";
  return date.toLocaleDateString("ru-RU");
}

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export function UsersPage() {
  const { session } = useAuth();
  const [searchParams] = useSearchParams();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState(() => searchParams.get("search") || "");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "all">("all");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    role: "student" as UserRole,
    group: "",
    status: "active" as UserStatus,
  });

  const request = useCallback(
    async (method = "GET", body?: Record<string, unknown>) => {
      if (!session?.access_token) throw new Error("Сессия авторизации истекла");
      const response = await fetch("/api/users", {
        method,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const payload = (await response.json().catch(() => ({}))) as {
        users?: ManagedUser[];
        error?: string;
      };
      if (!response.ok)
        throw new Error(payload.error || "Не удалось выполнить запрос");
      if (method === "GET" && !Array.isArray(payload.users)) {
        throw new Error(
          "API пользователей недоступен. Локально запустите проект через vercel dev.",
        );
      }
      return payload;
    },
    [session],
  );

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await request();
      setUsers(payload.users || []);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Не удалось загрузить пользователей",
      );
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadUsers(), 0);
    return () => window.clearTimeout(timer);
  }, [loadUsers]);

  const groups = useMemo(
    () => [...new Set(users.map((user) => user.group).filter(Boolean))].sort(),
    [users],
  );
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return users.filter(
      (user) =>
        (!normalized ||
          `${user.fullName} ${user.email}`
            .toLowerCase()
            .includes(normalized)) &&
        (roleFilter === "all" || user.role === roleFilter) &&
        (groupFilter === "all" || user.group === groupFilter) &&
        (statusFilter === "all" || user.status === statusFilter),
    );
  }, [groupFilter, query, roleFilter, statusFilter, users]);

  const activeLastMonth = users.filter(
    (user) =>
      user.lastSignInAt &&
      Date.now() - new Date(user.lastSignInAt).getTime() <=
        30 * 24 * 60 * 60 * 1000,
  ).length;

  const openInvite = () => {
    setForm({
      fullName: "",
      email: "",
      role: "student",
      group: "",
      status: "invited",
    });
    setInviteOpen(true);
    setMessage("");
  };

  const openEdit = (user: ManagedUser) => {
    setForm({
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      group: user.group,
      status: user.status,
    });
    setEditing(user);
    setMessage("");
  };

  const submitInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await request("POST", form);
      setInviteOpen(false);
      setMessage(`Приглашение отправлено на ${form.email}`);
      await loadUsers();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка приглашения");
    } finally {
      setBusy(false);
    }
  };

  const saveUser = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    setBusy(true);
    setError("");
    try {
      await request("PATCH", { id: editing.id, ...form });
      setEditing(null);
      setMessage("Данные пользователя обновлены");
      await loadUsers();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка сохранения");
    } finally {
      setBusy(false);
    }
  };

  const deleteUser = async () => {
    if (!editing || !confirm(`Удалить пользователя «${editing.fullName}»?`))
      return;
    setBusy(true);
    setError("");
    try {
      await request("DELETE", { id: editing.id });
      setEditing(null);
      setMessage("Пользователь удалён");
      await loadUsers();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка удаления");
    } finally {
      setBusy(false);
    }
  };

  const copyInviteLink = async () => {
    const link = `${window.location.origin}/?register=1`;
    try {
      await navigator.clipboard.writeText(link);
      setMessage("Ссылка для самостоятельной регистрации скопирована");
    } catch {
      setMessage(link);
    }
  };

  const exportUsers = () => {
    const rows = [
      ["Имя", "Email", "Роль", "Группа", "Статус", "Курсы", "Активность"],
      ...filtered.map((user) => [
        user.fullName,
        user.email,
        roleLabels[user.role],
        user.group || "Без группы",
        statusLabels[user.status],
        user.courseCount,
        activityLabel(user.lastSignInAt),
      ]),
    ];
    const blob = new Blob(
      [`\uFEFF${rows.map((row) => row.map(csvCell).join(";")).join("\n")}`],
      { type: "text/csv;charset=utf-8" },
    );
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `lingvaedu-users-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <main className="content fade usersPage">
      <div className="pageTitle usersPageTitle">
        <div>
          <h1>Пользователи</h1>
          <p>Реальные аккаунты учеников, сотрудников и администраторов.</p>
        </div>
        <div className="titleActions">
          <button className="btn ghost" onClick={copyInviteLink}>
            Пригласить по ссылке
          </button>
          <button className="btn primary" onClick={openInvite}>
            + Добавить пользователя
          </button>
        </div>
      </div>

      {message && <div className="usersNotice success">{message}</div>}
      {error && (
        <div className="usersNotice error">
          <span>{error}</span>
          <button onClick={loadUsers}>Повторить</button>
        </div>
      )}

      <section className="peopleSummary">
        <div>
          <span className="violet">♙</span>
          <p>
            Всего пользователей<b>{users.length}</b>
          </p>
        </div>
        <div>
          <span className="green">●</span>
          <p>
            Активны за 30 дней<b>{activeLastMonth}</b>
          </p>
        </div>
        <div>
          <span className="orange">◎</span>
          <p>
            Сотрудники
            <b>{users.filter((user) => user.role === "staff").length}</b>
          </p>
        </div>
        <div>
          <span className="blue">◉</span>
          <p>
            Группы<b>{groups.length}</b>
          </p>
        </div>
      </section>

      <div className="toolbar usersToolbar">
        <label>
          <span>⌕</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Имя или электронная почта"
          />
        </label>
        <select
          className="filter"
          aria-label="Фильтр по роли"
          value={roleFilter}
          onChange={(event) =>
            setRoleFilter(event.target.value as UserRole | "all")
          }
        >
          <option value="all">Все роли</option>
          <option value="admin">Администраторы</option>
          <option value="staff">Сотрудники</option>
          <option value="student">Ученики</option>
        </select>
        <select
          className="filter"
          aria-label="Фильтр по группе"
          value={groupFilter}
          onChange={(event) => setGroupFilter(event.target.value)}
        >
          <option value="all">Все группы</option>
          {groups.map((group) => (
            <option key={group}>{group}</option>
          ))}
        </select>
        <select
          className="filter"
          aria-label="Фильтр по статусу"
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as UserStatus | "all")
          }
        >
          <option value="all">Все статусы</option>
          <option value="active">Активные</option>
          <option value="invited">Ожидают приглашения</option>
          <option value="blocked">Заблокированные</option>
        </select>
        <button
          className="export"
          onClick={exportUsers}
          disabled={!filtered.length}
        >
          ⇩ Экспорт
        </button>
      </div>

      <div className="dataTable usersTable">
        <div className="dataRow head">
          <span>ПОЛЬЗОВАТЕЛЬ</span>
          <span>РОЛЬ</span>
          <span>ГРУППА</span>
          <span>КУРСЫ</span>
          <span>ПРОГРЕСС</span>
          <span>АКТИВНОСТЬ</span>
          <span />
        </div>
        {loading ? (
          <div className="usersEmpty">Загружаем пользователей…</div>
        ) : filtered.length ? (
          filtered.map((user, index) => (
            <div className="dataRow" key={user.id}>
              <div className="personCell">
                <span className={`avatarColor a${index % 5}`}>
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" />
                  ) : (
                    initials(user.fullName)
                  )}
                </span>
                <div>
                  <b>
                    {user.fullName} {user.isCurrent && <em>Вы</em>}
                  </b>
                  <small>{user.email}</small>
                </div>
              </div>
              <span>
                <mark className={user.role}>{roleLabels[user.role]}</mark>
              </span>
              <span>{user.group || "Без группы"}</span>
              <span>{user.courseCount}</span>
              <span
                className="usersNoProgress"
                title="Прогресс пока хранится на устройстве ученика"
              >
                —
              </span>
              <span className="muted">
                <i className={`userStatus ${user.status}`} />
                {activityLabel(user.lastSignInAt)}
              </span>
              <button
                className="userRowAction"
                aria-label={`Редактировать ${user.fullName}`}
                onClick={() => openEdit(user)}
              >
                •••
              </button>
            </div>
          ))
        ) : (
          <div className="usersEmpty">Пользователи не найдены</div>
        )}
      </div>

      {inviteOpen && (
        <UserModal
          title="Добавить пользователя"
          close={() => setInviteOpen(false)}
        >
          <form onSubmit={submitInvite}>
            <UserFields
              form={form}
              setForm={setForm}
              includeEmail
              groups={groups}
            />
            <button className="btn primary full" disabled={busy}>
              {busy ? "Отправляем…" : "Добавить и отправить приглашение"}
            </button>
          </form>
        </UserModal>
      )}

      {editing && (
        <UserModal
          title="Управление пользователем"
          close={() => setEditing(null)}
        >
          <form onSubmit={saveUser}>
            <UserFields form={form} setForm={setForm} groups={groups} />
            <div className="userModalActions">
              <button
                type="button"
                className="btn danger"
                disabled={busy || editing.isCurrent}
                onClick={deleteUser}
              >
                Удалить
              </button>
              <button className="btn primary" disabled={busy}>
                {busy ? "Сохраняем…" : "Сохранить"}
              </button>
            </div>
          </form>
        </UserModal>
      )}
    </main>
  );
}

function UserFields({
  form,
  setForm,
  includeEmail = false,
  groups,
}: {
  form: {
    fullName: string;
    email: string;
    role: UserRole;
    group: string;
    status: UserStatus;
  };
  setForm: React.Dispatch<React.SetStateAction<typeof form>>;
  includeEmail?: boolean;
  groups: string[];
}) {
  return (
    <>
      <label>
        Имя и фамилия
        <input
          required
          value={form.fullName}
          onChange={(event) =>
            setForm((current) => ({ ...current, fullName: event.target.value }))
          }
          placeholder="Например, Алия Касымова"
        />
      </label>
      {includeEmail && (
        <label>
          Электронная почта
          <input
            required
            type="email"
            value={form.email}
            onChange={(event) =>
              setForm((current) => ({ ...current, email: event.target.value }))
            }
            placeholder="name@company.kz"
          />
        </label>
      )}
      <div className="modalGrid">
        <label>
          Роль
          <select
            value={form.role}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                role: event.target.value as UserRole,
              }))
            }
          >
            <option value="student">Ученик</option>
            <option value="staff">Сотрудник</option>
            <option value="admin">Администратор</option>
          </select>
        </label>
        <label>
          Группа
          <input
            list="lingvaedu-user-groups"
            value={form.group}
            onChange={(event) =>
              setForm((current) => ({ ...current, group: event.target.value }))
            }
            placeholder="Без группы"
          />
          <datalist id="lingvaedu-user-groups">
            {groups.map((group) => (
              <option key={group} value={group} />
            ))}
          </datalist>
        </label>
      </div>
      {!includeEmail && (
        <label>
          Статус
          <select
            value={form.status}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                status: event.target.value as UserStatus,
              }))
            }
          >
            <option value="active">Активен</option>
            <option value="blocked">Заблокирован</option>
            {form.status === "invited" && (
              <option value="invited">Ожидает приглашения</option>
            )}
          </select>
        </label>
      )}
    </>
  );
}

function UserModal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="modalLayer">
      <button className="modalScrim" aria-label="Закрыть" onClick={close} />
      <section className="modal userModal" role="dialog" aria-modal="true">
        <div className="modalHead">
          <h2>{title}</h2>
          <button aria-label="Закрыть" onClick={close}>
            ×
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
