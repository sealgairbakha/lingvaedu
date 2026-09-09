import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import { PageState } from "../../components/PageState";
import { useCourses } from "../courses/CourseProvider";
import { CourseCover, CourseCardInfo } from "../courses/CourseCard";
import "../../styles/student-overview.css";

type StudentData = Pick<ReturnType<typeof useCourses>, "courses" | "enrolledCourseIds" | "progress" | "loading" | "loadError" | "reload" | "progressLoading" | "progressError" | "retryProgress">;

export function StudentOverview({ go }: { go: (page: "courses") => void }) {
  const { displayName, user } = useAuth();
  const data = useCourses();
  return <StudentOverviewContent data={data} displayName={displayName} userId={user?.id} go={go} />;
}

export function StudentOverviewContent({ data, displayName, userId, go }: {
  data: StudentData; displayName: string; userId?: string; go: (page: "courses") => void;
}) {
  const [photoReady, setPhotoReady] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
  const courses = data.courses.filter((course) => course.status === "published" && data.enrolledCourseIds.includes(course.id));
  const ownProgress = data.progress.filter((entry) => entry.userId === userId && courses.some((course) => course.id === entry.courseId && course.modules.some((module) => module.lessons.some((lesson) => lesson.id === entry.lessonId))));
  const latest = [...ownProgress].sort((a, b) => (Date.parse(b.lastOpenedAt) || 0) - (Date.parse(a.lastOpenedAt) || 0))[0];
  const focusCourse = courses.find((course) => course.id === latest?.courseId) ?? courses.find((course) => course.modules.some((module) => module.lessons.length)) ?? courses[0];
  const lessons = focusCourse?.modules.flatMap((module) => module.lessons) ?? [];
  const progressKnown = !data.progressLoading && !data.progressError;
  const nextLesson = progressKnown ? lessons.find((lesson) => !ownProgress.some((entry) => entry.courseId === focusCourse?.id && entry.lessonId === lesson.id && entry.status === "completed")) : undefined;
  const path = (id: string) => `/courses/learn?course=${encodeURIComponent(id)}`;
  const resumePath = focusCourse ? `${path(focusCourse.id)}${nextLesson ? `&lesson=${encodeURIComponent(nextLesson.id)}` : ""}` : "/courses";
  const actionLabel = !progressKnown || !nextLesson ? "Открыть курс" : latest ? "Продолжить урок" : "Начать обучение";

  return <main className="content overviewPage studentOverview">
    <header className="studentOverviewHeading"><div><p>Ваше пространство</p><h1>Привет, {displayName.trim().split(/\s+/)[0] || "ученик"}!</h1></div><button className="studentGuideReplay" onClick={() => window.dispatchEvent(new Event("lingvaedu:student-guide"))}>Как учиться</button></header>
    <section className="studentJourney" aria-label="Ваше учебное путешествие">
      <div className="studentJourneyCopy">
        <span className="studentJourneyEyebrow">УЧИТЬ. ГОВОРИТЬ. ОТКРЫВАТЬ.</span>
        <h2>Целый мир.<br />На вашем <em>языке.</em></h2>
        <p>Для разговоров, встреч и мест,<br className="studentDesktopBreak" /> которые ещё впереди.</p>
        {!data.loading && !data.loadError && focusCourse ? <div className="studentResume">
          <span>{focusCourse.title}</span>
          {nextLesson && <small>{nextLesson.title}</small>}
          <Link className="overviewPrimary" to={resumePath}>{actionLabel}<span aria-hidden="true">↗</span></Link>
        </div> : <button className="overviewPrimary" onClick={() => go("courses")}>К моим курсам <span aria-hidden="true">↗</span></button>}
      </div>
      <div className={`studentPhotoScene${photoReady ? " is-ready" : ""}${photoFailed ? " is-unavailable" : ""}`} aria-hidden="true">
        {!photoFailed && <img src="/overview/student-journey.png" alt="" width="1536" height="1024" fetchPriority="high" onLoad={() => setPhotoReady(true)} onError={() => setPhotoFailed(true)} />}
        <div className="studentPhotoCaption"><span>За пределами учебника</span><strong>Больше, чем слова.</strong></div>
        <div className="studentPhotoNote"><span>Hello!</span><small>Всё начинается с разговора.</small></div>
      </div>
    </section>
    {data.loadError && !data.loading ? <PageState title="Не удалось загрузить курсы" description={data.loadError} action={<button className="overviewPrimary" onClick={data.reload}>Попробовать снова</button>} /> : <section className="studentCourses" aria-label="Ваши курсы">
      <header className="overviewSectionHeading"><div><h2>Ваши курсы</h2><p>В своём ритме, шаг за шагом.</p></div><button className="overviewTextButton" onClick={() => go("courses")}>Все курсы <span aria-hidden="true">↗</span></button></header>
      {data.loading ? <PageState loading title="Загружаем курсы" /> : courses.length ? <ul className="courseGrid overviewCourseList">{courses.slice(0, 3).map((course) => <li key={course.id}><Link className="courseCard overviewCourseLink" to={path(course.id)}><CourseCover course={course} /><CourseCardInfo course={course} showStatus={false} stats={<span>{course.language}{course.level ? ` · ${course.level}` : ""}</span>} action={<span className="openCourseBtn">Открыть курс</span>} /></Link></li>)}</ul> : <div className="studentEmpty"><h3>Скоро здесь начнётся ваша история</h3><p>Когда наставник назначит курс, он появится здесь.</p></div>}
      {data.progressError && <div className="overviewNotice" role="status"><span>Не удалось восстановить место в уроке. Курсы по-прежнему доступны.</span><button onClick={() => { void data.retryProgress(); }}>Повторить</button></div>}
    </section>}
  </main>;
}
