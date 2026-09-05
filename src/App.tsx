"use client";

import { lazy, Suspense, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./auth/AuthProvider";
import { SelectionTranslator } from "./components/SelectionTranslator";
import { PageState } from "./components/PageState";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ConnectionNotice } from "./components/ConnectionNotice";
import { useCourses } from "./features/courses/CourseProvider";
import { supabase } from "./lib/supabase";

const CoursesPage = lazy(() => import("./features/courses/CoursesPage").then((module) => ({ default: module.CoursesPage })));
const CourseEditorPage = lazy(() => import("./features/courses/CourseEditorPage").then((module) => ({ default: module.CourseEditorPage })));
const CoursePlayerPage = lazy(() => import("./features/courses/CoursePlayerPage").then((module) => ({ default: module.CoursePlayerPage })));
const AssignmentReviewPage = lazy(() => import("./features/courses/AssignmentReviewPage").then((module) => ({ default: module.AssignmentReviewPage })));
const ProfilePage = lazy(() => import("./features/profile/ProfilePage").then((module) => ({ default: module.ProfilePage })));
const UsersPage = lazy(() => import("./features/users/UsersPage").then((module) => ({ default: module.UsersPage })));
const GroupsPage = lazy(() => import("./features/groups/GroupsPage").then((module) => ({ default: module.GroupsPage })));
const VideoRoomsPage = lazy(() => import("./features/video/VideoRoomsPage").then((module) => ({ default: module.VideoRoomsPage })));
const ReportsPage = lazy(() => import("./features/reports/ReportsPage").then((module) => ({ default: module.ReportsPage })));
const RolesPage = lazy(() => import("./features/users/RolesPage").then((module) => ({ default: module.RolesPage })));

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
  | "calendar"
  | "assignments";

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

type HeaderNotification = {
  id: string;
  kind: "assignment" | "reply" | "meeting";
  title: string;
  description: string;
  createdAt: string;
  path: string;
};

type NotificationSubmission = {
  id: string;
  userId: string;
  studentName: string;
  courseId: string;
  lessonId: string;
  updatedAt: string;
};

type NotificationReply = {
  id: string;
  submissionId: string;
  staffName: string;
  updatedAt: string;
};

type NotificationRoom = {
  id: string;
  title: string;
  createdAt: string;
  scheduledAt?: string;
  groupName?: string;
};

type DismissedNotification = {
  id: string;
  dismissedAt: string;
};

const ASSIGNMENT_NOTIFICATIONS_KEY = "lingvaedu-assignment-submissions-v1";
const VIDEO_ROOM_NOTIFICATIONS_KEY = "lingvaedu-video-rooms";
const NOTIFICATIONS_CHANGED_EVENT = "lingvaedu:notifications-changed";

function BellIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z"/><path d="M10 21h4"/></svg>;
}

function NotificationKindIcon({ kind }: { kind: HeaderNotification["kind"] }) {
  const paths = {
    assignment: <><path d="M7 3.5h7l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 20V5a1.5 1.5 0 0 1 1-1.5Z"/><path d="M14 3.5V8h4M9 14l2 2 4-4"/></>,
    reply: <><path d="M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-8l-5 4v-4H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/><path d="m9 10 2 2 4-4"/></>,
    meeting: <><rect x="3" y="6" width="13" height="12" rx="3"/><path d="m16 10 5-3v10l-5-3z"/></>,
  } as const;
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[kind]}</svg>;
}

type MetricIconKind = "users" | "courses" | "materials" | "groups" | "completed" | "progress" | "score" | "time" | "return";

function DashboardMetricIcon({ kind }: { kind: MetricIconKind }) {
  const paths = {
    users: <><path d="M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20"/><circle cx="9.5" cy="7.5" r="3.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 6.7M18 14.7a4 4 0 0 1 3 3.8V20"/></>,
    courses: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5Z"/><path d="M4 5.5v16M8 7h8M8 11h8"/></>,
    materials: <><path d="m12 3 8 4-8 4-8-4 8-4Z"/><path d="m4 12 8 4 8-4M4 17l8 4 8-4"/></>,
    groups: <><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3.5 20v-1.5A4.5 4.5 0 0 1 8 14h2a4.5 4.5 0 0 1 4.5 4.5V20M15 14.5a4 4 0 0 1 5.5 3.7V20"/></>,
    completed: <><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></>,
    progress: <><path d="M12 3a9 9 0 1 0 9 9h-9V3Z"/><path d="M16 3.9A9 9 0 0 1 20.1 8H16V3.9Z"/></>,
    score: <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/>,
    time: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    return: <><path d="M4 8V3m0 0h5M4 3l4 4"/><path d="M5.5 13a7.5 7.5 0 1 0 2-5"/></>,
  } as const;
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[kind]}</svg>;
}

function AddIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 4v12M4 10h12"/></svg>;
}

function NotificationCloseIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m6 6 8 8M14 6l-8 8"/></svg>;
}

function TrashIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 6h12M8 3h4l1 3H7l1-3ZM6 6l.7 11h6.6L14 6M8.5 9v5M11.5 9v5"/></svg>;
}

function RestoreIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5.5 7H2V3.5M2.5 7A7 7 0 1 1 3 14"/></svg>;
}

function readNotificationSources() {
  try {
    const assignments = JSON.parse(localStorage.getItem(ASSIGNMENT_NOTIFICATIONS_KEY) || "{}");
    const rooms = JSON.parse(localStorage.getItem(VIDEO_ROOM_NOTIFICATIONS_KEY) || "[]");
    return {
      submissions: (Array.isArray(assignments.submissions) ? assignments.submissions : []) as NotificationSubmission[],
      replies: (Array.isArray(assignments.replies) ? assignments.replies : []) as NotificationReply[],
      rooms: (Array.isArray(rooms) ? rooms : []) as NotificationRoom[],
    };
  } catch {
    return { submissions: [], replies: [], rooms: [] };
  }
}

function notificationDate(value: string) {
  const date = new Date(value);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  return sameDay
    ? date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

const nav: {
  section?: string;
  items: { id: Page; icon: string; label: string; headerLabel?: string }[];
}[] = [
  { items: [{ id: "overview", icon: "⌂", label: "Обзор" }] },
  {
    section: "ОБУЧЕНИЕ",
    items: [
      { id: "courses", icon: "▤", label: "Курсы" },
      { id: "assignments", icon: "✓", label: "Задания", headerLabel: "Задания учеников" },
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


function Logo() {
  return (
    <div className="logo">
      <b>Lingva<span>Edu</span></b>
    </div>
  );
}

function NavIcon({ name }: { name: Page | "help" | "logout" }) {
  const paths: Partial<Record<typeof name, React.ReactNode>> = {
    overview: <><rect x="3.5" y="3.5" width="7" height="7" rx="2.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="2.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="2.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="2.5"/></>,
    courses: <><rect x="3.5" y="4" width="17" height="16" rx="4"/><path d="M8 4v16M11.5 8h5.5M11.5 12h4.5"/></>,
    assignments: <><rect x="4.5" y="5.5" width="15" height="15" rx="4"/><rect x="8" y="3" width="8" height="5" rx="2"/><path d="m9 14 2 2 4-4"/></>,
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
    "assignments",
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
  const [notificationMenu, setNotificationMenu] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState<"all" | "assignments" | "trash">("all");
  const [notificationItems, setNotificationItems] = useState<HeaderNotification[]>([]);
  const [notificationLoading, setNotificationLoading] = useState(true);
  const notificationReadKey = `lingvaedu-read-notifications:${user?.id || "guest"}`;
  const notificationDismissedKey = `lingvaedu-dismissed-notifications:${user?.id || "guest"}`;
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(`lingvaedu-read-notifications:${user?.id || "guest"}`) || "[]"); }
    catch { return []; }
  });
  const [dismissedNotifications, setDismissedNotifications] = useState<DismissedNotification[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(`lingvaedu-dismissed-notifications:${user?.id || "guest"}`) || "[]");
      const now = new Date().toISOString();
      return Array.isArray(saved) ? saved.map((item) => typeof item === "string" ? { id: item, dismissedAt: now } : item) : [];
    }
    catch { return []; }
  });
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
    const timer = window.setTimeout(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(notificationReadKey) || "[]");
        setReadNotificationIds(Array.isArray(saved) ? saved : []);
      } catch {
        setReadNotificationIds([]);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [notificationReadKey]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(notificationDismissedKey) || "[]");
        const now = Date.now();
        const normalized = (Array.isArray(saved) ? saved : [])
          .map((item) => typeof item === "string" ? { id: item, dismissedAt: new Date().toISOString() } : item as DismissedNotification)
          .filter((item) => item?.id && now - new Date(item.dismissedAt).getTime() < 24 * 60 * 60 * 1000);
        setDismissedNotifications(normalized);
        localStorage.setItem(notificationDismissedKey, JSON.stringify(normalized));
      } catch {
        setDismissedNotifications([]);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [notificationDismissedKey]);
  useEffect(() => {
    let active = true;
    const loadNotifications = async () => {
      const local = readNotificationSources();
      let submissions = local.submissions;
      let replies = local.replies;
      if (supabase && user) {
        let submissionQuery = supabase
          .from("course_assignment_submissions")
          .select("id,user_id,student_name,course_id,lesson_id,updated_at")
          .order("updated_at", { ascending: false })
          .limit(40);
        if (!canEditCourses) submissionQuery = submissionQuery.eq("user_id", user.id);
        const { data: submissionRows, error: submissionError } = await submissionQuery;
        if (!submissionError) {
          submissions = (submissionRows || []).map((row) => ({
            id: row.id,
            userId: row.user_id,
            studentName: row.student_name,
            courseId: row.course_id,
            lessonId: row.lesson_id,
            updatedAt: row.updated_at,
          }));
          const submissionIds = submissions.map((item) => item.id);
          if (submissionIds.length) {
            const { data: replyRows, error: replyError } = await supabase
              .from("course_assignment_replies")
              .select("id,submission_id,staff_name,updated_at")
              .in("submission_id", submissionIds)
              .order("updated_at", { ascending: false });
            if (!replyError) replies = (replyRows || []).map((row) => ({
              id: row.id,
              submissionId: row.submission_id,
              staffName: row.staff_name,
              updatedAt: row.updated_at,
            }));
          } else replies = [];
        }
      }
      const findContext = (submission: NotificationSubmission) => {
        const course = courses.find((item) => item.id === submission.courseId);
        const lesson = course?.modules.flatMap((item) => item.lessons).find((item) => item.id === submission.lessonId);
        return {
          courseTitle: course?.title || "Курс",
          lessonTitle: lesson?.title || "Урок",
          path: `/courses/learn?course=${submission.courseId}`,
        };
      };
      const assignmentItems: HeaderNotification[] = canEditCourses
        ? submissions.map((submission) => {
            const context = findContext(submission);
            return {
              id: `submission:${submission.id}:${submission.updatedAt}`,
              kind: "assignment",
              title: `${submission.studentName} отправил(а) задание`,
              description: `${context.courseTitle} · ${context.lessonTitle}`,
              createdAt: submission.updatedAt,
              path: context.path,
            };
          })
        : replies.flatMap((reply) => {
            const submission = submissions.find((item) => item.id === reply.submissionId && item.userId === user?.id);
            if (!submission) return [];
            const context = findContext(submission);
            return [{
              id: `reply:${reply.id}:${reply.updatedAt}`,
              kind: "reply" as const,
              title: `${reply.staffName} проверил(а) задание`,
              description: `${context.courseTitle} · ${context.lessonTitle}`,
              createdAt: reply.updatedAt,
              path: context.path,
            }];
          });
      const meetingItems: HeaderNotification[] = local.rooms.map((room) => ({
        id: `meeting:${room.id}:${room.scheduledAt || room.createdAt}`,
        kind: "meeting",
        title: room.scheduledAt ? "Запланирована видеовстреча" : "Создана видеокомната",
        description: `${room.title}${room.groupName ? ` · ${room.groupName}` : ""}${room.scheduledAt ? ` · ${new Date(room.scheduledAt).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : ""}`,
        createdAt: room.createdAt,
        path: "/video-rooms",
      }));
      if (active) {
        setNotificationItems([...assignmentItems, ...meetingItems]
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 30));
        setNotificationLoading(false);
      }
    };
    const reload = () => void loadNotifications();
    void loadNotifications();
    window.addEventListener("storage", reload);
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, reload);
    const timer = window.setInterval(reload, 45_000);
    const channel = supabase && user
      ? supabase.channel(`header-notifications-${user.id}-${crypto.randomUUID()}`)
          .on("postgres_changes", { event: "*", schema: "public", table: "course_assignment_submissions" }, reload)
          .on("postgres_changes", { event: "*", schema: "public", table: "course_assignment_replies" }, reload)
          .subscribe()
      : null;
    return () => {
      active = false;
      window.removeEventListener("storage", reload);
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, reload);
      window.clearInterval(timer);
      if (channel && supabase) void supabase.removeChannel(channel);
    };
  }, [canEditCourses, courses, user]);
  const activeDismissedNotifications = dismissedNotifications.filter((item) => Date.now() - new Date(item.dismissedAt).getTime() < 24 * 60 * 60 * 1000);
  const dismissedNotificationIds = activeDismissedNotifications.map((item) => item.id);
  const availableNotificationItems = notificationItems.filter((item) => !dismissedNotificationIds.includes(item.id));
  const trashedNotificationItems = notificationItems.filter((item) => dismissedNotificationIds.includes(item.id));
  const unreadNotificationCount = notifications
    ? availableNotificationItems.filter((item) => !readNotificationIds.includes(item.id)).length
    : 0;
  const assignmentNotificationCount = availableNotificationItems.filter((item) => item.kind === "assignment" || item.kind === "reply").length;
  const visibleNotificationItems = notificationFilter === "trash"
    ? trashedNotificationItems
    : notificationFilter === "assignments"
      ? availableNotificationItems.filter((item) => item.kind === "assignment" || item.kind === "reply")
      : availableNotificationItems;
  const saveReadNotifications = (ids: string[]) => {
    const next = Array.from(new Set(ids)).slice(-200);
    setReadNotificationIds(next);
    localStorage.setItem(notificationReadKey, JSON.stringify(next));
  };
  const saveDismissedNotifications = (items: DismissedNotification[]) => {
    const unique = new Map(items.map((item) => [item.id, item]));
    const next = Array.from(unique.values())
      .filter((item) => Date.now() - new Date(item.dismissedAt).getTime() < 24 * 60 * 60 * 1000)
      .slice(-500);
    setDismissedNotifications(next);
    localStorage.setItem(notificationDismissedKey, JSON.stringify(next));
  };
  const dismissNotification = (id: string) =>
    saveDismissedNotifications([...activeDismissedNotifications, { id, dismissedAt: new Date().toISOString() }]);
  const restoreNotification = (id: string) =>
    saveDismissedNotifications(activeDismissedNotifications.filter((item) => item.id !== id));
  const clearNotifications = () => {
    const dismissedAt = new Date().toISOString();
    saveDismissedNotifications([
      ...activeDismissedNotifications,
      ...availableNotificationItems.map((item) => ({ id: item.id, dismissedAt })),
    ]);
  };
  const openNotification = (item: HeaderNotification) => {
    saveReadNotifications([...readNotificationIds, item.id]);
    dismissNotification(item.id);
    setNotificationMenu(false);
    navigate(item.path);
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
        { label: "Задания учеников", description: "Архив отправленных работ", path: "/assignments", keywords: "задания работы проверка ответы" },
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
      <div className="notificationMenuWrap">
        <button
          type="button"
          className={`topIcon notificationButton ${notificationMenu ? "active" : ""}`}
          onClick={() => { setAccountMenu(false); setNotificationMenu((value) => !value); }}
          aria-label={unreadNotificationCount ? `Уведомления: ${unreadNotificationCount} непрочитанных` : "Уведомления"}
          aria-expanded={notificationMenu}
          title="Уведомления"
        >
          <BellIcon />
          {unreadNotificationCount > 0 && <span>{unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}</span>}
        </button>
        {notificationMenu && <>
          <button className="notificationScrim" aria-label="Закрыть уведомления" onClick={() => setNotificationMenu(false)} />
          <section className="notificationPanel" aria-label="Центр уведомлений">
            <header><div><b>Уведомления</b><small>{notificationFilter === "trash" ? "Срок хранения в корзине 24 часа" : unreadNotificationCount ? `${unreadNotificationCount} непрочитанных` : "Всё просмотрено"}</small></div><div className="notificationHeaderActions">{notificationFilter !== "trash" && unreadNotificationCount > 0 && <button type="button" onClick={() => saveReadNotifications([...readNotificationIds, ...availableNotificationItems.map((item) => item.id)])}>Прочитать все</button>}{notificationFilter !== "trash" && availableNotificationItems.length > 0 && <button type="button" className="notificationDeleteAll" onClick={clearNotifications} title="Очистить уведомления" aria-label="Очистить уведомления"><TrashIcon/><span>Очистить</span></button>}</div></header>
            <nav className="notificationFilters" role="tablist" aria-label="Фильтр уведомлений">
              <button type="button" role="tab" aria-selected={notificationFilter === "all"} className={notificationFilter === "all" ? "active" : ""} onClick={() => setNotificationFilter("all")}>Все уведомления<span>{availableNotificationItems.length}</span></button>
              <button type="button" role="tab" aria-selected={notificationFilter === "assignments"} className={notificationFilter === "assignments" ? "active" : ""} onClick={() => setNotificationFilter("assignments")}>Задания<span>{assignmentNotificationCount}</span></button>
              <button type="button" role="tab" aria-selected={notificationFilter === "trash"} className={notificationFilter === "trash" ? "active" : ""} onClick={() => setNotificationFilter("trash")}><TrashIcon/>Корзина<span>{trashedNotificationItems.length}</span></button>
            </nav>
            <div className="notificationList">
              {notificationLoading ? <p className="notificationEmpty">Загружаем уведомления…</p> : visibleNotificationItems.length ? visibleNotificationItems.map((item) => {
                const inTrash = notificationFilter === "trash";
                const unread = !inTrash && !readNotificationIds.includes(item.id) && notifications;
                return <article className={`notificationItem ${unread ? "unread" : ""} ${inTrash ? "trashed" : ""}`} key={item.id}>
                  <button type="button" className="notificationItemMain" onClick={() => { if (inTrash) { setNotificationMenu(false); navigate(item.path); } else openNotification(item); }}>
                    <span className={`notificationKind ${item.kind}`} aria-hidden="true"><NotificationKindIcon kind={item.kind} /></span>
                    <div><b>{item.title}</b><p>{item.description}</p><time>{notificationDate(item.createdAt)}</time></div>
                    {unread && <i aria-label="Непрочитано" />}
                  </button>
                  {inTrash
                    ? <button type="button" className="notificationDismiss notificationRestore" onClick={() => restoreNotification(item.id)} aria-label={`Восстановить уведомление: ${item.title}`} title="Восстановить"><RestoreIcon/></button>
                    : <button type="button" className="notificationDismiss" onClick={() => dismissNotification(item.id)} aria-label={`Убрать уведомление: ${item.title}`} title="Убрать уведомление"><NotificationCloseIcon/></button>}
                </article>;
              }) : <p className="notificationEmpty">{notificationFilter === "trash" ? "Корзина пуста." : notificationFilter === "assignments" ? "Уведомлений о заданиях пока нет." : "Новых событий пока нет."}</p>}
            </div>
            {!notifications && <footer>Уведомления отключены в настройках аккаунта.</footer>}
          </section>
        </>}
      </div>
      <div className="accountMenuWrap">
        <button className={`topAvatar ${accountMenu ? "active" : ""}`} onClick={() => { setNotificationMenu(false); setAccountMenu((value) => !value); }} aria-expanded={accountMenu} aria-label="Меню аккаунта" title={displayName}>{avatarUrl ? <img src={avatarUrl} alt={displayName}/> : initials}</button>
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
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("lingvaedu-sidebar-collapsed") === "true");
  const compactNavigationQuery = "(max-width: 820px), (max-height: 500px) and (max-width: 1000px)";
  const toggleNav = () => {
    if (window.matchMedia(compactNavigationQuery).matches) setOpen(true);
    else setCollapsed((current) => {
      const next = !current;
      localStorage.setItem("lingvaedu-sidebar-collapsed", String(next));
      return next;
    });
  };
  const hideNav = () => {
    if (window.matchMedia(compactNavigationQuery).matches) setOpen(false);
    else {
      setCollapsed(true);
      localStorage.setItem("lingvaedu-sidebar-collapsed", "true");
    }
  };
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname, location.search]);
  useEffect(() => {
    document.documentElement.classList.toggle("shellNavOpen", open);
    document.body.classList.toggle("shellNavOpen", open);
    return () => {
      document.documentElement.classList.remove("shellNavOpen");
      document.body.classList.remove("shellNavOpen");
    };
  }, [open]);
  const title =
    page === "editor"
      ? "Редактор курса"
      : page === "profile"
        ? "Мой профиль"
      : (() => {
          const item = nav.flatMap((group) => group.items).find((entry) => entry.id === page);
          return item?.headerLabel || item?.label;
        })() ||
        "Обзор";
  useEffect(() => { document.title = `${title} — LingvaEdu`; }, [title]);
  return (
    <div className={`app ${collapsed ? "sidebarCollapsed" : ""}`}>
      <a className="skipContent" href="#workspace-content" onClick={(event) => {
        event.preventDefault();
        const main = document.querySelector<HTMLElement>(".mainShell main");
        if (main) { main.tabIndex = -1; main.focus(); main.scrollIntoView({ block: "start" }); }
      }}>К содержимому</a>
      <Sidebar
        page={page}
        setPage={setPage}
        open={open}
        close={() => setOpen(false)}
        hide={hideNav}
      />
      <div className={page === "editor" || page === "player" ? "mainShell" : "mainShell workspaceBackdrop"}>
        <Header title={title} toggleNav={toggleNav} />
        {children}
        <ConnectionNotice />
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
        action={canEditCourses ? <button className="btn primary dashboardCreateButton" onClick={create}><AddIcon />Создать курс</button> : undefined}
      />
      <section className="metricGrid">
        {canEditCourses ? <>
          <Metric icon="users" label={organization ? "Ученики" : "Назначения ученикам"} value={loading ? "…" : String(organization?.studentCount ?? assignmentCount)} delta="" note={organization ? `${organization.activeUsers30d} активны за 30 дней` : "по всем курсам"} tone="violet" />
          <Metric icon="courses" label="Опубликовано курсов" value={loading ? "…" : String(published)} delta="" note={`из ${courses.length} курсов`} tone="blue" />
          <Metric icon="materials" label="Учебные материалы" value={loading ? "…" : String(totalBlocks)} delta="" note={`${totalLessons} уроков`} tone="green" />
          <Metric icon="groups" label="Учебные группы" value={organization ? String(organization.groupCount) : "—"} delta="" note={organization ? `${assignmentCount} назначений` : "доступно через сервер API"} tone="orange" />
        </> : <>
          <Metric icon="courses" label="Назначено курсов" value={loading ? "…" : String(availableCourses.length)} delta="" note={`${completedCourses} завершено`} tone="violet" />
          <Metric icon="completed" label="Пройдено уроков" value={String(completedLessons)} delta="" note={`из ${totalLessons} уроков`} tone="blue" />
          <Metric icon="progress" label="Общий прогресс" value={`${averageProgress}%`} delta="" note="по назначенным курсам" tone="green" />
          <Metric icon="materials" label="Учебные материалы" value={String(totalBlocks)} delta="" note="доступно в курсах" tone="orange" />
        </>}
      </section>
      <div className="overviewGrid">
        <section className="panel activityPanel">
          <PanelHead title="Наполнение курсов" text="Количество блоков в последних курсах" />
          {chartCourses.length ? <div className="chart dashboardChart">
            <div className="yLabels"><span>{chartMax}</span><span>{Math.round(chartMax / 2)}</span><span>0</span></div>
            <div className="bars">{chartCourses.map((course, index) => <div className="barCol" key={course.id} title={`${course.title}: ${chartValues[index]} блоков`}>
              <div className="barTrack"><i style={{ height: `${Math.max(4, (chartValues[index] / chartMax) * 100)}%` }} className={index === chartCourses.length - 1 ? "hot" : ""} /></div>
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
  icon: MetricIconKind;
  label: string;
  value: string;
  delta: string;
  note: string;
  tone: string;
}) {
  return (
    <article className="metric">
      <div className={`metricIcon ${tone}`}><DashboardMetricIcon kind={icon} /></div>
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
    if (!String(data.get("title") || "").trim() || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      setError("Заполните название и укажите корректное время окончания");
      return;
    }
    setSaving(true);
    setError("");
    try {
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
    } catch { setError("Не удалось сохранить событие. Проверьте подключение и попробуйте снова."); }
    finally { setSaving(false); }
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


function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef(close);
  useLayoutEffect(() => { closeRef.current = close; });
  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const dialog = dialogRef.current;
    dialog?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); closeRef.current(); }
      if (event.key !== "Tab" || !dialog) return;
      const items = Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')).filter((element) => element.getClientRects().length);
      const first = items[0];
      const last = items.at(-1);
      if (!first) { event.preventDefault(); dialog.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", onKeyDown); previousFocus?.focus(); };
  }, []);
  return (
    <div className="modalLayer">
      <button className="modalScrim" onClick={close} aria-label="Закрыть окно" tabIndex={-1} />
      <section className="modal" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <div className="modalHead">
          <h2 id={titleId}>{title}</h2>
          <button onClick={close} aria-label="Закрыть окно">×</button>
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
  assignments: "/assignments",
};

const pageByPath = Object.fromEntries(
  Object.entries(paths).map(([page, path]) => [path, page]),
) as Record<string, Page>;

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin, canEditCourses } = useAuth();
  const { loadError, progressError, reload, retryProgress } = useCourses();
  const page = pageByPath[location.pathname] ?? "overview";
  const setPage = (next: Page) => navigate(paths[next]);
  const adminOnlyPages: Page[] = ["assignments", "people", "reports", "roles"];
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
    ) : page === "assignments" ? (
      <AssignmentReviewPage />
    ) : page === "groups" ? (
      <GroupsPage />
    ) : page === "reports" ? (
      <ReportsPage />
    ) : page === "calls" ? (
      <VideoRoomsPage />
    ) : page === "calendar" ? (
      <Calendar />
    ) : (
      <RolesPage />
    );
  return (
    <Shell page={page} setPage={setPage}>
      <ErrorBoundary key={location.pathname}>
        {loadError && <div className="content"><div className="platformNotice" role="alert"><span>{loadError}</span><button className="btn ghost" onClick={reload}>Повторить</button></div></div>}
        {progressError && <div className="content"><div className="platformNotice" role="status"><span>{progressError}</span><button className="btn ghost" onClick={() => void retryProgress()}>Повторить</button></div></div>}
        <Suspense fallback={<main className="content"><PageState title="Загружаем раздел" description="Это займёт несколько секунд." loading /></main>}>
          {pageByPath[location.pathname] || location.pathname === "/overview" ? content : <main className="content"><PageState title="Страница не найдена" description="Возможно, ссылка устарела. Откройте нужный раздел через меню." action={<button className="btn primary" onClick={() => setPage("overview")}>На главную</button>} /></main>}
        </Suspense>
      </ErrorBoundary>
      {page === "player" && <SelectionTranslator />}
    </Shell>
  );
}
