type CourseRow = { id: string; title: string; status: string; content: { modules?: { lessons?: { id: string }[] }[] } | null };
type Enrollment = { course_id: string; user_id: string };
type Progress = { course_id: string; user_id: string; lesson_id: string; status: string };

export function reportMetrics(courses: CourseRow[], enrollments: Enrollment[], progress: Progress[]) {
  const rows = courses.map((course) => {
    const lessonIds = new Set(course.content?.modules?.flatMap((module) => module.lessons?.map((lesson) => lesson.id) || []) || []);
    const students = new Set(enrollments.filter((row) => row.course_id === course.id).map((row) => row.user_id));
    const completed = new Set(progress.filter((row) => row.course_id === course.id && students.has(row.user_id) && lessonIds.has(row.lesson_id) && row.status === "completed").map((row) => `${row.user_id}:${row.lesson_id}`));
    const total = lessonIds.size * students.size;
    return { id: course.id, title: course.title, status: course.status, lessons: lessonIds.size, students: students.size, completedLessons: completed.size, totalLessons: total, completion: total ? Math.round(completed.size / total * 100) : 0 };
  });
  const totalLessons = rows.reduce((sum, row) => sum + row.totalLessons, 0);
  const completedLessons = rows.reduce((sum, row) => sum + row.completedLessons, 0);
  const courseIds = new Set(courses.map((course) => course.id));
  return {
    courses: rows,
    summary: {
      students: new Set(enrollments.filter((row) => courseIds.has(row.course_id)).map((row) => row.user_id)).size,
      published: courses.filter((course) => course.status === "published").length,
      completedLessons,
      completion: totalLessons ? Math.round(completedLessons / totalLessons * 100) : 0,
    },
  };
}
