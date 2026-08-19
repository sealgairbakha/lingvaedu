"use client";

import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./auth/AuthProvider";
import { CoursesPage } from "./features/courses/CoursesPage";
import { CourseEditorPage } from "./features/courses/CourseEditorPage";
import { CoursePlayerPage } from "./features/courses/CoursePlayerPage";

type Page =
  | "overview"
  | "courses"
  | "editor"
  | "player"
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
}: {
  page: Page;
  setPage: (p: Page) => void;
  open: boolean;
  close: () => void;
}) {
  const { displayName, initials, isAdmin, signOut } = useAuth();
  const adminOnlyPages: Page[] = [
    "people",
    "groups",
    "roles",
    "reports",
  ];
  return (
    <>
      <aside className={`sidebar ${open ? "mobileOpen" : ""}`}>
        <div className="sideTop">
          <Logo />
          <button className="closeNav" onClick={close}>
            ×
          </button>
        </div>
        <button className="workspace">
          <span>L</span>
          <div>
            <b>Lingva Academy</b>
            <small>
              {isAdmin ? "Панель администратора" : "Личный кабинет"}
            </small>
          </div>
          <i>⌄</i>
        </button>
        <nav>
          {nav.map((group, gi) => {
            const items = group.items.filter(
              (item) => isAdmin || !adminOnlyPages.includes(item.id),
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
                    {item.label}
                    {item.id === "people" && <em>1 248</em>}
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
            <span>{initials}</span>
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

function Header({ title, openNav }: { title: string; openNav: () => void }) {
  const { initials, displayName, signOut } = useAuth();
  return (
    <header className="topbar">
      <button className="menuBtn" onClick={openNav}>
        ☰
      </button>
      <div className="crumb">
        <span>LingvaEdu</span>
        <i>/</i>
        <b>{title}</b>
      </div>
      <label className="globalSearch">
        <span>⌕</span>
        <input placeholder="Найти курс, ученика или отчёт" />
        <kbd>⌘ K</kbd>
      </label>
      <button className="topIcon">?</button>
      <button className="topIcon notice">
        ♢<i />
      </button>
      <button
        className="topAvatar"
        onClick={signOut}
        title={`${displayName} · Выйти из аккаунта`}
      >
        {initials}
      </button>
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
  const title =
    page === "editor"
      ? "Редактор курса"
      : nav.flatMap((n) => n.items).find((i) => i.id === page)?.label ||
        "Обзор";
  return (
    <div className="app">
      <Sidebar
        page={page}
        setPage={setPage}
        open={open}
        close={() => setOpen(false)}
      />
      <div className="mainShell">
        <Header title={title} openNav={() => setOpen(true)} />
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

function Overview({ go }: { go: (p: Page) => void }) {
  const { displayName, isAdmin } = useAuth();
  const firstName = displayName.split(/\s+/)[0];
  return (
    <main className="content fade">
      <PageTitle
        eyebrow="ЧЕТВЕРГ, 13 АВГУСТА"
        title={`Добрый день, ${firstName}`}
        text="Вот что происходит в вашем учебном пространстве сегодня."
        action={isAdmin ? (
          <button className="btn primary" onClick={() => go("editor")}>
            ＋ Создать курс
          </button>
        ) : undefined}
      />
      <section className="metricGrid">
        <Metric
          icon="♙"
          label="Активные ученики"
          value="1 248"
          delta="+8,4%"
          note="за последние 30 дней"
          tone="violet"
        />
        <Metric
          icon="▤"
          label="Завершено курсов"
          value="386"
          delta="+12,1%"
          note="за последние 30 дней"
          tone="blue"
        />
        <Metric
          icon="◎"
          label="Средний результат"
          value="82%"
          delta="+3,2%"
          note="выше прошлого месяца"
          tone="green"
        />
        <Metric
          icon="◷"
          label="Обучение сегодня"
          value="214 ч"
          delta="+5,7%"
          note="вовлечённость растёт"
          tone="orange"
        />
      </section>
      <div className="overviewGrid">
        <section className="panel activityPanel">
          <PanelHead
            title="Активность обучения"
            text="Часы за последние 7 дней"
            action={<button className="quiet">Неделя ⌄</button>}
          />
          <div className="chart">
            <div className="yLabels">
              <span>60</span>
              <span>40</span>
              <span>20</span>
              <span>0</span>
            </div>
            <div className="bars">
              {[
                { d: "Пн", v: 42 },
                { d: "Вт", v: 65 },
                { d: "Ср", v: 51 },
                { d: "Чт", v: 82 },
                { d: "Пт", v: 73 },
                { d: "Сб", v: 35 },
                { d: "Вс", v: 46 },
              ].map((b, i) => (
                <div className="barCol" key={b.d}>
                  <div className="barTrack">
                    <i
                      style={{ height: `${b.v}%` }}
                      className={i === 3 ? "hot" : ""}
                    />
                  </div>
                  <span>{b.d}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="panel upcoming">
          <PanelHead
            title="Ближайшие события"
            action={
              <button className="linkBtn" onClick={() => go("calendar")}>
                Календарь →
              </button>
            }
          />
          <div className="eventList">
            <Event
              time="10:00"
              date="СЕГОДНЯ"
              title="Speaking club · Intermediate"
              people="12 участников"
              color="violet"
            />
            <Event
              time="14:30"
              date="СЕГОДНЯ"
              title="Onboarding новых учеников"
              people="8 участников"
              color="orange"
            />
            <Event
              time="11:00"
              date="ЗАВТРА"
              title="Разбор результатов группы"
              people="Sales Team"
              color="blue"
            />
          </div>
        </section>
      </div>
      <section className="panel coursesPanel">
        <PanelHead
          title="Курсы в работе"
          text="Актуальный прогресс и вовлечённость"
          action={
            <button className="linkBtn" onClick={() => go("courses")}>
              Все курсы →
            </button>
          }
        />
        <div className="courseTiles">
          {courseRows.slice(0, 3).map((c) => (
            <article key={c.title} onClick={() => go("editor")}>
              <div className={`courseIcon ${c.color}`}>{c.code}</div>
              <div className="courseTitle">
                <b>{c.title}</b>
                <span>
                  {c.students} учеников · {c.lessons} урока
                </span>
              </div>
              <div
                className="ring"
                style={
                  { "--value": `${c.progress * 3.6}deg` } as React.CSSProperties
                }
              >
                <span>{c.progress}%</span>
              </div>
            </article>
          ))}
        </div>
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
        <b>↗ {delta}</b> {note}
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

function Groups() {
  return (
    <main className="content fade">
      <PageTitle
        title="Группы"
        text="Объединяйте учеников, назначайте курсы и наставников."
        action={<button className="btn primary">＋ Создать группу</button>}
      />
      <div className="groupGrid">
        {[
          { n: "Sales Team", m: 42, c: 3, mentor: "Анна Ким", color: "violet" },
          {
            n: "Newcomers · August",
            m: 18,
            c: 2,
            mentor: "Олег Миронов",
            color: "orange",
          },
          {
            n: "HR Department",
            m: 26,
            c: 4,
            mentor: "Айгүл Сәрсен",
            color: "blue",
          },
          { n: "Marketing", m: 31, c: 2, mentor: "Анна Ким", color: "green" },
          {
            n: "English mentors",
            m: 8,
            c: 6,
            mentor: "Баха Админ",
            color: "pink",
          },
        ].map((g, i) => (
          <article className="groupCard" key={g.n}>
            <div className={`groupMark ${g.color}`}>
              {g.n
                .split(" ")
                .map((x) => x[0])
                .slice(0, 2)
                .join("")}
            </div>
            <button>•••</button>
            <h3>{g.n}</h3>
            <p>Рабочая учебная группа Lingva Academy</p>
            <div className="groupNums">
              <span>
                <b>{g.m}</b>участников
              </span>
              <span>
                <b>{g.c}</b>курса
              </span>
            </div>
            <div className="groupMentor">
              <span>{g.mentor.slice(0, 2)}</span>
              <div>
                <small>НАСТАВНИК</small>
                <b>{g.mentor}</b>
              </div>
            </div>
          </article>
        ))}
        <button className="newGroup">
          ＋<b>Новая группа</b>
          <span>Создать и настроить доступы</span>
        </button>
      </div>
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

function Calls() {
  const [room, setRoom] = useState(false);
  return (
    <main className="content fade">
      <PageTitle
        title="Видеокомнаты"
        text="Проводите живые занятия без сторонних сервисов."
        action={
          <button className="btn primary" onClick={() => setRoom(true)}>
            ＋ Создать комнату
          </button>
        }
      />
      <section className="callHero">
        <div>
          <span className="liveDot">● ГОТОВО К ЗВОНКУ</span>
          <h2>
            Начните встречу
            <br />в один клик
          </h2>
          <p>
            Без установки приложений. До 50 участников, демонстрация экрана и
            чат.
          </p>
          <button className="startCall" onClick={() => setRoom(true)}>
            <span>◇</span>Начать мгновенный звонок
          </button>
        </div>
        <div className="callVisual">
          <div className="personVideo one">
            <span>АК</span>
            <b>Анна Ким</b>
          </div>
          <div className="personVideo two">
            <span>БА</span>
            <b>Вы</b>
          </div>
          <div className="callControls">
            <i>♩</i>
            <i>▣</i>
            <i>□</i>
            <i className="hang">⌕</i>
          </div>
        </div>
      </section>
      <h2 className="sectionTitle">Запланированные комнаты</h2>
      <div className="roomList">
        <div className="roomRow">
          <div className="roomDate">
            <b>14</b>
            <span>АВГ</span>
          </div>
          <div>
            <h3>Speaking club · Intermediate</h3>
            <p>Завтра, 10:00–11:00 · Анна Ким</p>
          </div>
          <div className="participantDots">
            <i>АК</i>
            <i>МИ</i>
            <i>+10</i>
          </div>
          <button className="btn ghost">Копировать ссылку</button>
          <button>•••</button>
        </div>
        <div className="roomRow">
          <div className="roomDate blue">
            <b>16</b>
            <span>АВГ</span>
          </div>
          <div>
            <h3>Onboarding: знакомство с платформой</h3>
            <p>Суббота, 14:30–15:15 · Баха Админ</p>
          </div>
          <div className="participantDots">
            <i>БА</i>
            <i>+7</i>
          </div>
          <button className="btn ghost">Копировать ссылку</button>
          <button>•••</button>
        </div>
      </div>
      {room && (
        <Modal title="Новая видеокомната" close={() => setRoom(false)}>
          <label>
            Название встречи
            <input defaultValue="Разговорная практика" />
          </label>
          <div className="modalGrid">
            <label>
              Дата
              <input type="date" defaultValue="2026-08-14" />
            </label>
            <label>
              Время
              <input type="time" defaultValue="10:00" />
            </label>
          </div>
          <label>
            Группа
            <select>
              <option>Sales Team</option>
              <option>Newcomers · August</option>
              <option>Открытая встреча</option>
            </select>
          </label>
          <button className="btn primary full" onClick={() => setRoom(false)}>
            Создать комнату и получить ссылку
          </button>
        </Modal>
      )}
    </main>
  );
}

function Calendar() {
  const days = [...Array(35)].map((_, i) => (i < 3 ? 29 + i : i - 2));
  return (
    <main className="content fade">
      <PageTitle
        title="Календарь"
        text="Планируйте занятия, встречи и сроки прохождения."
        action={<button className="btn primary">＋ Добавить событие</button>}
      />
      <div className="calendarLayout">
        <section className="panel calendar">
          <div className="calendarHead">
            <button>‹</button>
            <h2>Август 2026</h2>
            <button>›</button>
            <button className="todayBtn">Сегодня</button>
            <div>
              <button className="active">Месяц</button>
              <button>Неделя</button>
            </div>
          </div>
          <div className="weekdays">
            {["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"].map((x) => (
              <span key={x}>{x}</span>
            ))}
          </div>
          <div className="calendarGrid">
            {days.map((d, i) => (
              <div
                className={`${i < 3 || i > 33 ? "other" : ""} ${d === 13 && i > 3 ? "today" : ""}`}
                key={i}
              >
                <span>{d}</span>
                {i === 9 && (
                  <b className="calEvent violet">10:00 Speaking club</b>
                )}
                {i === 11 && (
                  <b className="calEvent orange">14:30 Onboarding</b>
                )}
                {i === 15 && (
                  <b className="calEvent blue">11:00 Разбор группы</b>
                )}
                {i === 18 && <b className="calEvent green">Срок: English B2</b>}
                {i === 23 && (
                  <b className="calEvent violet">16:00 Grammar lab</b>
                )}
              </div>
            ))}
          </div>
        </section>
        <aside className="panel agenda">
          <PanelHead title="13 августа" text="3 события сегодня" />
          <div className="agendaTimeline">
            <Event
              time="10:00"
              date="60 МИН"
              title="Speaking club"
              people="12 участников"
              color="violet"
            />
            <Event
              time="14:30"
              date="45 МИН"
              title="Onboarding"
              people="Newcomers"
              color="orange"
            />
            <Event
              time="17:00"
              date="30 МИН"
              title="Проверка работ"
              people="8 заданий"
              color="blue"
            />
          </div>
          <button className="btn ghost full">
            Настроить доступ к календарю
          </button>
        </aside>
      </div>
    </main>
  );
}

function Roles() {
  return (
    <main className="content fade">
      <PageTitle
        title="Роли и права"
        text="Создавайте роли и точно настраивайте доступ к функциям."
        action={<button className="btn primary">＋ Создать роль</button>}
      />
      <div className="roleLayout">
        <section className="roleList panel">
          <PanelHead title="Роли" text="6 ролей · 1 248 пользователей" />
          {[
            { n: "Владелец", u: 1, c: "violet" },
            { n: "Администратор", u: 3, c: "blue" },
            { n: "Наставник", u: 24, c: "green" },
            { n: "Менеджер группы", u: 8, c: "orange" },
            { n: "Ученик", u: 1212, c: "pink" },
          ].map((r, i) => (
            <button className={i === 2 ? "active" : ""} key={r.n}>
              <span className={r.c}>{r.n[0]}</span>
              <div>
                <b>{r.n}</b>
                <small>{r.u} пользователей</small>
              </div>
              <i>›</i>
            </button>
          ))}
        </section>
        <section className="permissions panel">
          <div className="permissionHead">
            <div className="roleBadge green">Н</div>
            <div>
              <span>РОЛЬ</span>
              <h2>Наставник</h2>
              <p>Ведёт назначенные курсы и группы</p>
            </div>
            <button className="btn ghost">Дублировать</button>
          </div>
          {[
            {
              t: "Курсы и контент",
              items: [
                "Просматривать назначенные курсы",
                "Редактировать уроки",
                "Публиковать изменения",
              ],
            },
            {
              t: "Пользователи",
              items: [
                "Просматривать учеников своих групп",
                "Добавлять учеников в группу",
                "Изменять роли пользователей",
              ],
            },
            {
              t: "Отчёты и встречи",
              items: [
                "Просматривать отчёты своих групп",
                "Экспортировать отчёты",
                "Создавать видеокомнаты",
              ],
            },
          ].map((s, si) => (
            <div className="permissionSection" key={s.t}>
              <h3>{s.t}</h3>
              {s.items.map((x, i) => (
                <label key={x}>
                  <span>{x}</span>
                  <input
                    type="checkbox"
                    defaultChecked={si === 0 ? i < 2 : si === 1 ? i < 2 : true}
                  />
                  <i />
                </label>
              ))}
            </div>
          ))}
          <button className="btn primary permissionSave">
            Сохранить изменения
          </button>
        </section>
      </div>
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
  const adminOnlyPages: Page[] = ["people", "groups", "reports", "roles"];
  const denied = (!isAdmin && adminOnlyPages.includes(page)) || (page === "editor" && !canEditCourses);
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
    ) : page === "people" ? (
      <People />
    ) : page === "groups" ? (
      <Groups />
    ) : page === "reports" ? (
      <Reports />
    ) : page === "calls" ? (
      <Calls />
    ) : page === "calendar" ? (
      <Calendar />
    ) : (
      <Roles />
    );
  return (
    <Shell page={page} setPage={setPage}>
      {content}
    </Shell>
  );
}
