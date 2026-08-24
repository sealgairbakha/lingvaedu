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

const formatAttachmentSize = (bytes?: number) => {
  if (!bytes) return "Учебный материал";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} МБ`;
};

export function LessonBlockView({ block }: { block: LessonBlock }) {
  const [answer, setAnswer] = useState("");
  const [taskAnswers, setTaskAnswers] = useState<Record<string, string>>({});
  const [activeWord, setActiveWord] = useState("");
  const [activeMatch, setActiveMatch] = useState("");
  const [openedImage, setOpenedImage] = useState<number | null>(null);
  const lines = block.content.split("\n").filter(Boolean);
  const blockImages = block.images?.length
    ? block.images
    : block.content
      ? [block.content]
      : [];
  useEffect(() => {
    if (openedImage === null) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenedImage(null);
      if (event.key === "ArrowLeft")
        setOpenedImage((current) => current === null ? null : (current - 1 + blockImages.length) % blockImages.length);
      if (event.key === "ArrowRight")
        setOpenedImage((current) => current === null ? null : (current + 1) % blockImages.length);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [blockImages.length, openedImage]);
  if (block.kind === "drag-words") {
    const items = lines.map((line, index) => {
      const match = line.match(/\[([^\]]+)\]/);
      return {
        id: String(index),
        before: match ? line.slice(0, match.index) : line,
        answer: match?.[1] || "",
        after: match ? line.slice((match.index || 0) + match[0].length) : "",
      };
    });
    const words = items.map((item) => item.answer).filter(Boolean);
    const placeWord = (id: string, word: string) => {
      if (!word) return;
      setTaskAnswers((current) => {
        const next = { ...current };
        Object.keys(next).forEach((key) => {
          if (next[key] === word) delete next[key];
        });
        next[id] = word;
        return next;
      });
      setActiveWord("");
    };
    return (
      <section className="learningBlock taskLearning dragWordsLearning">
        <h3>{block.title}</h3>
        <div className="wordBank">
          {words.map((word) => (
            <button
              key={word}
              type="button"
              draggable
              disabled={Object.values(taskAnswers).includes(word)}
              className={activeWord === word ? "active" : ""}
              onClick={() => setActiveWord(word)}
              onDragStart={(event) => event.dataTransfer.setData("text/plain", word)}
            >
              {word}
            </button>
          ))}
        </div>
        <ol className="gapSentenceList">
          {items.map((item) => (
            <li key={item.id}>
              {item.before}
              <button
                type="button"
                className={
                  taskAnswers[item.id]
                    ? taskAnswers[item.id] === item.answer
                      ? "correct"
                      : "wrong"
                    : ""
                }
                onClick={() => placeWord(item.id, activeWord)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  placeWord(item.id, event.dataTransfer.getData("text/plain"));
                }}
              >
                {taskAnswers[item.id] || "Перетащите слово"}
              </button>
              {item.after}
            </li>
          ))}
        </ol>
      </section>
    );
  }
  if (block.kind === "select-words")
    return (
      <section className="learningBlock taskLearning selectWordsLearning">
        <h3>{block.title}</h3>
        <ol className="gapSentenceList">
          {lines.map((line, index) => {
            const match = line.match(/\[([^\]]+)\]/);
            const options = match?.[1].split("|") || [];
            const id = String(index);
            return (
              <li key={id}>
                {match ? line.slice(0, match.index) : line}
                {match && (
                  <select
                    value={taskAnswers[id] || ""}
                    className={
                      taskAnswers[id]
                        ? taskAnswers[id] === options[0]
                          ? "correct"
                          : "wrong"
                        : ""
                    }
                    onChange={(event) =>
                      setTaskAnswers((current) => ({
                        ...current,
                        [id]: event.target.value,
                      }))
                    }
                  >
                    <option value="">Выберите</option>
                    {options.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                )}
                {match && line.slice((match.index || 0) + match[0].length)}
              </li>
            );
          })}
        </ol>
      </section>
    );
  if (block.kind === "fill-blank")
    return (
      <section className="learningBlock taskLearning fillBlankLearning">
        <h3>{block.title}</h3>
        <ol className="gapSentenceList">
          {lines.map((line, index) => {
            const match = line.match(/\[([^\]]+)\]/);
            const id = String(index);
            const value = taskAnswers[id] || "";
            return (
              <li key={id}>
                {match ? line.slice(0, match.index) : line}
                {match && (
                  <input
                    value={value}
                    aria-label={`Ответ ${index + 1}`}
                    className={
                      value
                        ? value.trim().toLowerCase() === match[1].trim().toLowerCase()
                          ? "correct"
                          : "wrong"
                        : ""
                    }
                    onChange={(event) =>
                      setTaskAnswers((current) => ({
                        ...current,
                        [id]: event.target.value,
                      }))
                    }
                  />
                )}
                {match && line.slice((match.index || 0) + match[0].length)}
              </li>
            );
          })}
        </ol>
      </section>
    );
  if (block.kind === "match") {
    const pairs = lines.map((line, index) => {
      const [left, ...right] = line.split("=");
      return { id: String(index), left: left?.trim(), right: right.join("=").trim() };
    });
    const rightItems = [...pairs].reverse();
    return (
      <section className="learningBlock taskLearning matchLearning">
        <h3>{block.title}</h3>
        <div className="matchGrid">
          <div>
            {pairs.map((pair) => (
              <button
                type="button"
                key={pair.id}
                className={activeMatch === pair.id ? "active" : taskAnswers[pair.id] ? "paired" : ""}
                onClick={() => setActiveMatch(pair.id)}
              >
                {pair.left}
              </button>
            ))}
          </div>
          <div>
            {rightItems.map((item) => {
              const pairedId = Object.keys(taskAnswers).find(
                (key) => taskAnswers[key] === item.right,
              );
              return (
                <button
                  type="button"
                  key={item.id}
                  disabled={!activeMatch || Boolean(pairedId)}
                  className={
                    pairedId
                      ? pairs.find((pair) => pair.id === pairedId)?.right === item.right
                        ? "correct"
                        : "wrong"
                      : ""
                  }
                  onClick={() => {
                    if (!activeMatch) return;
                    setTaskAnswers((current) => ({
                      ...current,
                      [activeMatch]: item.right,
                    }));
                    setActiveMatch("");
                  }}
                >
                  {item.right}
                </button>
              );
            })}
          </div>
        </div>
      </section>
    );
  }
  if (block.kind === "true-false")
    return (
      <section className="learningBlock taskLearning trueFalseLearning">
        <h3>{block.title}</h3>
        {lines.map((line, index) => {
          const [statement, expectedRaw] = line.split("|");
          const expected = expectedRaw?.trim().toLowerCase() === "true" ? "true" : "false";
          const id = String(index);
          return (
            <div className="trueFalseCard" key={id}>
              <b>{index + 1}. {statement.trim()}</b>
              <div>
                {(["true", "false"] as const).map((value) => (
                  <button
                    type="button"
                    key={value}
                    className={
                      taskAnswers[id] === value
                        ? value === expected
                          ? "correct"
                          : "wrong"
                        : ""
                    }
                    onClick={() =>
                      setTaskAnswers((current) => ({ ...current, [id]: value }))
                    }
                  >
                    {value === "true" ? "Верно" : "Неверно"}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </section>
    );
  if (block.kind === "quiz")
    {
      const correct = lines.slice(1).find((option) => option.startsWith("*")) || lines[1];
      const options = lines.slice(1).map((option) => option.replace(/^\*/, ""));
      const correctValue = correct?.replace(/^\*/, "");
      return (
        <section className="learningBlock quizLearning taskLearning">
          <h3>{block.title}</h3>
          <b>{lines[0] || "Выберите ответ"}</b>
          {options.map((option) => (
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
            <p className={answer === correctValue ? "answerGood" : "answerBad"}>
              {answer === correctValue ? "Верно!" : "Попробуйте ещё раз"}
            </p>
          )}
        </section>
      );
    }
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
  if (block.kind === "image")
    return (
      <section className="learningBlock imageLearning">
        <div className="mediaBlockHeading">
          <span>▧</span>
          <div>
            <small>ФОТО</small>
            <h3>{block.title}</h3>
          </div>
        </div>
        {blockImages.length ? (
          <div
            className={`lessonImageCollage layout-${block.imageLayout || "grid"} ${blockImages.length === 1 ? "single" : ""}`}
          >
            {blockImages.map((src, index) => (
              <button
                key={`${src}-${index}`}
                type="button"
                className="lessonImageButton"
                onClick={() => setOpenedImage(index)}
                aria-label={`Открыть фото ${index + 1} в полном размере`}
              >
                <img
                  src={src}
                  alt={`${block.title}${blockImages.length > 1 ? ` — фото ${index + 1}` : ""}`}
                  loading="lazy"
                />
                <span className="lessonImageZoom"><i>⌕</i>Открыть полностью</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="emptyMaterial">Фото пока не добавлено.</p>
        )}
        {openedImage !== null && blockImages[openedImage] && (
          <div className="imageLightbox" role="dialog" aria-modal="true" aria-label={`Просмотр фото: ${block.title}`}>
            <button className="imageLightboxScrim" onClick={() => setOpenedImage(null)} aria-label="Закрыть просмотр" />
            <div className="imageLightboxContent">
              <div className="imageLightboxHead">
                <div><small>ФОТО {openedImage + 1} ИЗ {blockImages.length}</small><b>{block.title}</b></div>
                <button onClick={() => setOpenedImage(null)} aria-label="Закрыть">×</button>
              </div>
              <img src={blockImages[openedImage]} alt={`${block.title} — фото ${openedImage + 1}`} />
              {blockImages.length > 1 && <>
                <button className="imageLightboxNav previous" onClick={() => setOpenedImage((openedImage - 1 + blockImages.length) % blockImages.length)} aria-label="Предыдущее фото">‹</button>
                <button className="imageLightboxNav next" onClick={() => setOpenedImage((openedImage + 1) % blockImages.length)} aria-label="Следующее фото">›</button>
              </>}
            </div>
          </div>
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
        {block.content ? (
          <div className="learningFileCard">
            <span className="learningFileIcon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M6 3.5h8l4 4V20H6Z" />
                <path d="M14 3.5V8h4" />
                <path d="M12 11v6m0 0-2.5-2.5M12 17l2.5-2.5" />
              </svg>
            </span>
            <span className="learningFileInfo">
              <small>ФАЙЛ К УРОКУ</small>
              <b>{block.fileName || block.title || "Учебный материал"}</b>
              <em>{formatAttachmentSize(block.fileSize)}</em>
            </span>
            <span className="learningFileActions">
              <a className="btn ghost" href={block.content} target="_blank" rel="noreferrer">
                Открыть
              </a>
              <a className="btn primary" href={block.content} download={block.fileName || true}>
                Скачать
              </a>
            </span>
          </div>
        ) : (
          <>
            <h3>{block.title}</h3>
            <p className="emptyMaterial">Файл пока не прикреплён.</p>
          </>
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
                      <LessonBlockView key={block.id} block={block} />
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
