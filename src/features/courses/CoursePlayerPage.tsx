import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import { supabase } from "../../lib/supabase";
import { useCourses } from "./CourseProvider";
import type { LessonBlock } from "./types";

type LessonRun = {
  used: number;
  deadline: number | null;
  expired: boolean;
};

const formatTimer = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

function BlockView({ block }: { block: LessonBlock }) {
  const [answer, setAnswer] = useState("");
  const lines = block.content.split("\n").filter(Boolean);
  if (block.kind === "quiz")
    return (
      <section className="learningBlock quizLearning">
        <h3>{block.title}</h3>
        <b>{lines[0] || "Выберите ответ"}</b>
        {lines.slice(1).map((option) => (
          <label key={option} className={answer === option ? "chosen" : ""}>
            <input
              type="radio"
              name={block.id}
              checked={answer === option}
              onChange={() => setAnswer(option)}
            />
            {option}
          </label>
        ))}
        {answer && (
          <p className={answer === lines[1] ? "answerGood" : "answerBad"}>
            {answer === lines[1] ? "Верно!" : "Попробуйте ещё раз"}
          </p>
        )}
      </section>
    );
  if (block.kind === "html")
    return (
      <section className="learningBlock">
        <h3>{block.title}</h3>
        <iframe
          className="lessonEmbed"
          sandbox="allow-scripts"
          srcDoc={block.content}
          title={block.title}
        />
      </section>
    );
  if (block.kind === "audio")
    return (
      <section className="learningBlock audioLearning">
        <div className="mediaBlockHeading">
          <span>♫</span>
          <div>
            <small>АУДИО</small>
            <h3>{block.title}</h3>
          </div>
        </div>
        {block.content ? (
          <audio controls preload="metadata" src={block.content}>
            Ваш браузер не поддерживает аудио.
          </audio>
        ) : (
          <p className="emptyMaterial">Аудиофайл пока не добавлен.</p>
        )}
      </section>
    );
  if (block.kind === "video" || block.kind === "media") {
    const youtubeId = block.content.match(
      /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/,
    )?.[1];
    const isFile = /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(block.content);
    return (
      <section className="learningBlock videoLearning">
        <div className="mediaBlockHeading">
          <span>▶</span>
          <div>
            <small>ВИДЕОУРОК</small>
            <h3>{block.title}</h3>
          </div>
        </div>
        {youtubeId ? (
          <div className="videoFrame">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${youtubeId}`}
              title={block.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : isFile ? (
          <video
            className="lessonVideo"
            controls
            preload="metadata"
            src={block.content}
          >
            Ваш браузер не поддерживает видео.
          </video>
        ) : block.content ? (
          <div className="videoFrame">
            <iframe src={block.content} title={block.title} allowFullScreen />
          </div>
        ) : (
          <p className="emptyMaterial">Видео пока не добавлено.</p>
        )}
      </section>
    );
  }
  if (block.kind === "file")
    return (
      <section className="learningBlock fileLearning">
        <h3>{block.title}</h3>
        {block.content ? (
          <a
            className="btn primary"
            href={block.content}
            target="_blank"
            rel="noreferrer"
          >
            Открыть материал ↗
          </a>
        ) : (
          <p className="emptyMaterial">Файл пока не прикреплён.</p>
        )}
      </section>
    );
  return (
    <section className="learningBlock">
      <h3>{block.title}</h3>
      <p className="lessonText">
        {block.content || "Содержание пока не добавлено."}
      </p>
    </section>
  );
}

export function CoursePlayerPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { courses, loading } = useCourses();
  const { user, role, canEditCourses } = useAuth();
  const course = courses.find((x) => x.id === params.get("course"));
  const courseId = course?.id;
  const learnerId = user?.id || "guest";
  const lessons = useMemo(
    () =>
      course?.modules.flatMap((module) =>
        module.lessons.map((lesson) => ({ module, lesson })),
      ) || [],
    [course],
  );
  const [lessonId, setLessonId] = useState(params.get("lesson") || "");
  const [completed, setCompleted] = useState<string[]>([]);
  const [mobileTreeOpen, setMobileTreeOpen] = useState(false);
  const [lessonRuns, setLessonRuns] = useState<Record<string, LessonRun>>({});
  const [runsReady, setRunsReady] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!course || !user) return;
    const value = localStorage.getItem(
      `lingvaedu-progress-${user.id}-${course.id}`,
    );
    const timer = setTimeout(
      () => setCompleted(value ? JSON.parse(value) : []),
      0,
    );
    return () => clearTimeout(timer);
  }, [course, user]);
  useEffect(() => {
    if (
      !supabase ||
      !course ||
      !user ||
      role !== "student" ||
      course.status !== "published"
    )
      return;
    void supabase
      .from("course_enrollments")
      .upsert(
        { course_id: course.id, user_id: user.id },
        { onConflict: "course_id,user_id" },
      );
  }, [course, role, user]);
  useEffect(() => {
    if (!courseId) return;
    const loadRuns = window.setTimeout(() => {
      setRunsReady(false);
      const stored = localStorage.getItem(
        `lingvaedu-lesson-runs-${learnerId}-${courseId}`,
      );
      try {
        setLessonRuns(stored ? JSON.parse(stored) : {});
      } catch {
        setLessonRuns({});
      }
      setRunsReady(true);
    }, 0);
    return () => window.clearTimeout(loadRuns);
  }, [courseId, learnerId]);
  useEffect(() => {
    if (!runsReady || !courseId) return;
    localStorage.setItem(
      `lingvaedu-lesson-runs-${learnerId}-${courseId}`,
      JSON.stringify(lessonRuns),
    );
  }, [courseId, learnerId, lessonRuns, runsReady]);
  const currentIndex = Math.max(
    0,
    lessons.findIndex((x) => x.lesson.id === lessonId),
  );
  const current = lessons[currentIndex]?.lesson || lessons[0]?.lesson;
  const currentModule = lessons[currentIndex]?.module || lessons[0]?.module;
  const isLastLesson = currentIndex === lessons.length - 1;
  const currentRun = current ? lessonRuns[current.id] : undefined;
  const isRestricted = Boolean(
    current && (current.timeLimit > 0 || current.attempts > 0),
  );
  const attemptsRemaining = current?.attempts
    ? Math.max(current.attempts - (currentRun?.used || 0), 0)
    : null;
  const secondsRemaining = currentRun?.deadline
    ? Math.max(0, Math.ceil((currentRun.deadline - now) / 1000))
    : null;
  const attemptBlocked = Boolean(
    currentRun?.expired && attemptsRemaining === 0,
  );
  useEffect(() => {
    if (
      !runsReady ||
      !current ||
      completed.includes(current.id) ||
      (current.timeLimit <= 0 && current.attempts <= 0)
    )
      return;
    const startRun = window.setTimeout(() => {
      setLessonRuns((previous) => {
        const existing = previous[current.id];
        if (existing) return previous;
        return {
          ...previous,
          [current.id]: {
            used: 1,
            deadline:
              current.timeLimit > 0
                ? Date.now() + current.timeLimit * 60_000
                : null,
            expired: false,
          },
        };
      });
      setNow(Date.now());
    }, 0);
    return () => window.clearTimeout(startRun);
  }, [completed, current, runsReady]);
  useEffect(() => {
    if (!currentRun?.deadline || currentRun.expired) return;
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    const expire = window.setTimeout(
      () => {
        setNow(Date.now());
        if (!current) return;
        setLessonRuns((previous) => ({
          ...previous,
          [current.id]: { ...previous[current.id], expired: true },
        }));
      },
      Math.max(currentRun.deadline - Date.now(), 0),
    );
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(expire);
    };
  }, [current, currentRun?.deadline, currentRun?.expired]);
  const selectLesson = (id: string) => {
    setLessonId(id);
    setMobileTreeOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const complete = () => {
    if (!current || !course || !user || currentRun?.expired) return;
    const next = [...new Set([...completed, current.id])];
    setCompleted(next);
    localStorage.setItem(
      `lingvaedu-progress-${user.id}-${course.id}`,
      JSON.stringify(next),
    );
    setLessonRuns((previous) =>
      previous[current.id]
        ? {
            ...previous,
            [current.id]: {
              ...previous[current.id],
              deadline: null,
              expired: false,
            },
          }
        : previous,
    );
    if (currentIndex < lessons.length - 1)
      selectLesson(lessons[currentIndex + 1].lesson.id);
  };
  const retryLesson = () => {
    if (!current || attemptBlocked) return;
    setLessonRuns((previous) => {
      const used = previous[current.id]?.used || 0;
      return {
        ...previous,
        [current.id]: {
          used: used + 1,
          deadline:
            current.timeLimit > 0
              ? Date.now() + current.timeLimit * 60_000
              : null,
          expired: false,
        },
      };
    });
    setNow(Date.now());
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  if (loading)
    return (
      <main className="content">
        <div className="courseEmpty">Загружаем курс…</div>
      </main>
    );
  if (!course || (course.status !== "published" && !canEditCourses))
    return (
      <main className="content">
        <div className="courseEmpty">
          <h2>Курс недоступен</h2>
          <p>Возможно, он ещё не опубликован или перемещён в архив.</p>
          <button className="btn primary" onClick={() => navigate("/courses")}>
            Вернуться к курсам
          </button>
        </div>
      </main>
    );
  const percent = lessons.length
    ? Math.round((completed.length / lessons.length) * 100)
    : 0;
  return (
    <main className="coursePlayer fade">
      <header className="playerHeader">
        <button
          className="playerCoursesBack"
          onClick={() => navigate("/courses")}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m14.5 6.5-5.5 5.5 5.5 5.5" />
          </svg>
          <span>КУРСЫ</span>
        </button>
        <div>
          <small>{course.language}</small>
          <b>{course.title}</b>
        </div>
        <div className="playerProgress">
          <span>{percent}% завершено</span>
          <i>
            <em style={{ width: `${percent}%` }} />
          </i>
        </div>
        {canEditCourses && (
          <button
            className="btn ghost playerEditButton"
            aria-label="Редактировать курс"
            title="Редактировать курс"
            onClick={() => navigate(`/courses/editor?course=${course.id}`)}
          >
            <span aria-hidden="true">✎</span>
            <b>Редактировать</b>
          </button>
        )}
      </header>
      <div className="playerLayout">
        <aside
          className={`playerTree ${mobileTreeOpen ? "mobileTreeOpen" : ""}`}
        >
          <button
            className="playerTreeToggle"
            aria-expanded={mobileTreeOpen}
            aria-controls="course-player-lessons"
            onClick={() => setMobileTreeOpen((open) => !open)}
          >
            <span>
              <small>{currentModule?.title || "Содержание курса"}</small>
              <b>{current?.title || "Выберите урок"}</b>
            </span>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m7 10 5 5 5-5" />
            </svg>
          </button>
          <div className="playerTreeContent" id="course-player-lessons">
            {course.modules.map((module, mi) => (
              <div key={module.id}>
                <h3>
                  <span>{mi + 1}</span>
                  {module.title}
                </h3>
                {module.lessons.map((lesson, li) => (
                  <button
                    key={lesson.id}
                    className={current?.id === lesson.id ? "active" : ""}
                    onClick={() => selectLesson(lesson.id)}
                  >
                    <i className={completed.includes(lesson.id) ? "done" : ""}>
                      {completed.includes(lesson.id) ? (
                        <svg viewBox="0 0 20 20" aria-hidden="true">
                          <path d="m5.5 10.2 2.8 2.8 6.2-6.2" />
                        </svg>
                      ) : (
                        li + 1
                      )}
                    </i>
                    <span>
                      {lesson.title}
                      <small>{lesson.blocks.length} блоков</small>
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </aside>
        <article className="lessonReader">
          {current ? (
            <>
              <div className="readerIntro">
                <small>
                  УРОК {currentIndex + 1} ИЗ {lessons.length}
                </small>
                <h1>{current.title}</h1>
                <p>{current.description}</p>
                <div className="readerMeta">
                  {current.timeLimit > 0 && !completed.includes(current.id) && (
                    <span
                      className={`readerLimit timerLimit ${secondsRemaining !== null && secondsRemaining < 60 ? "ending" : ""}`}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="12" cy="13" r="7" />
                        <path d="M12 9v4l2.5 1.5M9 3h6" />
                      </svg>
                      <small>Осталось</small>
                      <b>
                        {formatTimer(
                          secondsRemaining ?? current.timeLimit * 60,
                        )}
                      </b>
                    </span>
                  )}
                  {current.attempts > 0 && !completed.includes(current.id) && (
                    <span className="readerLimit attemptLimit">
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M6.2 8.2A7 7 0 1 1 5 15" />
                        <path d="M6 4.5v4h4" />
                      </svg>
                      <small>Попытка</small>
                      <b>
                        {currentRun?.used || 1} из {current.attempts}
                      </b>
                    </span>
                  )}
                  {completed.includes(current.id) && isRestricted && (
                    <span className="readerLimit completedLimit">
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="m7 12.5 3.2 3.2L17.5 8" />
                      </svg>
                      <small>Статус</small>
                      <b>Завершено</b>
                    </span>
                  )}
                </div>
              </div>
              {currentRun?.expired ? (
                <section className="lessonExpiredCard">
                  <span className="expiredIcon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="8" />
                      <path d="M12 7.5v5M12 16.5h.01" />
                    </svg>
                  </span>
                  <small>
                    {attemptBlocked ? "ПОПЫТКИ ЗАКОНЧИЛИСЬ" : "ВРЕМЯ ВЫШЛО"}
                  </small>
                  <h2>
                    {attemptBlocked
                      ? "Лимит прохождения исчерпан"
                      : "Попробуйте пройти урок ещё раз"}
                  </h2>
                  <p>
                    {attemptBlocked
                      ? "Обратитесь к наставнику, чтобы получить дополнительную попытку."
                      : attemptsRemaining === null
                        ? "Количество повторов не ограничено."
                        : `Осталось попыток: ${attemptsRemaining}.`}
                  </p>
                  {!attemptBlocked && (
                    <button className="btn primary" onClick={retryLesson}>
                      Начать новую попытку
                    </button>
                  )}
                </section>
              ) : (
                <>
                  {current.blocks.length ? (
                    current.blocks.map((block) => (
                      <BlockView key={block.id} block={block} />
                    ))
                  ) : (
                    <div className="learningBlock emptyMaterial">
                      В этом уроке пока нет учебных материалов.
                    </div>
                  )}
                  <footer className="readerFooter">
                    <button
                      className="btn ghost readerBackButton"
                      disabled={currentIndex === 0}
                      onClick={() =>
                        selectLesson(lessons[currentIndex - 1].lesson.id)
                      }
                    >
                      Назад
                    </button>
                    <button
                      className="btn primary readerNextButton"
                      onClick={complete}
                    >
                      {isLastLesson ? "Завершить курс" : "Дальше"}
                    </button>
                  </footer>
                </>
              )}
            </>
          ) : (
            <div className="courseEmpty">
              <h2>В курсе пока нет уроков</h2>
            </div>
          )}
        </article>
      </div>
    </main>
  );
}
