export type CourseStatus = "published" | "draft" | "archived";
export type BlockKind = "text" | "media" | "quiz" | "html" | "file";

export type LessonBlock = {
  id: string;
  kind: BlockKind;
  title: string;
  content: string;
};

export type CourseLesson = {
  id: string;
  title: string;
  description: string;
  timeLimit: number;
  attempts: number;
  blocks: LessonBlock[];
};

export type CourseModule = { id: string; title: string; lessons: CourseLesson[] };

export type Course = {
  id: string;
  title: string;
  code: string;
  description: string;
  language: string;
  author: string;
  mentor: string;
  status: CourseStatus;
  color: string;
  students: number;
  updatedAt: string;
  modules: CourseModule[];
};

export const uid = () => crypto.randomUUID();

export const blankCourse = (author: string): Course => ({
  id: uid(), title: "Новый курс", code: "NEW", description: "Добавьте описание курса",
  language: "Английский", author, mentor: author, status: "draft", color: "purple",
  students: 0, updatedAt: new Date().toISOString(),
  modules: [{ id: uid(), title: "Первый модуль", lessons: [{ id: uid(), title: "Первый урок", description: "", timeLimit: 0, attempts: 0, blocks: [] }] }],
});
