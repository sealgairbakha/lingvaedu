import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import { PageState } from "../../components/PageState";
import { useCourses } from "../courses/CourseProvider";
import { CourseCover, CourseCardInfo } from "../courses/CourseCard";
import "../../styles/overview.css";
import { StudentOverview } from "./StudentOverview";

type DashboardStats = { studentCount: number; activeUsers30d: number; groupCount: number; enrollmentCount: number };
type OrganizationResult = { token: string; stats: DashboardStats | null; failed: boolean };
const number = new Intl.NumberFormat("ru-RU");
const plural = new Intl.PluralRules("ru-RU");
const counted = (value: number, one: string, few: string, many: string) =>
  `${number.format(value)} ${plural.select(value) === "one" ? one : plural.select(value) === "few" ? few : many}`;

function ArrowIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h12m-5-5 5 5-5 5" /></svg>;
}

function SectionHeading({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <header className="overviewSectionHeading"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{action}</header>;
}

function Metric({ label, value, note, busy = false }: { label: string; value: string; note: string; busy?: boolean }) {
  return <div className="overviewMetric" aria-busy={busy}>
    <dt>{label}</dt>
    <dd><strong>{busy ? <span className="overviewSkeleton overviewNumberSkeleton" aria-label="Загрузка" /> : value}</strong><small>{busy ? "Загружаем данные…" : note}</small></dd>
  </div>;
}

function LoadingRows() {
  return <div className="overviewLoading" role="status" aria-label="Загружаем курсы" aria-busy="true">
    {[0, 1, 2].map((row) => <div key={row} aria-hidden="true"><span className="overviewSkeleton" /><span className="overviewSkeleton" /></div>)}
  </div>;
}

export function OverviewPage({ go }: { go: (page: "courses") => void }) {
  const { canEditCourses } = useAuth();
  return canEditCourses ? <StaffOverview go={go} /> : <StudentOverview go={go} />;
}

function StaffOverview({ go }: { go: (page: "courses") => void }) {
  const navigate = useNavigate();
  const { displayName, canEditCourses, session, user } = useAuth();
  const { courses, loading, loadError, reload, enrolledCourseIds, progress, progressLoading, progressError, retryProgress, createCourse } = useCourses();
  const [result, setResult] = useState<OrganizationResult | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [artReady, setArtReady] = useState(false);
  const accessToken = session?.access_token;
  const organization = accessToken && result?.token === accessToken ? result.stats : null;
  const organizationFailed = !accessToken || (result?.token === accessToken && result.failed);
  const organizationLoading = canEditCourses && !organization && !organizationFailed;

  useEffect(() => {
    if (!canEditCourses || !accessToken) return;
    const controller = new AbortController();
    void fetch("/api/dashboard", { headers: { Authorization: `Bearer ${accessToken}` }, signal: controller.signal })
      .then(async (response) => {
        if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) throw new Error("Dashboard unavailable");
        const payload = await response.json() as { stats?: DashboardStats };
        if (!payload.stats || ![payload.stats.studentCount, payload.stats.activeUsers30d, payload.stats.groupCount, payload.stats.enrollmentCount].every((value) => Number.isFinite(value) && value >= 0)) throw new Error("Invalid dashboard data");
        if (!controller.signal.aborted) setResult({ token: accessToken, stats: payload.stats, failed: false });
      }).catch(() => {
        if (!controller.signal.aborted) setResult({ token: accessToken, stats: null, failed: true });
      });
    return () => controller.abort();
  }, [accessToken, canEditCourses, attempt]);

  const summary = useMemo(() => {
    const available = canEditCourses ? courses : courses.filter((course) => course.status === "published" && enrolledCourseIds.includes(course.id));
    return available.map((course) => {
      const lessons = course.modules.flatMap((module) => module.lessons);
      const completedIds = new Set(progress.filter((entry) => entry.courseId === course.id && entry.userId === user?.id && entry.status === "completed").map((entry) => entry.lessonId));
      const completed = lessons.filter((lesson) => completedIds.has(lesson.id)).length;
      const filled = lessons.filter((lesson) => lesson.blocks.length > 0).length;
      return { course, lessons: lessons.length, blocks: lessons.reduce((sum, lesson) => sum + lesson.blocks.length, 0), completed,
        percent: lessons.length ? Math.round((canEditCourses ? filled : completed) / lessons.length * 100) : 0 };
    });
  }, [courses, canEditCourses, enrolledCourseIds, progress, user?.id]);
  const totalLessons = summary.reduce((sum, row) => sum + row.lessons, 0);
  const totalBlocks = summary.reduce((sum, row) => sum + row.blocks, 0);
  const completedLessons = summary.reduce((sum, row) => sum + row.completed, 0);
  const completedCourses = summary.filter((row) => row.lessons > 0 && row.percent === 100).length;
  const averageProgress = summary.length ? Math.round(summary.reduce((sum, row) => sum + row.percent, 0) / summary.length) : 0;
  const published = courses.filter((course) => course.status === "published").length;
  const draft = courses.filter((course) => course.status === "draft").length;
  const archived = courses.filter((course) => course.status === "archived").length;
  const recent = [...summary].sort((a, b) => new Date(b.course.updatedAt).getTime() - new Date(a.course.updatedAt).getTime());
  const chart = recent.slice(0, 7);
  const chartMax = Math.max(1, ...chart.map((row) => row.blocks));
  const learningBusy = loading || progressLoading;
  const learningUnavailable = Boolean(progressError) && !progress.length;
  const now = new Date();
  const greeting = now.getHours() < 12 ? "Доброе утро" : now.getHours() < 18 ? "Добрый день" : "Добрый вечер";
  const coursePath = (id: string) => `/courses/${canEditCourses ? "editor" : "learn"}?course=${encodeURIComponent(id)}`;
  const create = () => { const course = createCourse(); navigate(`/courses/editor?course=${encodeURIComponent(course.id)}`); };

  return <main className="content overviewPage">
    <header className="overviewHeader">
      <div><h1>Обзор</h1></div>
      <div className="overviewHeaderActions">
        <time dateTime={`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`}>{new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(now)}</time>
      </div>
    </header>

    <section className="overviewWelcome" aria-label="Ваше учебное пространство">
      <div className="overviewWelcomeCopy">
        <span className="overviewWelcomeEyebrow">Ваше учебное пространство</span>
        <h2>{greeting},<br />{displayName.trim().split(/\s+/)[0]}<span className="overviewGreetingDot">.</span></h2>
        <p>{canEditCourses ? "Большие открытия начинаются с одного урока. Продолжим создавать их вместе?" : "Новый язык открывает новый мир. Продолжим ваше путешествие?"}</p>
        {canEditCourses ? <button className="overviewPrimary overviewWelcomeAction" onClick={create}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 4v12M4 10h12" /></svg>Создать курс</button> : <button className="overviewPrimary overviewWelcomeAction" onClick={() => go("courses")}>К моим курсам <ArrowIcon /></button>}
      </div>
      <img className={artReady ? "overviewWelcomeArt overviewWelcomeArtReady" : "overviewWelcomeArt"} src="/overview/learning-studio.png" width="1254" height="1254" alt="" fetchPriority="high" onLoad={() => setArtReady(true)} />
    </section>

    {loadError && !loading ? <PageState title="Не удалось загрузить обзор" description={loadError} action={<button className="overviewPrimary" onClick={reload}>Попробовать снова</button>} /> : <>
      <dl className="overviewMetrics" aria-label={canEditCourses ? "Показатели платформы" : "Показатели обучения"}>
        {canEditCourses ? <>
          <Metric label="Ученики" value={organization ? number.format(organization.studentCount) : "—"} busy={organizationLoading} note={organization ? `${number.format(organization.activeUsers30d)} активны за 30 дней` : "Данные недоступны"} />
          <Metric label="Опубликовано курсов" value={number.format(published)} busy={loading} note={`Всего в каталоге: ${number.format(courses.length)}`} />
          <Metric label="Учебные материалы" value={number.format(totalBlocks)} busy={loading} note={counted(totalLessons, "урок", "урока", "уроков")} />
          <Metric label="Учебные группы" value={organization ? number.format(organization.groupCount) : "—"} busy={organizationLoading} note={organization ? counted(organization.enrollmentCount, "назначение", "назначения", "назначений") : "Данные недоступны"} />
        </> : <>
          <Metric label="Назначено курсов" value={number.format(summary.length)} busy={loading} note={learningBusy || learningUnavailable ? "Прогресс уточняется" : `Завершено: ${completedCourses}`} />
          <Metric label="Пройдено уроков" value={learningUnavailable ? "—" : number.format(completedLessons)} busy={learningBusy} note={`Всего уроков: ${totalLessons}`} />
          <Metric label="Общий прогресс" value={learningUnavailable ? "—" : `${averageProgress}%`} busy={learningBusy} note="В среднем по назначенным курсам" />
          <Metric label="Учебные материалы" value={number.format(totalBlocks)} busy={loading} note="Доступно в назначенных курсах" />
        </>}
      </dl>
      {canEditCourses && organizationFailed && <div className="overviewNotice" role="status"><span>Статистика учеников и групп временно недоступна.</span><button disabled={!accessToken} onClick={() => { setResult(null); setAttempt((value) => value + 1); }}>Повторить</button></div>}
      {!canEditCourses && progressError && <div className="overviewNotice" role="status"><span>{progressError}</span><button onClick={() => { void retryProgress(); }}>Повторить</button></div>}

      <section className="overviewPanel overviewRecent" aria-label={canEditCourses ? "Недавно обновлённые курсы" : "Продолжить обучение"}>
        <SectionHeading title={canEditCourses ? "Недавно обновлённые курсы" : "Продолжить обучение"} description={canEditCourses ? "Вернитесь к работе над учебными материалами" : "Откройте курс, чтобы вернуться к урокам"} action={<button className="overviewTextButton" onClick={() => go("courses")}>Все курсы <ArrowIcon /></button>} />
        {loading ? <LoadingRows /> : recent.length ? <ul className="courseGrid overviewCourseList">{recent.slice(0, 3).map((row) => <li key={row.course.id}>
          <Link className="courseCard overviewCourseLink" to={coursePath(row.course.id)}>
            <CourseCover course={row.course} />
            <CourseCardInfo course={row.course} showStatus={canEditCourses}
              stats={<span>{counted(row.lessons, "урок", "урока", "уроков")}{canEditCourses && ` · ${counted(row.course.students, "ученик", "ученика", "учеников")}`}</span>}
              progress={<div className="overviewCourseProgress"><span>{canEditCourses ? "Уроки с материалами" : "Пройдено"}<b>{!canEditCourses && (learningBusy || learningUnavailable) ? "—" : `${row.percent}%`}</b></span><div className="overviewBar" aria-hidden="true"><span style={{ width: `${!canEditCourses && (learningBusy || learningUnavailable) ? 0 : row.percent}%` }} /></div></div>}
              action={<span className="openCourseBtn">{canEditCourses ? "Редактировать курс" : "Открыть курс"}</span>} />
          </Link>
        </li>)}</ul> : <div className="overviewEmpty"><p>{canEditCourses ? "Созданные курсы будут появляться здесь после обновления." : "Ваши назначенные курсы появятся здесь."}</p></div>}
      </section>

      <div className="overviewColumns">
        <section className="overviewPanel overviewComparison" aria-label={canEditCourses ? "Наполнение курсов" : "Прогресс по курсам"}>
          <SectionHeading title={canEditCourses ? "Наполнение курсов" : "Прогресс по курсам"} description={canEditCourses ? "Количество блоков в последних обновлённых курсах" : "Завершённые уроки в назначенных курсах"} />
          {loading || (!canEditCourses && progressLoading) ? <LoadingRows /> : chart.length ? <ul className="overviewChart">{chart.map((row) => <li key={row.course.id}>
            <Link to={coursePath(row.course.id)} className="overviewChartLabel">{row.course.title}</Link>
            <span className="overviewChartValue">{canEditCourses ? number.format(row.blocks) : learningUnavailable ? "—" : `${row.percent}%`}</span>
            <div className="overviewBar" aria-hidden="true"><span style={{ width: `${canEditCourses ? row.blocks / chartMax * 100 : learningUnavailable ? 0 : row.percent}%` }} /></div>
          </li>)}</ul> : <div className="overviewEmpty"><h3>{canEditCourses ? "Начните с первого курса" : "Курсы пока не назначены"}</h3><p>{canEditCourses ? "Добавьте уроки и материалы — здесь появится наполнение каждого курса." : "Когда наставник назначит вам курс, здесь появится ваш прогресс."}</p>{canEditCourses && <button className="overviewTextButton" onClick={create}>Создать курс <ArrowIcon /></button>}</div>}
          {chart.length > 0 && !loading && <footer className="overviewPanelFoot">{canEditCourses ? "Сравнение по количеству блоков, а не по длительности курса" : "Прогресс считается по полностью завершённым урокам"}</footer>}
        </section>

        <section className="overviewPanel" aria-label={canEditCourses ? "Состояние каталога" : "Ваше обучение"}>
          <SectionHeading title={canEditCourses ? "Состояние каталога" : "Ваше обучение"} />
          {loading || (!canEditCourses && progressLoading) ? <LoadingRows /> : <>
            <dl className="overviewStatusList">
              {(canEditCourses ? [
                { label: "Опубликованные", note: "Доступны назначенным ученикам", value: published, status: "published" },
                { label: "Черновики", note: "Ожидают публикации", value: draft, status: "draft" },
                { label: "Архив", note: "Скрытые курсы", value: archived, status: "archived" },
              ] : [
                { label: "Завершено", note: "Все уроки пройдены", value: completedCourses, status: "published" },
                { label: "В процессе", note: "Продолжайте с места остановки", value: summary.filter((row) => row.percent > 0 && row.percent < 100).length, status: "draft" },
                { label: "Не начато", note: "Можно приступить к обучению", value: summary.filter((row) => row.percent === 0).length, status: "archived" },
              ]).map((item) => <div key={item.label}><dt><i data-status={item.status} aria-hidden="true" /><span>{item.label}<small>{item.note}</small></span></dt><dd>{!canEditCourses && learningUnavailable ? "—" : number.format(item.value)}</dd></div>)}
            </dl>
            <div className="overviewCatalogAction"><button className="overviewTextButton" onClick={() => go("courses")}>Открыть курсы <ArrowIcon /></button></div>
          </>}
        </section>
      </div>

    </>}
  </main>;
}
