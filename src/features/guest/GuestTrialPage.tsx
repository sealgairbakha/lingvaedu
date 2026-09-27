import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { LessonBlockView } from "../courses/CoursePlayerPage";
import type { LessonBlock } from "../courses/types";
import { loadGuestTrial, type GuestTrial } from "./guestTrialData";
import "./guest.css";

const taskKinds = new Set<LessonBlock["kind"]>([
  "drag-words", "select-words", "fill-blank", "quiz", "match", "true-false",
  "game-memory", "game-build-word", "game-listen-choice", "game-missing",
  "game-odd-one-out", "game-speed", "game-truth", "game-categories",
  "game-sentence", "game-translate-sentence", "game-adventure",
]);

export default function GuestTrialPage() {
  const { courseId = "" } = useParams();
  const validCourseId = /^[a-f\d]{8}-[a-f\d]{4}-[1-8][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(courseId);
  const [trial, setTrial] = useState<GuestTrial | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");
  const [retry, setRetry] = useState(0);
  const [passed, setPassed] = useState<Set<string>>(() => new Set());
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    let active = true;
    if (!validCourseId) return;
    loadGuestTrial(courseId).then((result) => {
      if (active) { setTrial(result); setStatus("ready"); setPassed(new Set()); setFinished(false); }
    }).catch((caught: unknown) => {
      if (active) { setMessage(caught instanceof Error ? caught.message : "Не удалось открыть урок."); setStatus("error"); }
    });
    return () => { active = false; };
  }, [courseId, retry, validCourseId]);

  const taskCount = trial?.lesson.blocks.filter((block) => taskKinds.has(block.kind)).length || 0;
  const onTaskResult = (blockId: string, success: boolean) => {
    setPassed((current) => {
      const next = new Set(current);
      if (success) next.add(blockId); else next.delete(blockId);
      return next;
    });
  };

  return <div className="guestPage guestTrialPage">
    <a className="skipContent" href="#trial-main">Перейти к уроку</a>
    <header className="guestTrialTopbar"><Link className="guestBrand" to="/welcome"><span className="guestBrandMark">lv</span><span>Lingva<span>Edu</span></span></Link><Link to="/welcome#trial-courses">Все пробные уроки ↗</Link></header>
    <main className="guestTrialMain" id="trial-main">
      {validCourseId && status === "loading" && <div className="guestTrialState" role="status"><h1>Открываем урок…</h1><p>Подготавливаем материалы курса.</p></div>}
      {(!validCourseId || status === "error") && <div className="guestTrialState" role="alert"><h1>Урок не открылся</h1><p>{validCourseId ? message : "Адрес пробного урока неверный."}</p><div className="guestHeroActions">{validCourseId && <button className="guestButton guestButtonPrimary" type="button" onClick={() => { setStatus("loading"); setRetry((value) => value + 1); }}>Повторить</button>}<Link className="guestButton guestButtonOutline" to="/welcome#trial-courses">К каталогу</Link></div></div>}
      {validCourseId && status === "ready" && trial && <>
        <div className="guestTrialIntro"><span className="guestTrialBreadcrumb">Пробный урок · {trial.courseTitle}</span><h1>{trial.lesson.title}</h1><p>{trial.lesson.description || "Вы проходите первый урок опубликованного курса без регистрации."}</p><p className="guestTrialNotice">Прогресс пробного урока не сохраняется. Для полного курса нужен доступ к обучению.</p></div>
        <div className="guestTrialBody">
          {trial.lesson.blocks.length === 0 && <div className="guestTrialAssignment"><h2>В этом уроке пока нет материалов</h2><p>Выберите другой пробный курс или загляните позже.</p></div>}
          {trial.lesson.blocks.map((block) => block.kind === "assignment"
            ? <section className="guestTrialAssignment" key={block.id}><h2>{block.title || "Задание для ученика"}</h2><p>Отправка работы наставнику доступна после получения доступа к полному курсу.</p></section>
            : <LessonBlockView key={block.id} block={block} courseLanguage={trial.courseLanguage} onTaskResult={onTaskResult} />)}
          {trial.lesson.blocks.length > 0 && <div className="guestTrialFinish"><p>{finished ? "Пробный урок завершён. Спасибо, что попробовали LingvaEdu!" : taskCount > 0 ? `Выполнено заданий: ${passed.size} из ${taskCount}. Вы можете продолжать в своём темпе.` : "Вы познакомились с материалами первого урока."}</p>{!finished && <button type="button" className="guestButton guestButtonPrimary" onClick={() => setFinished(true)}>Завершить пробный урок →</button>}</div>}
          {finished && <div className="guestHeroActions" style={{ marginTop: 20 }}><Link className="guestButton guestButtonPrimary" to="/?register=1">Продолжить обучение ↗</Link><Link className="guestButton guestButtonOutline" to="/welcome#trial-courses">Другие пробные уроки →</Link></div>}
        </div>
      </>}
    </main>
  </div>;
}
