import { BlockIcon } from "./BlockIcon";
import type { LessonBlock } from "./types";

export function LearningBlockHeader({
  kind,
  title,
  category,
  language,
}: {
  kind: LessonBlock["kind"];
  title: string;
  category: "content" | "task" | "assignment";
  language?: string;
}) {
  const languageCode = /^(en|english|английский)/i.test(language || "") ? "en"
    : /^(kz|kk|kazakh|қазақ|казахский)/i.test(language || "") ? "kz"
      : /^(ko|korean|한국|корейский)/i.test(language || "") ? "ko"
        : /^(zh|chinese|中文|китайский)/i.test(language || "") ? "zh"
          : /^(ja|jp|japanese|日本|японский)/i.test(language || "") ? "ja"
            : "ru";
  const eyebrow = {
    ru: { content: "МАТЕРИАЛ УРОКА", task: "ЗАДАНИЕ", assignment: "РАБОТА С ПРЕПОДАВАТЕЛЕМ" },
    en: { content: "LESSON MATERIAL", task: "TASK", assignment: "TEACHER ASSIGNMENT" },
    kz: { content: "САБАҚ МАТЕРИАЛЫ", task: "ТАПСЫРМА", assignment: "МҰҒАЛІММЕН ЖҰМЫС" },
    ko: { content: "수업 자료", task: "과제", assignment: "교사 과제" },
    zh: { content: "课程资料", task: "任务", assignment: "教师作业" },
    ja: { content: "レッスン教材", task: "課題", assignment: "教師課題" },
  }[languageCode][category];
  return (
    <header className={`learningContentHeader kind-${kind}${category === "content" ? " withoutEyebrow" : ""}`}>
      <span className="learningContentHeaderIcon" aria-hidden="true">
        <BlockIcon kind={kind} />
      </span>
      <div>
        {category !== "content" && <small>{eyebrow}</small>}
        <h3>{title}</h3>
      </div>
    </header>
  );
}
