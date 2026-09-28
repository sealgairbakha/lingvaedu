import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { LessonBlockView } from "../courses/CoursePlayerPage";
import { LessonReaderIntro, LessonTabBar } from "../courses/LessonPresentation";
import { lessonTabs, taskBlockKinds, visibleLessonBlocks } from "../courses/lessonPresentationData";
import { loadGuestTrial, type GuestTrial } from "./guestTrialData";
import { GuestBrand, GuestChevron } from "./GuestUi";
import "./guest.css";

const catalogPath = "/welcome/students#trial-courses";

export default function GuestTrialPage({ courseId }: { courseId: string }) {
  const validCourseId = /^[a-f\d]{8}-[a-f\d]{4}-[1-8][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(courseId);
  const [trial, setTrial] = useState<GuestTrial | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");
  const [retry, setRetry] = useState(0);
  const [passed, setPassed] = useState<Set<string>>(() => new Set());
  const [finished, setFinished] = useState(false);
  const [activeLessonTabId, setActiveLessonTabId] = useState("");
  const [mobileTreeOpen, setMobileTreeOpen] = useState(false);
  const trialVersion = useRef("");

  useEffect(() => {
    if (!validCourseId) return;
    let active = true;
    let loading = false;
    const refresh = async () => {
      if (loading || document.visibilityState === "hidden") return;
      loading = true;
      try {
        const result = await loadGuestTrial(courseId);
        if (!active) return;
        const version = JSON.stringify(result);
        if (version !== trialVersion.current) {
          trialVersion.current = version;
          setTrial(result);
          setPassed(new Set());
          setFinished(false);
          setActiveLessonTabId("");
        }
        setStatus("ready");
        setMessage("");
      } catch (caught) {
        if (active) {
          const errorMessage = caught instanceof Error ? caught.message : "Не удалось открыть урок.";
          setMessage(errorMessage);
          if (errorMessage.includes("больше не опубликован")) {
            trialVersion.current = "";
            setTrial(null);
            setStatus("error");
          } else {
            setStatus((previous) => previous === "ready" ? previous : "error");
          }
        }
      } finally {
        loading = false;
      }
    };
    void refresh();
    const interval = window.setInterval(() => { void refresh(); }, 30_000);
    const refreshWhenVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("focus", refreshWhenVisible);
    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("focus", refreshWhenVisible);
    };
  }, [courseId, retry, validCourseId]);

  const lesson = trial?.lesson;
  const tabs = lesson ? lessonTabs(lesson) : [];
  const activeTabId = tabs.find((tab) => tab.id === activeLessonTabId)?.id || tabs[0]?.id || "";
  const blocks = lesson ? visibleLessonBlocks(lesson, tabs, activeTabId) : [];
  const taskBlocks = lesson?.blocks.filter((block) => taskBlockKinds.has(block.kind)) || [];
  const interactiveTasks = taskBlocks.filter((block) => block.kind !== "assignment");
  const onTaskResult = (blockId: string, success: boolean) => {
    setPassed((current) => {
      const next = new Set(current);
      if (success) next.add(blockId); else next.delete(blockId);
      return next;
    });
  };
  const complete = () => {
    setFinished(true);
    window.setTimeout(() => document.getElementById("guest-lesson-complete")?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
  };

  return <div className="guestPage guestTrialPage">
    <a className="skipContent" href="#trial-main">Перейти к уроку</a>
    <header className="guestTrialTopbar"><GuestBrand /><Link to={catalogPath}><GuestChevron back />Все пробные уроки</Link></header>
    {validCourseId && status === "loading" && <main className="guestTrialMain" id="trial-main"><div className="guestTrialState" role="status"><h1>Открываем урок…</h1><p>Подготавливаем материалы курса.</p></div></main>}
    {(!validCourseId || status === "error") && <main className="guestTrialMain" id="trial-main"><div className="guestTrialState" role="alert"><h1>Урок не открылся</h1><p>{validCourseId ? message : "Адрес пробного урока неверный."}</p><div className="guestHeroActions">{validCourseId && <button className="guestButton guestButtonPrimary" type="button" onClick={() => { setStatus("loading"); setRetry((value) => value + 1); }}><GuestChevron />Повторить</button>}<Link className="guestButton guestButtonOutline" to={catalogPath}><GuestChevron back />К каталогу</Link></div></div></main>}
    {validCourseId && status === "ready" && trial && lesson && <main className="coursePlayer guestCoursePlayer" data-lesson-pattern={trial.lessonPattern}>
      <header className="playerHeader">
        <Link className="playerCoursesBack" to={catalogPath}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 6.5-5.5 5.5 5.5 5.5" /></svg><span>КУРСЫ</span></Link>
        <div className="playerCourseIdentity"><small>{trial.courseLanguage}</small><b>{trial.courseTitle}</b></div>
        <div className="playerProgress"><span>Пробный урок · без регистрации</span></div>
      </header>
      <div className="playerLayout">
        <aside className={`playerTree ${mobileTreeOpen ? "mobileTreeOpen" : ""}`}>
          <button className="playerTreeToggle" type="button" aria-expanded={mobileTreeOpen} aria-controls="guest-player-lessons" onClick={() => setMobileTreeOpen((value) => !value)}>
            <span><small>{trial.moduleTitle}</small><b>{lesson.title}</b></span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5" /></svg>
          </button>
          <div className="playerTreeContent" id="guest-player-lessons"><div>
            <h3><span>1</span>{trial.moduleTitle}</h3>
            <button className="active" type="button" aria-current="page" onClick={() => { setMobileTreeOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}><i>1</i><span>{lesson.title}<small>Пробный урок</small></span></button>
          </div></div>
        </aside>
        <article className="lessonReader" id="trial-main">
          {message && <div className="guestTrialSyncError" role="status"><span>Не удалось проверить обновления урока. Показана последняя загруженная версия.</span><button type="button" onClick={() => setRetry((value) => value + 1)}>Повторить</button></div>}
          <LessonReaderIntro lesson={lesson} index={0} total={trial.lessonCount} taskCount={taskBlocks.length} />
          <p className="guestTrialNotice">Прогресс пробного урока не сохраняется. Для полного курса нужен доступ к обучению.</p>
          <LessonTabBar tabs={tabs} activeTabId={activeTabId} onSelect={setActiveLessonTabId} />
          {blocks.length ? <div className="learningBlockStack">{blocks.map((block) => {
            const taskIndex = interactiveTasks.findIndex((item) => item.id === block.id);
            const nextTask = taskIndex >= 0 ? interactiveTasks[taskIndex + 1] : undefined;
            return <div className="lessonBlockAnchor" id={`learning-block-${block.id}`} key={block.id}>
              <LessonBlockView
                block={block}
                courseLanguage={trial.courseLanguage}
                onTaskResult={onTaskResult}
                continueLabel={nextTask ? "Следующее задание" : "Завершить урок"}
                onContinue={taskIndex < 0 ? undefined : () => {
                  if (!nextTask) { complete(); return; }
                  if (nextTask.tabId) setActiveLessonTabId(nextTask.tabId);
                  window.setTimeout(() => document.getElementById(`learning-block-${nextTask.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
                }}
              />
            </div>;
          })}</div> : <div className="learningBlock emptyMaterial">В этом уроке пока нет учебных материалов.</div>}
          {finished && <section className="lessonCompletedCard" id="guest-lesson-complete" aria-live="polite"><span>✓</span><div><small>ПРОБНЫЙ УРОК ЗАВЕРШЁН</small><h2>{lesson.title} пройден</h2><p>Результат не сохраняется без аккаунта.</p></div><Link className="btn primary" to="/?register=1">Продолжить обучение</Link></section>}
          <footer className="readerFooter">
            <button className="btn ghost readerBackButton" type="button" disabled>Назад</button>
            <button className="btn primary readerNextButton" type="button" onClick={complete} disabled={finished}>Завершить пробный урок</button>
          </footer>
          {finished && <p className="guestTrialMore"><Link to={catalogPath}>Посмотреть другие пробные уроки</Link></p>}
          {interactiveTasks.length > 0 && !finished && <p className="guestTrialTaskProgress" aria-live="polite">Выполнено заданий: {passed.size} из {interactiveTasks.length}</p>}
        </article>
      </div>
    </main>}
  </div>;
}
