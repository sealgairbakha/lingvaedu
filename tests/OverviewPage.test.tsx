import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { OverviewPage } from "../src/features/overview/OverviewPage";
import { blankCourse, type Course } from "../src/features/courses/types";
import type { CourseLessonProgress } from "../src/features/courses/CourseProvider";

const mock = vi.hoisted(() => ({
  auth: { displayName: "Анна", canEditCourses: true, session: { access_token: "test-token" }, user: { id: "viewer" } },
  store: { courses: [] as Course[], loading: false, loadError: "", reload: vi.fn(), enrolledCourseIds: [] as string[],
    progress: [] as CourseLessonProgress[], progressLoading: false, progressError: "", retryProgress: vi.fn(), createCourse: vi.fn() },
}));
vi.mock("../src/auth/AuthProvider", () => ({ useAuth: () => mock.auth }));
vi.mock("../src/features/courses/CourseProvider", () => ({ useCourses: () => mock.store }));

const stats = { studentCount: 12, activeUsers30d: 7, groupCount: 3, enrollmentCount: 19 };
const success = () => new Response(JSON.stringify({ stats }), { headers: { "Content-Type": "application/json" } });
const mount = () => render(<MemoryRouter><OverviewPage go={vi.fn()} /></MemoryRouter>);
const course = (id: string, status: Course["status"] = "published"): Course => ({ ...blankCourse("Наставник"), id, title: `Курс ${id}`, status });

beforeEach(() => {
  mock.auth.canEditCourses = true;
  Object.assign(mock.store, { courses: [], loading: false, loadError: "", enrolledCourseIds: [], progress: [], progressLoading: false, progressError: "" });
  vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => success()));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("overview states and course access", () => {
  it("keeps unavailable organization statistics distinct from zero and retries", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response("Unavailable", { status: 503 }));
    mount();
    await screen.findByText("Статистика учеников и групп временно недоступна.");
    expect(screen.getAllByText("Данные недоступны")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Повторить" }));
    await waitFor(() => expect(screen.queryByText("Статистика учеников и групп временно недоступна.")).toBeNull());
    expect(screen.getByText("12")).toBeTruthy();
    expect(screen.getByText("19 назначений")).toBeTruthy();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("offers recovery when course loading fails instead of presenting an empty catalog", () => {
    mock.store.loadError = "Связь с сервером потеряна.";
    mount();
    expect(screen.getByRole("heading", { name: "Не удалось загрузить обзор" })).toBeTruthy();
    expect(screen.queryByText("Начните с первого курса")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Попробовать снова" }));
    expect(mock.store.reload).toHaveBeenCalledOnce();
  });

  it("does not flash empty course states while data is loading", () => {
    mock.store.loading = true;
    mount();
    expect(screen.getAllByRole("status", { name: "Загружаем курсы" })).toHaveLength(3);
    expect(screen.queryByText("Начните с первого курса")).toBeNull();
  });

  it("provides real course links and explains the teacher's completion percentage", () => {
    mock.store.courses = [course("one")];
    mount();
    const recent = screen.getByRole("region", { name: "Недавно обновлённые курсы" });
    const link = within(recent).getByRole("link", { name: /Курс one/ });
    expect(link.getAttribute("href")).toBe("/courses/editor?course=one");
    expect(within(link).getByText("Уроки с материалами")).toBeTruthy();
    expect(within(link).getByText("1 урок · 0 учеников")).toBeTruthy();
  });

  it("shows only assigned published courses to a student and uses their own progress", () => {
    mock.auth.canEditCourses = false;
    const assigned = course("assigned");
    mock.store.courses = [assigned, course("unassigned"), course("draft", "draft")];
    mock.store.enrolledCourseIds = ["assigned", "draft"];
    mock.store.progress = [{ userId: "someone-else", courseId: assigned.id, lessonId: assigned.modules[0].lessons[0].id,
      status: "completed", progress: 100, completedAt: "2026-09-07", lastOpenedAt: "2026-09-07" }];
    mount();
    expect(screen.queryByRole("button", { name: "Создать курс" })).toBeNull();
    expect(screen.queryByText("Курс unassigned")).toBeNull();
    expect(screen.queryByText("Курс draft")).toBeNull();
    expect(screen.queryByRole("region", { name: "Состояние каталога" })).toBeNull();
    const recent = screen.getByRole("region", { name: "Ваши курсы" });
    expect(within(recent).getByRole("link").getAttribute("href")).toBe("/courses/learn?course=assigned");
    expect(screen.getByRole("link", { name: /Начать обучение/ }).getAttribute("href")).toBe(`/courses/learn?course=assigned&lesson=${assigned.modules[0].lessons[0].id}`);
    expect(screen.queryByRole("definition")).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not report missing student progress as zero and exposes retry", () => {
    mock.auth.canEditCourses = false;
    mock.store.courses = [course("assigned")];
    mock.store.enrolledCourseIds = ["assigned"];
    mock.store.progressError = "Не удалось загрузить прогресс.";
    mount();
    expect(screen.queryByText("0%")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Повторить" }));
    expect(mock.store.retryProgress).toHaveBeenCalledOnce();
  });

  it("continues with the first unfinished lesson of the last studied course", () => {
    mock.auth.canEditCourses = false;
    const assigned = course("assigned");
    const first = assigned.modules[0].lessons[0];
    assigned.modules[0].lessons.push({ ...first, id: "next", title: "Следующий урок" });
    mock.store.courses = [course("other"), assigned];
    mock.store.enrolledCourseIds = ["other", "assigned"];
    mock.store.progress = [{ userId: "viewer", courseId: assigned.id, lessonId: first.id, status: "completed", progress: 100, completedAt: "2026-09-07", lastOpenedAt: "2026-09-07" }];
    mount();
    expect(screen.getByRole("link", { name: /Продолжить урок/ }).getAttribute("href")).toBe("/courses/learn?course=assigned&lesson=next");
  });

  it("does not guess a resume lesson while progress is loading", () => {
    mock.auth.canEditCourses = false;
    mock.store.courses = [course("assigned")];
    mock.store.enrolledCourseIds = ["assigned"];
    mock.store.progressLoading = true;
    mount();
    const hero = screen.getByRole("region", { name: "Ваше учебное путешествие" });
    expect(within(hero).getByRole("link").getAttribute("href")).toBe("/courses/learn?course=assigned");
    expect(screen.queryByText("Начать обучение")).toBeNull();
  });
});
