import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadCourseDraft, serializeCourseDraft } from "../src/features/courses/courseDraft";
import { blankCourse } from "../src/features/courses/types";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("course draft rescue", () => {
  it("preserves all unsaved content without mutating the course", () => {
    const course = blankCourse("Author");
    course.title = "Новый урок: 中文 & English";
    const before = structuredClone(course);
    const parsed = JSON.parse(serializeCourseDraft(course));
    expect(parsed.format).toBe("lingvaedu-course-draft");
    expect(parsed.version).toBe(1);
    expect(parsed.course).toEqual(before);
    expect(course).toEqual(before);
  });
  it("downloads a JSON file and releases its URL after the browser can consume it", () => {
    vi.useFakeTimers();
    const createObjectURL = vi.fn<(blob: Blob) => string>(() => "blob:draft");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toMatch(/^lingvaedu-draft-[\w-]+\.json$/);
      expect(this.href).toBe("blob:draft");
      expect(this.isConnected).toBe(true);
    });
    downloadCourseDraft(blankCourse("Author"));
    expect(click).toHaveBeenCalledOnce();
    expect(createObjectURL.mock.calls[0][0]).toBeInstanceOf(Blob);
    expect(document.querySelector('a[download]')).toBeNull();
    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:draft");
  });
});
