import type { ReactNode } from "react";
import type { CourseLesson, LessonTab } from "./types";
import { lessonFontFamilies } from "./lessonPresentationData";

export function LessonReaderIntro({ lesson, index, total, taskCount, children }: {
  lesson: CourseLesson;
  index: number;
  total: number;
  taskCount: number;
  children?: ReactNode;
}) {
  return <div className="readerIntro">
    <small>УРОК {index + 1} ИЗ {total}</small>
    <h1>{lesson.title}</h1>
    {(lesson.goal || lesson.description) && <p style={{
      fontFamily: lessonFontFamilies[lesson.descriptionStyle?.fontFamily || "onest"],
      fontSize: `${lesson.descriptionStyle?.fontSize || 17}px`,
      fontWeight: lesson.descriptionStyle?.fontWeight || 400,
      textAlign: lesson.descriptionStyle?.textAlign || "left",
    }}>{lesson.goal || lesson.description}</p>}
    <div className="readerMeta">
      {lesson.estimatedMinutes && lesson.estimatedMinutes > 0 && <span className="readerLimit">
        <small>Время</small><b>≈ {lesson.estimatedMinutes} мин</b>
      </span>}
      {taskCount > 0 && <span className="readerLimit">
        <small>Практика</small><b>{taskCount} {taskCount === 1 ? "задание" : "заданий"}</b>
      </span>}
      {children}
    </div>
  </div>;
}

export function LessonTabBar({ tabs, activeTabId, onSelect }: {
  tabs: LessonTab[];
  activeTabId: string;
  onSelect: (id: string) => void;
}) {
  if (!tabs.length) return null;
  return <nav className="learnerLessonTabs" aria-label="Разделы урока">
    {tabs.map((tab, index) => <button
      type="button"
      key={tab.id}
      className={tab.id === activeTabId ? "active" : ""}
      aria-current={tab.id === activeTabId ? "page" : undefined}
      onClick={() => onSelect(tab.id)}
    >{tab.title || `Вкладка ${index + 1}`}</button>)}
  </nav>;
}
