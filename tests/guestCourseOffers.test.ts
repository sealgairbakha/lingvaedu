import { describe, expect, it } from "vitest";
import { courseMatchesCategory, parseGuestCourse } from "../src/features/guest/guestTrialData";

const base = { course_id: "course", course_title: "English", lesson_id: "lesson", lesson_title: "Hello" };

describe("guest course categories", () => {
  it("keeps every published catalog course in the free trial category", () => {
    const course = parseGuestCourse(base);
    expect(course).not.toBeNull();
    expect(courseMatchesCategory(course!, "free")).toBe(true);
    expect(courseMatchesCategory(course!, "self-paced")).toBe(false);
    expect(courseMatchesCategory(course!, "with-teacher")).toBe(false);
  });

  it("supports independent prices for both full-course formats", () => {
    const course = parseGuestCourse({ ...base, self_paced_price_kzt: 35000, with_teacher_price_kzt: 55000 });
    expect(course?.selfPacedPriceKzt).toBe(35000);
    expect(course?.withTeacherPriceKzt).toBe(55000);
    expect(courseMatchesCategory(course!, "self-paced")).toBe(true);
    expect(courseMatchesCategory(course!, "with-teacher")).toBe(true);
  });

  it("ignores prices below the published minimum", () => {
    const course = parseGuestCourse({ ...base, self_paced_price_kzt: 29999, with_teacher_price_kzt: 49999 });
    expect(course?.selfPacedPriceKzt).toBeNull();
    expect(course?.withTeacherPriceKzt).toBeNull();
  });
});
