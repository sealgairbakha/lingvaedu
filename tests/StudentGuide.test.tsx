import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { StudentGuide } from "../src/features/overview/StudentGuide";

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});

it("shows one text-free course preview and keeps its action inside the guide", () => {
  const openCourses = vi.fn();
  const { container } = render(<StudentGuide userId="cards" openCourses={openCourses} />);
  fireEvent.click(screen.getByRole("button", { name: "Далее" }));
  fireEvent.click(screen.getByRole("button", { name: "Далее" }));
  expect(container.querySelectorAll(".guideCourseCard")).toHaveLength(1);
  expect(container.querySelector(".guideCourseCard h3, .guideCourseCard p")).toBeNull();
  expect(container.querySelector(".guideCourseButton")?.textContent).toContain("Продолжить");
  fireEvent.click(container.querySelector(".studentContinueButton")!);
  expect(openCourses).not.toHaveBeenCalled();
  expect(screen.getByText("Шаг 3 из 5")).toBeTruthy();
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("shows all steps, supports going back and opens courses on completion", () => {
  const openCourses = vi.fn();
  const { container } = render(<StudentGuide userId="complete" openCourses={openCourses} />);
  expect(screen.getByRole("heading", { name: "Откройте боковую панель" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Далее" }));
  expect(screen.getByRole("heading", { name: "Выберите «Мои курсы»" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Назад" }));
  expect(screen.getByText("Шаг 1 из 5")).toBeTruthy();
  for (let index = 0; index < 4; index++) fireEvent.click(screen.getByRole("button", { name: "Далее" }));
  expect(container.querySelector(".guideReturnButton")?.textContent).toContain("Продолжить");
  expect(container.querySelector(".guideReturnButton .courseActionChevron")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "К моим курсам" }));
  expect(openCourses).toHaveBeenCalledOnce();
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(localStorage.getItem("lingvaedu:student-guide:v2:complete")).toBeNull();
});

it("remembers skipping per student and allows replay from the beginning", () => {
  const first = render(<StudentGuide userId="skip" openCourses={vi.fn()} />);
  fireEvent.click(screen.getByRole("checkbox", { name: "Больше не показывать" }));
  fireEvent.click(screen.getByRole("button", { name: "Пропустить" }));
  first.unmount();
  render(<StudentGuide userId="skip" openCourses={vi.fn()} />);
  expect(screen.queryByRole("dialog")).toBeNull();
  fireEvent(window, new Event("lingvaedu:student-guide"));
  expect(screen.getByText("Шаг 1 из 5")).toBeTruthy();
});

it("handles Escape, restores scrolling, and does not hide the guide for another student", () => {
  document.body.style.overflow = "auto";
  const first = render(<StudentGuide userId="escape" openCourses={vi.fn()} />);
  fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(document.body.style.overflow).toBe("auto");
  first.unmount();
  render(<StudentGuide userId="another" openCourses={vi.fn()} />);
  expect(screen.getByRole("dialog")).toBeTruthy();
});

it("shows again without opting out and chooses the mobile guide automatically", () => {
  vi.mocked(window.matchMedia).mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() } as unknown as MediaQueryList);
  const first = render(<StudentGuide userId="repeat" openCourses={vi.fn()} />);
  expect(screen.getByRole("heading", { name: "Откройте меню на телефоне" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Пропустить" }));
  first.unmount();
  render(<StudentGuide userId="repeat" openCourses={vi.fn()} />);
  expect(screen.getByRole("dialog")).toBeTruthy();
});
