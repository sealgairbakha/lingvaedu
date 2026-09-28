import { describe, expect, it } from "vitest";
import { parseGuestCourse, parseGuestTrial } from "./guestTrialData";

describe("guest trial data", () => {
  it("accepts only a course with a first lesson", () => {
    expect(parseGuestCourse({ course_id: "c", course_title: "English", lesson_id: "l", lesson_title: "Hello" })?.lessonId).toBe("l");
    expect(parseGuestCourse({ course_id: "c", course_title: "English" })).toBeNull();
  });

  it("rejects a missing or malformed lesson", () => {
    expect(parseGuestTrial(null)).toBeNull();
    expect(parseGuestTrial({ courseId: "c", courseTitle: "English", courseLanguage: "English", lesson: { id: "l", title: "Hello" } })).toBeNull();
    expect(parseGuestTrial({ courseId: "c", courseTitle: "English", courseLanguage: "English", lesson: { id: "l", title: "Hello", blocks: [] } })?.lesson.id).toBe("l");
  });

});
