import { useEffect, useRef, useState, type ReactNode } from "react";
import { GuideCoursesScene, GuideLessonScene, GuideReturnScene } from "./StudentGuideScenes";
import "../../styles/student-guide.css";

const compactQuery = "(max-width: 820px), (max-height: 500px) and (max-width: 1000px)";
const learningSteps = [
  { title: "Выберите «Мои курсы»", text: "Нажмите «Мои курсы» в боковой панели. Здесь находятся курсы, которые назначил вам наставник.", label: "Найти курсы" },
  { title: "Откройте свой курс", text: "Нажмите «Начать» или «Продолжить» на карточке курса. Если курсов пока нет, дождитесь назначения от наставника — они появятся здесь автоматически.", label: "Открыть курс" },
  { title: "Проходите урок шаг за шагом", text: "Выберите урок в списке, изучите материалы и выполните задания. Нажимайте кнопку проверки под заданием и следуйте подсказкам. Названия кнопок могут зависеть от языка курса.", label: "Пройти урок" },
  { title: "Возвращайтесь к обучению", text: "В «Обзоре» нажмите кнопку под названием курса, чтобы продолжить обучение. Все назначенные курсы всегда доступны в разделе «Курсы».", label: "Продолжить обучение" },
];

function TapHand() {
  return <svg className="guideTapHand" viewBox="0 0 40 48" aria-hidden="true"><circle className="guideTapGlow" cx="15" cy="12" r="15" /><g className="guideTapRays" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 2V0M7 5 5 3M23 5l2-2M4 12H1M27 12h3" /></g><path fill="white" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M12 29V13a3 3 0 0 1 6 0v11-4a3 3 0 0 1 6 0v5-2a3 3 0 0 1 6 0v4-1a3 3 0 0 1 6 0v8c0 7-4 12-11 12h-4c-4 0-7-2-9-5L4 30c-2-4 2-6 5-3l3 2Z" /></svg>;
}

export function StudentGuide({ userId, openCourses, sidebar }: { userId: string; openCourses: () => void; sidebar?: ReactNode }) {
  const storageKey = `lingvaedu:student-guide:v2:${userId}`;
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem(storageKey) !== "hidden"; } catch { return true; }
  });
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [compact, setCompact] = useState(() => window.matchMedia(compactQuery).matches);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dontShow, setDontShow] = useState(() => { try { return localStorage.getItem(storageKey) === "hidden"; } catch { return false; } });
  const steps = [{ title: compact ? "Откройте меню на телефоне" : "Откройте боковую панель", text: compact ? "Нажмите кнопку с тремя полосками в левом верхнем углу. Боковая панель откроется поверх страницы. Попробуйте нажать кнопку на иллюстрации." : "Если боковая панель скрыта, нажмите кнопку с тремя полосками слева вверху. Если она уже открыта, переходите дальше. Попробуйте открыть её на иллюстрации.", label: "Открыть меню" }, ...learningSteps];
  useEffect(() => {
    const media = window.matchMedia(compactQuery);
    const update = () => setCompact(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const replay = () => { setStep(0); setDirection("forward"); setMenuOpen(false); setOpen(true); };
    window.addEventListener("lingvaedu:student-guide", replay);
    return () => window.removeEventListener("lingvaedu:student-guide", replay);
  }, []);

  useEffect(() => {
    const element = dialog.current;
    if (!open || !element) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = "hidden";
    heading.current?.focus({ preventScroll: true });
    return () => { element.close(); document.body.style.overflow = previousOverflow; previousFocus?.focus(); };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    heading.current?.focus({ preventScroll: true });
    if (dialog.current) dialog.current.scrollTop = 0;
  }, [open, step]);

  const dismiss = () => {
    try { if (dontShow) localStorage.setItem(storageKey, "hidden"); else localStorage.removeItem(storageKey); } catch { /* The guide remains available when storage is disabled. */ }
    setOpen(false);
  };

  const changeStep = (offset: -1 | 1) => {
    setDirection(offset > 0 ? "forward" : "backward");
    setMenuOpen(false);
    setStep((value) => Math.max(0, Math.min(steps.length - 1, value + offset)));
  };

  if (!open) return null;
  return <dialog className="studentGuide" ref={dialog} aria-labelledby="student-guide-title" aria-describedby="student-guide-description" onCancel={(event) => { event.preventDefault(); dismiss(); }}>
    <header className="studentGuideTop"><span>Знакомство с LingvaEdu</span><button onClick={dismiss}>Пропустить</button></header>
    <div className={`studentGuideIllustration guideDevice-${compact ? "phone" : "desktop"}`}>
      {step < 2 ? <div className="guideReplicaFrame">
        <div className={`guideReplica ${(step > 0 || menuOpen) ? "guideMenuVisible" : ""}`}>
          <div className="guideReplicaHeader"><button className="menuBtn" aria-label="Открыть меню на иллюстрации" onClick={() => setMenuOpen((value) => !value)}><span/><span/><span/>{!menuOpen && step === 0 && <TapHand />}</button><span>LingvaEdu</span></div>
          <div className="guideReplicaContent" aria-hidden="true"><strong>Обзор</strong><span className="courseCoverArt guideReplicaCourseCover"><i /><i /><i /></span></div>
          <div className="guideOriginalSidebar" inert aria-hidden="true">{sidebar}<div className="guideNavTap"><TapHand /></div></div>
        </div>
      </div> : <div key={step} className={`guideWindow guideScene-${direction}`} aria-hidden="true">
        {step === 2 ? <GuideCoursesScene cursor={<TapHand />} /> : step === 3 ? <GuideLessonScene cursor={<TapHand />} /> : <GuideReturnScene cursor={<TapHand />} />}
      </div>}
    </div>
    <div key={step} className={`studentGuideCopy guideScene-${direction}`}><span className="studentGuideCount">Шаг {step + 1} из {steps.length}</span><h2 id="student-guide-title" ref={heading} tabIndex={-1}>{steps[step].title}</h2><p id="student-guide-description">{steps[step].text}</p></div>
    <footer className="studentGuideFooter">
      <button className="guideBack" disabled={step === 0} onClick={() => changeStep(-1)}>Назад</button>
      <div className="guideSteps" aria-label="Этапы знакомства">{steps.map((item, index) => <span key={item.label} aria-current={step === index ? "step" : undefined} aria-label={`${index + 1}. ${item.label}`} />)}</div>
      <button className="guideNext" onClick={() => { if (step < steps.length - 1) changeStep(1); else { dismiss(); openCourses(); } }}>{step === steps.length - 1 ? "К моим курсам" : "Далее"}</button>
    </footer>
    <label className="guideDontShow"><input type="checkbox" checked={dontShow} onChange={(event) => setDontShow(event.target.checked)} />Больше не показывать</label>
  </dialog>;
}
