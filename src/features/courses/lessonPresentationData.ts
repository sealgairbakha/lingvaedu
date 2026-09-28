import type { CourseLesson, LessonBlock, LessonTab } from "./types";

export const lessonFontFamilies = {
  onest: '"Onest Variable", Onest, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  rounded: '"Trebuchet MS", Arial, sans-serif',
  mono: '"Cascadia Code", Consolas, monospace',
} as const;

export const taskBlockKinds = new Set<LessonBlock["kind"]>([
  "drag-words", "select-words", "fill-blank", "match", "true-false", "quiz", "assignment",
  "game-memory", "game-build-word", "game-listen-choice", "game-missing",
  "game-odd-one-out", "game-speed", "game-truth", "game-categories",
  "game-sentence", "game-translate-sentence", "game-adventure",
]);

export function lessonTabs(lesson: CourseLesson): LessonTab[] {
  return lesson.tabs?.filter((tab) => tab.id) || [];
}

export function visibleLessonBlocks(lesson: CourseLesson, tabs: LessonTab[], activeTabId: string): LessonBlock[] {
  return tabs.length
    ? lesson.blocks.filter((block) => (block.tabId || tabs[0].id) === activeTabId)
    : lesson.blocks;
}
