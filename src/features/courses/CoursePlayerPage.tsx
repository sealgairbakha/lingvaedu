import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import { useCourses } from "./CourseProvider";
import type { LessonBlock } from "./types";

function BlockView({ block }: { block: LessonBlock }) {
  const [answer, setAnswer] = useState("");
  const lines = block.content.split("\n").filter(Boolean);
  if (block.kind === "quiz") return <section className="learningBlock quizLearning"><h3>{block.title}</h3><b>{lines[0] || "Выберите ответ"}</b>{lines.slice(1).map((option) => <label key={option} className={answer === option ? "chosen" : ""}><input type="radio" name={block.id} checked={answer === option} onChange={() => setAnswer(option)} />{option}</label>)}{answer && <p className={answer === lines[1] ? "answerGood" : "answerBad"}>{answer === lines[1] ? "Верно!" : "Попробуйте ещё раз"}</p>}</section>;
  if (block.kind === "html") return <section className="learningBlock"><h3>{block.title}</h3><iframe className="lessonEmbed" sandbox="allow-scripts" srcDoc={block.content} title={block.title} /></section>;
  if (block.kind === "media") return <section className="learningBlock"><h3>{block.title}</h3>{block.content.match(/\.(png|jpe?g|gif|webp)(\?.*)?$/i) ? <img className="lessonMedia" src={block.content} alt={block.title} /> : block.content ? <iframe className="lessonEmbed" src={block.content} title={block.title} allowFullScreen /> : <p className="emptyMaterial">Ссылка пока не добавлена.</p>}</section>;
  if (block.kind === "file") return <section className="learningBlock fileLearning"><h3>{block.title}</h3>{block.content ? <a className="btn primary" href={block.content} target="_blank" rel="noreferrer">Открыть материал ↗</a> : <p className="emptyMaterial">Файл пока не прикреплён.</p>}</section>;
  return <section className="learningBlock"><h3>{block.title}</h3><p className="lessonText">{block.content || "Содержание пока не добавлено."}</p></section>;
}

export function CoursePlayerPage() {
  const navigate = useNavigate(); const [params] = useSearchParams(); const { courses, loading } = useCourses(); const { user, canEditCourses } = useAuth();
  const course = courses.find((x) => x.id === params.get("course"));
  const lessons = useMemo(() => course?.modules.flatMap((module) => module.lessons.map((lesson) => ({ module, lesson }))) || [], [course]);
  const [lessonId, setLessonId] = useState(params.get("lesson") || ""); const [completed, setCompleted] = useState<string[]>([]);
  useEffect(() => { if (!course || !user) return; const value = localStorage.getItem(`lingvaedu-progress-${user.id}-${course.id}`); const timer = setTimeout(() => setCompleted(value ? JSON.parse(value) : []), 0); return () => clearTimeout(timer); }, [course, user]);
  const currentIndex = Math.max(0, lessons.findIndex((x) => x.lesson.id === lessonId)); const current = lessons[currentIndex]?.lesson || lessons[0]?.lesson;
  const selectLesson = (id: string) => { setLessonId(id); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const complete = () => { if (!current || !course || !user) return; const next = [...new Set([...completed, current.id])]; setCompleted(next); localStorage.setItem(`lingvaedu-progress-${user.id}-${course.id}`, JSON.stringify(next)); if (currentIndex < lessons.length - 1) selectLesson(lessons[currentIndex + 1].lesson.id); };
  if (loading) return <main className="content"><div className="courseEmpty">Загружаем курс…</div></main>;
  if (!course || (course.status !== "published" && !canEditCourses)) return <main className="content"><div className="courseEmpty"><h2>Курс недоступен</h2><p>Возможно, он ещё не опубликован или перемещён в архив.</p><button className="btn primary" onClick={() => navigate("/courses")}>Вернуться к курсам</button></div></main>;
  const percent = lessons.length ? Math.round(completed.length / lessons.length * 100) : 0;
  return <main className="coursePlayer fade"><header className="playerHeader"><button onClick={() => navigate("/courses")}>← Все курсы</button><div><small>{course.language}</small><b>{course.title}</b></div><div className="playerProgress"><span>{percent}% завершено</span><i><em style={{width:`${percent}%`}} /></i></div>{canEditCourses && <button className="btn ghost" onClick={() => navigate(`/courses/editor?course=${course.id}`)}>Редактировать</button>}</header><div className="playerLayout"><aside className="playerTree">{course.modules.map((module, mi) => <div key={module.id}><h3><span>{mi + 1}</span>{module.title}</h3>{module.lessons.map((lesson, li) => <button key={lesson.id} className={current?.id === lesson.id ? "active" : ""} onClick={() => selectLesson(lesson.id)}><i className={completed.includes(lesson.id) ? "done" : ""}>{completed.includes(lesson.id) ? "✓" : li + 1}</i><span>{lesson.title}<small>{lesson.blocks.length} блоков</small></span></button>)}</div>)}</aside><article className="lessonReader">{current ? <><div className="readerIntro"><small>УРОК {currentIndex + 1} ИЗ {lessons.length}</small><h1>{current.title}</h1><p>{current.description}</p><div className="readerMeta">{current.timeLimit > 0 && <span>◷ {current.timeLimit} мин.</span>}{current.attempts > 0 && <span>↻ {current.attempts} попытки</span>}</div></div>{current.blocks.length ? current.blocks.map((block) => <BlockView key={block.id} block={block} />) : <div className="learningBlock emptyMaterial">В этом уроке пока нет учебных материалов.</div>}<footer className="readerFooter"><button className="btn ghost" disabled={currentIndex === 0} onClick={() => selectLesson(lessons[currentIndex - 1].lesson.id)}>← Назад</button><button className="btn primary" onClick={complete}>{currentIndex === lessons.length - 1 ? "Завершить курс ✓" : "Завершить и продолжить →"}</button></footer></> : <div className="courseEmpty"><h2>В курсе пока нет уроков</h2></div>}</article></div></main>;
}
