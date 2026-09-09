import type { ReactNode } from "react";
import { CourseCover } from "./CourseCard";
import type { CourseLessonProgress } from "./CourseProvider";
import { getCourseProgress } from "./courseProgress";
import type { Course } from "./types";

export function StudentCourseCard({ course, progress, onOpen, actionDecoration }: {
  course: Course;
  progress: CourseLessonProgress[];
  onOpen: (course: Course, lessonId?: string) => void;
  actionDecoration?: ReactNode;
}) {
  const item = getCourseProgress(course, progress);
  return <article className="studentCourseCard">
    <button className="studentCoverButton" onClick={() => onOpen(course, item.lastLesson?.id)} aria-label={`Открыть курс ${course.title}`}><CourseCover course={course} /></button>
    <div className="studentCourseInfo"><p className="courseMeta">{course.language}{course.level ? ` · ${course.level}` : ""}</p><h3>{course.title}</h3>
      {course.mentor && <p className="studentMentor">{course.mentorAvatar ? <img src={course.mentorAvatar} alt="" /> : <i>{course.mentor.slice(0, 2).toUpperCase()}</i>}<span>{course.mentor}</span></p>}
      <div className="studentProgressLabel"><b>{item.percent}%</b><span>{item.completed} из {item.lessons.length} уроков</span></div><div className="studentProgressBar"><i style={{ width: `${item.percent}%` }} /></div>
      {item.lastLesson && <p className="studentLastLesson">Последний урок: <b>{item.lastLesson.title}</b></p>}{item.remainingMinutes > 0 && <small className="remainingTime">Осталось примерно {item.remainingMinutes} мин</small>}
      <button className="studentContinueButton" onClick={() => onOpen(course, item.lastLesson?.id)}>{item.last ? "Продолжить" : "Начать"} <span>→</span>{actionDecoration}</button>
    </div>
  </article>;
}
