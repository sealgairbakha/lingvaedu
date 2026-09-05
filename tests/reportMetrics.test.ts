import { describe, expect, it } from "vitest";
import { reportMetrics } from "../server/reportMetrics";
import { csvCell } from "../src/lib/csv";

describe("real report calculations", () => {
  const courses = [{ id: "course", title: "Test", status: "published", content: { modules: [{ lessons: [{ id: "one" }, { id: "two" }] }] } }];
  it("excludes teachers, unassigned learners and deleted lessons", () => {
    const enrollments = [{ course_id: "course", user_id: "student" }];
    const progress = [
      { course_id: "course", user_id: "student", lesson_id: "one", status: "completed" },
      { course_id: "course", user_id: "student", lesson_id: "deleted", status: "completed" },
      { course_id: "course", user_id: "teacher", lesson_id: "two", status: "completed" },
    ];
    const report = reportMetrics(courses, enrollments, progress);
    expect(report.summary).toEqual({ students: 1, published: 1, completedLessons: 1, completion: 50 });
  });
  it("does not count duplicate completion or enrollment rows twice", () => {
    const enrollment = { course_id: "course", user_id: "student" };
    const completion = { course_id: "course", user_id: "student", lesson_id: "one", status: "completed" };
    const report = reportMetrics(courses, [enrollment, enrollment], [completion, completion]);
    expect(report.summary.completion).toBe(50);
  });
  it("handles empty data without a fabricated percentage", () => {
    expect(reportMetrics([], [], []).summary.completion).toBe(0);
  });
});

describe("CSV export", () => {
  it.each(["=SUM(A1)", "+cmd", "@SUM(A1)", "-cmd", "  =cmd"])("neutralizes spreadsheet formulas: %s", (value) => {
    expect(csvCell(value)).toBe(`"'${value}"`);
  });
  it("quotes separators and embedded quotes", () => { expect(csvCell('English; "A1"')).toBe('"English; ""A1"""'); });
});
