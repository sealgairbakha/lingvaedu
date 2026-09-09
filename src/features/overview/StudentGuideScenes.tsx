import { useLayoutEffect, useRef, type ReactNode } from "react";
import { ActionChevron } from "../../components/ActionChevron";

// Fit the original components into the illustration without changing their proportions.
function ScaledScene({ children }: { children: ReactNode }) {
  const viewport = useRef<HTMLDivElement>(null);
  const page = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const frame = viewport.current;
    const content = page.current;
    if (!frame || !content) return;
    const fit = () => {
      if (!frame.clientWidth || !frame.clientHeight || !content.offsetWidth || !content.offsetHeight) return;
      const scale = Math.min(frame.clientWidth / content.offsetWidth, frame.clientHeight / content.offsetHeight);
      content.style.transform = `scale(${scale})`;
      content.style.left = `${(frame.clientWidth - content.offsetWidth * scale) / 2}px`;
    };
    const observer = new ResizeObserver(fit);
    observer.observe(frame);
    observer.observe(content);
    fit();
    return () => observer.disconnect();
  }, []);
  return <div className="guideScaledViewport" ref={viewport} inert aria-hidden="true"><div className="guideScaledPage" ref={page}>{children}</div></div>;
}

function GuideSceneHeader() {
  return <div className="guidePageBar"><span className="guideSceneMenu"><i /><i /><i /></span><b>LingvaEdu</b></div>;
}

export function GuideCoursesScene({ cursor }: { cursor: ReactNode }) {
  return <ScaledScene>
    <GuideSceneHeader />
    <div className="guideCatalog">
      <h3>Мои курсы</h3>
      <div className="guideCatalogCards">
        <article className="studentCourseCard guideCourseCard">
          <div className="guideCourseCover"><i /><i /></div>
          <div className="studentCourseInfo">
            <GuideTextLines />
            <div className="guideCourseMeta"><i /><i /></div>
            <div className="studentProgressBar"><i /></div>
            <button className="studentContinueButton guideCourseButton" tabIndex={-1}>Продолжить<ActionChevron />{cursor}</button>
          </div>
        </article>
      </div>
    </div>
  </ScaledScene>;
}

function GuideTextLines() {
  return <div className="guideTextLines"><i /><i /><i /></div>;
}

export function GuideLessonScene({ cursor }: { cursor: ReactNode }) {
  return <ScaledScene>
    <div className="guideLessonPage coursePlayer">
      <GuideSceneHeader />
      <div className="guideLessonViewport">
        <div className="guideLessonTrack">
          <div className="learningBlock"><GuideTextLines /><GuideTextLines /></div>
          <div className="learningBlock"><GuideTextLines /><div className="guideLessonMedia"><svg viewBox="0 0 24 24"><path d="m9 5 10 7-10 7Z" /></svg></div></div>
          <div className="learningBlock"><GuideTextLines /><GuideTextLines /></div>
          <div className="learningBlock guideLessonTask">
            <h3>Задание</h3><GuideTextLines />
            <div className="guideTaskAnswer"><span /><div className="guideTextLines"><i /></div></div>
            <div className="taskActions guideTaskActions"><span className="guideTaskChecked"><svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6" /></svg>Ответ проверен</span><button className="taskCheckButton" tabIndex={-1}>Проверить<span className="guideLessonCursor">{cursor}</span></button></div>
          </div>
        </div>
      </div>
    </div>
  </ScaledScene>;
}

export function GuideReturnScene({ cursor }: { cursor: ReactNode }) {
  return <ScaledScene>
    <div className="guideReturnPage">
      <GuideSceneHeader />
      <div className="guideReturnContent">
        <GuideTextLines />
        <div className="guideReturnCourse">
          <div className="guideCourseCover"><i /><i /></div>
          <div><GuideTextLines /><button className="btn primary guideReturnButton" tabIndex={-1}>Продолжить<ActionChevron />{cursor}</button></div>
        </div>
      </div>
    </div>
  </ScaledScene>;
}
