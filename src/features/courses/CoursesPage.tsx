import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import { useCourses } from "./CourseProvider";
import type { CourseStatus } from "./types";

const labels: Record<CourseStatus | "all", string> = { all: "Все курсы", published: "Опубликованные", draft: "Черновики", archived: "Архив" };
const statusLabel: Record<CourseStatus, string> = { published: "Опубликован", draft: "Черновик", archived: "В архиве" };

export function CoursesPage() {
  const navigate = useNavigate();
  const { canEditCourses } = useAuth();
  const { courses, loading, storage, createCourse, saveCourse, removeCourse, duplicateCourse } = useCourses();
  const [tab, setTab] = useState<CourseStatus | "all">("all");
  const [q, setQ] = useState(""); const [language, setLanguage] = useState("Все"); const [author, setAuthor] = useState("Все");
  const languages = [...new Set(courses.map((x) => x.language))]; const authors = [...new Set(courses.map((x) => x.author))];
  const visibleCourses = canEditCourses ? courses : courses.filter((c) => c.status === "published");
  const rows = useMemo(() => visibleCourses.filter((c) => (tab === "all" || c.status === tab) && (language === "Все" || c.language === language) && (author === "Все" || c.author === author) && `${c.title} ${c.description}`.toLowerCase().includes(q.toLowerCase())), [visibleCourses, tab, language, author, q]);
  const edit = (id: string) => navigate(`/courses/editor?course=${id}`);
  const create = () => edit(createCourse().id);
  return <main className="content fade coursesWorking">
    <div className="pageTitle"><div><h1>Курсы</h1><p>Создавайте программы обучения и управляйте их содержанием.</p></div>{canEditCourses && <button className="btn primary" onClick={create}>＋ Новый курс</button>}</div>
    <div className="courseNotice">{storage === "cloud" ? "● Данные синхронизируются с Supabase" : "● Локальный режим: подключите таблицу courses для общей работы сотрудников"}</div>
    {canEditCourses && <div className="tabs">{(["all","published","draft","archived"] as const).map((x) => <button key={x} className={tab === x ? "active" : ""} onClick={() => setTab(x)}>{labels[x]} <span>{courses.filter((c) => x === "all" || c.status === x).length}</span></button>)}</div>}
    <div className="toolbar"><label><span>⌕</span><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск по курсам" /></label><select className="filter" value={language} onChange={(e) => setLanguage(e.target.value)}><option>Все</option>{languages.map(x => <option key={x}>{x}</option>)}</select><select className="filter" value={author} onChange={(e) => setAuthor(e.target.value)}><option>Все</option>{authors.map(x => <option key={x}>{x}</option>)}</select></div>
    {loading ? <div className="courseEmpty">Загружаем курсы…</div> : rows.length === 0 ? <div className="courseEmpty"><h2>{visibleCourses.length ? "Ничего не найдено" : "Здесь пока нет доступных курсов"}</h2><p>{canEditCourses ? "Создайте первый курс и добавьте в него уроки." : "Курсы появятся после публикации сотрудником."}</p>{canEditCourses && !courses.length && <button className="btn primary" onClick={create}>Создать курс</button>}</div> : <div className="courseGrid">{rows.map((c) => <article className="courseCard" key={c.id}><button className={`courseCover ${c.color}`} onClick={() => navigate(`/courses/learn?course=${c.id}`)}><span>{c.code}</span><small>{c.language.toUpperCase()}</small></button><div className="courseInfo"><div className="statusRow"><span className={c.status === "published" ? "published" : "draft"}>● {statusLabel[c.status]}</span><small>{new Date(c.updatedAt).toLocaleDateString("ru-RU")}</small></div><h3>{c.title}</h3><p>{c.description}</p><div className="courseStats"><span>▤ {c.modules.reduce((n,m) => n + m.lessons.length, 0)} уроков</span><span>♙ {c.students} учеников</span></div><button className="openCourseBtn" onClick={() => navigate(`/courses/learn?course=${c.id}`)}>{canEditCourses ? "Открыть курс" : "Продолжить обучение"} →</button><div className="mentor"><span>{c.mentor.slice(0,2).toUpperCase()}</span><div><small>НАСТАВНИК</small><b>{c.mentor}</b></div>{canEditCourses && <button onClick={() => edit(c.id)}>Редактировать →</button>}</div>{canEditCourses && <div className="courseActions"><button onClick={() => duplicateCourse(c.id)}>Дублировать</button><button onClick={() => saveCourse({...c,status:c.status === "archived" ? "draft" : "archived"})}>{c.status === "archived" ? "Вернуть" : "В архив"}</button><button className="dangerText" onClick={() => confirm(`Удалить курс «${c.title}»?`) && removeCourse(c.id)}>Удалить</button></div>}</div></article>)}</div>}
  </main>;
}
