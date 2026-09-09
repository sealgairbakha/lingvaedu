import { useLayoutEffect, useRef, type ReactNode } from "react";
import { useCourses } from "../courses/CourseProvider";
import { StudentCourseCard } from "../courses/StudentCourseCard";

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

export function GuideCoursesScene({ cursor }: { cursor: ReactNode }) {
  const { courses, enrolledCourseIds, progress, loading, progressLoading, loadError, progressError } = useCourses();
  const available = courses.filter((course) => course.status === "published" && enrolledCourseIds.includes(course.id)).slice(0, 2);
  return <ScaledScene>
    <div className="guidePageBar">LingvaEdu <span>/ Мои курсы</span></div>
    <div className="guideCatalog">
      <h3>Мои курсы</h3>
      {loading || progressLoading ? <div className="guideCatalogLoading"><GuideTextLines /><GuideTextLines /></div> : loadError || progressError ? <p>Не удалось загрузить курсы. Попробуйте открыть «Мои курсы» ещё раз.</p> : available.length ? <div className="guideCatalogCards">
        {available.map((course, index) => <StudentCourseCard key={course.id} course={course} progress={progress} onOpen={() => {}} actionDecoration={index === 0 ? cursor : undefined} />)}
      </div> : <div className="courseEmpty studentCourseEmpty"><h3>У вас пока нет доступных курсов.</h3><p>Назначенные курсы появятся здесь.</p></div>}
    </div>
  </ScaledScene>;
}

function GuideTextLines() {
  return <div className="guideTextLines"><i /><i /><i /></div>;
}

export function GuideLessonScene({ cursor }: { cursor: ReactNode }) {
  return <ScaledScene>
    <div className="guideLessonPage coursePlayer">
      <div className="guidePageBar">LingvaEdu <span>/ Урок</span></div>
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
