import type { CSSProperties, ReactNode } from "react";
import type { Course } from "./types";

const statusLabels = { published: "Опубликован", draft: "Черновик", archived: "В архиве" };

export function CourseCover({ course }: { course: Pick<Course, "code" | "color" | "coverStyle" | "coverImage" | "showNewRibbon" | "language"> }) {
  const showNewRibbon = course.showNewRibbon ?? course.code === "NEW";
  return <span className={`courseCoverArt ${course.color} cover-${course.coverStyle || "orbit"} ${course.coverImage ? "has-image" : ""}`} style={course.coverImage ? { "--cover-image": `url(${course.coverImage})` } as CSSProperties : undefined} aria-hidden="true">
    {!course.coverImage && <><i /><i /><i /></>}
    {showNewRibbon && <span className="courseNewRibbon">NEW</span>}
    <small>{course.language.toUpperCase()}</small>
  </span>;
}

export function CourseCardInfo({ course, stats, action, progress, children, showStatus = true }: {
  course: Course;
  stats: ReactNode;
  action: ReactNode;
  progress?: ReactNode;
  children?: ReactNode;
  showStatus?: boolean;
}) {
  return <div className="courseInfo">
    {showStatus && <div className="statusRow"><span className={course.status === "published" ? "published" : "draft"}>● {statusLabels[course.status]}</span><small>{new Date(course.updatedAt).toLocaleDateString("ru-RU")}</small></div>}
    <h3>{course.title}</h3><p>{course.description}</p>
    <div className="courseStats">{stats}</div>
    {progress}
    {action}
    {children}
  </div>;
}
