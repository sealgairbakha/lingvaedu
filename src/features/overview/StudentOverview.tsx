import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import { PageState } from "../../components/PageState";
import { useCourses } from "../courses/CourseProvider";
import { CourseCover, CourseCardInfo } from "../courses/CourseCard";
import { animateHeadlineParticles } from "./headlineParticles";
import "../../styles/student-overview.css";

type StudentData = Pick<ReturnType<typeof useCourses>, "courses" | "enrolledCourseIds" | "progress" | "loading" | "loadError" | "reload" | "progressLoading" | "progressError" | "retryProgress">;

const studentStories = [
  {
    src: "/overview/student-story-live.png",
    alt: "Ученица занимается языком с наставником по видеосвязи",
    label: "Живой английский",
    title: "Говорите с первого занятия.",
    note: "Практика с наставником помогает быстрее почувствовать уверенность.",
  },
  {
    src: "/overview/student-story-practice.png",
    alt: "Ученица тренирует произношение во время онлайн-занятия",
    label: "Практика в своём ритме",
    title: "Слушайте. Повторяйте. Запоминайте.",
    note: "Короткие занятия легко встроить в обычный день.",
  },
  {
    src: "/overview/student-story-conversation.png",
    alt: "Двое друзей беседуют за столом после занятия языком",
    label: "За пределами учебника",
    title: "Больше, чем слова.",
    note: "Язык для встреч, путешествий и новых знакомств.",
  },
] as const;

const studentHeadlines = [
  { first: "Говорите смелее.", second: "С первого", accent: "занятия." },
  { first: "Свой ритм.", second: "Уверенный", accent: "результат." },
  { first: "Целый мир.", second: "На вашем", accent: "языке." },
] as const;

const storyStorageKey = "lingvaedu:student-overview-story";
const headlineRotationMs = 8000;

function getNextStoryIndex() {
  const fallback = Math.floor(Math.random() * studentStories.length);
  try {
    const previous = Number.parseInt(window.localStorage.getItem(storyStorageKey) ?? "", 10);
    return Number.isInteger(previous) && previous >= 0 && previous < studentStories.length
      ? (previous + 1) % studentStories.length
      : fallback;
  } catch {
    return fallback;
  }
}

function ArrowIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h12m-5-5 5 5-5 5" /></svg>;
}

function HeadlineWords({ text }: { text: string }) {
  const words = text.split(" ");
  return words.map((word, index) => <span key={`${word}-${index}`}><span className="studentHeadlineWord" data-particle-text={word}>{word}</span>{index < words.length - 1 ? " " : null}</span>);
}

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
  const [activeStory] = useState(getNextStoryIndex);
  const [activeHeadline, setActiveHeadline] = useState(activeStory);
  const activeHeadlineRef = useRef(activeStory);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const particleCanvasRef = useRef<HTMLCanvasElement>(null);
  const particleCleanupRef = useRef<(() => void) | null>(null);
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
  const story = studentStories[activeStory];

  useEffect(() => {
    try {
      window.localStorage.setItem(storyStorageKey, String(activeStory));
    } catch {
      // The selected story still works when storage is unavailable.
    }
  }, [activeStory]);

  useEffect(() => {
    let isVisible = true;
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
    }, { threshold: 0.2 });

    if (headlineRef.current) observer?.observe(headlineRef.current);
    const interval = window.setInterval(() => {
      if (!isVisible || document.visibilityState === "hidden") return;
      const nextHeadline = (activeHeadlineRef.current + 1) % studentHeadlines.length;
      const heading = headlineRef.current;
      const canvas = particleCanvasRef.current;
      if (!heading || !canvas || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        activeHeadlineRef.current = nextHeadline;
        setActiveHeadline(nextHeadline);
        return;
      }

      particleCleanupRef.current?.();
      particleCleanupRef.current = animateHeadlineParticles({
        heading,
        canvas,
        nextIndex: nextHeadline,
        onSwap: () => {
          activeHeadlineRef.current = nextHeadline;
          setActiveHeadline(nextHeadline);
        },
      });
    }, headlineRotationMs);

    const cancelParticles = () => {
      particleCleanupRef.current?.();
      particleCleanupRef.current = null;
    };
    const cancelWhenHidden = () => {
      if (document.visibilityState === "hidden") cancelParticles();
    };
    window.addEventListener("resize", cancelParticles);
    document.addEventListener("visibilitychange", cancelWhenHidden);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("resize", cancelParticles);
      document.removeEventListener("visibilitychange", cancelWhenHidden);
      cancelParticles();
      observer?.disconnect();
    };
  }, []);

  return <main className="content overviewPage studentOverview">
    <header className="studentOverviewHeading"><div><p>Ваше пространство</p><h1>Привет, {displayName.trim().split(/\s+/)[0] || "ученик"}!</h1></div><button className="studentGuideReplay" onClick={() => window.dispatchEvent(new Event("lingvaedu:student-guide"))}>Как учиться</button></header>
    <section className="studentJourney" aria-label="Ваше учебное путешествие">
      <div className="studentJourneyCopy">
        <span className="studentJourneyEyebrow">УЧИТЬ. ГОВОРИТЬ. ОТКРЫВАТЬ.</span>
        <h2 ref={headlineRef} className="studentHeadline">{studentHeadlines.map((headline, index) => <span key={headline.accent} className={`studentHeadlineSlide${index === activeHeadline ? " is-visible" : ""}`} aria-hidden={index !== activeHeadline}><span><HeadlineWords text={headline.first} /></span><br /><span><HeadlineWords text={headline.second} /> <em className="studentHeadlineAccent" data-glow={headline.accent} data-particle-text={headline.accent}>{headline.accent}</em></span></span>)}<canvas ref={particleCanvasRef} className="studentHeadlineParticles" aria-hidden="true" /></h2>
        {!data.loading && !data.loadError && focusCourse ? <div className="studentResume">
          <span className="studentResumeLabel">Продолжить обучение</span>
          <span className="studentResumeCourse">{focusCourse.title}</span>
          {nextLesson && <small>{nextLesson.title}</small>}
          <Link className="overviewPrimary" to={resumePath}>{actionLabel}</Link>
        </div> : <button className="overviewPrimary" onClick={() => go("courses")}>К моим курсам <ArrowIcon /></button>}
      </div>
      <div className={`studentPhotoScene${photoReady ? " is-ready" : ""}${photoFailed ? " is-unavailable" : ""}`} role="group" aria-label="Истории об обучении">
        {!photoFailed && <img key={story.src} src={story.src} alt={story.alt} width="1536" height="1024" fetchPriority={activeStory === 0 ? "high" : "auto"} onLoad={() => setPhotoReady(true)} onError={() => setPhotoFailed(true)} />}
        <div className="studentPhotoCaption"><span>{story.label}</span><strong>{story.title}</strong><small>{story.note}</small></div>
      </div>
    </section>
    {data.loadError && !data.loading ? <PageState title="Не удалось загрузить курсы" description={data.loadError} action={<button className="overviewPrimary" onClick={data.reload}>Попробовать снова</button>} /> : <section className="studentCourses" aria-label="Ваши курсы">
      <header className="overviewSectionHeading"><div><h2>Ваши курсы</h2><p>В своём ритме, шаг за шагом.</p></div><button className="overviewTextButton" onClick={() => go("courses")}>Все курсы <ArrowIcon /></button></header>
      {data.loading ? <PageState loading title="Загружаем курсы" /> : courses.length ? <ul className="courseGrid overviewCourseList">{courses.slice(0, 3).map((course) => <li key={course.id}><Link className="courseCard overviewCourseLink" to={path(course.id)}><CourseCover course={course} /><CourseCardInfo course={course} showStatus={false} stats={<span>{course.language}{course.level ? ` · ${course.level}` : ""}</span>} action={<span className="openCourseBtn">Открыть курс</span>} /></Link></li>)}</ul> : <div className="studentEmpty"><h3>Скоро здесь начнётся ваша история</h3><p>Когда наставник назначит курс, он появится здесь.</p></div>}
      {data.progressError && <div className="overviewNotice" role="status"><span>Не удалось восстановить место в уроке. Курсы по-прежнему доступны.</span><button onClick={() => { void data.retryProgress(); }}>Повторить</button></div>}
    </section>}
  </main>;
}
