export type CourseStatus = "published" | "draft" | "archived";
export type BlockKind =
  | "text"
  | "media"
  | "video"
  | "audio"
  | "image"
  | "drag-words"
  | "select-words"
  | "fill-blank"
  | "quiz"
  | "match"
  | "true-false"
  | "assignment"
  | "game-memory"
  | "game-build-word"
  | "game-listen-choice"
  | "game-missing"
  | "game-odd-one-out"
  | "game-speed"
  | "game-truth"
  | "game-categories"
  | "game-sentence"
  | "game-adventure"
  | "html"
  | "file";

export type MemoryGameConfig = {
  type: "memory";
  pairs: { id: string; left: string; right: string; leftImage?: string; rightImage?: string }[];
};

export type BuildWordGameConfig = {
  type: "build-word";
  items: { id: string; word: string; clue?: string; image?: string }[];
};

export type ListenChoiceGameConfig = {
  type: "listen-choice";
  language: string;
  items: { id: string; phrase: string; audio?: string; answer: string; options: string[] }[];
};

export type MissingGameConfig = { type: "missing"; revealSeconds: number; rounds: { id: string; items: string[]; missing: string }[] };
export type OddOneOutGameConfig = { type: "odd-one-out"; rounds: { id: string; options: string[]; answer: string; explanation?: string }[] };
export type SpeedGameConfig = { type: "speed"; seconds: number; rounds: { id: string; prompt: string; answer: string; options: string[]; image?: string }[] };
export type TruthGameConfig = { type: "truth"; rounds: { id: string; prompt: string; statement: string; correct: boolean; image?: string }[] };
export type CategoriesGameConfig = { type: "categories"; categories: { id: string; name: string }[]; items: { id: string; text: string; categoryId: string }[] };
export type SentenceGameConfig = { type: "sentence"; items: { id: string; sentence: string; clue?: string }[] };
export type AdventureGameConfig = { type: "adventure"; heroName: string; stages: { id: string; prompt: string; answer: string; options: string[] }[] };

export type GameConfig = MemoryGameConfig | BuildWordGameConfig | ListenChoiceGameConfig | MissingGameConfig | OddOneOutGameConfig | SpeedGameConfig | TruthGameConfig | CategoriesGameConfig | SentenceGameConfig | AdventureGameConfig;

export type LessonBlock = {
  id: string;
  tabId?: string;
  kind: BlockKind;
  title: string;
  content: string;
  richContent?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  images?: string[];
  imageCaptions?: string[];
  imageLayout?: "grid" | "mosaic" | "filmstrip";
  game?: GameConfig;
  textStyle?: {
    fontFamily?: "onest" | "serif" | "rounded" | "mono";
    fontSize?: 14 | 16 | 18 | 20 | 24;
    fontWeight?: 400 | 500 | 700;
    textAlign?: "left" | "center" | "right";
  };
};

export type LessonTab = {
  id: string;
  title: string;
};

export type CourseLesson = {
  id: string;
  title: string;
  description: string;
  descriptionStyle?: LessonBlock["textStyle"];
  timeLimit: number;
  attempts: number;
  estimatedMinutes?: number;
  goal?: string;
  tabs?: LessonTab[];
  blocks: LessonBlock[];
};

export type CourseModule = { id: string; title: string; lessons: CourseLesson[] };

export type Course = {
  id: string;
  title: string;
  code: string;
  description: string;
  language: string;
  level?: string;
  author: string;
  authorId?: string;
  mentor: string;
  mentorAvatar?: string;
  status: CourseStatus;
  color: string;
  coverStyle?: "orbit" | "grid" | "waves";
  coverImage?: string;
  showNewRibbon?: boolean;
  students: number;
  updatedAt: string;
  modules: CourseModule[];
};

export const uid = () => crypto.randomUUID();

export const blankCourse = (author: string, authorId?: string, avatarUrl?: string): Course => ({
  id: uid(), title: "Новый курс", code: "NEW", description: "Добавьте описание курса",
  language: "Английский", author, authorId, mentor: author, mentorAvatar: avatarUrl, status: "draft", color: "purple", showNewRibbon: true,
  students: 0, updatedAt: new Date().toISOString(),
  modules: [{ id: uid(), title: "Первый модуль", lessons: [{ id: uid(), title: "Первый урок", description: "", timeLimit: 0, attempts: 0, blocks: [] }] }],
});
