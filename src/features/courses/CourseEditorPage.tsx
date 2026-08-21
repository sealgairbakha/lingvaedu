import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import { supabase } from "../../lib/supabase";
import { useCourses } from "./CourseProvider";
import { uid, type BlockKind, type Course, type LessonBlock } from "./types";

const palette: {
  kind: BlockKind;
  title: string;
  hint: string;
}[] = [
  { kind: "text", title: "Текст", hint: "Текст и инструкции" },
  {
    kind: "video",
    title: "Видео",
    hint: "YouTube, MP4, WebM и другие форматы",
  },
  {
    kind: "audio",
    title: "Аудио",
    hint: "MP3, WAV, OGG и другие форматы",
  },
  {
    kind: "quiz",
    title: "Задание",
    hint: "Вопрос и варианты ответов",
  },
  { kind: "html", title: "HTML-код", hint: "Встраиваемый HTML" },
  {
    kind: "file",
    title: "Файл",
    hint: "Ссылка на PDF, PPT или документ",
  },
];

function BlockIcon({ kind }: { kind: BlockKind }) {
  const normalized = kind === "media" ? "video" : kind;
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {normalized === "text" && <path d="M6 5h12M6 9h8M6 13h12M6 17h9" />}
      {normalized === "video" && (
        <>
          <rect x="3.5" y="5" width="17" height="14" rx="3" />
          <path d="m10 9 5 3-5 3Z" />
        </>
      )}
      {normalized === "audio" && (
        <>
          <path d="M9 18V7l8-2v11" />
          <circle cx="6.5" cy="18" r="2.5" />
          <circle cx="14.5" cy="16" r="2.5" />
        </>
      )}
      {normalized === "quiz" && (
        <>
          <path d="m5 12 4 4L19 6" />
          <path d="M5 5h5M14 19h5" />
        </>
      )}
      {normalized === "html" && (
        <>
          <path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16" />
        </>
      )}
      {normalized === "file" && (
        <>
          <path d="M6 3.5h8l4 4V20H6Z" />
          <path d="M14 3.5V8h4M12 11v6M9.5 14.5 12 17l2.5-2.5" />
        </>
      )}
    </svg>
  );
}

function hideNativeDragImage(dataTransfer: DataTransfer) {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  dataTransfer.setDragImage(canvas, 0, 0);
}

type DragVisual = {
  kind: BlockKind;
  title: string;
  hint: string;
  x: number;
  y: number;
  offsetX: number;
  offsetY: number;
  sourceX: number;
  sourceY: number;
  width: number;
  returning?: boolean;
};
const makeBlock = (kind: BlockKind): LessonBlock => ({
  id: uid(),
  kind,
  title: palette.find((x) => x.kind === kind)!.title,
  content:
    kind === "quiz"
      ? "Какой вариант правильный?\nПравильный ответ\nДругой ответ"
      : "",
});
const courseColors = [
  { value: "purple", label: "Фиолетовый" },
  { value: "blue", label: "Синий" },
  { value: "green", label: "Зелёный" },
  { value: "orange", label: "Оранжевый" },
  { value: "pink", label: "Розовый" },
  { value: "dark", label: "Тёмный" },
] as const;

export function CourseEditorPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { canEditCourses, user } = useAuth();
  const store = useCourses();
  const source = store.courses.find((x) => x.id === params.get("course"));
  const savedCourseRef = useRef<Course | null>(
    source ? structuredClone(source) : null,
  );
  const colorPickerRef = useRef<HTMLDetailsElement>(null);
  const blockPaletteRef = useRef<HTMLElement>(null);
  const [course, setCourse] = useState<Course | null>(source || null);
  const [moduleId, setModuleId] = useState(source?.modules[0]?.id || "");
  const [lessonId, setLessonId] = useState(
    source?.modules[0]?.lessons[0]?.id || "",
  );
  const [selected, setSelected] = useState("");
  const [dragging, setDragging] = useState<string | null>(null);
  const [paletteDragging, setPaletteDragging] = useState<BlockKind | null>(
    null,
  );
  const [paletteDropActive, setPaletteDropActive] = useState(false);
  const [dragVisual, setDragVisual] = useState<DragVisual | null>(null);
  const dragDroppedRef = useRef(false);
  const [dropTarget, setDropTarget] = useState<{
    id: string;
    edge: "before" | "after";
  } | null>(null);
  const [saved, setSaved] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [preview, setPreview] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<"tree" | "blocks" | null>(
    null,
  );
  const [paletteWidth, setPaletteWidth] = useState(() =>
    Math.min(
      520,
      Math.max(
        340,
        Number(localStorage.getItem("lingvaedu-editor-palette-width")) || 360,
      ),
    ),
  );
  const [paletteResize, setPaletteResize] = useState<{
    startX: number;
    startWidth: number;
  } | null>(null);
  const [treeWidth, setTreeWidth] = useState(() =>
    Math.min(
      420,
      Math.max(
        210,
        Number(localStorage.getItem("lingvaedu-editor-tree-width")) || 250,
      ),
    ),
  );
  const [treeResize, setTreeResize] = useState<{
    startX: number;
    startWidth: number;
  } | null>(null);
  useEffect(() => {
    if (!paletteResize) return;
    const clamp = (value: number) => Math.min(520, Math.max(340, value));
    const move = (event: PointerEvent) =>
      setPaletteWidth(
        clamp(paletteResize.startWidth + paletteResize.startX - event.clientX),
      );
    const stop = (event: PointerEvent) => {
      const width = clamp(
        paletteResize.startWidth + paletteResize.startX - event.clientX,
      );
      setPaletteWidth(width);
      localStorage.setItem("lingvaedu-editor-palette-width", String(width));
      setPaletteResize(null);
    };
    document.body.classList.add("resizingEditorPalette");
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop, { once: true });
    return () => {
      document.body.classList.remove("resizingEditorPalette");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };
  }, [paletteResize]);
  useEffect(() => {
    if (!treeResize) return;
    const clamp = (value: number) => Math.min(420, Math.max(210, value));
    const move = (event: PointerEvent) =>
      setTreeWidth(
        clamp(treeResize.startWidth + event.clientX - treeResize.startX),
      );
    const stop = (event: PointerEvent) => {
      const width = clamp(
        treeResize.startWidth + event.clientX - treeResize.startX,
      );
      setTreeWidth(width);
      localStorage.setItem("lingvaedu-editor-tree-width", String(width));
      setTreeResize(null);
    };
    document.body.classList.add("resizingEditorTree");
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop, { once: true });
    return () => {
      document.body.classList.remove("resizingEditorTree");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };
  }, [treeResize]);
  useEffect(() => {
    if (mobilePanel !== "blocks") return;
    const frame = window.requestAnimationFrame(() => {
      const panel = blockPaletteRef.current;
      const header = panel?.querySelector<HTMLElement>(".paletteHeader");
      if (panel && header)
        panel.scrollTo({
          top: Math.max(0, header.offsetTop - 14),
          behavior: "smooth",
        });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [mobilePanel]);
  useEffect(() => {
    if (!dragging && !paletteDragging) return;
    const followPointer = (event: DragEvent) => {
      if (!event.clientX && !event.clientY) return;
      setDragVisual((current) =>
        current && !current.returning
          ? { ...current, x: event.clientX, y: event.clientY }
          : current,
      );
    };
    window.addEventListener("dragover", followPointer);
    return () => window.removeEventListener("dragover", followPointer);
  }, [dragging, paletteDragging]);
  useEffect(() => {
    if (course || !source) return;
    const timer = window.setTimeout(() => {
      setCourse(source);
      savedCourseRef.current = structuredClone(source);
      setModuleId(source.modules[0]?.id || "");
      setLessonId(source.modules[0]?.lessons[0]?.id || "");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [course, source]);
  const module =
    course?.modules.find((x) => x.id === moduleId) || course?.modules[0];
  const lesson =
    module?.lessons.find((x) => x.id === lessonId) || module?.lessons[0];
  const block = lesson?.blocks.find((x) => x.id === selected);
  const mutate = (fn: (draft: Course) => Course) => {
    if (course) {
      setCourse(fn(structuredClone(course)));
      setSaved(false);
    }
  };
  const updateLesson = (patch: object) =>
    mutate((c) => ({
      ...c,
      modules: c.modules.map((m) =>
        m.id === module?.id
          ? {
              ...m,
              lessons: m.lessons.map((l) =>
                l.id === lesson?.id ? { ...l, ...patch } : l,
              ),
            }
          : m,
      ),
    }));
  const updateBlocks = (blocks: LessonBlock[]) => updateLesson({ blocks });
  const startDragVisual = (
    element: HTMLElement,
    kind: BlockKind,
    title: string,
    hint: string,
    clientX: number,
    clientY: number,
  ) => {
    const rect = element.getBoundingClientRect();
    dragDroppedRef.current = false;
    setDragVisual({
      kind,
      title,
      hint,
      x: clientX,
      y: clientY,
      offsetX: rect.width / 2,
      offsetY: rect.height / 2,
      sourceX: rect.left,
      sourceY: rect.top,
      width: rect.width,
    });
  };
  const completeDragDrop = () => {
    dragDroppedRef.current = true;
    setDragVisual(null);
  };
  const finishDragVisual = () => {
    if (dragDroppedRef.current) {
      dragDroppedRef.current = false;
      setDragVisual(null);
      return;
    }
    setDragVisual((current) =>
      current
        ? {
            ...current,
            x: current.sourceX + current.offsetX,
            y: current.sourceY + current.offsetY,
            returning: true,
          }
        : null,
    );
    window.setTimeout(() => setDragVisual(null), 280);
  };
  const addModule = () =>
    mutate((c) => {
      const id = uid(),
        lid = uid();
      setModuleId(id);
      setLessonId(lid);
      return {
        ...c,
        modules: [
          ...c.modules,
          {
            id,
            title: `Модуль ${c.modules.length + 1}`,
            lessons: [
              {
                id: lid,
                title: "Новый урок",
                description: "",
                timeLimit: 0,
                attempts: 0,
                blocks: [],
              },
            ],
          },
        ],
      };
    });
  const addLesson = () => {
    if (!module) return;
    const id = uid();
    setLessonId(id);
    mutate((c) => ({
      ...c,
      modules: c.modules.map((m) =>
        m.id === module.id
          ? {
              ...m,
              lessons: [
                ...m.lessons,
                {
                  id,
                  title: "Новый урок",
                  description: "",
                  timeLimit: 0,
                  attempts: 0,
                  blocks: [],
                },
              ],
            }
          : m,
      ),
    }));
  };
  const addBlock = (kind: BlockKind) => {
    const b = makeBlock(kind);
    updateBlocks([...(lesson?.blocks || []), b]);
    setSelected(b.id);
  };
  const dropPaletteBlock = (
    kind: BlockKind,
    targetId?: string,
    edge: "before" | "after" = "after",
  ) => {
    if (!lesson) return;
    const blockToAdd = makeBlock(kind);
    const next = [...lesson.blocks];
    const targetIndex = targetId
      ? next.findIndex((item) => item.id === targetId)
      : -1;
    const insertIndex =
      targetIndex < 0 ? next.length : targetIndex + (edge === "after" ? 1 : 0);
    next.splice(insertIndex, 0, blockToAdd);
    updateBlocks(next);
    setSelected(blockToAdd.id);
  };
  const reorder = (
    fromId: string,
    targetId: string,
    edge: "before" | "after",
  ) => {
    if (!lesson || fromId === targetId) return;
    const next = [...lesson.blocks];
    const from = next.findIndex((x) => x.id === fromId);
    const target = next.findIndex((x) => x.id === targetId);
    if (from < 0 || target < 0) return;
    const [item] = next.splice(from, 1);
    const insert =
      next.findIndex((x) => x.id === targetId) + (edge === "after" ? 1 : 0);
    next.splice(insert, 0, item);
    updateBlocks(next);
  };
  const uploadMedia = async (file: File) => {
    if (!block || !lesson || !course || !supabase || !user) return;
    setUploading(true);
    setUploadError("");
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const path = `${user.id}/${course.id}/${uid()}-${safeName}`;
      const { error } = await supabase.storage
        .from("course-media")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("course-media").getPublicUrl(path);
      updateBlocks(
        lesson.blocks.map((x) =>
          x.id === block.id ? { ...x, content: data.publicUrl } : x,
        ),
      );
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Не удалось загрузить файл",
      );
    } finally {
      setUploading(false);
    }
  };
  const save = async () => {
    if (course && !saved && !saving) {
      setSaving(true);
      try {
        await store.saveCourse(course);
        savedCourseRef.current = structuredClone(course);
        setSaved(true);
      } finally {
        setSaving(false);
      }
    }
  };
  const cancelChanges = () => {
    const snapshot = savedCourseRef.current;
    if (!snapshot || saving) return;
    const restored = structuredClone(snapshot);
    const activeModule =
      restored.modules.find((item) => item.id === moduleId) ||
      restored.modules[0];
    const activeLesson =
      activeModule?.lessons.find((item) => item.id === lessonId) ||
      activeModule?.lessons[0];
    setCourse(restored);
    setModuleId(activeModule?.id || "");
    setLessonId(activeLesson?.id || "");
    setSelected("");
    setUploadError("");
    setSaved(true);
  };
  const rendered = useMemo(() => lesson?.blocks || [], [lesson?.blocks]);
  if (!canEditCourses)
    return (
      <main className="content">
        <div className="courseEmpty">
          <h2>Нет доступа к редактору</h2>
          <button className="btn primary" onClick={() => navigate("/courses")}>
            К курсам
          </button>
        </div>
      </main>
    );
  if (!course)
    return (
      <main className="content">
        <div className="courseEmpty">
          <h2>Курс не найден</h2>
          <button className="btn primary" onClick={() => navigate("/courses")}>
            К списку курсов
          </button>
        </div>
      </main>
    );
  return (
    <main className="editorPage courseEditor fade">
      <div className="editorTop">
        <button className="backBtn" onClick={() => navigate("/courses")}>
          ←
        </button>
        <div className="courseIdentity">
          <small>НАЗВАНИЕ КУРСА</small>
          <input
            aria-label="Название курса"
            className="courseTitleInput"
            value={course.title}
            placeholder="Введите название курса"
            onChange={(e) => mutate((c) => ({ ...c, title: e.target.value }))}
          />
          <b>{lesson?.title || "Добавьте урок"}</b>
        </div>
        <div className="editorPanelToggles">
          <button
            type="button"
            className={mobilePanel === "tree" ? "active" : ""}
            aria-pressed={mobilePanel === "tree"}
            onClick={() =>
              setMobilePanel((current) => (current === "tree" ? null : "tree"))
            }
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 6h14M5 12h14M5 18h14" />
            </svg>
            <span>Содержание</span>
          </button>
          <button
            type="button"
            className={mobilePanel === "blocks" ? "active" : ""}
            aria-pressed={mobilePanel === "blocks"}
            onClick={() =>
              setMobilePanel((current) =>
                current === "blocks" ? null : "blocks",
              )
            }
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="4" y="4" width="6" height="6" rx="1" />
              <rect x="14" y="4" width="6" height="6" rx="1" />
              <rect x="4" y="14" width="6" height="6" rx="1" />
              <path d="M17 14v6M14 17h6" />
            </svg>
            <span>Блоки</span>
          </button>
        </div>
        <div className="saveState">
          <i className={saved ? "saved" : ""} />
          {saving
            ? "Сохраняем изменения…"
            : saved
              ? "Все изменения сохранены"
              : "Есть несохранённые изменения"}
        </div>
        <button
          className={`btn previewUndoButton ${saved ? "previewMode" : "undoMode"}`}
          disabled={saving}
          onClick={() => (saved ? setPreview(true) : cancelChanges())}
          aria-label={
            saved ? "Открыть предпросмотр" : "Отменить несохранённые изменения"
          }
        >
          <span key={saved ? "preview" : "undo"}>
            {saved ? "Предпросмотр" : "Отменить"}
          </span>
        </button>
        <button
          className="btn primary saveCourseButton"
          disabled={saved || saving}
          onClick={save}
        >
          {saving ? "Сохраняем…" : saved ? "Сохранено" : "Сохранить"}
        </button>
      </div>
      {mobilePanel && (
        <button
          type="button"
          className="editorPanelScrim"
          aria-label="Закрыть боковую панель редактора"
          onClick={() => setMobilePanel(null)}
        />
      )}
      <div
        className="editorLayout"
        style={
          {
            "--palette-width": `${paletteWidth}px`,
            "--tree-width": `${treeWidth}px`,
          } as CSSProperties
        }
      >
        <aside
          className={`lessonTree ${mobilePanel === "tree" ? "editorPanelOpen" : ""}`}
        >
          <div className="treeHead">
            <span>СОДЕРЖАНИЕ КУРСА</span>
            <button onClick={addModule}>＋</button>
          </div>
          {course.modules.map((m, mi) => (
            <div className="module" key={m.id}>
              <div className="moduleEdit">
                <small>МОДУЛЬ {mi + 1}</small>
                <input
                  value={m.title}
                  onChange={(e) =>
                    mutate((c) => ({
                      ...c,
                      modules: c.modules.map((x) =>
                        x.id === m.id ? { ...x, title: e.target.value } : x,
                      ),
                    }))
                  }
                />
                <button
                  aria-label={`Добавить урок в модуль «${m.title}»`}
                  title="Добавить урок"
                  onClick={() => {
                    setModuleId(m.id);
                    addLesson();
                  }}
                >
                  ＋
                </button>
              </div>
              {m.lessons.map((l, li) => (
                <button
                  key={l.id}
                  className={`treeLesson ${lesson?.id === l.id ? "active" : ""}`}
                  onClick={() => {
                    setModuleId(m.id);
                    setLessonId(l.id);
                    setSelected("");
                    setMobilePanel(null);
                  }}
                >
                  <i>{li + 1}</i>
                  <span>
                    {l.title}
                    <small>{l.blocks.length} блоков</small>
                  </span>
                </button>
              ))}
            </div>
          ))}
          <button className="addModule" onClick={addModule}>
            ＋ Добавить модуль
          </button>
        </aside>
        <div
          className="paletteResizer treeResizer"
          role="separator"
          aria-orientation="vertical"
          aria-label="Изменить ширину панели содержания курса"
          title="Потяните, чтобы изменить ширину"
          onPointerDown={(event) => {
            event.preventDefault();
            setTreeResize({
              startX: event.clientX,
              startWidth: treeWidth,
            });
          }}
        >
          <span />
        </div>
        <section className="canvas">
          <div className="canvasHead">
            <div>
              <span>УРОК</span>
              <input
                value={lesson?.title || ""}
                onChange={(e) => updateLesson({ title: e.target.value })}
              />
              <textarea
                value={lesson?.description || ""}
                onChange={(e) => updateLesson({ description: e.target.value })}
                placeholder="Описание урока"
              />
            </div>
            <div className="lessonSettings">
              <label>
                Лимит, мин
                <input
                  type="number"
                  min="0"
                  value={lesson?.timeLimit || 0}
                  onChange={(e) => updateLesson({ timeLimit: +e.target.value })}
                />
              </label>
              <label>
                Попытки
                <input
                  type="number"
                  min="0"
                  value={lesson?.attempts || 0}
                  onChange={(e) => updateLesson({ attempts: +e.target.value })}
                />
              </label>
            </div>
          </div>
          <div
            className={`blockCanvas ${paletteDropActive ? "paletteDropActive" : ""}`}
            onDragOver={(e) => {
              if (
                !paletteDragging ||
                (e.target as HTMLElement).closest(".lessonBlock")
              )
                return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
              setPaletteDropActive(true);
              setDropTarget(null);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node))
                setPaletteDropActive(false);
            }}
            onDrop={(e) => {
              if (!paletteDragging) return;
              e.preventDefault();
              dropPaletteBlock(paletteDragging);
              completeDragDrop();
              setPaletteDragging(null);
              setPaletteDropActive(false);
              setDropTarget(null);
            }}
          >
            {lesson?.blocks.map((b) => (
              <article
                key={b.id}
                className={`lessonBlock ${selected === b.id ? "selected" : ""} ${dragging === b.id ? "dragging" : ""} ${dropTarget?.id === b.id && dragging !== b.id ? (dropTarget.edge === "before" ? "dropBefore" : "dropAfter") : ""}`}
                onClick={() => setSelected(b.id)}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = paletteDragging ? "copy" : "move";
                  const rect = e.currentTarget.getBoundingClientRect();
                  const edge =
                    e.clientY < rect.top + rect.height / 2 ? "before" : "after";
                  if (dropTarget?.id !== b.id || dropTarget.edge !== edge)
                    setDropTarget({ id: b.id, edge });
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node))
                    setDropTarget((current) =>
                      current?.id === b.id ? null : current,
                    );
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (dragging && dropTarget)
                    reorder(dragging, dropTarget.id, dropTarget.edge);
                  if (paletteDragging && dropTarget)
                    dropPaletteBlock(
                      paletteDragging,
                      dropTarget.id,
                      dropTarget.edge,
                    );
                  if ((dragging || paletteDragging) && dropTarget)
                    completeDragDrop();
                  setDragging(null);
                  setPaletteDragging(null);
                  setPaletteDropActive(false);
                  setDropTarget(null);
                }}
              >
                <span
                  className="drag"
                  draggable
                  title="Перетащить блок"
                  aria-label="Перетащить блок"
                  onDragStart={(e) => {
                    e.stopPropagation();
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", b.id);
                    hideNativeDragImage(e.dataTransfer);
                    const card = e.currentTarget.closest(".lessonBlock");
                    const descriptor = palette.find(
                      (item) =>
                        item.kind === (b.kind === "media" ? "video" : b.kind),
                    );
                    if (card instanceof HTMLElement) {
                      startDragVisual(
                        card,
                        b.kind,
                        b.title,
                        descriptor?.hint || "",
                        e.clientX,
                        e.clientY,
                      );
                    }
                    setDragging(b.id);
                  }}
                  onDragEnd={() => {
                    finishDragVisual();
                    setDragging(null);
                    setDropTarget(null);
                  }}
                >
                  ⋮⋮
                </span>
                <div
                  className={`blockGlyph ${b.kind === "media" ? "video" : b.kind}`}
                >
                  <BlockIcon kind={b.kind} />
                </div>
                <div>
                  <b>{b.title}</b>
                  <p>
                    {
                      palette.find(
                        (p) =>
                          p.kind === (b.kind === "media" ? "video" : b.kind),
                      )?.hint
                    }
                  </p>
                </div>
                <div className="blockActions">
                  <button
                    aria-label="Удалить блок"
                    title="Удалить блок"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateBlocks(lesson.blocks.filter((x) => x.id !== b.id));
                    }}
                  >
                    ×
                  </button>
                </div>
              </article>
            ))}
            {!lesson?.blocks.length && (
              <div className="emptyCanvas">
                Перетащите сюда блок из правой панели или нажмите на него.
              </div>
            )}
          </div>
        </section>
        <div
          className="paletteResizer"
          role="separator"
          aria-orientation="vertical"
          aria-label="Изменить ширину панели блоков"
          title="Потяните, чтобы изменить ширину"
          onPointerDown={(event) => {
            event.preventDefault();
            setPaletteResize({
              startX: event.clientX,
              startWidth: paletteWidth,
            });
          }}
        >
          <span />
        </div>
        <aside
          ref={blockPaletteRef}
          className={`blockPalette ${mobilePanel === "blocks" ? "editorPanelOpen" : ""}`}
        >
          <section className="coursePanelSettings">
            <div className="paletteHeader courseSettingsHeader">
              <span>Настройки</span>
              <p>Основные параметры курса</p>
            </div>
            <label>
              <span>Язык курса</span>
              <select
                className="courseLanguageSelect"
                aria-label="Язык курса"
                value={course.language}
                onChange={(e) =>
                  mutate((c) => ({ ...c, language: e.target.value }))
                }
              >
                <option>Английский</option>
                <option>Русский</option>
                <option>Казахский</option>
                <option>Корейский</option>
                <option>Китайский</option>
                <option>Японский</option>
              </select>
            </label>
            <div className="courseColorField">
              <span>Цвет обложки</span>
              <details ref={colorPickerRef} className="courseColorPicker">
                <summary>
                  <i data-color={course.color} />
                  <b>
                    {courseColors.find((item) => item.value === course.color)
                      ?.label || "Выберите цвет"}
                  </b>
                  <em>⌄</em>
                </summary>
                <div className="courseColorGrid">
                  {courseColors.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      data-color={item.value}
                      className={course.color === item.value ? "active" : ""}
                      aria-label={item.label}
                      aria-pressed={course.color === item.value}
                      onClick={() => {
                        mutate((c) => ({ ...c, color: item.value }));
                        if (colorPickerRef.current)
                          colorPickerRef.current.open = false;
                      }}
                    >
                      <i />
                      <span>{course.color === item.value ? "✓" : ""}</span>
                    </button>
                  ))}
                </div>
              </details>
            </div>
            <label>
              <span>Статус</span>
              <select
                className="publishSelect"
                aria-label="Статус курса"
                value={course.status}
                onChange={(e) =>
                  mutate((c) => ({
                    ...c,
                    status: e.target.value as Course["status"],
                  }))
                }
              >
                <option value="draft">Черновик</option>
                <option value="published">Опубликован</option>
                <option value="archived">Архив</option>
              </select>
            </label>
            <div className="courseStylePreview">
              <small>Превью карточки</small>
              <div className="courseStylePreviewCard">
                <div
                  className="courseStylePreviewCover"
                  data-color={course.color}
                >
                  <span>{course.language.toUpperCase()}</span>
                  <i />
                </div>
                <div>
                  <em
                    className={
                      course.status === "published" ? "published" : "draft"
                    }
                  >
                    ●{" "}
                    {course.status === "published"
                      ? "Опубликован"
                      : course.status === "archived"
                        ? "Архив"
                        : "Черновик"}
                  </em>
                  <b>{course.title || "Название курса"}</b>
                </div>
              </div>
            </div>
          </section>
          <div className="paletteHeader">
            <span>{block ? "Настройка блока" : "Блоки"}</span>
            <p>
              {block
                ? "Изменения применяются сразу"
                : "Перетащите блок в урок или нажмите на него"}
            </p>
          </div>
          {block ? (
            <div className="blockInspector">
              <label>
                Название
                <input
                  value={block.title}
                  onChange={(e) =>
                    updateBlocks(
                      lesson!.blocks.map((x) =>
                        x.id === block.id ? { ...x, title: e.target.value } : x,
                      ),
                    )
                  }
                />
              </label>
              <label>
                {block.kind === "video" || block.kind === "media"
                  ? "Ссылка на YouTube или видео"
                  : block.kind === "audio"
                    ? "Ссылка на аудио"
                    : "Содержимое"}
                {block.kind === "text" ||
                block.kind === "quiz" ||
                block.kind === "html" ? (
                  <textarea
                    rows={12}
                    value={block.content}
                    onChange={(e) =>
                      updateBlocks(
                        lesson!.blocks.map((x) =>
                          x.id === block.id
                            ? { ...x, content: e.target.value }
                            : x,
                        ),
                      )
                    }
                  />
                ) : (
                  <input
                    type="url"
                    placeholder={
                      block.kind === "audio"
                        ? "https://.../audio.mp3"
                        : "https://youtube.com/watch?v=..."
                    }
                    value={block.content}
                    onChange={(e) =>
                      updateBlocks(
                        lesson!.blocks.map((x) =>
                          x.id === block.id
                            ? { ...x, content: e.target.value }
                            : x,
                        ),
                      )
                    }
                  />
                )}
              </label>
              {(block.kind === "video" ||
                block.kind === "media" ||
                block.kind === "audio") && (
                <div className="mediaUploader">
                  <span>ИЛИ ЗАГРУЗИТЕ ФАЙЛ</span>
                  <label className={uploading ? "uploading" : ""}>
                    ↥{" "}
                    <b>
                      {uploading
                        ? "Загрузка…"
                        : block.kind === "audio"
                          ? "Выбрать аудиофайл"
                          : "Выбрать видеофайл"}
                    </b>
                    <small>
                      {block.kind === "audio"
                        ? "MP3, WAV или OGG"
                        : "MP4, WebM или MOV"}
                    </small>
                    <input
                      type="file"
                      disabled={uploading}
                      accept={
                        block.kind === "audio"
                          ? "audio/mpeg,audio/wav,audio/ogg,audio/mp4"
                          : "video/mp4,video/webm,video/quicktime"
                      }
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void uploadMedia(file);
                      }}
                    />
                  </label>
                  {uploadError && <p className="uploadError">{uploadError}</p>}
                  {block.content && (
                    <p className="mediaReady">✓ Материал добавлен</p>
                  )}
                </div>
              )}
              <button className="btn ghost" onClick={() => setSelected("")}>
                Готово
              </button>
            </div>
          ) : (
            palette.map((p) => (
              <button
                key={p.kind}
                className={paletteDragging === p.kind ? "paletteDragging" : ""}
                draggable
                onClick={() => addBlock(p.kind)}
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "copy";
                  e.dataTransfer.setData(
                    "application/x-lingva-block-kind",
                    p.kind,
                  );
                  hideNativeDragImage(e.dataTransfer);
                  startDragVisual(
                    e.currentTarget,
                    p.kind,
                    p.title,
                    p.hint,
                    e.clientX,
                    e.clientY,
                  );
                  setSelected("");
                  setPaletteDragging(p.kind);
                }}
                onDragEnd={() => {
                  finishDragVisual();
                  setPaletteDragging(null);
                  setPaletteDropActive(false);
                  setDropTarget(null);
                }}
                title={`Перетащите блок «${p.title}» в урок или нажмите, чтобы добавить`}
              >
                <i className={p.kind}>
                  <BlockIcon kind={p.kind} />
                </i>
                <span>
                  <b>{p.title}</b>
                  <small>{p.hint}</small>
                </span>
                <span className="paletteDragHint" aria-hidden="true">
                  ⋮⋮
                </span>
                <em>＋</em>
              </button>
            ))
          )}
        </aside>
      </div>
      {dragVisual && (
        <div
          className={`editorFloatingDrag ${dragVisual.returning ? "returning" : ""}`}
          style={
            {
              left: dragVisual.x - dragVisual.offsetX,
              top: dragVisual.y - dragVisual.offsetY,
              width: dragVisual.width,
            } as CSSProperties
          }
          aria-hidden="true"
        >
          <span className="drag">⋮⋮</span>
          <i
            className={`blockGlyph ${dragVisual.kind === "media" ? "video" : dragVisual.kind}`}
          >
            <BlockIcon kind={dragVisual.kind} />
          </i>
          <span>
            <b>{dragVisual.title}</b>
            <small>{dragVisual.hint}</small>
          </span>
        </div>
      )}
      {preview && (
        <div className="courseModal" onClick={() => setPreview(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <button className="modalClose" onClick={() => setPreview(false)}>
              ×
            </button>
            <small>{course.title}</small>
            <h1>{lesson?.title}</h1>
            <p>{lesson?.description}</p>
            {rendered.map((b) => (
              <section className="previewBlock" key={b.id}>
                <h3>{b.title}</h3>
                {b.kind === "html" ? (
                  <div className="htmlPreview">
                    HTML-код скрыт в безопасном предпросмотре
                  </div>
                ) : b.kind === "audio" ? (
                  <audio controls src={b.content} />
                ) : b.kind === "video" || b.kind === "media" ? (
                  <video className="lessonVideo" controls src={b.content} />
                ) : b.kind === "file" ? (
                  <a href={b.content} target="_blank" rel="noreferrer">
                    Открыть материал →
                  </a>
                ) : b.kind === "quiz" ? (
                  <div>
                    {b.content.split("\n").map((x, i) =>
                      i === 0 ? (
                        <b key={i}>{x}</b>
                      ) : (
                        <label key={i}>
                          <input type="radio" name={b.id} />
                          {x}
                        </label>
                      ),
                    )}
                  </div>
                ) : (
                  <p>{b.content}</p>
                )}
              </section>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
