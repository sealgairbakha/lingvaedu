import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/AuthProvider";
import { PageState } from "../../components/PageState";
import { downloadCsv } from "../../lib/csv";

type ReportCourse = { id: string; title: string; status: string; lessons: number; students: number; completedLessons: number; totalLessons: number; completion: number };
type Report = { courses: ReportCourse[]; summary: { students: number; published: number; completedLessons: number; completion: number }; updatedAt: string };

export function ReportsPage() {
  const { session } = useAuth();
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const [query, setQuery] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/reports", { headers: { Authorization: `Bearer ${session?.access_token || ""}` }, signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Не удалось загрузить отчёт");
        if (!controller.signal.aborted) setReport(data);
      } catch (caught) {
        if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Не удалось загрузить отчёт");
      } finally { if (!controller.signal.aborted) setLoading(false); }
    };
    void load();
    return () => controller.abort();
  }, [session?.access_token, version]);
  const rows = useMemo(() => (report?.courses || []).filter((course) => course.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).sort((a, b) => b.students - a.students), [report, query]);
  const exportReport = () => downloadCsv(`lingvaedu-report-${new Date().toISOString().slice(0, 10)}.csv`, [
    ["Курс", "Уроков", "Учеников", "Завершено уроков", "Завершение, %"],
    ...rows.map((course) => [course.title, course.lessons, course.students, course.completedLessons, course.completion]),
  ]);
  return <main className="content fade reportsPage">
    <div className="pageTitle"><div><h1>Отчёты</h1><p>Реальные результаты обучения на вашей платформе.</p></div><div className="titleActions"><button className="btn ghost" disabled={loading} onClick={() => setVersion((value) => value + 1)}>Обновить</button><button className="btn primary" disabled={loading || Boolean(error) || !rows.length} onClick={exportReport}>Скачать CSV</button></div></div>
    {loading ? <PageState title="Собираем отчёт" description="Рассчитываем показатели по курсам и прогрессу учеников." loading /> : error ? <PageState title="Отчёт временно недоступен" description={error} action={<button className="btn primary" onClick={() => setVersion((value) => value + 1)}>Повторить</button>} /> : report && <>
      <section className="reportSummary" aria-label="Основные показатели">
        {[["Учеников", report.summary.students, "С назначенными курсами"], ["Опубликовано курсов", report.summary.published, "Доступны назначенным ученикам"], ["Завершено уроков", report.summary.completedLessons, "В действующих назначениях"], ["Завершение", `${report.summary.completion}%`, "От всех назначенных уроков"]].map(([title, value, note]) => <article key={title}><span>{title}</span><strong>{value}</strong><small>{note}</small></article>)}
      </section>
      <section className="panel reportCoursePanel"><div className="panelHead"><div><h2>Результаты по курсам</h2><p>Обновлено {new Date(report.updatedAt).toLocaleString("ru-RU")}</p></div><input aria-label="Найти курс в отчёте" placeholder="Найти курс…" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
        {!rows.length ? <PageState title="Курсы не найдены" description={query ? "Попробуйте изменить поисковый запрос." : "Показатели появятся после создания курсов и назначения учеников."} /> : <div className="reportTableScroll" tabIndex={0} role="region" aria-label="Таблица результатов"><table className="reportTable"><thead><tr><th scope="col">Курс</th><th scope="col">Учеников</th><th scope="col">Уроков</th><th scope="col">Завершение</th></tr></thead><tbody>{rows.map((course) => <tr key={course.id}><th scope="row">{course.title}</th><td>{course.students}</td><td>{course.lessons}</td><td><div className="reportProgress"><progress max="100" value={course.completion} aria-label={`Завершение курса ${course.title}`} /><span>{course.completion}%</span></div></td></tr>)}</tbody></table></div>}
      </section><p className="reportMethod">Завершение — доля выполненных уроков среди всех уроков, назначенных ученикам. Прогресс вне назначенных курсов и удалённые уроки не учитываются.</p>
    </>}
  </main>;
}
