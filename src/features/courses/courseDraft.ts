import type { Course } from "./types";

/** Portable copy of teaching content; media URLs are references, not file backups. */
export function serializeCourseDraft(course: Course) {
  return JSON.stringify({ format: "lingvaedu-course-draft", version: 1, exportedAt: new Date().toISOString(), course }, null, 2);
}

export function downloadCourseDraft(course: Course) {
  const blob = new Blob([serializeCourseDraft(course)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `lingvaedu-draft-${course.id.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80)}.json`;
  document.body.append(link);
  try { link.click(); }
  finally { link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 30_000); }
}
