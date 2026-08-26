"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./auth/AuthProvider";
import { SelectionTranslator } from "./components/SelectionTranslator";
import { CoursesPage } from "./features/courses/CoursesPage";
import { CourseEditorPage } from "./features/courses/CourseEditorPage";
import { CoursePlayerPage } from "./features/courses/CoursePlayerPage";
import { ProfilePage } from "./features/profile/ProfilePage";
import { UsersPage } from "./features/users/UsersPage";
import { GroupsPage } from "./features/groups/GroupsPage";
import { VideoRoomsPage } from "./features/video/VideoRoomsPage";
import { useCourses } from "./features/courses/CourseProvider";
import { supabase } from "./lib/supabase";

type Page =
  | "overview"
  | "courses"
  | "editor"
  | "player"
  | "profile"
  | "people"
  | "groups"
  | "roles"
  | "reports"
  | "calls"
  | "calendar";
type BlockKind = "text" | "media" | "quiz" | "html" | "file";
type LessonBlock = {
  id: number;
  kind: BlockKind;
  title: string;
  description: string;
};

function AccountMenuIcon({ kind }: { kind: "profile" | "settings" | "sun" | "moon" | "logout" }) {
  const paths = {
    profile: <><circle cx="12" cy="8" r="3.25" /><path d="M5.75 19c.65-3.25 2.75-5 6.25-5s5.6 1.75 6.25 5" /></>,
    settings: <><path d="M4 7h10M17 7h3M4 17h3M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4" /></>,
    moon: <path d="M20 15.2A8.5 8.5 0 0 1 8.8 4 8.5 8.5 0 1 0 20 15.2Z" />,
    logout: <><path d="M10 5H5.5A1.5 1.5 0 0 0 4 6.5v11A1.5 1.5 0 0 0 5.5 19H10M14.5 8l4 4-4 4M18.5 12H9" /></>,
  } as const;

  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[kind]}</svg>;
}

const nav: {
  section?: string;
  items: { id: Page; icon: string; label: string }[];
}[] = [
  { items: [{ id: "overview", icon: "⌂", label: "Обзор" }] },
  {
    section: "ОБУЧЕНИЕ",
    items: [
      { id: "courses", icon: "▤", label: "Курсы" },
      { id: "people", icon: "♙", label: "Пользователи" },
      { id: "groups", icon: "◉", label: "Группы" },
    ],
  },
  {
    section: "УПРАВЛЕНИЕ",
    items: [
      { id: "calendar", icon: "□", label: "Календарь" },
      { id: "calls", icon: "◇", label: "Видеокомнаты" },
      { id: "reports", icon: "⌁", label: "Отчёты" },
      { id: "roles", icon: "⌘", label: "Роли и права" },
    ],
  },
];

const courseRows = [
  {
    title: "English for work",
    code: "EN",
    color: "violet",
    status: "Опубликован",
    students: 184,
    lessons: 24,
    progress: 76,
    mentor: "Анна Ким",
  },
  {
    title: "Русский без барьеров",
    code: "RU",
    color: "blue",
    status: "Опубликован",
    students: 96,
    lessons: 18,
    progress: 63,
    mentor: "Олег Миронов",
  },
  {
    title: "Қазақ тілі: Бастау",
    code: "KZ",
    color: "orange",
    status: "Опубликован",
    students: 142,
    lessons: 20,
    progress: 81,
    mentor: "Айгүл Сәрсен",
  },
  {
    title: "Business English B2",
    code: "B2",
    color: "green",
    status: "Черновик",
    students: 0,
    lessons: 12,
    progress: 35,
    mentor: "Не назначен",
  },
];

const people = [
  {
    name: "Алия Касымова",
    email: "aliya.k@company.kz",
    initials: "АК",
    role: "Ученик",
    group: "Sales Team",
    courses: 2,
    progress: 86,
    active: "Сегодня",
  },
  {
    name: "Марат Ибраев",
    email: "m.ibrayev@company.kz",
    initials: "МИ",
    role: "Ученик",
    group: "Newcomers",
    courses: 1,
    progress: 54,
    active: "Вчера",
  },
  {
    name: "Анна Ким",
    email: "anna.kim@lingva.kz",
    initials: "АК",
    role: "Наставник",
    group: "English mentors",
    courses: 3,
    progress: 92,
    active: "5 мин назад",
  },
  {
    name: "Нурлан Садыков",
    email: "n.sadykov@company.kz",
    initials: "НС",
    role: "Менеджер",
    group: "HR Department",
    courses: 4,
    progress: 71,
    active: "12 авг",
  },
  {
    name: "Диана Ли",
    email: "diana.li@company.kz",
    initials: "ДЛ",
    role: "Ученик",
    group: "Marketing",
    courses: 2,
    progress: 39,
    active: "11 авг",
  },
];

function Logo() {
  return (
    <div className="logo">
      <b>Lingva<span>Edu</span></b>
    </div>
  );
}

function NavIcon({ name }: { name: Page | "help" | "logout" }) {
  const paths: Partial<Record<typeof name, React.ReactNode>> = {
    overview: <><path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V21h13V9.5M9 21v-6h6v6"/></>,
    courses: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 5.5v16M8 7h8M8 11h8"/></>,
    people: <><circle cx="12" cy="8" r="3"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0"/></>,
    groups: <><circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0M16 5.5a3 3 0 0 1 0 5.8M17 15a5 5 0 0 1 4 5"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></>,
    calls: <><rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3z"/></>,
    reports: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>,
    roles: <><path d="M12 3 4 6v5c0 5 3.4 8.6 8 10 4.6-1.4 8-5 8-10V6z"/><path d="m9 12 2 2 4-4"/></>,
    help: <><circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.4 2.4 0 1 1 3.2 2.3c-.7.3-1 .8-1 1.7M12 17h.01"/></>,
    logout: <><path d="M10 5H5v14h5M14 8l4 4-4 4M18 12H9"/></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function Sidebar({
  page,
  setPage,
  open,
  close,
  hide,
}: {
  page: Page;
  setPage: (p: Page) => void;
  open: boolean;
  close: () => void;
  hide: () => void;
}) {
  const { displayName, initials, avatarUrl, isAdmin, canEditCourses, signOut } = useAuth();
  const adminOnlyPages: Page[] = [
    "people",
    "roles",
    "reports",
  ];
  return (
    <>
      <aside className={`sidebar ${open ? "mobileOpen" : ""}`}>
        <div className="sideTop">
          <Logo />
          <button className="closeNav" onClick={hide} aria-label="Скрыть меню" title="Скрыть меню">
            <span/><span/>
          </button>
        </div>
        <nav>
          {nav.map((group, gi) => {
            const items = group.items.filter(
              (item) => (item.id !== "calls" || canEditCourses) && (isAdmin || (item.id === "groups" && canEditCourses) || !adminOnlyPages.includes(item.id)),
            );
            if (!items.length) return null;
            return (
              <div className="navGroup" key={gi}>
                {group.section && <small>{group.section}</small>}
                {items.map((item) => (
                  <button
                    key={item.id}
                    className={
                      page === item.id ||
                      ((page === "editor" || page === "player") && item.id === "courses")
                        ? "active"
                        : ""
                    }
                    onClick={() => {
                      setPage(item.id);
                      close();
                    }}
                  >
                    <i><NavIcon name={item.id} /></i>
                    {!canEditCourses && item.id === "courses" ? "Мои курсы" : item.label}
                  </button>
                ))}
              </div>
            );
          })}
        </nav>
        <div className="sideBottom">
          <button>
            <i><NavIcon name="help" /></i>Помощь
          </button>
          <div className="profile">
            <span>{avatarUrl ? <img src={avatarUrl} alt={displayName}/> : initials}</span>
            <div>
              <b>{displayName}</b>
              <small>{isAdmin ? "Администратор" : "Ученик"}</small>
            </div>
            <button onClick={signOut} title="Выйти">
              <NavIcon name="logout" />
            </button>
          </div>
        </div>
      </aside>
      {open && (
        <button className="scrim" onClick={close} aria-label="Закрыть меню" />
      )}
    </>
  );
}

function Header({ title, toggleNav }: { title: string; toggleNav: () => void }) {
  const navigate = useNavigate();
  const { initials, displayName, avatarUrl, user, session, isAdmin, canEditCourses, signOut } = useAuth();
  const { courses } = useCourses();
  const [accountMenu, setAccountMenu] = useState(false);
  const [accountDialog, setAccountDialog] = useState<"settings" | "logout" | null>(null);
  const [notifications, setNotifications] = useState(() => localStorage.getItem("lingvaedu-notifications") !== "false");
  const [darkTheme, setDarkTheme] = useState(() => document.documentElement.dataset.theme === "dark");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [matchedUsers, setMatchedUsers] = useState<{ id: string; fullName: string; email: string }[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const openDialog = (dialog: "settings" | "logout") => { setAccountMenu(false); setAccountDialog(dialog); };
  const toggleTheme = () => {
    const next = !darkTheme;
    setDarkTheme(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    document.documentElement.style.colorScheme = next ? "dark" : "light";
    localStorage.setItem("lingvaedu-theme", next ? "dark" : "light");
  };
  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
        setSearchOpen(true);
      }
      if (event.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);
  useEffect(() => {
    const normalized = searchQuery.trim();
    if (!isAdmin || normalized.length < 2 || !session?.access_token) {
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/users", {
          headers: { Authorization: `Bearer ${session.access_token}` },
          signal: controller.signal,
        });
        const payload = await response.json() as { users?: { id: string; fullName: string; email: string }[] };
        const needle = normalized.toLocaleLowerCase();
        setMatchedUsers((payload.users || []).filter((entry) =>
          `${entry.fullName} ${entry.email}`.toLocaleLowerCase().includes(needle),
        ).slice(0, 4));
      } catch {
        if (!controller.signal.aborted) setMatchedUsers([]);
      }
    }, 220);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [isAdmin, searchQuery, session?.access_token]);

  const searchResults = useMemo(() => {
    const needle = searchQuery.trim().toLocaleLowerCase();
    if (!needle) return [];
    const pageResults = [
      { label: "Обзор", description: "Главная панель", path: "/", keywords: "главная статистика обзор" },
      { label: "Курсы", description: "Все учебные курсы", path: "/courses", keywords: "обучение уроки курсы" },
      { label: "Группы", description: "Учебные группы", path: "/groups", keywords: "группы ученики" },
      { label: "Календарь", description: "Встречи и события", path: "/calendar", keywords: "календарь события встречи" },
      { label: "Видеокомнаты", description: "Комнаты для звонков", path: "/video-rooms", keywords: "видео звонки комнаты" },
      ...(isAdmin ? [
        { label: "Пользователи", description: "Ученики и сотрудники", path: "/users", keywords: "пользователи ученики сотрудники" },
        { label: "Отчёты", description: "Результаты обучения", path: "/reports", keywords: "отчеты аналитика результаты" },
        { label: "Роли и права", description: "Права доступа", path: "/roles", keywords: "роли права доступ" },
      ] : []),
    ].filter((entry) => `${entry.label} ${entry.keywords}`.toLocaleLowerCase().includes(needle))
      .map((entry) => ({ ...entry, type: "Раздел" }));
    const courseResults = courses
      .filter((course) => `${course.title} ${course.description} ${course.language}`.toLocaleLowerCase().includes(needle))
      .slice(0, 5)
      .map((course) => ({
        label: course.title,
        description: `${course.language} · ${course.modules.reduce((total, module) => total + module.lessons.length, 0)} уроков`,
        path: canEditCourses ? `/courses/editor?course=${course.id}` : `/courses/learn?course=${course.id}`,
        type: "Курс",
      }));
    const userResults = (needle.length >= 2 ? matchedUsers : []).map((entry) => ({
      label: entry.fullName || entry.email,
      description: entry.email,
      path: `/users?search=${encodeURIComponent(entry.email)}`,
      type: "Пользователь",
    }));
    return [...courseResults, ...userResults, ...pageResults].slice(0, 8);
  }, [canEditCourses, courses, isAdmin, matchedUsers, searchQuery]);

  const openSearchResult = (path: string) => {
    setSearchOpen(false);
    setSearchQuery("");
    navigate(path);
  };
  return (
    <header className="topbar">
      <button className="menuBtn" onClick={toggleNav} aria-label="Показать или скрыть меню" title="Показать или скрыть меню">
        <span/><span/><span/>
      </button>
      <div className="crumb">
        <span>LingvaEdu</span>
        <i>/</i>
        <b>{title}</b>
      </div>
      <div className="globalSearchWrap" onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setSearchOpen(false);
      }}>
        <label className="globalSearch">
          <span aria-hidden="true">⌕</span>
          <input
            ref={searchInputRef}
            value={searchQuery}
            onChange={(event) => { setSearchQuery(event.target.value); setSearchOpen(true); }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && searchResults[0]) openSearchResult(searchResults[0].path);
            }}
            placeholder="Найти курс, ученика или раздел"
            aria-label="Глобальный поиск"
            aria-expanded={searchOpen}
          />
          <kbd>Ctrl K</kbd>
        </label>
        {searchOpen && searchQuery.trim() && (
          <div className="globalSearchResults" role="listbox">
            {searchResults.length ? searchResults.map((result) => (
              <button key={`${result.type}-${result.path}`} onClick={() => openSearchResult(result.path)} role="option">
                <span>{result.type === "Курс" ? "▤" : result.type === "Пользователь" ? "○" : "⌁"}</span>
                <div><b>{result.label}</b><small>{result.description}</small></div>
                <em>{result.type}</em>
              </button>
            )) : <p>Ничего не найдено</p>}
          </div>
        )}
      </div>
      <div className="accountMenuWrap">
        <button className={`topAvatar ${accountMenu ? "active" : ""}`} onClick={() => setAccountMenu((value) => !value)} aria-expanded={accountMenu} aria-label="Меню аккаунта" title={displayName}>{avatarUrl ? <img src={avatarUrl} alt={displayName}/> : initials}</button>
        {accountMenu && <><button className="accountMenuScrim" aria-label="Закрыть меню аккаунта" onClick={() => setAccountMenu(false)} /><div className="accountDropdown"><div className="accountSummary"><span>{avatarUrl ? <img src={avatarUrl} alt={displayName}/> : initials}</span><div><b>{displayName}</b><small>{user?.email}</small></div></div><button onClick={() => { setAccountMenu(false); navigate("/profile"); }}><span className="accountMenuIcon"><AccountMenuIcon kind="profile" /></span>Мой профиль</button><button onClick={() => openDialog("settings")}><span className="accountMenuIcon"><AccountMenuIcon kind="settings" /></span>Настройки</button><button onClick={toggleTheme}><span className="accountMenuIcon"><AccountMenuIcon kind={darkTheme ? "sun" : "moon"} /></span>{darkTheme ? "Светлая тема" : "Тёмная тема"}<i className={`themeState ${darkTheme ? "on" : ""}`} /></button><hr/><button className="accountLogout" onClick={() => openDialog("logout")}><span className="accountMenuIcon"><AccountMenuIcon kind="logout" /></span>Выйти</button></div></>}
      </div>
      {accountDialog === "settings" && <Modal title="Настройки" close={() => setAccountDialog(null)}><div className="accountSettings"><label><div><b>Уведомления</b><small>Показывать новости курсов и напоминания</small></div><input type="checkbox" checked={notifications} onChange={(e) => setNotifications(e.target.checked)}/><i/></label><button className="btn primary full" onClick={() => { localStorage.setItem("lingvaedu-notifications", String(notifications)); setAccountDialog(null); }}>Сохранить настройки</button></div></Modal>}
      {accountDialog === "logout" && <Modal title="Выйти из аккаунта?" close={() => setAccountDialog(null)}><div className="logoutDialog"><p>Вы действительно хотите завершить текущий сеанс?</p><div><button className="btn ghost" onClick={() => setAccountDialog(null)}>Отмена</button><button className="btn logoutConfirm" onClick={async () => { setAccountDialog(null); await signOut(); }}>Выйти</button></div></div></Modal>}
    </header>
  );
}

function Shell({
  page,
  setPage,
  children,
}: {
  page: Page;
  setPage: (p: Page) => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("lingvaedu-sidebar-collapsed") === "true");
  const toggleNav = () => {
    if (window.matchMedia("(max-width: 820px)").matches) setOpen(true);
    else setCollapsed((current) => {
      const next = !current;
      localStorage.setItem("lingvaedu-sidebar-collapsed", String(next));
      return next;
    });
  };
  const hideNav = () => {
    if (window.matchMedia("(max-width: 820px)").matches) setOpen(false);
    else {
      setCollapsed(true);
      localStorage.setItem("lingvaedu-sidebar-collapsed", "true");
    }
  };
  const title =
    page === "editor"
      ? "Редактор курса"
      : page === "profile"
        ? "Мой профиль"
      : nav.flatMap((n) => n.items).find((i) => i.id === page)?.label ||
        "Обзор";
  return (
    <div className={`app ${collapsed ? "sidebarCollapsed" : ""}`}>
      <Sidebar
        page={page}
        setPage={setPage}
        open={open}
        close={() => setOpen(false)}
        hide={hideNav}
      />
      <div className="mainShell">
        <Header title={title} toggleNav={toggleNav} />
        {children}
      </div>
    </div>
  );
}

function PageTitle({
  eyebrow,
  title,
  text,
  action,
  secondary,
}: {
  eyebrow?: string;
  title: string;
  text?: string;
  action?: React.ReactNode;
  secondary?: React.ReactNode;
}) {
  return (
    <div className="pageTitle">
      <div>
        {eyebrow && <span>{eyebrow}</span>}
        <h1>{title}</h1>
        {text && <p>{text}</p>}
      </div>
      <div className="titleActions">
        {secondary}
        {action}
      </div>
    </div>
  );
}

type DashboardStats = {
  studentCount: number;
  activeUsers30d: number;
  groupCount: number;
  enrollmentCount: number;
};

function Overview({ go }: { go: (p: Page) => void }) {
  const navigate = useNavigate();
  const { displayName, canEditCourses, session, user } = useAuth();
  const { courses, loading, enrolledCourseIds, progress, createCourse } = useCourses();
  const [organization, setOrganization] = useState<DashboardStats | null>(null);
  const firstName = displayName.split(/\s+/)[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Доброе утро" : hour < 18 ? "Добрый день" : "Добрый вечер";
  const currentDate = new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date()).toUpperCase();

  useEffect(() => {
    if (!canEditCourses || !session?.access_token) return;
    let active = true;
    void fetch("/api/dashboard", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    }).then(async (response) => {
      const type = response.headers.get("content-type") || "";
      if (!response.ok || !type.includes("application/json")) return null;
      return response.json() as Promise<{ stats?: DashboardStats }>;
    }).then((payload) => {
      if (active && payload?.stats) setOrganization(payload.stats);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [canEditCourses, session?.access_token]);

  const availableCourses = useMemo(() => canEditCourses
    ? courses
    : courses.filter((course) => course.status === "published" && enrolledCourseIds.includes(course.id)),
  [canEditCourses, courses, enrolledCourseIds]);

  const courseProgress = (course: (typeof courses)[number]) => {
    const lessons = course.modules.flatMap((module) => module.lessons);
    if (!lessons.length) return 0;
    if (canEditCourses) {
      const ready = lessons.filter((lesson) => lesson.blocks.length > 0).length;
      return Math.round((ready / lessons.length) * 100);
    }
    if (!user?.id) return 0;
    const completed = progress.filter((item) => item.courseId === course.id && item.status === "completed");
    return Math.round((lessons.filter((lesson) => completed.some((item) => item.lessonId === lesson.id)).length / lessons.length) * 100);
  };

  const totalLessons = availableCourses.reduce((sum, course) => sum + course.modules.reduce((count, module) => count + module.lessons.length, 0), 0);
  const totalBlocks = availableCourses.reduce((sum, course) => sum + course.modules.reduce((moduleSum, module) => moduleSum + module.lessons.reduce((lessonSum, lesson) => lessonSum + lesson.blocks.length, 0), 0), 0);
  const completedCourses = availableCourses.filter((course) => courseProgress(course) === 100).length;
  const completedLessons = !canEditCourses && user?.id ? availableCourses.reduce((sum, course) => sum + course.modules.flatMap((module) => module.lessons).filter((lesson) => progress.some((item) => item.courseId === course.id && item.lessonId === lesson.id && item.status === "completed")).length, 0) : 0;
  const averageProgress = availableCourses.length
    ? Math.round(availableCourses.reduce((sum, course) => sum + courseProgress(course), 0) / availableCourses.length)
    : 0;
  const assignmentCount = organization?.enrollmentCount ?? courses.reduce((sum, course) => sum + course.students, 0);
  const published = courses.filter((course) => course.status === "published").length;
  const draft = courses.filter((course) => course.status === "draft").length;
  const archived = courses.filter((course) => course.status === "archived").length;
  const recentCourses = [...availableCourses].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 3);
  const chartCourses = [...availableCourses].sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()).slice(-7);
  const chartValues = chartCourses.map((course) => course.modules.reduce((sum, module) => sum + module.lessons.reduce((count, lesson) => count + lesson.blocks.length, 0), 0));
  const chartMax = Math.max(1, ...chartValues);

  const create = () => {
    const course = createCourse();
    navigate(`/courses/editor?course=${course.id}`);
  };

  return (
    <main className="content fade dashboardReal">
      <PageTitle
        eyebrow={currentDate}
        title={`${greeting}, ${firstName}`}
        text={canEditCourses ? "Актуальное состояние учебной платформы." : "Ваш прогресс и назначенные курсы."}
        action={canEditCourses ? <button className="btn primary" onClick={create}>＋ Создать курс</button> : undefined}
      />
      <section className="metricGrid">
        {canEditCourses ? <>
          <Metric icon="♙" label={organization ? "Ученики" : "Назначения ученикам"} value={loading ? "…" : String(organization?.studentCount ?? assignmentCount)} delta="" note={organization ? `${organization.activeUsers30d} активны за 30 дней` : "по всем курсам"} tone="violet" />
          <Metric icon="▤" label="Опубликовано курсов" value={loading ? "…" : String(published)} delta="" note={`из ${courses.length} курсов`} tone="blue" />
          <Metric icon="◎" label="Учебные материалы" value={loading ? "…" : String(totalBlocks)} delta="" note={`${totalLessons} уроков`} tone="green" />
          <Metric icon="◉" label="Учебные группы" value={organization ? String(organization.groupCount) : "—"} delta="" note={organization ? `${assignmentCount} назначений` : "доступно через сервер API"} tone="orange" />
        </> : <>
          <Metric icon="▤" label="Назначено курсов" value={loading ? "…" : String(availableCourses.length)} delta="" note={`${completedCourses} завершено`} tone="violet" />
          <Metric icon="✓" label="Пройдено уроков" value={String(completedLessons)} delta="" note={`из ${totalLessons} уроков`} tone="blue" />
          <Metric icon="◎" label="Общий прогресс" value={`${averageProgress}%`} delta="" note="по назначенным курсам" tone="green" />
          <Metric icon="▦" label="Учебные материалы" value={String(totalBlocks)} delta="" note="доступно в курсах" tone="orange" />
        </>}
      </section>
      <div className="overviewGrid">
        <section className="panel activityPanel">
          <PanelHead title="Наполнение курсов" text="Количество блоков в последних курсах" />
          {chartCourses.length ? <div className="chart dashboardChart">
            <div className="yLabels"><span>{chartMax}</span><span>{Math.round(chartMax / 2)}</span><span>0</span></div>
            <div className="bars">{chartCourses.map((course, index) => <div className="barCol" key={course.id} title={`${course.title}: ${chartValues[index]} блоков`}>
              <div className="barTrack"><i style={{ height: `${Math.max(4, (chartValues[index] / chartMax) * 100)}%` }} className={index === chartCourses.length - 1 ? "hot" : ""} /></div>
              <span>{course.code.slice(0, 6)}</span>
            </div>)}</div>
          </div> : <div className="dashboardEmpty">Курсы появятся здесь после создания.</div>}
        </section>
        <section className="panel upcoming dashboardCatalog">
          <PanelHead title="Состояние каталога" action={<button className="linkBtn" onClick={() => go("courses")}>Открыть курсы</button>} />
          <div className="dashboardStatusList">
            <button onClick={() => go("courses")}><i className="published" /> <span><b>Опубликованные</b><small>Доступны ученикам</small></span><strong>{published}</strong></button>
            <button onClick={() => go("courses")}><i className="draft" /> <span><b>Черновики</b><small>Ожидают публикации</small></span><strong>{draft}</strong></button>
            <button onClick={() => go("courses")}><i className="archived" /> <span><b>Архив</b><small>Скрытые курсы</small></span><strong>{archived}</strong></button>
          </div>
        </section>
      </div>
      <section className="panel coursesPanel">
        <PanelHead title={canEditCourses ? "Недавно обновлённые курсы" : "Продолжить обучение"} text={canEditCourses ? "Реальные данные из каталога" : "Ваш текущий прогресс"} action={<button className="linkBtn" onClick={() => go("courses")}>Все курсы</button>} />
        {recentCourses.length ? <div className="courseTiles">{recentCourses.map((course, index) => {
          const lessons = course.modules.reduce((sum, module) => sum + module.lessons.length, 0);
          const progress = courseProgress(course);
          const tones = ["violet", "blue", "green"];
          return <article key={course.id} onClick={() => navigate(canEditCourses ? `/courses/editor?course=${course.id}` : `/courses/learn?course=${course.id}`)}>
            <div className={`courseIcon ${tones[index % tones.length]}`}>{course.code.slice(0, 3).toUpperCase()}</div>
            <div className="courseTitle"><b>{course.title}</b><span>{lessons} уроков · {course.students} учеников</span></div>
            <div className="ring" style={{ "--value": `${progress * 3.6}deg` } as React.CSSProperties}><span>{progress}%</span></div>
          </article>;
        })}</div> : <div className="dashboardEmpty">Доступных курсов пока нет.</div>}
      </section>
    </main>
  );
}

function Metric({
  icon,
  label,
  value,
  delta,
  note,
  tone,
}: {
  icon: string;
  label: string;
  value: string;
  delta: string;
  note: string;
  tone: string;
}) {
  return (
    <article className="metric">
      <div className={`metricIcon ${tone}`}>{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>
        {delta && <b>↗ {delta}</b>} {note}
      </p>
    </article>
  );
}
function PanelHead({
  title,
  text,
  action,
}: {
  title: string;
  text?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="panelHead">
      <div>
        <h2>{title}</h2>
        {text && <p>{text}</p>}
      </div>
      {action}
    </div>
  );
}
function Event({
  time,
  date,
  title,
  people,
  color,
}: {
  time: string;
  date: string;
  title: string;
  people: string;
  color: string;
}) {
  return (
    <div className="event">
      <div className={`dateBlock ${color}`}>
        <b>{time}</b>
        <span>{date}</span>
      </div>
      <div>
        <b>{title}</b>
        <span>♙ {people}</span>
      </div>
      <button>•••</button>
    </div>
  );
}

function Courses({ go }: { go: (p: Page) => void }) {
  const [q, setQ] = useState("");
  const rows = courseRows.filter((c) =>
    c.title.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <main className="content fade">
      <PageTitle
        title="Курсы"
        text="Создавайте программы обучения и управляйте их содержанием."
        action={
          <button className="btn primary" onClick={() => go("editor")}>
            ＋ Новый курс
          </button>
        }
      />
      <div className="tabs">
        <button className="active">
          Все курсы <span>12</span>
        </button>
        <button>
          Опубликованные <span>8</span>
        </button>
        <button>
          Черновики <span>3</span>
        </button>
        <button>
          Архив <span>1</span>
        </button>
      </div>
      <div className="toolbar">
        <label>
          <span>⌕</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Поиск по курсам"
          />
        </label>
        <button className="filter">Язык: Все ⌄</button>
        <button className="filter">Автор: Все ⌄</button>
        <button className="viewToggle">▦　☷</button>
      </div>
      <div className="courseGrid">
        {rows.map((c, i) => (
          <article className="courseCard" key={c.title}>
            <div className={`courseCover ${c.color}`}>
              <span>{c.code}</span>
              <div className="coverDots">•••</div>
              <small>{i === 3 ? "BUSINESS" : "LINGVA COURSE"}</small>
            </div>
            <div className="courseInfo">
              <div className="statusRow">
                <span
                  className={c.status === "Черновик" ? "draft" : "published"}
                >
                  ● {c.status}
                </span>
                <small>Обновлён {i + 2} дня назад</small>
              </div>
              <h3>{c.title}</h3>
              <p>
                Практический курс с упражнениями, живыми встречами и поддержкой
                наставника.
              </p>
              <div className="courseStats">
                <span>▤ {c.lessons} урока</span>
                <span>♙ {c.students} учеников</span>
              </div>
              <div className="mentor">
                <span>{c.mentor.slice(0, 2)}</span>
                <div>
                  <small>НАСТАВНИК</small>
                  <b>{c.mentor}</b>
                </div>
                <button onClick={() => go("editor")}>Редактировать →</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}

const seedBlocks: LessonBlock[] = [
  {
    id: 1,
    kind: "text",
    title: "Приветствие и цель урока",
    description: "Форматированный текст · 486 символов",
  },
  {
    id: 2,
    kind: "media",
    title: "Знакомство в деловой среде",
    description: "Видео · MP4 · 04:32",
  },
  {
    id: 3,
    kind: "quiz",
    title: "Выберите правильное приветствие",
    description: "Один ответ · 4 варианта · 2 попытки",
  },
  {
    id: 4,
    kind: "file",
    title: "Useful phrases.pdf",
    description: "PDF · 2,4 МБ · доступен для скачивания",
  },
];

const palette: {
  kind: BlockKind;
  icon: string;
  title: string;
  desc: string;
}[] = [
  {
    kind: "text",
    icon: "T",
    title: "Текст",
    desc: "Заголовки и форматирование",
  },
  {
    kind: "media",
    icon: "▶",
    title: "Медиа",
    desc: "Видео, аудио и изображения",
  },
  { kind: "quiz", icon: "✓", title: "Задание", desc: "Тесты и практика" },
  {
    kind: "html",
    icon: "</>",
    title: "HTML-код",
    desc: "Встраиваемый контент",
  },
  { kind: "file", icon: "↥", title: "Файл", desc: "PDF, PPT, DOC и другое" },
];

function Editor({ back }: { back: () => void }) {
  const [blocks, setBlocks] = useState(seedBlocks);
  const [selected, setSelected] = useState(3);
  const [saved, setSaved] = useState(true);
  const add = (p: (typeof palette)[number]) => {
    setBlocks([
      ...blocks,
      {
        id: Date.now(),
        kind: p.kind,
        title:
          p.title === "Задание"
            ? "Новое практическое задание"
            : `Новый блок: ${p.title}`,
        description: p.desc,
      },
    ]);
    setSaved(false);
  };
  return (
    <main className="editorPage fade">
      <div className="editorTop">
        <button className="backBtn" onClick={back}>
          ←
        </button>
        <div>
          <span>English for work</span>
          <b>Урок 1. First impressions</b>
        </div>
        <div className="saveState">
          <i className={saved ? "saved" : ""} />
          {saved ? "Все изменения сохранены" : "Есть несохранённые изменения"}
        </div>
        <button className="btn ghost">Предпросмотр</button>
        <button className="btn primary" onClick={() => setSaved(true)}>
          Сохранить
        </button>
      </div>
      <div className="editorLayout">
        <aside className="lessonTree">
          <div className="treeHead">
            <span>СОДЕРЖАНИЕ КУРСА</span>
            <button>＋</button>
          </div>
          <div className="module">
            <button className="moduleTitle">
              <span>⋮⋮</span>
              <div>
                <small>МОДУЛЬ 1</small>
                <b>Start communicating</b>
              </div>
              <i>⌃</i>
            </button>
            {[
              "First impressions",
              "Introduce yourself",
              "Meet the team",
              "Checkpoint",
            ].map((x, i) => (
              <button
                className={`treeLesson ${i === 0 ? "active" : ""}`}
                key={x}
              >
                <i>{i === 3 ? "✓" : i + 1}</i>
                <span>
                  {x}
                  <small>
                    {i === 3 ? "Тест · 10 вопросов" : `${4 + i} блоков`}
                  </small>
                </span>
                {i === 0 && <b>•••</b>}
              </button>
            ))}
          </div>
          <div className="module">
            <button className="moduleTitle">
              <span>⋮⋮</span>
              <div>
                <small>МОДУЛЬ 2</small>
                <b>Everyday work</b>
              </div>
              <i>⌄</i>
            </button>
          </div>
          <button className="addModule">＋ Добавить модуль</button>
        </aside>
        <section className="canvas">
          <div className="canvasHead">
            <div>
              <span>УРОК 1</span>
              <input defaultValue="First impressions" />
              <p>
                Научитесь знакомиться и производить хорошее первое впечатление.
              </p>
            </div>
            <button>⚙ Настройки урока</button>
          </div>
          <div className="blockCanvas">
            {blocks.map((b, i) => (
              <article
                key={b.id}
                className={`lessonBlock ${selected === i ? "selected" : ""}`}
                onClick={() => setSelected(i)}
              >
                <span className="drag">⋮⋮</span>
                <div className={`blockGlyph ${b.kind}`}>
                  {palette.find((p) => p.kind === b.kind)?.icon}
                </div>
                <div>
                  <b>{b.title}</b>
                  <p>{b.description}</p>
                </div>
                <button>•••</button>
              </article>
            ))}
            <div className="insertLine">
              <span>＋</span>
            </div>
          </div>
        </section>
        <aside className="blockPalette">
          <div>
            <span>БЛОКИ</span>
            <p>Добавьте блок в конец урока</p>
          </div>
          {palette.map((p) => (
            <button key={p.kind} onClick={() => add(p)}>
              <i className={p.kind}>{p.icon}</i>
              <span>
                <b>{p.title}</b>
                <small>{p.desc}</small>
              </span>
              <em>＋</em>
            </button>
          ))}
          <div className="paletteTip">
            <i>!</i>
            <p>
              <b>Перетаскивайте блоки</b>
              <br />
              Меняйте порядок элементов прямо в уроке.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}

function People() {
  const [q, setQ] = useState("");
  const list = useMemo(
    () =>
      people.filter((p) =>
        (p.name + p.email).toLowerCase().includes(q.toLowerCase()),
      ),
    [q],
  );
  const [modal, setModal] = useState(false);
  return (
    <main className="content fade">
      <PageTitle
        title="Пользователи"
        text="Управляйте учениками, сотрудниками и наставниками."
        secondary={<button className="btn ghost">Пригласить по ссылке</button>}
        action={
          <button className="btn primary" onClick={() => setModal(true)}>
            ＋ Добавить пользователя
          </button>
        }
      />
      <section className="peopleSummary">
        <div>
          <span className="violet">♙</span>
          <p>
            Всего пользователей<b>1 248</b>
          </p>
        </div>
        <div>
          <span className="green">●</span>
          <p>
            Активны за 30 дней<b>1 086</b>
          </p>
        </div>
        <div>
          <span className="orange">◎</span>
          <p>
            Наставники<b>24</b>
          </p>
        </div>
        <div>
          <span className="blue">◉</span>
          <p>
            Группы<b>38</b>
          </p>
        </div>
      </section>
      <div className="toolbar">
        <label>
          <span>⌕</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Имя или электронная почта"
          />
        </label>
        <button className="filter">Все роли ⌄</button>
        <button className="filter">Все группы ⌄</button>
        <button className="filter">Статус: Активные ⌄</button>
        <button className="export">⇩ Экспорт</button>
      </div>
      <div className="dataTable">
        <div className="dataRow head">
          <span>ПОЛЬЗОВАТЕЛЬ</span>
          <span>РОЛЬ</span>
          <span>ГРУППА</span>
          <span>КУРСЫ</span>
          <span>ПРОГРЕСС</span>
          <span>АКТИВНОСТЬ</span>
          <span />
        </div>
        {list.map((p, i) => (
          <div className="dataRow" key={p.email}>
            <div className="personCell">
              <span className={`avatarColor a${i}`}>{p.initials}</span>
              <div>
                <b>{p.name}</b>
                <small>{p.email}</small>
              </div>
            </div>
            <span>
              <mark
                className={
                  p.role === "Ученик"
                    ? "student"
                    : p.role === "Наставник"
                      ? "mentor"
                      : "manager"
                }
              >
                {p.role}
              </mark>
            </span>
            <span>{p.group}</span>
            <span>{p.courses}</span>
            <span>
              <div className="inlineProgress">
                <i style={{ width: `${p.progress}%` }} />
              </div>
              <b>{p.progress}%</b>
            </span>
            <span className="muted">{p.active}</span>
            <button>•••</button>
          </div>
        ))}
      </div>
      {modal && (
        <Modal title="Добавить пользователя" close={() => setModal(false)}>
          <label>
            Имя и фамилия
            <input placeholder="Например, Алия Касымова" />
          </label>
          <label>
            Электронная почта
            <input placeholder="name@company.kz" type="email" />
          </label>
          <div className="modalGrid">
            <label>
              Роль
              <select>
                <option>Ученик</option>
                <option>Наставник</option>
                <option>Менеджер</option>
              </select>
            </label>
            <label>
              Группа
              <select>
                <option>Без группы</option>
                <option>Sales Team</option>
                <option>Newcomers</option>
              </select>
            </label>
          </div>
          <button className="btn primary full" onClick={() => setModal(false)}>
            Добавить и отправить приглашение
          </button>
        </Modal>
      )}
    </main>
  );
}

function Reports() {
  return (
    <main className="content fade">
      <PageTitle
        title="Отчёты"
        text="20 ключевых метрик обучения в одном месте."
        secondary={<button className="btn ghost">13 июл — 13 авг ⌄</button>}
        action={<button className="btn primary">⇩ Скачать отчёт</button>}
      />
      <div className="reportFilters">
        <button>Все курсы ⌄</button>
        <button>Все группы ⌄</button>
        <button>Все наставники ⌄</button>
        <span>Данные обновлены 5 минут назад</span>
      </div>
      <section className="metricGrid reportMetrics">
        <Metric
          icon="◎"
          label="Завершаемость"
          value="78,6%"
          delta="+4,2%"
          note="к прошлому периоду"
          tone="violet"
        />
        <Metric
          icon="★"
          label="Средний балл"
          value="8,4 / 10"
          delta="+0,6"
          note="к прошлому периоду"
          tone="orange"
        />
        <Metric
          icon="◷"
          label="Время обучения"
          value="6,2 ч"
          delta="+11%"
          note="на ученика"
          tone="blue"
        />
        <Metric
          icon="↻"
          label="Возврат к обучению"
          value="84%"
          delta="+2,8%"
          note="за 30 дней"
          tone="green"
        />
      </section>
      <div className="reportGrid">
        <section className="panel completion">
          <PanelHead
            title="Динамика завершения"
            text="Процент завершённых уроков"
            action={<button className="quiet">По неделям ⌄</button>}
          />
          <div className="lineChart">
            <div className="chartLines">
              <i />
              <i />
              <i />
              <i />
            </div>
            <div className="lineFill" />
            <div className="lineStroke">●　　　●　　 ●　　　●　　 ●</div>
            <div className="xaxis">
              <span>15 июл</span>
              <span>22 июл</span>
              <span>29 июл</span>
              <span>5 авг</span>
              <span>12 авг</span>
            </div>
          </div>
        </section>
        <section className="panel effectiveness">
          <PanelHead
            title="Эффективность курсов"
            text="По среднему результату"
          />
          <div>
            {courseRows.slice(0, 4).map((c, i) => (
              <div className="effectRow" key={c.title}>
                <span>{i + 1}</span>
                <div>
                  <b>{c.title}</b>
                  <small>{c.students || 48} учеников</small>
                </div>
                <div className="effectBar">
                  <i style={{ width: `${[92, 87, 81, 74][i]}%` }} />
                </div>
                <strong>{[92, 87, 81, 74][i]}%</strong>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

type CalendarEventRecord = {
  id: string;
  title: string;
  description: string;
  start_at: string;
  end_at: string;
  color: "violet" | "blue" | "green" | "orange" | "pink";
  audience: "all" | "students" | "staff";
  course_id: string | null;
};

const calendarDayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const calendarDateTimeValue = (date: Date) => `${calendarDayKey(date)}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
const calendarSameDay = (a: Date, b: Date) => calendarDayKey(a) === calendarDayKey(b);
const calendarMonday = (date: Date) => {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() - ((next.getDay() + 6) % 7));
  return next;
};

function Calendar() {
  const { canEditCourses } = useAuth();
  const { courses } = useCourses();
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState(() => new Date());
  const [view, setView] = useState<"month" | "week">("month");
  const [events, setEvents] = useState<CalendarEventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<CalendarEventRecord | "new" | null>(null);
  const [saving, setSaving] = useState(false);

  const loadEvents = async () => {
    if (!supabase) {
      setError("Подключение Supabase не настроено");
      setLoading(false);
      return;
    }
    setLoading(true);
    const from = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1).toISOString();
    const to = new Date(cursor.getFullYear(), cursor.getMonth() + 2, 1).toISOString();
    const result = await supabase.from("calendar_events").select("id,title,description,start_at,end_at,color,audience,course_id").gte("start_at", from).lt("start_at", to).order("start_at");
    if (result.error) setError(result.error.message.includes("calendar_events") ? "Выполните миграцию 009_calendar_events.sql в Supabase" : result.error.message);
    else {
      setEvents((result.data || []) as CalendarEventRecord[]);
      setError("");
    }
    setLoading(false);
  };

  useEffect(() => { const request = window.setTimeout(() => void loadEvents(), 0); return () => window.clearTimeout(request); }, [cursor.getFullYear(), cursor.getMonth()]); // eslint-disable-line react-hooks/exhaustive-deps

  const visibleDays = useMemo(() => {
    if (view === "week") {
      const start = calendarMonday(cursor);
      return Array.from({ length: 7 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index));
    }
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = calendarMonday(first);
    return Array.from({ length: 42 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index));
  }, [cursor, view]);
  const selectedEvents = events.filter((event) => calendarSameDay(new Date(event.start_at), selected));
  const monthTitle = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(cursor);
  const selectedTitle = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(selected);
  const move = (amount: number) => setCursor((value) => view === "month" ? new Date(value.getFullYear(), value.getMonth() + amount, 1) : new Date(value.getFullYear(), value.getMonth(), value.getDate() + amount * 7));
  const openNew = (date = selected) => { setSelected(date); setEditing("new"); };

  const saveEvent = async (form: HTMLFormElement) => {
    if (!supabase) return;
    const data = new FormData(form);
    const start = new Date(String(data.get("start")));
    const end = new Date(String(data.get("end")));
    if (!String(data.get("title") || "").trim() || Number.isNaN(start.getTime()) || end <= start) {
      setError("Заполните название и укажите корректное время окончания");
      return;
    }
    setSaving(true);
    const payload = {
      title: String(data.get("title")).trim(), description: String(data.get("description") || "").trim(),
      start_at: start.toISOString(), end_at: end.toISOString(), color: String(data.get("color")),
      audience: String(data.get("audience")), course_id: String(data.get("courseId") || "") || null,
      updated_at: new Date().toISOString(),
    };
    const result = editing === "new"
      ? await supabase.from("calendar_events").insert(payload)
      : await supabase.from("calendar_events").update(payload).eq("id", editing!.id);
    setSaving(false);
    if (result.error) setError(result.error.message);
    else { setEditing(null); setSelected(start); setCursor(start); await loadEvents(); }
  };

  const removeEvent = async (event: CalendarEventRecord) => {
    if (!supabase || !window.confirm(`Удалить событие «${event.title}»?`)) return;
    const result = await supabase.from("calendar_events").delete().eq("id", event.id);
    if (result.error) setError(result.error.message); else { setEditing(null); await loadEvents(); }
  };

  const formEvent = editing === "new" ? null : editing;
  const defaultStart = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate(), 10, 0);
  const defaultEnd = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate(), 11, 0);
  return (
    <main className="content fade calendarPage">
      <PageTitle title="Календарь" text="Планируйте занятия, встречи и сроки прохождения."
        action={canEditCourses ? <button className="btn primary" onClick={() => openNew()}>＋ Добавить событие</button> : undefined} />
      {error && <div className="calendarError"><span>{error}</span><button onClick={() => void loadEvents()}>Повторить</button></div>}
      <div className="calendarLayout">
        <section className="panel calendar">
          <div className="calendarHead">
            <button aria-label="Предыдущий период" onClick={() => move(-1)}>‹</button>
            <h2>{view === "month" ? monthTitle : `${new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" }).format(visibleDays[0])} — ${new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" }).format(visibleDays[6])}`}</h2>
            <button aria-label="Следующий период" onClick={() => move(1)}>›</button>
            <button className="todayBtn" onClick={() => { setCursor(new Date()); setSelected(new Date()); }}>Сегодня</button>
            <div><button className={view === "month" ? "active" : ""} onClick={() => setView("month")}>Месяц</button><button className={view === "week" ? "active" : ""} onClick={() => setView("week")}>Неделя</button></div>
          </div>
          <div className="weekdays">{["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"].map((day) => <span key={day}>{day}</span>)}</div>
          <div className={`calendarGrid ${view === "week" ? "weekView" : ""}`}>
            {visibleDays.map((date) => {
              const dayEvents = events.filter((event) => calendarSameDay(new Date(event.start_at), date));
              return <div key={calendarDayKey(date)} className={`${date.getMonth() !== cursor.getMonth() && view === "month" ? "other" : ""} ${calendarSameDay(date, today) ? "today" : ""} ${calendarSameDay(date, selected) ? "selected" : ""}`}
                onClick={() => setSelected(date)} onDoubleClick={() => canEditCourses && openNew(date)}>
                <span>{date.getDate()}</span>
                {dayEvents.slice(0, 3).map((event) => <button key={event.id} className={`calEvent ${event.color}`} onClick={(click) => { click.stopPropagation(); setSelected(date); if (canEditCourses) setEditing(event); }}><time>{new Date(event.start_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</time> {event.title}</button>)}
                {dayEvents.length > 3 && <small className="moreEvents">Ещё {dayEvents.length - 3}</small>}
              </div>;
            })}
          </div>
        </section>
        <aside className="panel agenda">
          <PanelHead title={selectedTitle} text={`${selectedEvents.length} ${selectedEvents.length === 1 ? "событие" : "событий"}`} />
          <div className="agendaTimeline">
            {loading ? <p className="agendaEmpty">Загружаем события…</p> : selectedEvents.length ? selectedEvents.map((event) => {
              const start = new Date(event.start_at); const end = new Date(event.end_at);
              const duration = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));
              const course = courses.find((item) => item.id === event.course_id);
              return <button key={event.id} className="agendaEvent" onClick={() => canEditCourses && setEditing(event)}>
                <span className={`agendaEventTime ${event.color}`}><b>{start.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</b><small>{duration} мин</small></span>
                <span><b>{event.title}</b><small>{course?.title || (event.audience === "students" ? "Для учеников" : event.audience === "staff" ? "Для сотрудников" : "Для всех")}</small></span>
              </button>;
            }) : <div className="agendaEmpty"><span>□</span><b>Событий нет</b><p>{canEditCourses ? "Дважды нажмите на день, чтобы запланировать событие." : "На этот день ничего не запланировано."}</p></div>}
          </div>
          {canEditCourses && <button className="btn ghost full" onClick={() => openNew()}>Добавить на этот день</button>}
        </aside>
      </div>
      {editing && <Modal title={editing === "new" ? "Новое событие" : "Редактировать событие"} close={() => setEditing(null)}>
        <form className="calendarForm" onSubmit={(submit) => { submit.preventDefault(); void saveEvent(submit.currentTarget); }}>
          <label>Название<input name="title" required maxLength={160} defaultValue={formEvent?.title || ""} placeholder="Например, разговорная практика" /></label>
          <label>Описание<textarea name="description" defaultValue={formEvent?.description || ""} placeholder="Добавьте детали встречи" /></label>
          <div className="modalGrid"><label>Начало<input name="start" type="datetime-local" required defaultValue={calendarDateTimeValue(formEvent ? new Date(formEvent.start_at) : defaultStart)} /></label><label>Окончание<input name="end" type="datetime-local" required defaultValue={calendarDateTimeValue(formEvent ? new Date(formEvent.end_at) : defaultEnd)} /></label></div>
          <div className="modalGrid"><label>Доступ<select name="audience" defaultValue={formEvent?.audience || "all"}><option value="all">Для всех</option><option value="students">Для учеников</option><option value="staff">Для сотрудников</option></select></label><label>Курс<select name="courseId" defaultValue={formEvent?.course_id || ""}><option value="">Без привязки к курсу</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label></div>
          <fieldset className="calendarColors"><legend>Цвет события</legend>{(["violet", "blue", "green", "orange", "pink"] as const).map((color) => <label key={color}><input type="radio" name="color" value={color} defaultChecked={(formEvent?.color || "violet") === color} /><i className={color} /></label>)}</fieldset>
          <div className="calendarFormActions">{formEvent && <button type="button" className="btn danger" onClick={() => void removeEvent(formEvent)}>Удалить</button>}<button className="btn primary" disabled={saving}>{saving ? "Сохраняем…" : "Сохранить событие"}</button></div>
        </form>
      </Modal>}
    </main>
  );
}

type PermissionKey =
  | "courses.view" | "courses.edit" | "courses.publish"
  | "users.view" | "users.add" | "users.roles"
  | "reports.view" | "reports.export" | "calls.create";

type AccessRole = {
  id: string;
  name: string;
  description: string;
  color: "violet" | "blue" | "green" | "orange" | "pink";
  permissions: PermissionKey[];
  system?: boolean;
};

const permissionGroups: { title: string; items: { id: PermissionKey; label: string }[] }[] = [
  { title: "Курсы и контент", items: [
    { id: "courses.view", label: "Просматривать назначенные курсы" },
    { id: "courses.edit", label: "Редактировать уроки" },
    { id: "courses.publish", label: "Публиковать изменения" },
  ] },
  { title: "Пользователи", items: [
    { id: "users.view", label: "Просматривать учеников своих групп" },
    { id: "users.add", label: "Добавлять учеников в группу" },
    { id: "users.roles", label: "Изменять роли пользователей" },
  ] },
  { title: "Отчёты и встречи", items: [
    { id: "reports.view", label: "Просматривать отчёты своих групп" },
    { id: "reports.export", label: "Экспортировать отчёты" },
    { id: "calls.create", label: "Создавать видеокомнаты" },
  ] },
];

const allPermissions = permissionGroups.flatMap((group) => group.items.map((item) => item.id));
const defaultRoles: AccessRole[] = [
  { id: "admin", name: "Администратор", description: "Полный доступ ко всем функциям", color: "violet", permissions: allPermissions, system: true },
  { id: "staff", name: "Наставник", description: "Ведёт назначенные курсы и группы", color: "green", permissions: ["courses.view", "courses.edit", "users.view", "users.add", "reports.view", "reports.export", "calls.create"], system: true },
  { id: "student", name: "Ученик", description: "Учится на назначенных курсах", color: "pink", permissions: ["courses.view"], system: true },
];

function readSavedRoles() {
  try {
    const saved = JSON.parse(localStorage.getItem("lingvaedu.roles") || "null") as AccessRole[] | null;
    if (Array.isArray(saved) && saved.length) {
      const custom = saved.filter((role) => !defaultRoles.some((item) => item.id === role.id));
      return defaultRoles.map((role) => saved.find((item) => item.id === role.id) || role).concat(custom);
    }
  } catch { /* use safe defaults */ }
  return defaultRoles;
}

function Roles() {
  const { session } = useAuth();
  const [roles, setRoles] = useState<AccessRole[]>(readSavedRoles);
  const [selectedId, setSelectedId] = useState("staff");
  const [draft, setDraft] = useState<AccessRole>(() => ({ ...defaultRoles[1], permissions: [...defaultRoles[1].permissions] }));
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [message, setMessage] = useState("");
  const selected = roles.find((role) => role.id === selectedId) || roles[0];

  useEffect(() => {
    if (!session?.access_token) return;
    void fetch("/api/users", { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((payload: { users?: { role: string }[] }) => {
        const next: Record<string, number> = {};
        for (const user of payload.users || []) next[user.role] = (next[user.role] || 0) + 1;
        setCounts(next);
      })
      .catch(() => undefined);
  }, [session]);

  const saveRoles = (next: AccessRole[]) => {
    setRoles(next);
    localStorage.setItem("lingvaedu.roles", JSON.stringify(next));
  };
  const selectRole = (id: string) => {
    const role = roles.find((item) => item.id === id);
    if (!role) return;
    setSelectedId(id);
    setDraft({ ...role, permissions: [...role.permissions] });
    setMessage("");
  };
  const saveDraft = () => {
    const name = draft.name.trim();
    if (!name) return;
    const next = roles.map((role) => role.id === draft.id ? { ...draft, name } : role);
    saveRoles(next);
    setMessage("Изменения сохранены");
    window.setTimeout(() => setMessage(""), 2500);
  };
  const createRole = () => {
    const name = newName.trim();
    if (!name) return;
    const role: AccessRole = { id: crypto.randomUUID(), name, description: "Новая пользовательская роль", color: "blue", permissions: [] };
    saveRoles([...roles, role]);
    setSelectedId(role.id); setDraft({ ...role, permissions: [] }); setCreating(false); setNewName(""); setMessage("Роль создана");
  };
  const duplicate = () => {
    const copy: AccessRole = { ...draft, id: crypto.randomUUID(), name: `${draft.name} — копия`, system: false, permissions: [...draft.permissions] };
    saveRoles([...roles, copy]); setSelectedId(copy.id); setDraft({ ...copy, permissions: [...copy.permissions] }); setMessage("Копия роли создана");
  };
  const remove = () => {
    if (draft.system || !window.confirm(`Удалить роль «${draft.name}»?`)) return;
    const next = roles.filter((role) => role.id !== draft.id);
    saveRoles(next); setSelectedId(next[0].id); setDraft({ ...next[0], permissions: [...next[0].permissions] }); setMessage("Роль удалена");
  };

  return (
    <main className="content fade">
      <PageTitle
        title="Роли и права"
        text="Создавайте роли и точно настраивайте доступ к функциям."
        action={<button className="btn primary" onClick={() => setCreating(true)}>＋ Создать роль</button>}
      />
      <div className="roleLayout">
        <section className="roleList panel">
          <PanelHead title="Роли" text={`${roles.length} ролей · ${Object.values(counts).reduce((sum, value) => sum + value, 0)} пользователей`} />
          <select className="roleMobileSelect" value={selectedId} onChange={(event) => selectRole(event.target.value)} aria-label="Выбрать роль">{roles.map((role) => <option value={role.id} key={role.id}>{role.name}</option>)}</select>
          {roles.map((role) => (
            <button className={selectedId === role.id ? "active" : ""} key={role.id} onClick={() => selectRole(role.id)}>
              <span className={role.color}>{role.name[0]}</span>
              <div>
                <b>{role.name}</b>
                <small>{counts[role.id] || 0} пользователей{role.system ? " · системная" : ""}</small>
              </div>
              <i>›</i>
            </button>
          ))}
        </section>
        <section className="permissions panel">
          <div className="permissionHead">
            <div className={`roleBadge ${draft.color}`}>{draft.name[0] || "Р"}</div>
            <div>
              <span>РОЛЬ</span>
              <input className="roleNameInput" value={draft.name} maxLength={60} onChange={(event) => setDraft({ ...draft, name: event.target.value })} aria-label="Название роли" />
              <input className="roleDescriptionInput" value={draft.description} maxLength={160} onChange={(event) => setDraft({ ...draft, description: event.target.value })} aria-label="Описание роли" />
            </div>
            <button className="btn ghost" onClick={duplicate}>Дублировать</button>
          </div>
          {permissionGroups.map((group) => (
            <div className="permissionSection" key={group.title}>
              <h3>{group.title}</h3>
              {group.items.map((permission) => (
                <label key={permission.id}>
                  <span>{permission.label}</span>
                  <input
                    type="checkbox"
                    checked={draft.permissions.includes(permission.id)}
                    onChange={() => setDraft({ ...draft, permissions: draft.permissions.includes(permission.id) ? draft.permissions.filter((id) => id !== permission.id) : [...draft.permissions, permission.id] })}
                  />
                  <i />
                </label>
              ))}
            </div>
          ))}
          <div className="permissionActions"><button className="btn primary" onClick={saveDraft} disabled={!draft.name.trim()}>Сохранить изменения</button>{!draft.system && <button className="btn danger" onClick={remove}>Удалить роль</button>} {message && <span className="roleMessage">✓ {message}</span>}</div>
        </section>
      </div>
      {creating && <Modal title="Создать роль" close={() => setCreating(false)}><form onSubmit={(event) => { event.preventDefault(); createRole(); }}><label>Название роли<input autoFocus required maxLength={60} value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Например, Куратор" /></label><button className="btn primary full" disabled={!newName.trim()}>Создать роль</button></form></Modal>}
    </main>
  );
}

function Modal({
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
      <button className="modalScrim" onClick={close} />
      <section className="modal">
        <div className="modalHead">
          <h2>{title}</h2>
          <button onClick={close}>×</button>
        </div>
        {children}
      </section>
    </div>
  );
}

const paths: Record<Page, string> = {
  overview: "/",
  courses: "/courses",
  editor: "/courses/editor",
  player: "/courses/learn",
  profile: "/profile",
  people: "/users",
  groups: "/groups",
  roles: "/roles",
  reports: "/reports",
  calls: "/video-rooms",
  calendar: "/calendar",
};

const pageByPath = Object.fromEntries(
  Object.entries(paths).map(([page, path]) => [path, page]),
) as Record<string, Page>;

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin, canEditCourses } = useAuth();
  const page = pageByPath[location.pathname] ?? "overview";
  const setPage = (next: Page) => navigate(paths[next]);
  const adminOnlyPages: Page[] = ["people", "reports", "roles"];
  const denied = (!isAdmin && adminOnlyPages.includes(page)) || ((page === "editor" || page === "groups" || page === "calls") && !canEditCourses);
  const content =
    denied ? (
      <main className="content fade">
        <div className="accessDenied panel">
          <span>⌘</span>
          <h1>Только для администратора</h1>
          <p>У вашей учётной записи нет прав для просмотра этого раздела.</p>
          <button className="btn primary" onClick={() => setPage("overview")}>Вернуться на главную</button>
        </div>
      </main>
    ) : page === "overview" ? (
      <Overview go={setPage} />
    ) : page === "courses" ? (
      <CoursesPage />
    ) : page === "editor" ? (
      <CourseEditorPage />
    ) : page === "player" ? (
      <CoursePlayerPage />
    ) : page === "profile" ? (
      <ProfilePage />
    ) : page === "people" ? (
      <UsersPage key={location.search} />
    ) : page === "groups" ? (
      <GroupsPage />
    ) : page === "reports" ? (
      <Reports />
    ) : page === "calls" ? (
      <VideoRoomsPage />
    ) : page === "calendar" ? (
      <Calendar />
    ) : (
      <Roles />
    );
  return (
    <Shell page={page} setPage={setPage}>
      {content}
      {page === "player" && <SelectionTranslator />}
    </Shell>
  );
}
