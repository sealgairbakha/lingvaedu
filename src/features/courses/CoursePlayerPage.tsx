import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import { useCourses } from "./CourseProvider";
import { CourseAssignmentBlock } from "./CourseAssignmentBlock";
import { GameBlockView } from "./GameBlockView";
import { LearningBlockHeader } from "./LearningBlockHeader";
import type { LessonBlock } from "./types";
import { getCourseTaskLocale, type CourseTaskLocale } from "./courseTaskLocale";
import { sanitizeRichText } from "./richText";

const lessonFontFamilies = {
  onest: '"Onest Variable", Onest, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  rounded: '"Trebuchet MS", Arial, sans-serif',
  mono: '"Cascadia Code", Consolas, monospace',
} as const;

const taskBlockKinds = new Set<LessonBlock["kind"]>([
  "drag-words",
  "select-words",
  "fill-blank",
  "match",
  "true-false",
  "quiz",
  "assignment",
  "game-memory",
  "game-build-word",
  "game-listen-choice",
  "game-missing",
  "game-odd-one-out",
  "game-speed",
  "game-truth",
  "game-categories",
  "game-sentence",
  "game-adventure",
]);

type LessonRun = {
  used: number;
  deadline: number | null;
  expired: boolean;
};

const formatTimer = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

const formatAudioTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
};

function LessonAudioPlayer({ src, title }: { src: string; title: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [failed, setFailed] = useState(false);
  const progress = duration ? Math.min((currentTime / duration) * 100, 100) : 0;

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      try {
        await audio.play();
      } catch {
        setFailed(true);
      }
    } else {
      audio.pause();
    }
  };

  const cycleSpeed = () => {
    const values = [1, 1.25, 1.5, 0.75];
    const next = values[(values.indexOf(speed) + 1) % values.length];
    setSpeed(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  return (
    <div className={`lessonAudioPlayer ${failed ? "failed" : ""}`}>
      <audio
        ref={audioRef}
        className="lessonAudioElement"
        preload="metadata"
        src={src}
        onLoadedMetadata={(event) => {
          setDuration(event.currentTarget.duration || 0);
          setFailed(false);
        }}
        onDurationChange={(event) => setDuration(event.currentTarget.duration || 0)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onError={() => setFailed(true)}
      />
      <button
        type="button"
        className="lessonAudioPlay"
        aria-label={playing ? "Пауза" : "Воспроизвести"}
        onClick={() => void togglePlayback()}
      >
        {playing ? (
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6v12M16 6v12" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 9 6-9 6Z" /></svg>
        )}
      </button>
      <div className="lessonAudioMain">
        <div className="lessonAudioInfo">
          <span><b>{title}</b><small>{failed ? "Не удалось загрузить аудио" : playing ? "Воспроизводится" : "Готово к прослушиванию"}</small></span>
          <time>{formatAudioTime(currentTime)} / {formatAudioTime(duration)}</time>
        </div>
        <input
          className="lessonAudioProgress"
          type="range"
          min="0"
          max={duration || 0}
          step="0.1"
          value={Math.min(currentTime, duration || 0)}
          aria-label="Позиция воспроизведения"
          style={{ background: `linear-gradient(90deg,var(--purple) ${progress}%,#dfe3eb ${progress}%)` }}
          onChange={(event) => {
            const value = Number(event.target.value);
            setCurrentTime(value);
            if (audioRef.current) audioRef.current.currentTime = value;
          }}
        />
      </div>
      <div className="lessonAudioControls">
        <button type="button" className="lessonAudioSpeed" onClick={cycleSpeed} aria-label={`Скорость ${speed}`} title="Скорость воспроизведения">{speed}×</button>
        <button
          type="button"
          className="lessonAudioMute"
          aria-label={muted ? "Включить звук" : "Выключить звук"}
          onClick={() => {
            const next = !muted;
            setMuted(next);
            if (audioRef.current) audioRef.current.muted = next;
          }}
        >
          {muted ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 10h4l5-4v12l-5-4H5ZM18 9l4 6m0-6-4 6" /></svg> : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 10h4l5-4v12l-5-4H5ZM17 9.5a4 4 0 0 1 0 5M19.5 7a7.5 7.5 0 0 1 0 10" /></svg>}
        </button>
      </div>
    </div>
  );
}

const formatAttachmentSize = (bytes?: number) => {
  if (!bytes) return "Учебный материал";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} МБ`;
};

const normalizeTaskAnswer = (value: string) =>
  value.trim().toLocaleLowerCase().replace(/\s+/g, " ");

const parseGapTaskLine = (line: string) => {
  const draftMatch = line.match(/\s*\[\[gap-answer:([^\]]*)\]\]$/);
  if (draftMatch) {
    let answer = draftMatch[1] || "";
    try {
      answer = decodeURIComponent(answer);
    } catch {
      // Keep legacy or manually edited text readable.
    }
    return {
      before: line.replace(/\s*\[\[gap-answer:([^\]]*)\]\]$/, ""),
      answer,
      after: "",
    };
  }
  const match = line.match(/\[([^\]]*)\]/);
  return {
    before: match ? line.slice(0, match.index) : line,
    answer: match?.[1] || "",
    after: match ? line.slice((match.index || 0) + match[0].length) : "",
  };
};

function TaskActions({
  checked,
  answered,
  total,
  correct,
  onCheck,
  onReset,
  onContinue,
  continueLabel,
  labels,
}: {
  checked: boolean;
  answered: number;
  total: number;
  correct: number;
  onCheck: () => void;
  onReset: () => void;
  onContinue?: () => void;
  continueLabel?: string;
  labels: CourseTaskLocale;
}) {
  const complete = total > 0 && answered === total;
  return (
    <div className={`taskActions ${checked ? (correct === total ? "success" : "needsWork") : ""}`}>
      <div aria-live="polite">
        {checked ? (
          <>
            <b>{correct === total ? `${labels.excellent} ${labels.allCorrect}` : labels.correctCount(correct, total)}</b>
            <small>
              {correct === total
                ? labels.taskComplete
                : labels.fixAnswers}
            </small>
          </>
        ) : (
          <>
            <b>{complete ? labels.readyToCheck : labels.completedCount(answered, total)}</b>
            <small>{complete ? labels.allAnswered : labels.answerAll}</small>
          </>
        )}
      </div>
      <button
        type="button"
        className={checked ? "taskResetButton" : "taskCheckButton"}
        disabled={!checked && !complete}
        onClick={checked && correct === total && onContinue ? onContinue : checked ? onReset : onCheck}
      >
        {checked && correct === total && onContinue ? continueLabel || labels.nextTask : checked ? labels.reset : labels.check}
      </button>
    </div>
  );
}

export function LessonBlockView({
  block,
  onTaskResult,
  onContinue,
  continueLabel,
  courseLanguage,
  courseId,
  lessonId,
}: {
  block: LessonBlock;
  onTaskResult?: (blockId: string, passed: boolean) => void;
  onContinue?: () => void;
  continueLabel?: string;
  courseLanguage?: string;
  courseId?: string;
  lessonId?: string;
}) {
  const labels = getCourseTaskLocale(courseLanguage);
  const [answer, setAnswer] = useState("");
  const [taskAnswers, setTaskAnswers] = useState<Record<string, string>>({});
  const [activeWord, setActiveWord] = useState("");
  const [activeMatch, setActiveMatch] = useState("");
  const [matchAttempts, setMatchAttempts] = useState<Record<string, boolean[]>>({});
  const [matchResolvedOrder, setMatchResolvedOrder] = useState<string[]>([]);
  const [taskChecked, setTaskChecked] = useState(false);
  const [openedImage, setOpenedImage] = useState<number | null>(null);
  const invalidateTask = () => {
    setTaskChecked(false);
    onTaskResult?.(block.id, false);
  };
  const checkTask = (correct: number, total: number) => {
    setTaskChecked(true);
    onTaskResult?.(block.id, total > 0 && correct === total);
  };
  const lines = block.content.split("\n").filter(Boolean);
  const blockImages = block.images?.length
    ? block.images
    : block.content
      ? [block.content]
      : [];
  const blockImageCaptions = blockImages.map(
    (_, index) => block.imageCaptions?.[index]?.trim() || "",
  );
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
  if (block.kind.startsWith("game-"))
    return <GameBlockView block={block} courseLanguage={courseLanguage} onResult={(passed) => onTaskResult?.(block.id, passed)} />;
  if (block.kind === "assignment")
    return (
      <CourseAssignmentBlock
        block={block}
        courseId={courseId}
        lessonId={lessonId}
        courseLanguage={courseLanguage}
        onSubmitted={(submitted) => onTaskResult?.(block.id, submitted)}
      />
    );
  if (block.kind === "drag-words") {
    const items = lines.map((line, index) => {
      const parsed = parseGapTaskLine(line);
      return {
        id: String(index),
        ...parsed,
      };
    });
    const wordTokens = items
      .filter((item) => item.answer)
      .map((item) => ({ id: `word-${item.id}`, word: item.answer }));
    const wordById = new Map(wordTokens.map((token) => [token.id, token.word]));
    const placeWord = (id: string, tokenId: string) => {
      if (!tokenId || !wordById.has(tokenId)) return;
      setTaskAnswers((current) => {
        const next = { ...current };
        Object.keys(next).forEach((key) => {
          if (next[key] === tokenId) delete next[key];
        });
        next[id] = tokenId;
        return next;
      });
      setActiveWord("");
      invalidateTask();
    };
    const answered = items.filter((item) => taskAnswers[item.id]).length;
    const correct = items.filter(
      (item) =>
        normalizeTaskAnswer(wordById.get(taskAnswers[item.id]) || "") ===
        normalizeTaskAnswer(item.answer),
    ).length;
    return (
      <section className="learningBlock taskLearning dragWordsLearning">
        <LearningBlockHeader kind={block.kind} title={block.title} category="task" language={courseLanguage} />
        <div className="wordBank">
          {wordTokens.map((token) => (
            <button
              key={token.id}
              type="button"
              draggable
              disabled={Object.values(taskAnswers).includes(token.id)}
              className={activeWord === token.id ? "active" : ""}
              onClick={() => setActiveWord(token.id)}
              onDragStart={(event) => event.dataTransfer.setData("text/plain", token.id)}
            >
              {token.word}
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
                  taskChecked && taskAnswers[item.id]
                    ? normalizeTaskAnswer(wordById.get(taskAnswers[item.id]) || "") ===
                      normalizeTaskAnswer(item.answer)
                      ? "correct"
                      : "wrong"
                    : ""
                }
                onClick={() => {
                  if (activeWord) {
                    placeWord(item.id, activeWord);
                    return;
                  }
                  if (taskAnswers[item.id]) {
                    setTaskAnswers((current) => {
                      const next = { ...current };
                      delete next[item.id];
                      return next;
                    });
                    invalidateTask();
                  }
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  placeWord(item.id, event.dataTransfer.getData("text/plain"));
                }}
              >
                {wordById.get(taskAnswers[item.id]) || labels.dragWord}
              </button>
              {item.after}
            </li>
          ))}
        </ol>
        <TaskActions
          checked={taskChecked}
          answered={answered}
          total={items.length}
          correct={correct}
          onCheck={() => checkTask(correct, items.length)}
          onReset={() => {
            setTaskAnswers({});
            setActiveWord("");
            invalidateTask();
          }}
          onContinue={onContinue}
          continueLabel={continueLabel}
          labels={labels}
        />
      </section>
    );
  }
  if (block.kind === "select-words") {
    const items = lines.map((line, index) => {
      const match = line.match(/\[([^\]]*)\]/);
      const options = (match?.[1].split("|") || []).filter(Boolean);
      return { id: String(index), line, match, options };
    });
    const answered = items.filter((item) => taskAnswers[item.id]).length;
    const correct = items.filter(
      (item) =>
        normalizeTaskAnswer(taskAnswers[item.id] || "") ===
        normalizeTaskAnswer(item.options[0] || ""),
    ).length;
    return (
      <section className="learningBlock taskLearning selectWordsLearning">
        <LearningBlockHeader kind={block.kind} title={block.title} category="task" language={courseLanguage} />
        <ol className="gapSentenceList">
          {items.map(({ id, line, match, options }, index) => {
            const visibleOptions = options.length
              ? [...options.slice(index % options.length), ...options.slice(0, index % options.length)]
              : [];
            return (
              <li key={id}>
                {match ? line.slice(0, match.index) : line}
                {match && (
                  <select
                    value={taskAnswers[id] || ""}
                    className={
                      taskChecked && taskAnswers[id]
                        ? normalizeTaskAnswer(taskAnswers[id]) ===
                          normalizeTaskAnswer(options[0] || "")
                          ? "correct"
                          : "wrong"
                        : ""
                    }
                    onChange={(event) =>
                      {
                        setTaskAnswers((current) => ({
                          ...current,
                          [id]: event.target.value,
                        }));
                        invalidateTask();
                      }
                    }
                  >
                    <option value="">{labels.select}</option>
                    {visibleOptions.map((option, optionIndex) => (
                      <option key={`${option}-${optionIndex}`} value={option}>{option}</option>
                    ))}
                  </select>
                )}
                {match && line.slice((match.index || 0) + match[0].length)}
              </li>
            );
          })}
        </ol>
        <TaskActions
          checked={taskChecked}
          answered={answered}
          total={items.length}
          correct={correct}
          onCheck={() => checkTask(correct, items.length)}
          onReset={() => {
            setTaskAnswers({});
            invalidateTask();
          }}
          onContinue={onContinue}
          continueLabel={continueLabel}
          labels={labels}
        />
      </section>
    );
  }
  if (block.kind === "fill-blank") {
    const items = lines.map((line, index) => ({
      id: String(index),
      line,
      parsed: parseGapTaskLine(line),
    }));
    const answered = items.filter((item) => taskAnswers[item.id]?.trim()).length;
    const correct = items.filter(
      (item) =>
        normalizeTaskAnswer(taskAnswers[item.id] || "") ===
        normalizeTaskAnswer(item.parsed.answer),
    ).length;
    return (
      <section className="learningBlock taskLearning fillBlankLearning">
        <LearningBlockHeader kind={block.kind} title={block.title} category="task" language={courseLanguage} />
        <ol className="gapSentenceList">
          {items.map(({ id, parsed }, index) => {
            const value = taskAnswers[id] || "";
            return (
              <li key={id}>
                {parsed.before}
                {parsed.answer && (
                  <input
                    value={value}
                    aria-label={`${labels.answer} ${index + 1}`}
                    style={{ width: `${Math.max(5, Math.min([...parsed.answer].length + 1, 14))}ch` }}
                    className={
                      taskChecked && value
                        ? normalizeTaskAnswer(value) === normalizeTaskAnswer(parsed.answer)
                          ? "correct"
                          : "wrong"
                        : ""
                    }
                    onChange={(event) =>
                      {
                        setTaskAnswers((current) => ({
                          ...current,
                          [id]: event.target.value,
                        }));
                        invalidateTask();
                      }
                    }
                  />
                )}
                {parsed.answer && parsed.after}
              </li>
            );
          })}
        </ol>
        <TaskActions
          checked={taskChecked}
          answered={answered}
          total={items.length}
          correct={correct}
          onCheck={() => checkTask(correct, items.length)}
          onReset={() => {
            setTaskAnswers({});
            invalidateTask();
          }}
          onContinue={onContinue}
          continueLabel={continueLabel}
          labels={labels}
        />
      </section>
    );
  }
  if (block.kind === "match") {
    const pairs = lines.map((line, index) => {
      const [left, ...right] = line.split("=");
      return { id: String(index), left: left?.trim(), right: right.join("=").trim() };
    });
    const resolvedIds = pairs
      .filter(
        (pair) =>
          taskAnswers[pair.id] === pair.id ||
          taskAnswers[pair.id] === `failed:${pair.id}`,
      )
      .map((pair) => pair.id);
    const unresolvedPairs = pairs.filter((pair) => !resolvedIds.includes(pair.id));
    const rightItems = [...pairs]
      .reverse()
      .filter((pair) => !resolvedIds.includes(pair.id));
    const resolvedPairs = matchResolvedOrder
      .map((id) => pairs.find((pair) => pair.id === id))
      .filter((pair): pair is (typeof pairs)[number] => Boolean(pair));
    const answered = resolvedIds.length;
    const correct = pairs.filter((pair) => taskAnswers[pair.id] === pair.id).length;
    const chooseMatch = (rightId: string) => {
      if (!activeMatch || resolvedIds.includes(activeMatch)) return;
      const previousAttempts = matchAttempts[activeMatch] || [];
      if (previousAttempts.length >= 4) return;
      const isCorrect = activeMatch === rightId;
      const nextAttempts = [...previousAttempts, isCorrect];
      setMatchAttempts((current) => ({ ...current, [activeMatch]: nextAttempts }));

      if (!isCorrect && nextAttempts.length < 4) {
        invalidateTask();
        return;
      }

      const resolvedId = activeMatch;
      const nextAnswers = {
        ...taskAnswers,
        [resolvedId]: isCorrect ? resolvedId : `failed:${resolvedId}`,
      };
      setTaskAnswers(nextAnswers);
      setMatchResolvedOrder((current) =>
        current.includes(resolvedId) ? current : [...current, resolvedId],
      );
      setActiveMatch("");

      const nextResolved = pairs.filter(
        (pair) =>
          nextAnswers[pair.id] === pair.id ||
          nextAnswers[pair.id] === `failed:${pair.id}`,
      ).length;
      if (nextResolved === pairs.length) {
        const nextCorrect = pairs.filter(
          (pair) => nextAnswers[pair.id] === pair.id,
        ).length;
        setTaskChecked(true);
        onTaskResult?.(block.id, nextCorrect === pairs.length);
      } else {
        invalidateTask();
      }
    };
    return (
      <section className="learningBlock taskLearning matchLearning">
        <LearningBlockHeader kind={block.kind} title={block.title} category="task" language={courseLanguage} />
        <div className="matchGrid">
          <div>
            {unresolvedPairs.map((pair) => (
              <button
                type="button"
                key={pair.id}
                className={activeMatch === pair.id ? "active" : ""}
                onClick={() => {
                  setActiveMatch(pair.id);
                  invalidateTask();
                }}
              >
                <span>{pair.left}</span>
                <i className="matchAttemptBars" aria-label={labels.attemptsUsed((matchAttempts[pair.id] || []).length)}>
                  {Array.from({ length: 4 }, (_, index) => {
                    const result = matchAttempts[pair.id]?.[index];
                    return <em key={index} className={result === true ? "correct" : result === false ? "wrong" : ""} />;
                  })}
                </i>
              </button>
            ))}
          </div>
          <div>
            {rightItems.map((item) => (
              <button
                type="button"
                key={item.id}
                disabled={!activeMatch}
                onClick={() => chooseMatch(item.id)}
              >
                {item.right}
              </button>
            ))}
          </div>
        </div>
        {resolvedPairs.length > 0 && (
          <div className="matchResolvedList" aria-label="Соединённые пары">
            {resolvedPairs.map((pair) => {
              const failed = taskAnswers[pair.id] === `failed:${pair.id}`;
              return (
                <div key={pair.id} className={failed ? "failed" : "correct"}>
                  <span className="matchResolvedWord">
                    <strong>{pair.left}</strong>
                    <i className="matchAttemptBars" aria-label={labels.attemptsUsed((matchAttempts[pair.id] || []).length)}>
                      {Array.from({ length: 4 }, (_, index) => {
                        const result = matchAttempts[pair.id]?.[index];
                        return <em key={index} className={result === true ? "correct" : result === false ? "wrong" : ""} />;
                      })}
                    </i>
                  </span>
                  <i className="matchResolvedConnector" aria-hidden="true" />
                  <span>{pair.right}</span>
                  <b>{failed ? labels.attemptsUsed(4) : labels.correct}</b>
                </div>
              );
            })}
          </div>
        )}
        <TaskActions
          checked={taskChecked}
          answered={answered}
          total={pairs.length}
          correct={correct}
          onCheck={() => checkTask(correct, pairs.length)}
          onReset={() => {
            setTaskAnswers({});
            setActiveMatch("");
            setMatchAttempts({});
            setMatchResolvedOrder([]);
            invalidateTask();
          }}
          onContinue={onContinue}
          continueLabel={continueLabel}
          labels={labels}
        />
      </section>
    );
  }
  if (block.kind === "true-false") {
    const items = lines.map((line, index) => {
      const [statement, expectedRaw] = line.split("|");
      return {
        id: String(index),
        statement: statement?.trim() || "",
        expected: expectedRaw?.trim().toLowerCase() === "true" ? "true" : "false",
      };
    });
    const answered = items.filter((item) => taskAnswers[item.id]).length;
    const correct = items.filter((item) => taskAnswers[item.id] === item.expected).length;
    return (
      <section className="learningBlock taskLearning trueFalseLearning">
        <LearningBlockHeader kind={block.kind} title={block.title} category="task" language={courseLanguage} />
        {items.map(({ id, statement, expected }, index) => {
          return (
            <div className="trueFalseCard" key={id}>
              <b>{index + 1}. {statement}</b>
              <div>
                {(["true", "false"] as const).map((value) => (
                  <button
                    type="button"
                    key={value}
                    className={
                      taskChecked && taskAnswers[id] === value
                        ? value === expected
                          ? "correct"
                          : "wrong"
                        : ""
                    }
                    onClick={() => {
                      setTaskAnswers((current) => ({ ...current, [id]: value }));
                      invalidateTask();
                    }}
                  >
                    {value === "true" ? labels.trueLabel : labels.falseLabel}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
        <TaskActions
          checked={taskChecked}
          answered={answered}
          total={items.length}
          correct={correct}
          onCheck={() => checkTask(correct, items.length)}
          onReset={() => {
            setTaskAnswers({});
            invalidateTask();
          }}
          onContinue={onContinue}
          continueLabel={continueLabel}
          labels={labels}
        />
      </section>
    );
  }
  if (block.kind === "quiz")
    {
      const rawOptions = lines.slice(1);
      const markedCorrectIndex = rawOptions.findIndex((option) => option.startsWith("*"));
      const correctIndex = markedCorrectIndex >= 0 ? markedCorrectIndex : 0;
      const options = rawOptions.map((option) => option.replace(/^\*/, ""));
      const answered = answer ? 1 : 0;
      const correctCount = answer === String(correctIndex + 1) ? 1 : 0;
      return (
        <section className="learningBlock quizLearning taskLearning">
          <LearningBlockHeader kind={block.kind} title={block.title} category="task" language={courseLanguage} />
          <b>{lines[0] || labels.chooseAnswer}</b>
          {options.map((option, optionIndex) => (
            <label
              key={`${option}-${optionIndex}`}
              className={`${answer === String(optionIndex + 1) ? "chosen" : ""} ${taskChecked && answer === String(optionIndex + 1) ? (optionIndex === correctIndex ? "correct" : "wrong") : ""}`}
            >
              <input
                type="radio"
                name={block.id}
                checked={answer === String(optionIndex + 1)}
                onChange={() => {
                  setAnswer(String(optionIndex + 1));
                  invalidateTask();
                }}
              />
              {option}
            </label>
          ))}
          <TaskActions
            checked={taskChecked}
            answered={answered}
            total={1}
            correct={correctCount}
            onCheck={() => checkTask(correctCount, 1)}
            onReset={() => {
              setAnswer("");
              invalidateTask();
            }}
            onContinue={onContinue}
            continueLabel={continueLabel}
            labels={labels}
          />
        </section>
      );
    }
  if (block.kind === "html")
    return (
      <section className="learningBlock">
        <LearningBlockHeader kind={block.kind} title={block.title} category="content" language={courseLanguage} />
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
        <LearningBlockHeader kind={block.kind} title={block.title} category="content" language={courseLanguage} />
        {block.content ? (
          <LessonAudioPlayer src={block.content} title={block.title} />
        ) : (
          <p className="emptyMaterial">Аудиофайл пока не добавлен.</p>
        )}
      </section>
    );
  if (block.kind === "image")
    return (
      <section className="learningBlock imageLearning">
        <LearningBlockHeader kind={block.kind} title={block.title} category="content" language={courseLanguage} />
        {blockImages.length ? (
          <div
            className={`lessonImageCollage layout-${block.imageLayout || "grid"} ${blockImages.length === 1 ? "single" : ""}`}
          >
            {blockImages.map((src, index) => (
              <figure className="lessonImageItem" key={`${src}-${index}`}>
                <button
                  type="button"
                  className="lessonImageButton"
                  onClick={() => setOpenedImage(index)}
                  aria-label={`Открыть фото ${index + 1} в полном размере`}
                >
                  <img
                    src={src}
                    alt={blockImageCaptions[index] || `${block.title}${blockImages.length > 1 ? ` — фото ${index + 1}` : ""}`}
                    loading="lazy"
                  />
                  <span className="lessonImageZoom"><i>⌕</i>Открыть полностью</span>
                </button>
                {blockImageCaptions[index] && (
                  <figcaption className="lessonImageCaption">
                    {blockImageCaptions[index]}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        ) : (
          <p className="emptyMaterial">Фото пока не добавлено.</p>
        )}
        {openedImage !== null && blockImages[openedImage] && createPortal(
          <div className="imageLightbox" role="dialog" aria-modal="true" aria-label={`Просмотр фото: ${block.title}`}>
            <button className="imageLightboxScrim" onClick={() => setOpenedImage(null)} aria-label="Закрыть просмотр" />
            <div className="imageLightboxContent">
              <div className="imageLightboxHead">
                <div><small>ФОТО {openedImage + 1} ИЗ {blockImages.length}</small><b>{block.title}</b></div>
                <button onClick={() => setOpenedImage(null)} aria-label="Закрыть">×</button>
              </div>
              <img
                src={blockImages[openedImage]}
                alt={blockImageCaptions[openedImage] || `${block.title} — фото ${openedImage + 1}`}
              />
              {blockImageCaptions[openedImage] && (
                <p className="imageLightboxCaption">{blockImageCaptions[openedImage]}</p>
              )}
              {blockImages.length > 1 && <>
                <button className="imageLightboxNav previous" onClick={() => setOpenedImage((openedImage - 1 + blockImages.length) % blockImages.length)} aria-label="Предыдущее фото">‹</button>
                <button className="imageLightboxNav next" onClick={() => setOpenedImage((openedImage + 1) % blockImages.length)} aria-label="Следующее фото">›</button>
              </>}
            </div>
          </div>,
          document.body,
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
        <LearningBlockHeader kind={block.kind} title={block.title} category="content" language={courseLanguage} />
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
        <LearningBlockHeader kind={block.kind} title={block.title} category="content" language={courseLanguage} />
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
        ) : <p className="emptyMaterial">Файл пока не прикреплён.</p>}
      </section>
    );
  return (
    <section className="learningBlock">
      <LearningBlockHeader kind={block.kind} title={block.title} category="content" language={courseLanguage} />
      {block.richContent ? <div
        className="lessonText richLessonText"
        style={{
          fontFamily: lessonFontFamilies[block.textStyle?.fontFamily || "onest"],
          fontSize: `${block.textStyle?.fontSize || 16}px`,
          fontWeight: block.textStyle?.fontWeight || 400,
          textAlign: block.textStyle?.textAlign || "left",
        }}
        dangerouslySetInnerHTML={{ __html: sanitizeRichText(block.richContent) }}
      /> : <p
        className="lessonText"
        style={{
          fontFamily: lessonFontFamilies[block.textStyle?.fontFamily || "onest"],
          fontSize: `${block.textStyle?.fontSize || 16}px`,
          fontWeight: block.textStyle?.fontWeight || 400,
          textAlign: block.textStyle?.textAlign || "left",
        }}
      >
        {block.content || "Содержание пока не добавлено."}
      </p>}
    </section>
  );
}

export function CoursePlayerPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { courses, loading, progress, progressLoading, saveLessonProgress } = useCourses();
  const { user, canEditCourses } = useAuth();
  const course = courses.find((x) => x.id === params.get("course"));
  const courseId = course?.id;
  const courseTaskLocale = getCourseTaskLocale(course?.language);
  const learnerId = user?.id || "guest";
  const lessons = useMemo(
    () =>
      course?.modules.flatMap((module) =>
        module.lessons.map((lesson) => ({ module, lesson })),
      ) || [],
    [course],
  );
  const [lessonId, setLessonId] = useState(params.get("lesson") || "");
  const [activeLessonTabId, setActiveLessonTabId] = useState("");
  const [completed, setCompleted] = useState<string[]>([]);
  const [passedTaskBlocks, setPassedTaskBlocks] = useState<Record<string, boolean>>({});
  const [completedLessonNotice, setCompletedLessonNotice] = useState("");
  const [loadedProgressKey, setLoadedProgressKey] = useState("");
  const [mobileTreeOpen, setMobileTreeOpen] = useState(false);
  const mobileTreeRef = useRef<HTMLElement>(null);
  const [lessonRuns, setLessonRuns] = useState<Record<string, LessonRun>>({});
  const [runsReady, setRunsReady] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [headerHidden, setHeaderHidden] = useState(false);
  const playerRef = useRef<HTMLElement>(null);
  const openedLessonKeyRef = useRef("");
  const lastScrollYRef = useRef(0);
  const headerScrollAnchorRef = useRef(0);
  useEffect(() => {
    lastScrollYRef.current = window.scrollY;
    headerScrollAnchorRef.current = window.scrollY;
    let frame = 0;
    const handleScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        const currentY = window.scrollY;
        const previousY = lastScrollYRef.current;
        const travel = currentY - headerScrollAnchorRef.current;
        if (mobileTreeOpen || currentY < 96) {
          setHeaderHidden(false);
          headerScrollAnchorRef.current = currentY;
        } else if (currentY > previousY && travel > 48) {
          setHeaderHidden(true);
          headerScrollAnchorRef.current = currentY;
        } else if (currentY < previousY && travel < -32) {
          setHeaderHidden(false);
          headerScrollAnchorRef.current = currentY;
        }
        lastScrollYRef.current = currentY;
        if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          const hue = Math.sin(currentY / 360) * 34;
          playerRef.current?.style.setProperty("--lesson-pattern-hue", `${hue.toFixed(2)}deg`);
        }
        frame = 0;
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [mobileTreeOpen]);
  useEffect(() => {
    if (!mobileTreeOpen) return;
    const closeOnOutsidePress = (event: PointerEvent) => {
      if (event.target instanceof Node && !mobileTreeRef.current?.contains(event.target)) {
        setMobileTreeOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileTreeOpen(false);
    };
    const mobileQuery = window.matchMedia("(max-width: 900px)");
    const closeOnWideViewport = (event: MediaQueryListEvent) => {
      if (!event.matches) setMobileTreeOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePress);
    window.addEventListener("keydown", closeOnEscape);
    mobileQuery.addEventListener("change", closeOnWideViewport);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      window.removeEventListener("keydown", closeOnEscape);
      mobileQuery.removeEventListener("change", closeOnWideViewport);
    };
  }, [mobileTreeOpen]);
  useEffect(() => {
    if (!course || !user || progressLoading) return;
    const progressKey = `${user.id}-${course.id}`;
    const value = localStorage.getItem(
      `lingvaedu-progress-${user.id}-${course.id}`,
    );
    const timer = setTimeout(() => {
      try {
        const stored = value ? JSON.parse(value) : [];
        const legacyCompleted = Array.isArray(stored) ? stored : [];
        const syncedCompleted = progress
          .filter((item) => item.courseId === course.id && item.status === "completed")
          .map((item) => item.lessonId);
        setCompleted([...new Set([...legacyCompleted, ...syncedCompleted])]);
      } catch {
        setCompleted([]);
      }
      setLoadedProgressKey(progressKey);
    }, 0);
    return () => clearTimeout(timer);
  }, [course, progress, progressLoading, user]);
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
  const progressReady = loadedProgressKey === `${learnerId}-${courseId}`;
  const lessonCompletionRequired = course?.requireLessonCompletion !== false;
  const requestedIndex = Math.max(
    0,
    lessons.findIndex((x) => x.lesson.id === lessonId),
  );
  const firstIncompleteIndex = lessons.findIndex(
    ({ lesson }) => !completed.includes(lesson.id),
  );
  const lastUnlockedIndex =
    !lessonCompletionRequired || firstIncompleteIndex < 0
      ? Math.max(lessons.length - 1, 0)
      : firstIncompleteIndex;
  const currentIndex = !progressReady
    ? 0
    : Math.min(requestedIndex, lastUnlockedIndex);
  const current = lessons[currentIndex]?.lesson || lessons[0]?.lesson;
  const currentModule = lessons[currentIndex]?.module || lessons[0]?.module;
  const currentTabs = current?.tabs?.filter((tab) => tab.id) || [];
  const activeTabId =
    currentTabs.find((tab) => tab.id === activeLessonTabId)?.id ||
    currentTabs[0]?.id ||
    "";
  const visibleBlocks = current
    ? currentTabs.length
      ? current.blocks.filter(
          (block) => (block.tabId || currentTabs[0].id) === activeTabId,
        )
      : current.blocks
    : [];
  const currentTaskBlocks = current?.blocks.filter((block) => taskBlockKinds.has(block.kind)) || [];
  const currentTasksPassed =
    completed.includes(current?.id || "") ||
    currentTaskBlocks.every((block) => passedTaskBlocks[block.id]);
  const canAdvance = !lessonCompletionRequired || currentTasksPassed;
  useEffect(() => {
    if (!course || !current || !user || !progressReady) return;
    const key = `${course.id}-${current.id}`;
    if (openedLessonKeyRef.current === key) return;
    openedLessonKeyRef.current = key;
    void saveLessonProgress({
      courseId: course.id,
      lessonId: current.id,
      status: completed.includes(current.id) ? "completed" : "in_progress",
      progress: completed.includes(current.id) ? 100 : 1,
      lastOpenedAt: new Date().toISOString(),
    });
  }, [completed, course, current, progressReady, saveLessonProgress, user]);
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
  const isLessonUnlocked = (index: number) =>
    !lessonCompletionRequired ||
    index === 0 ||
    lessons.slice(0, index).every(({ lesson }) => completed.includes(lesson.id));
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
    const targetIndex = lessons.findIndex(({ lesson }) => lesson.id === id);
    if (targetIndex < 0 || !isLessonUnlocked(targetIndex)) return;
    setLessonId(id);
    setCompletedLessonNotice("");
    setActiveLessonTabId("");
    setMobileTreeOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const complete = () => {
    if (!current || !course || !user || currentRun?.expired || !canAdvance) return;
    const next = [...new Set([...completed, current.id])];
    setCompleted(next);
    localStorage.setItem(
      `lingvaedu-progress-${user.id}-${course.id}`,
      JSON.stringify(next),
    );
    void saveLessonProgress({
      courseId: course.id,
      lessonId: current.id,
      status: "completed",
      progress: 100,
      completedAt: new Date().toISOString(),
    });
    setCompletedLessonNotice(current.id);
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
      <main className="coursePlayer playerSkeleton" aria-label="Загружаем курс">
        <div className="playerSkeletonHeader" />
        <div className="playerSkeletonLayout"><aside><i /><i /><i /><i /></aside><article><i /><i /><i /></article></div>
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
    <main
      ref={playerRef}
      className={`coursePlayer fade ${headerHidden ? "courseHeaderHidden" : ""}`}
      data-lesson-pattern={course.lessonPattern || "space"}
    >
      <header className={`playerHeader ${headerHidden ? "playerHeaderHidden" : ""}`}>
        <button
          className="playerCoursesBack"
          onClick={() => navigate("/courses")}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m14.5 6.5-5.5 5.5 5.5 5.5" />
          </svg>
          <span>КУРСЫ</span>
        </button>
        <div className="playerCourseIdentity">
          <small>{course.language}</small>
          <b>{course.title}</b>
        </div>
        <div className="playerProgress" aria-label={`Прогресс курса: ${percent}%`}>
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
            <span aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="m4 20 4.2-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z" />
                <path d="m13.8 7.2 3 3M4.8 16.2l3 3" />
              </svg>
            </span>
            <b>Редактировать</b>
          </button>
        )}
      </header>
      <div className="playerLayout">
        <aside
          ref={mobileTreeRef}
          className={`playerTree ${mobileTreeOpen ? "mobileTreeOpen" : ""}`}
        >
          <button
            className="playerTreeToggle"
            aria-expanded={mobileTreeOpen}
            aria-controls="course-player-lessons"
            onClick={() => {
              setHeaderHidden(false);
              setMobileTreeOpen((open) => !open);
            }}
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
                {module.lessons.map((lesson, li) => {
                  const lessonIndex = lessons.findIndex(
                    ({ lesson: item }) => item.id === lesson.id,
                  );
                  const locked = !progressReady || !isLessonUnlocked(lessonIndex);
                  return (
                    <button
                      key={lesson.id}
                      className={`${current?.id === lesson.id ? "active" : ""} ${locked ? "locked" : ""}`.trim()}
                      aria-current={current?.id === lesson.id ? "page" : undefined}
                      aria-label={locked ? `${lesson.title}. Сначала завершите предыдущий урок` : undefined}
                      title={locked ? "Сначала завершите предыдущий урок" : undefined}
                      disabled={locked}
                      onClick={() => selectLesson(lesson.id)}
                    >
                      <i className={completed.includes(lesson.id) ? "done" : locked ? "locked" : ""}>
                        {completed.includes(lesson.id) ? (
                          <svg viewBox="0 0 20 20" aria-hidden="true">
                            <path d="m5.5 10.2 2.8 2.8 6.2-6.2" />
                          </svg>
                        ) : locked ? (
                          <svg viewBox="0 0 20 20" aria-hidden="true">
                            <rect x="5.5" y="8.5" width="9" height="7" rx="1.5" />
                            <path d="M7.5 8.5V6.8a2.5 2.5 0 0 1 5 0v1.7" />
                          </svg>
                        ) : (
                          li + 1
                        )}
                      </i>
                      <span>
                        {lesson.title}
                        <small>
                          {locked
                            ? "Завершите предыдущий урок"
                            : completed.includes(lesson.id)
                              ? `Завершён${lesson.estimatedMinutes ? ` · ${lesson.estimatedMinutes} мин` : ""}`
                              : current?.id === lesson.id
                                ? `Текущий${lesson.estimatedMinutes ? ` · ${lesson.estimatedMinutes} мин` : ""}`
                                : lesson.estimatedMinutes
                                  ? `${lesson.estimatedMinutes} мин`
                                  : "Не начат"}
                        </small>
                      </span>
                    </button>
                  );
                })}
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
                {(current.goal || current.description) && <p style={{
                  fontFamily: lessonFontFamilies[current.descriptionStyle?.fontFamily || "onest"],
                  fontSize: `${current.descriptionStyle?.fontSize || 17}px`,
                  fontWeight: current.descriptionStyle?.fontWeight || 400,
                  textAlign: current.descriptionStyle?.textAlign || "left",
                }}>{current.goal || current.description}</p>}
                <div className="readerMeta">
                  {current.estimatedMinutes && current.estimatedMinutes > 0 && (
                    <span className="readerLimit">
                      <small>Время</small><b>≈ {current.estimatedMinutes} мин</b>
                    </span>
                  )}
                  {currentTaskBlocks.length > 0 && (
                    <span className="readerLimit">
                      <small>Практика</small><b>{currentTaskBlocks.length} {currentTaskBlocks.length === 1 ? "задание" : "заданий"}</b>
                    </span>
                  )}
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
              {currentTabs.length > 0 && !currentRun?.expired && (
                <nav className="learnerLessonTabs" aria-label="Разделы урока">
                  {currentTabs.map((tab, index) => (
                    <button
                      type="button"
                      key={tab.id}
                      className={tab.id === activeTabId ? "active" : ""}
                      aria-current={tab.id === activeTabId ? "page" : undefined}
                      onClick={() => setActiveLessonTabId(tab.id)}
                    >
                      {tab.title || `Вкладка ${index + 1}`}
                    </button>
                  ))}
                </nav>
              )}
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
                  {visibleBlocks.length ? (
                    <div className="learningBlockStack">
                      {visibleBlocks.map((block) => {
                        const taskIndex = currentTaskBlocks.findIndex((item) => item.id === block.id);
                        const nextTask = taskIndex >= 0 ? currentTaskBlocks[taskIndex + 1] : undefined;
                        return <div className="lessonBlockAnchor" id={`learning-block-${block.id}`} key={block.id}>
                          <LessonBlockView
                            block={block}
                            courseLanguage={course.language}
                            courseId={course.id}
                            lessonId={current.id}
                            onTaskResult={(blockId, passed) => setPassedTaskBlocks((previous) => ({ ...previous, [blockId]: passed }))}
                            continueLabel={nextTask ? courseTaskLocale.nextTask : courseTaskLocale.finishLesson}
                            onContinue={taskIndex < 0 ? undefined : () => {
                              if (!nextTask) { complete(); return; }
                              if (nextTask.tabId) setActiveLessonTabId(nextTask.tabId);
                              window.setTimeout(() => document.getElementById(`learning-block-${nextTask.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
                            }}
                          />
                        </div>;
                      })}
                    </div>
                  ) : (
                    <div className="learningBlock emptyMaterial">
                      В этом уроке пока нет учебных материалов.
                    </div>
                  )}
                  {completedLessonNotice === current.id && (
                    <section className="lessonCompletedCard" aria-live="polite">
                      <span>✓</span><div><small>УРОК ЗАВЕРШЁН</small><h2>{current.title} пройден</h2><p>Курс завершён на {percent}%.</p></div>
                      {currentIndex < lessons.length - 1 && <button className="btn primary" onClick={() => selectLesson(lessons[currentIndex + 1].lesson.id)}>Перейти к {lessons[currentIndex + 1].lesson.title} →</button>}
                    </section>
                  )}
                  <footer className="readerFooter">
                    <button
                      className="btn ghost readerBackButton"
                      disabled={currentIndex === 0}
                      onClick={() =>
                        selectLesson(lessons[currentIndex - 1].lesson.id)
                      }
                    >
                      {courseTaskLocale.previous}
                    </button>
                    <button
                      className="btn primary readerNextButton"
                      disabled={!canAdvance}
                      title={
                        canAdvance
                          ? undefined
                          : courseTaskLocale.completeTasksFirst
                      }
                      onClick={() => completed.includes(current.id) && currentIndex < lessons.length - 1 ? selectLesson(lessons[currentIndex + 1].lesson.id) : complete()}
                    >
                      {completed.includes(current.id) && currentIndex < lessons.length - 1
                        ? courseTaskLocale.nextLesson
                        : !canAdvance
                        ? courseTaskLocale.completeTasks
                        : isLastLesson
                          ? courseTaskLocale.finishCourse
                          : courseTaskLocale.next}
                    </button>
                  </footer>
                </>
              )}
            </>
          ) : (
            <div className="courseEmpty">
              <h2>{canEditCourses ? "В курсе пока нет уроков" : "В этом курсе пока нет опубликованных уроков."}</h2>
            </div>
          )}
        </article>
      </div>
    </main>
  );
}
