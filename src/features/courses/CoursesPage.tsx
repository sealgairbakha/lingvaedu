import { useMemo, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import { useCourses, type CourseLessonProgress } from "./CourseProvider";
import type { Course, CourseStatus } from "./types";

const labels: Record<CourseStatus | "all", string> = { all: "Все курсы", published: "Опубликованные", draft: "Черновики", archived: "Архив" };
const statusLabel: Record<CourseStatus, string> = { published: "Опубликован", draft: "Черновик", archived: "В архиве" };
const courseLessons = (course: Course) => course.modules.flatMap((module) => module.lessons);

function getCourseProgress(course: Course, progress: CourseLessonProgress[]) {
  const lessons = courseLessons(course);
  const lessonIds = new Set(lessons.map((lesson) => lesson.id));
  const entries = progress.filter((item) => item.courseId === course.id && lessonIds.has(item.lessonId));
  const completed = new Set(entries.filter((item) => item.status === "completed").map((item) => item.lessonId)).size;
  const last = [...entries].sort((a, b) => Date.parse(b.lastOpenedAt) - Date.parse(a.lastOpenedAt))[0];
  const lastLesson = lessons.find((lesson) => lesson.id === last?.lessonId) || lessons[0];
  const percent = lessons.length ? Math.round((completed / lessons.length) * 100) : 0;
  const remainingMinutes = lessons.filter((lesson) => !entries.some((item) => item.lessonId === lesson.id && item.status === "completed")).reduce((sum, lesson) => sum + (lesson.estimatedMinutes || 0), 0);
  return { lessons, completed, last, lastLesson, percent, remainingMinutes };
}

function CourseCover({ course }: { course: Course }) {
  const showNewRibbon = course.showNewRibbon ?? course.code === "NEW";
  return <span className={`courseCoverArt ${course.color} cover-${course.coverStyle || "orbit"} ${course.coverImage ? "has-image" : ""}`} style={course.coverImage ? { "--cover-image": `url(${course.coverImage})` } as CSSProperties : undefined} aria-hidden="true">
    {!course.coverImage && <><i /><i /><i /></>}
    {showNewRibbon && <span className="courseNewRibbon">NEW</span>}
    <small>{course.language.toUpperCase()}</small>
  </span>;
}

function MentorVerifiedIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m10 2.5 2 1.3 2.4.2 1 2.2 1.8 1.6-.6 2.4.6 2.4-1.8 1.6-1 2.2-2.4.2-2 1.3-2-1.3-2.4-.2-1-2.2-1.8-1.6.6-2.4-.6-2.4 1.8-1.6 1-2.2 2.4-.2 2-1.3Z"/><path d="m7 10 2 2 4-4"/></svg>;
}

function StudentCourses({ courses, progress, loading }: { courses: Course[]; progress: CourseLessonProgress[]; loading: boolean }) {
  const navigate = useNavigate();
  const stats = courses.map((course) => ({ course, ...getCourseProgress(course, progress) }));
  const active = [...stats].sort((a, b) => Date.parse(b.last?.lastOpenedAt || "0") - Date.parse(a.last?.lastOpenedAt || "0"))[0];
  const open = (course: Course, lessonId?: string) => navigate(`/courses/learn?course=${course.id}${lessonId ? `&lesson=${lessonId}` : ""}`);
  return <main className="content fade studentCoursesPage">
    <div className="pageTitle studentCourseTitle"><div><small>МОЁ ОБУЧЕНИЕ</small><h1>Мои курсы</h1><p>Продолжайте с того места, где остановились.</p></div></div>
    {loading ? <div className="courseSkeletonGrid" aria-label="Загружаем курсы"><i /><i /><i /></div> : !courses.length ? <div className="courseEmpty studentCourseEmpty"><span>▤</span><h2>У вас пока нет доступных курсов.</h2><p>Назначенные курсы появятся здесь.</p></div> : <>
      {active && <section className="continueLearningCard">
        <CourseCover course={active.course} />
        <div className="continueLearningContent"><small>ПРОДОЛЖИТЬ ОБУЧЕНИЕ</small><h2>{active.course.title}</h2><p>{active.course.language}{active.course.level ? ` · ${active.course.level}` : ""}</p>
          <div className="studentProgressLabel"><b>{active.percent}% завершено</b><span>{active.completed} из {active.lessons.length} уроков</span></div><div className="studentProgressBar"><i style={{ width: `${active.percent}%` }} /></div>
          {active.lastLesson && <p className="lastLesson">Последний урок: <b>{active.lastLesson.title}</b></p>}
          <button className="btn primary" onClick={() => open(active.course, active.lastLesson?.id)}>{active.last ? "Продолжить" : "Начать обучение"} <span>→</span></button>
        </div>
      </section>}
      <section className="studentCourseLibrary"><div className="studentSectionHead"><div><small>ВАШИ ПРОГРАММЫ</small><h2>Все курсы</h2></div><span>{courses.length}</span></div><div className="studentCourseGrid">
        {stats.map((item) => <article className="studentCourseCard" key={item.course.id}>
          <button className="studentCoverButton" onClick={() => open(item.course, item.lastLesson?.id)} aria-label={`Открыть курс ${item.course.title}`}><CourseCover course={item.course} /></button>
          <div className="studentCourseInfo"><p className="courseMeta">{item.course.language}{item.course.level ? ` · ${item.course.level}` : ""}</p><h3>{item.course.title}</h3>
            {item.course.mentor && <p className="studentMentor">{item.course.mentorAvatar ? <img src={item.course.mentorAvatar} alt="" /> : <i>{item.course.mentor.slice(0, 2).toUpperCase()}</i>}<span>{item.course.mentor}</span></p>}
            <div className="studentProgressLabel"><b>{item.percent}%</b><span>{item.completed} из {item.lessons.length} уроков</span></div><div className="studentProgressBar"><i style={{ width: `${item.percent}%` }} /></div>
            {item.lastLesson && <p className="studentLastLesson">Последний урок: <b>{item.lastLesson.title}</b></p>}{item.remainingMinutes > 0 && <small className="remainingTime">Осталось примерно {item.remainingMinutes} мин</small>}
            <button className="studentContinueButton" onClick={() => open(item.course, item.lastLesson?.id)}>{item.last ? "Продолжить" : "Начать"} <span>→</span></button>
          </div>
        </article>)}
      </div></section>
    </>}
  </main>;
}

function AdminCourses() {
  const navigate = useNavigate();
  const { displayName, avatarUrl, user } = useAuth();
  const { courses, loading, createCourse, saveCourse, removeCourse, duplicateCourse } = useCourses();
  const [tab, setTab] = useState<CourseStatus | "all">("all");
  const [q, setQ] = useState("");
  const [language, setLanguage] = useState("Все");
  const [author, setAuthor] = useState("Все");
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState("");
  const runAction = async (id: string, action: () => Promise<unknown>) => {
    if (busyId) return;
    setBusyId(id);
    setActionError("");
    try { await action(); }
    catch (error) { setActionError(error instanceof Error ? error.message : "Не удалось выполнить действие. Попробуйте снова."); }
    finally { setBusyId(""); }
  };
  const languages = [...new Set(courses.map((course) => course.language))];
  const authors = [...new Set(courses.map((course) => course.author))];
  const rows = useMemo(() => courses.filter((course) => (tab === "all" || course.status === tab) && (language === "Все" || course.language === language) && (author === "Все" || course.author === author) && `${course.title} ${course.description}`.toLowerCase().includes(q.toLowerCase())), [author, courses, language, q, tab]);
  const edit = (id: string) => navigate(`/courses/editor?course=${id}`);
  const create = () => edit(createCourse().id);
  return <main className="content fade coursesWorking">
    {actionError && <div className="platformNotice" role="alert">{actionError}</div>}
    <div className="pageTitle"><div><h1>Курсы</h1><p>Создавайте программы обучения и управляйте их содержанием.</p></div><button className="btn primary" onClick={create}>＋ Новый курс</button></div>
    <div className="tabs">{(["all", "published", "draft", "archived"] as const).map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{labels[item]} <span>{courses.filter((course) => item === "all" || course.status === item).length}</span></button>)}</div>
    <div className="toolbar"><label><span>⌕</span><input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Поиск по курсам" /></label><select className="filter" value={language} onChange={(event) => setLanguage(event.target.value)}><option>Все</option>{languages.map((item) => <option key={item}>{item}</option>)}</select><select className="filter" value={author} onChange={(event) => setAuthor(event.target.value)}><option>Все</option>{authors.map((item) => <option key={item}>{item}</option>)}</select></div>
    {loading ? <div className="courseSkeletonGrid"><i /><i /><i /></div> : rows.length === 0 ? <div className="courseEmpty"><h2>{courses.length ? "Ничего не найдено" : "Здесь пока нет курсов"}</h2><p>Создайте первый курс и добавьте в него уроки.</p>{!courses.length && <button className="btn primary" onClick={create}>Создать курс</button>}</div> : <div className="courseGrid">{rows.map((course) => {
      const isCurrentAuthor = course.authorId === user?.id || (!course.authorId && course.author === displayName);
      const mentorName = isCurrentAuthor ? displayName : course.mentor;
      const mentorAvatar = isCurrentAuthor ? avatarUrl : course.mentorAvatar;
      return <article className="courseCard" key={course.id}>
        <button className="courseCoverButton" aria-label={`Открыть курс ${course.title}`} onClick={() => navigate(`/courses/learn?course=${course.id}`)}><CourseCover course={course} /></button>
        <div className="courseInfo">
          <div className="statusRow"><span className={course.status === "published" ? "published" : "draft"}>● {statusLabel[course.status]}</span><small>{new Date(course.updatedAt).toLocaleDateString("ru-RU")}</small></div>
          <h3>{course.title}</h3><p>{course.description}</p>
          <div className="courseStats"><span>▤ {courseLessons(course).length} уроков</span><span>♙ {course.students} учеников</span></div>
          <button className="openCourseBtn" onClick={() => navigate(`/courses/learn?course=${course.id}`)}>Открыть курс</button>
          <div className="courseExtras">
            <div className="courseMentorCard">
              <span className="courseMentorAvatar">{mentorAvatar ? <img src={mentorAvatar} alt={mentorName} /> : mentorName.slice(0, 2).toUpperCase()}<i aria-hidden="true" /></span>
              <div><small>НАСТАВНИК КУРСА</small><b>{mentorName}</b></div>
              <span className="courseMentorVerified" title="Наставник курса"><MentorVerifiedIcon /></span>
            </div>
            <div className="courseActions" aria-busy={busyId === course.id}><button disabled={Boolean(busyId)} onClick={() => void runAction(course.id, () => duplicateCourse(course.id))}>Дублировать</button><button disabled={Boolean(busyId)} onClick={() => void runAction(course.id, () => saveCourse({ ...course, status: course.status === "archived" ? "draft" : "archived" }))}>{course.status === "archived" ? "Вернуть" : "В архив"}</button><button className="editCourseAction" onClick={() => edit(course.id)}>Редактировать</button><button disabled={Boolean(busyId)} className="dangerText" onClick={() => { if (confirm(`Удалить курс «${course.title}»?`)) void runAction(course.id, () => removeCourse(course.id)); }}>Удалить</button></div>
          </div>
        </div>
      </article>;
    })}</div>}
  </main>;
}

export function CoursesPage() {
  const { canEditCourses } = useAuth();
  const { courses, loading, enrolledCourseIds, progress, progressLoading } = useCourses();
  if (canEditCourses) return <AdminCourses />;
  const available = courses.filter((course) => course.status === "published" && enrolledCourseIds.includes(course.id));
  return <StudentCourses courses={available} progress={progress} loading={loading || progressLoading} />;
}
