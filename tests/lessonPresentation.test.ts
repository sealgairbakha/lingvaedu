import { describe, expect, it } from "vitest";
import { lessonTabs, taskBlockKinds, visibleLessonBlocks } from "../src/features/courses/lessonPresentationData";
import { parseGuestTrial } from "../src/features/guest/guestTrialData";
import type { CourseLesson } from "../src/features/courses/types";

const lesson: CourseLesson = {
  id: "lesson", title: "Hello", description: "", timeLimit: 0, attempts: 0,
  tabs: [{ id: "intro", title: "Introduction" }, { id: "practice", title: "Practice" }],
  blocks: [
    { id: "a", kind: "text", title: "Welcome", content: "Text" },
    { id: "b", tabId: "practice", kind: "quiz", title: "Question", content: "Answer" },
  ],
};

describe("shared lesson presentation", () => {
  it("shows the same blocks for each tab in the player and guest trial", () => {
    const tabs = lessonTabs(lesson);
    expect(visibleLessonBlocks(lesson, tabs, "intro").map((block) => block.id)).toEqual(["a"]);
    expect(visibleLessonBlocks(lesson, tabs, "practice").map((block) => block.id)).toEqual(["b"]);
    expect(taskBlockKinds.has("quiz")).toBe(true);
  });

  it("keeps presentation settings from the published course", () => {
    const trial = parseGuestTrial({
      courseId: "course", courseTitle: "English", courseLanguage: "English",
      moduleTitle: "Unit 1", lessonPattern: "dinosaurs", lessonCount: 7, lesson,
    });
    expect(trial?.moduleTitle).toBe("Unit 1");
    expect(trial?.lessonPattern).toBe("dinosaurs");
    expect(trial?.lessonCount).toBe(7);
    expect(trial?.lesson.tabs).toEqual(lesson.tabs);
  });
});
