import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import { supabase } from "../../lib/supabase";
import { useCourses } from "./CourseProvider";
import { LessonBlockView } from "./CoursePlayerPage";
import { RichTextEditor } from "./RichTextEditor";
import { TaskBlockEditor } from "./TaskBlockEditor";
import { uid, type BlockKind, type Course, type LessonBlock } from "./types";

const textFontOptions = [
  { value: "onest", label: "Onest", family: '"Onest Variable", Onest, sans-serif' },
  { value: "serif", label: "Книжный", family: 'Georgia, "Times New Roman", serif' },
  { value: "rounded", label: "Округлый", family: '"Trebuchet MS", Arial, sans-serif' },
  { value: "mono", label: "Моно", family: '"Cascadia Code", Consolas, monospace' },
] as const;

const textFontFamily = (
  value?: NonNullable<LessonBlock["textStyle"]>["fontFamily"],
) => textFontOptions.find((option) => option.value === value)?.family || textFontOptions[0].family;

function TextAlignIcon({ alignment }: { alignment: "left" | "center" | "right" }) {
  const lines = alignment === "left"
    ? [[3, 21], [3, 16], [3, 21], [3, 13]]
    : alignment === "center"
      ? [[3, 21], [6, 18], [3, 21], [8, 16]]
      : [[3, 21], [8, 21], [3, 21], [11, 21]];
  return <svg className="textAlignIcon" viewBox="0 0 24 24" aria-hidden="true">
    {lines.map(([start, end], index) => <path key={index} d={`M${start} ${5 + index * 5}H${end}`} />)}
  </svg>;
}

const palette: {
  kind: BlockKind;
  title: string;
  hint: string;
  group: "Контент" | "Медиа" | "Задания";
}[] = [
  {
    kind: "text",
    title: "Текст",
    hint: "Текст и инструкции",
    group: "Контент",
  },
  {
    kind: "html",
    title: "HTML-код",
    hint: "Встраиваемый HTML",
    group: "Контент",
  },
  {
    kind: "file",
    title: "Файл",
    hint: "Ссылка на PDF, PPT или документ",
    group: "Контент",
  },
  {
    kind: "video",
    title: "Видео",
    hint: "YouTube, MP4, WebM и другие форматы",
    group: "Медиа",
  },
  {
    kind: "audio",
    title: "Аудио",
    hint: "MP3, WAV, OGG и другие форматы",
    group: "Медиа",
  },
  {
    kind: "image",
    title: "Фото",
    hint: "PNG, JPG, WebP или вставка через Ctrl + V",
    group: "Медиа",
  },
  {
    kind: "drag-words",
    title: "Перетащить слова",
    hint: "Вставить слова в пропуски",
    group: "Задания",
  },
  {
    kind: "select-words",
    title: "Выбрать слово",
    hint: "Выбор правильного слова из списка",
    group: "Задания",
  },
  {
    kind: "fill-blank",
    title: "Вписать слово",
    hint: "Самостоятельный ввод ответа",
    group: "Задания",
  },
  {
    kind: "quiz",
    title: "Выбрать ответ",
    hint: "Один правильный вариант ответа",
    group: "Задания",
  },
  {
    kind: "match",
    title: "Соединить слова",
    hint: "Сопоставить пары слов или определений",
    group: "Задания",
  },
  {
    kind: "true-false",
    title: "Верно или неверно",
    hint: "Определить истинность утверждений",
    group: "Задания",
  },
];

const taskKinds: BlockKind[] = [
  "drag-words",
  "select-words",
  "fill-blank",
  "quiz",
  "match",
  "true-false",
];
const isTaskKind = (kind: BlockKind) => taskKinds.includes(kind);

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
      {normalized === "image" && (
        <>
          <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
          <circle cx="9" cy="9" r="1.7" />
          <path d="m5.5 17 4.2-4.2 2.7 2.7 2.3-2.3 3.8 3.8" />
        </>
      )}
      {isTaskKind(normalized) && (
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

function UploadIcon() {
  return (
    <span className="mediaUploadIcon" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path d="M7 18.5H6a4 4 0 0 1-.25-8A6.25 6.25 0 0 1 17.8 9a4.75 4.75 0 0 1 .2 9.5h-1" />
        <path d="M12 17V9m0 0-3 3m3-3 3 3" />
      </svg>
    </span>
  );
}

function DragHandleIcon() {
  return (
    <svg viewBox="0 0 20 20">
      <circle cx="7" cy="5" r="1" />
      <circle cx="13" cy="5" r="1" />
      <circle cx="7" cy="10" r="1" />
      <circle cx="13" cy="10" r="1" />
      <circle cx="7" cy="15" r="1" />
      <circle cx="13" cy="15" r="1" />
    </svg>
  );
}

function AddBlockIcon() {
  return (
    <svg viewBox="0 0 20 20">
      <path d="M10 5v10M5 10h10" />
    </svg>
  );
}

function RemoveIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M5.5 5.5l9 9M14.5 5.5l-9 9" />
    </svg>
  );
}

const courseFileAccept = [
  ".pdf",
  ".doc",
  ".docx",
  ".ppt",
  ".pptx",
  ".xls",
  ".xlsx",
  ".txt",
  ".csv",
  ".zip",
].join(",");

const supportedCourseFileExtensions = new Set(
  courseFileAccept.split(","),
);

function isSupportedCourseFile(file: File) {
  const extension = file.name.match(/\.[^.]+$/)?.[0]?.toLowerCase() || "";
  return supportedCourseFileExtensions.has(extension);
}

function formatFileSize(bytes?: number) {
  if (!bytes) return "Размер не указан";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} МБ`;
}

function fileNameFromUrl(url: string) {
  if (!url) return undefined;
  try {
    return decodeURIComponent(new URL(url).pathname.split("/").pop() || "Файл");
  } catch {
    return "Прикреплённый файл";
  }
}

function FileAttachmentPreview({
  block,
  onRemove,
}: {
  block: LessonBlock;
  onRemove: () => void;
}) {
  const extension =
    block.fileName?.match(/\.([^.]+)$/)?.[1]?.toUpperCase() || "ФАЙЛ";
  return (
    <div className="fileAttachmentPreview">
      <span className="fileAttachmentIcon" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M6 3.5h8l4 4V20H6Z" />
          <path d="M14 3.5V8h4" />
        </svg>
        <small>{extension.slice(0, 4)}</small>
      </span>
      <span className="fileAttachmentInfo">
        <b>{block.fileName || "Прикреплённый файл"}</b>
        <small>{formatFileSize(block.fileSize)}</small>
      </span>
      <a href={block.content} target="_blank" rel="noreferrer">
        Открыть
      </a>
      <button type="button" aria-label="Удалить прикреплённый файл" onClick={onRemove}>
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path d="m6 6 8 8M14 6l-8 8" />
        </svg>
      </button>
    </div>
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
const taskTemplates: Partial<Record<BlockKind, string>> = {
  "drag-words":
    "He went to work [despite] being ill.\nJake couldn't sleep [because] he was tired.",
  "select-words":
    "I've been off work [because of|therefore] this cough.\nSales have increased. [Therefore|Because] we need new employees.",
  "fill-blank":
    "I'm not energetic and [so] is my brother.\nShe has never been to London and [neither] has her sister.",
  quiz: "Choose the best answer\n*Correct answer\nWrong answer\nAnother answer",
  match: "makes a lot of profit = lucrative\na baby plant = a shoot\nnot affected by something = resistant",
  "true-false":
    "The lesson has already started | true\nEnglish is written from right to left | false",
};

const makeBlock = (kind: BlockKind): LessonBlock => ({
  id: uid(),
  kind,
  title: palette.find((x) => x.kind === kind)!.title,
  content: taskTemplates[kind] || "",
});
const getBlockImages = (block: LessonBlock) =>
  block.images?.length
    ? block.images
    : block.content
      ? [block.content]
      : [];
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
  const lessonDescriptionRef = useRef<HTMLTextAreaElement>(null);
  const [course, setCourse] = useState<Course | null>(source || null);
  const [moduleId, setModuleId] = useState(source?.modules[0]?.id || "");
  const [lessonId, setLessonId] = useState(
    source?.modules[0]?.lessons[0]?.id || "",
  );
  const [selected, setSelected] = useState("");
  const [closingEditor, setClosingEditor] = useState("");
  const closeEditorTimerRef = useRef<number | null>(null);
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
  const [timerInputDigits, setTimerInputDigits] = useState<string | null>(null);
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
    return () => {
      if (closeEditorTimerRef.current !== null)
        window.clearTimeout(closeEditorTimerRef.current);
    };
  }, []);
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
    if (!selected) return;
    const frame = window.requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>(`[data-block-id="${selected}"]`)
        ?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [selected]);
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
  const totalTimeSeconds = Math.max(
    0,
    Math.round((lesson?.timeLimit || 0) * 60),
  );
  const totalHours = Math.floor(totalTimeSeconds / 3600);
  const totalMinutes = Math.floor((totalTimeSeconds % 3600) / 60);
  const totalSeconds = totalTimeSeconds % 60;
  const savedTimerDigits =
    `${totalHours}${String(totalMinutes).padStart(2, "0")}${String(totalSeconds).padStart(2, "0")}`.replace(
      /^0+(?=\d)/,
      "",
    );
  const currentTimerDigits = timerInputDigits ?? savedTimerDigits ?? "0";
  const timerValue = currentTimerDigits.padStart(5, "0");
  const timerDisplay = `${timerValue.slice(0, -4) || "0"}:${timerValue.slice(-4, -2)}:${timerValue.slice(-2)}`;
  useEffect(() => {
    const field = lessonDescriptionRef.current;
    if (!field) return;
    field.style.height = "0px";
    field.style.height = `${field.scrollHeight}px`;
  }, [lesson?.description, lesson?.id]);
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
  const updateBlock = (id: string, patch: Partial<LessonBlock>) => {
    if (!lesson) return;
    updateBlocks(
      lesson.blocks.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    );
  };
  const updateImageCollection = (block: LessonBlock, images: string[]) =>
    updateBlock(block.id, {
      images,
      content: images[0] || "",
      imageLayout: block.imageLayout || "grid",
    });
  const moveImage = (
    block: LessonBlock,
    fromIndex: number,
    direction: -1 | 1,
  ) => {
    const images = getBlockImages(block);
    const toIndex = fromIndex + direction;
    if (toIndex < 0 || toIndex >= images.length) return;
    const next = [...images];
    [next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]];
    updateImageCollection(block, next);
  };
  const updateTimerDigits = (rawValue: string) => {
    const digits = rawValue.replace(/\D/g, "").slice(-6) || "0";
    const normalized = digits.replace(/^0+(?=\d)/, "");
    const padded = normalized.padStart(5, "0");
    const hours = Number(padded.slice(0, -4)) || 0;
    const minutes = Number(padded.slice(-4, -2)) || 0;
    const seconds = Number(padded.slice(-2)) || 0;
    setTimerInputDigits(normalized);
    updateLesson({
      timeLimit: (hours * 3600 + minutes * 60 + seconds) / 60,
    });
  };
  const startDragVisual = (
    element: HTMLElement,
    kind: BlockKind,
    title: string,
    hint: string,
    clientX: number,
    clientY: number,
  ) => {
    const rect = element.getBoundingClientRect();
    const previewWidth = Math.min(
      rect.width,
      Math.max(240, Math.min(440, window.innerWidth - 32)),
    );
    dragDroppedRef.current = false;
    setDragVisual({
      kind,
      title,
      hint,
      x: clientX,
      y: clientY,
      offsetX: previewWidth / 2,
      offsetY: 36,
      sourceX: rect.left,
      sourceY: rect.top,
      width: previewWidth,
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
  const addLesson = (targetModuleId = module?.id) => {
    if (!targetModuleId) return;
    const id = uid();
    setModuleId(targetModuleId);
    setLessonId(id);
    mutate((c) => ({
      ...c,
      modules: c.modules.map((m) =>
        m.id === targetModuleId
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
  const removeLesson = (
    targetModuleId: string,
    targetLessonId: string,
    title: string,
  ) => {
    if (!course || !window.confirm(`Удалить урок «${title}»? Все блоки этого урока будут удалены.`))
      return;
    const orderedLessons = course.modules.flatMap((item) =>
      item.lessons.map((entry) => ({ moduleId: item.id, lesson: entry })),
    );
    const removedIndex = orderedLessons.findIndex(
      (entry) => entry.lesson.id === targetLessonId,
    );
    const nextCourse = {
      ...course,
      modules: course.modules.map((item) =>
        item.id === targetModuleId
          ? {
              ...item,
              lessons: item.lessons.filter((entry) => entry.id !== targetLessonId),
            }
          : item,
      ),
    };
    const remaining = nextCourse.modules.flatMap((item) =>
      item.lessons.map((entry) => ({ moduleId: item.id, lesson: entry })),
    );
    const next = remaining[Math.min(Math.max(removedIndex, 0), remaining.length - 1)];
    setModuleId(next?.moduleId || nextCourse.modules[0]?.id || "");
    setLessonId(next?.lesson.id || "");
    setSelected("");
    mutate(() => nextCourse);
  };
  const removeModule = (targetModuleId: string, title: string) => {
    if (!course) return;
    const target = course.modules.find((item) => item.id === targetModuleId);
    const lessonCount = target?.lessons.length || 0;
    if (
      !window.confirm(
        `Удалить модуль «${title}»${lessonCount ? ` и ${lessonCount} ${lessonCount === 1 ? "урок" : "урока"} внутри` : ""}?`,
      )
    )
      return;
    const removedIndex = course.modules.findIndex((item) => item.id === targetModuleId);
    const nextModules = course.modules.filter((item) => item.id !== targetModuleId);
    const nextModule =
      nextModules[Math.min(Math.max(removedIndex, 0), nextModules.length - 1)] ||
      nextModules[0];
    const nextModuleWithLesson =
      (nextModule?.lessons.length ? nextModule : null) ||
      nextModules.find((item) => item.lessons.length) ||
      nextModule;
    setModuleId(nextModuleWithLesson?.id || "");
    setLessonId(nextModuleWithLesson?.lessons[0]?.id || "");
    setSelected("");
    mutate((current) => ({ ...current, modules: nextModules }));
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
  const beginBlockPointerDrag = (
    event: ReactPointerEvent<HTMLElement>,
    block: LessonBlock,
  ) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const card = event.currentTarget.closest(".lessonBlock");
    if (!(card instanceof HTMLElement)) return;
    const descriptor = palette.find(
      (item) => item.kind === (block.kind === "media" ? "video" : block.kind),
    );
    startDragVisual(card, block.kind, block.title, descriptor?.hint || "", event.clientX, event.clientY);
    setDragging(block.id);
    document.body.classList.add("editorBlockPointerDragging");

    let activeTarget: { id: string; edge: "before" | "after" } | null = null;
    const canvas = card.closest(".canvas");
    const move = (pointerEvent: PointerEvent) => {
      setDragVisual((current) =>
        current ? { ...current, x: pointerEvent.clientX, y: pointerEvent.clientY } : current,
      );
      const hovered = document.elementFromPoint(pointerEvent.clientX, pointerEvent.clientY)?.closest(".lessonBlock");
      const group = hovered?.closest<HTMLElement>(".blockEditorGroup");
      const targetId = group?.dataset.blockId;
      if (hovered instanceof HTMLElement && targetId && targetId !== block.id) {
        const rect = hovered.getBoundingClientRect();
        activeTarget = {
          id: targetId,
          edge: pointerEvent.clientY < rect.top + rect.height / 2 ? "before" : "after",
        };
        setDropTarget(activeTarget);
      } else {
        activeTarget = null;
        setDropTarget(null);
      }
      if (canvas instanceof HTMLElement) {
        const bounds = canvas.getBoundingClientRect();
        if (pointerEvent.clientY < bounds.top + 72) canvas.scrollTop -= 14;
        if (pointerEvent.clientY > bounds.bottom - 72) canvas.scrollTop += 14;
      }
    };
    const cleanup = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", cancel);
      document.body.classList.remove("editorBlockPointerDragging");
    };
    const end = () => {
      cleanup();
      if (activeTarget) {
        reorder(block.id, activeTarget.id, activeTarget.edge);
        completeDragDrop();
      } else finishDragVisual();
      setDragging(null);
      setDropTarget(null);
    };
    const cancel = () => {
      activeTarget = null;
      end();
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerup", end, { once: true });
    window.addEventListener("pointercancel", cancel, { once: true });
  };
  const uploadAsset = async (
    targetBlock: LessonBlock,
    selectedFiles: File | File[],
  ) => {
    if (!lesson || !course || !supabase || !user) return;
    const files = Array.isArray(selectedFiles)
      ? selectedFiles
      : [selectedFiles];
    if (!files.length) return;
    setUploading(true);
    setUploadError("");
    try {
      const uploadedAssets: { url: string; file: File }[] = [];
      for (const file of files) {
        const validType =
          (targetBlock.kind === "image" && file.type.startsWith("image/")) ||
          (targetBlock.kind === "audio" && file.type.startsWith("audio/")) ||
          (targetBlock.kind === "file" && isSupportedCourseFile(file)) ||
          ((targetBlock.kind === "video" || targetBlock.kind === "media") &&
            file.type.startsWith("video/"));
        if (!validType)
          throw new Error(
            targetBlock.kind === "file"
              ? "Поддерживаются PDF, Word, PowerPoint, Excel, TXT, CSV и ZIP"
              : "Формат файла не соответствует выбранному блоку",
          );
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        const path = `${user.id}/${course.id}/${uid()}-${safeName}`;
        const { error } = await supabase.storage
          .from("course-media")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (error) throw error;
        const { data } = supabase.storage
          .from("course-media")
          .getPublicUrl(path);
        uploadedAssets.push({ url: data.publicUrl, file });
      }
      const uploadedUrls = uploadedAssets.map((asset) => asset.url);
      const uploadedFile = uploadedAssets[0];
      updateBlocks(
        lesson.blocks.map((x) =>
          x.id === targetBlock.id
            ? targetBlock.kind === "image"
              ? {
                  ...x,
                  content: getBlockImages(targetBlock)[0] || uploadedUrls[0],
                  images: [...getBlockImages(targetBlock), ...uploadedUrls],
                  imageLayout: targetBlock.imageLayout || "grid",
                }
              : targetBlock.kind === "file"
                ? {
                    ...x,
                    content: uploadedFile.url,
                    fileName: uploadedFile.file.name,
                    fileSize: uploadedFile.file.size,
                    fileType: uploadedFile.file.type,
                  }
                : { ...x, content: uploadedUrls[0] }
            : x,
        ),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Не удалось загрузить файл";
      setUploadError(
        /bucket not found/i.test(message)
          ? "Хранилище course-media не создано. Выполните миграцию 005_course_media_images.sql в Supabase."
          : message,
      );
    } finally {
      setUploading(false);
    }
  };
  const lessonSettingsEditor = (
    <div className="lessonSettings lessonSettingsSidebar">
      <div className="lessonSettingsTitle">
        <span className="lessonSettingsTitleIcon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="7.5" />
            <path d="M12 8v4l2.7 1.7M9 3h6" />
          </svg>
        </span>
        <span>ТАЙМЕР И ПОПЫТКИ</span>
      </div>
      <label className="lessonSettingField">
        <span className="lessonSettingIcon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="13" r="7" />
            <path d="M12 9v4l2.5 1.5M9 3h6" />
          </svg>
        </span>
        <span className="lessonSettingCopy">
          <b>Таймер</b>
        </span>
        <span className="lessonTimerInput" aria-label="Таймер урока">
          <input
            aria-label="Таймер урока"
            inputMode="numeric"
            value={timerDisplay}
            onFocus={() => setTimerInputDigits(currentTimerDigits)}
            onBlur={() => setTimerInputDigits(null)}
            onChange={(event) => updateTimerDigits(event.target.value)}
            onKeyDown={(event) => {
              if (/^\d$/.test(event.key)) {
                event.preventDefault();
                updateTimerDigits(`${currentTimerDigits}${event.key}`);
              } else if (event.key === "Backspace") {
                event.preventDefault();
                updateTimerDigits(currentTimerDigits.slice(0, -1));
              } else if (event.key === "Delete") {
                event.preventDefault();
                updateTimerDigits("0");
              }
            }}
            onPaste={(event) => {
              event.preventDefault();
              updateTimerDigits(
                `${currentTimerDigits}${event.clipboardData.getData("text")}`,
              );
            }}
          />
        </span>
      </label>
      <label className="lessonSettingField">
        <span className="lessonSettingIcon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M6.2 8.2A7 7 0 1 1 5 15" />
            <path d="M6 4.5v4h4" />
          </svg>
        </span>
        <span className="lessonSettingCopy">
          <b>Попытки</b>
        </span>
        <input
          aria-label="Количество попыток прохождения урока"
          type="number"
          min="0"
          value={lesson?.attempts || 0}
          onChange={(event) => updateLesson({ attempts: +event.target.value })}
        />
      </label>
      <small className="lessonSettingsHint">Значение 0 — без ограничений</small>
    </div>
  );
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
        <button
          className="backBtn"
          aria-label="Вернуться к курсам"
          title="Вернуться к курсам"
          onClick={() => navigate("/courses")}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m14.5 6-6 6 6 6" />
          </svg>
        </button>
        <div className="courseIdentity">
          <label className="courseTitleControl">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m4 16.5-.5 4 4-.5L18.7 8.8a2.1 2.1 0 0 0-3-3z" />
              <path d="m14.5 7 2.5 2.5" />
            </svg>
            <input
              aria-label="Название курса"
              className="courseTitleInput"
              value={course.title}
              placeholder="Введите название курса"
              onChange={(e) => mutate((c) => ({ ...c, title: e.target.value }))}
            />
          </label>
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
                  type="button"
                  className="moduleDelete"
                  onClick={() => removeModule(m.id, m.title)}
                  aria-label={`Удалить модуль «${m.title}»`}
                  title="Удалить модуль"
                >
                  <RemoveIcon />
                </button>
              </div>
              {m.lessons.map((l, li) => (
                <div className="treeLessonRow" key={l.id}>
                  <button
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
                  <button
                    type="button"
                    className="treeLessonDelete"
                    onClick={() => removeLesson(m.id, l.id, l.title)}
                    aria-label={`Удалить урок «${l.title}»`}
                    title="Удалить урок"
                  >
                    <RemoveIcon />
                  </button>
                </div>
              ))}
              <button
                className="moduleAddLesson"
                aria-label={`Добавить урок в модуль «${m.title}»`}
                title="Добавить урок"
                onClick={() => addLesson(m.id)}
              >
                ＋
              </button>
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
            <div className="lessonOverview">
              <div className="lessonEyebrow">
                <span className="lessonEyebrowIcon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M7 3.5h7l3 3V20.5H7z" />
                    <path d="M14 3.5v3h3M9.5 11h5M9.5 14.5h5" />
                  </svg>
                </span>
                <span>ОГЛАВЛЕНИЕ УРОКА</span>
              </div>
              <label className="lessonTitleEditor">
                <span className="lessonTitleLabel">Название урока</span>
                <input
                  aria-label="Название урока"
                  value={lesson?.title || ""}
                  placeholder="Введите название урока"
                  onChange={(e) => updateLesson({ title: e.target.value })}
                />
                <span className="lessonTitleEditIcon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16v4Z" />
                    <path d="m13.5 6.5 4 4M4 20h16" />
                  </svg>
                </span>
              </label>
              <textarea
                ref={lessonDescriptionRef}
                aria-label="Описание урока"
                maxLength={250}
                value={(lesson?.description || "").slice(0, 250)}
                onChange={(e) =>
                  updateLesson({ description: e.target.value.slice(0, 250) })
                }
                onInput={(e) => {
                  e.currentTarget.style.height = "0px";
                  e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
                }}
                placeholder="Описание урока"
                style={{
                  fontFamily: textFontFamily(lesson?.descriptionStyle?.fontFamily),
                  fontSize: `${lesson?.descriptionStyle?.fontSize || 16}px`,
                  fontWeight: lesson?.descriptionStyle?.fontWeight || 400,
                  textAlign: lesson?.descriptionStyle?.textAlign || "left",
                }}
              />
              <div className="lessonDescriptionMeta">
                <small>Краткое описание содержания урока</small>
                <span>
                  {Math.min(lesson?.description.length || 0, 250)} / 250
                </span>
              </div>
              <div className="fontToolbarCurtain">
              <div className="textFormatToolbar lessonDescriptionToolbar" aria-label="Оформление описания урока">
                <label>
                  <span className="formatControlLabel">Шрифт</span>
                  <select aria-label="Шрифт" value={lesson?.descriptionStyle?.fontFamily || "onest"} onChange={(event) => updateLesson({ descriptionStyle: { ...lesson?.descriptionStyle, fontFamily: event.target.value as NonNullable<LessonBlock["textStyle"]>["fontFamily"] } })}>
                    {textFontOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <label>
                  <span className="formatControlLabel">Размер</span>
                  <select aria-label="Размер шрифта" value={lesson?.descriptionStyle?.fontSize || 16} onChange={(event) => updateLesson({ descriptionStyle: { ...lesson?.descriptionStyle, fontSize: Number(event.target.value) as NonNullable<LessonBlock["textStyle"]>["fontSize"] } })}>
                    {[14, 16, 18, 20, 24].map((size) => <option key={size} value={size}>{size} px</option>)}
                  </select>
                </label>
                <label>
                  <span className="formatControlLabel">Начертание</span>
                  <select aria-label="Начертание шрифта" value={lesson?.descriptionStyle?.fontWeight || 400} onChange={(event) => updateLesson({ descriptionStyle: { ...lesson?.descriptionStyle, fontWeight: Number(event.target.value) as NonNullable<LessonBlock["textStyle"]>["fontWeight"] } })}>
                    <option value={400}>Обычный</option><option value={500}>Средний</option><option value={700}>Жирный</option>
                  </select>
                </label>
                <div className="textAlignControl">
                  <span>Выравнивание</span>
                  <div className="textAlignPicker" aria-label="Выравнивание описания">
                    {(["left", "center", "right"] as const).map((alignment) => { const label = alignment === "left" ? "По левому краю" : alignment === "center" ? "По центру" : "По правому краю"; return <button key={alignment} type="button" className={(lesson?.descriptionStyle?.textAlign || "left") === alignment ? "active" : ""} title={label} aria-label={label} onClick={() => updateLesson({ descriptionStyle: { ...lesson?.descriptionStyle, textAlign: alignment } })}><TextAlignIcon alignment={alignment} /></button>; })}
                  </div>
                </div>
              </div>
              </div>
            </div>
          </div>
          <div
            className={`blockCanvas ${paletteDropActive ? "paletteDropActive" : ""}`}
            onDragOver={(e) => {
              const draggedBlockId =
                dragging ||
                e.dataTransfer.getData("application/x-lingva-block-id") ||
                e.dataTransfer.getData("text/plain");
              if (
                (!paletteDragging && !draggedBlockId) ||
                (e.target as HTMLElement).closest(".lessonBlock")
              )
                return;
              e.preventDefault();
              e.dataTransfer.dropEffect = paletteDragging ? "copy" : "move";
              if (paletteDragging) setPaletteDropActive(true);
              setDropTarget(null);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node))
                setPaletteDropActive(false);
            }}
            onDrop={(e) => {
              const paletteKind =
                paletteDragging ||
                (e.dataTransfer.getData(
                  "application/x-lingva-block-kind",
                ) as BlockKind);
              const draggedBlockId =
                dragging ||
                e.dataTransfer.getData("application/x-lingva-block-id") ||
                e.dataTransfer.getData("text/plain");
              if (!paletteKind && !draggedBlockId) return;
              e.preventDefault();
              if (paletteKind) dropPaletteBlock(paletteKind);
              if (draggedBlockId && lesson?.blocks.length) {
                const lastBlock = lesson.blocks[lesson.blocks.length - 1];
                if (lastBlock.id !== draggedBlockId)
                  reorder(draggedBlockId, lastBlock.id, "after");
              }
              completeDragDrop();
              setDragging(null);
              setPaletteDragging(null);
              setPaletteDropActive(false);
              setDropTarget(null);
            }}
          >
            {lesson?.blocks.map((b) => (
              <div
                key={b.id}
                className={`blockEditorGroup ${selected === b.id ? "editorOpen" : ""}`}
                data-block-id={b.id}
                tabIndex={-1}
                onPaste={(event) => {
                  if (b.kind !== "image") return;
                  const files = [...event.clipboardData.files].filter((item) =>
                    item.type.startsWith("image/"),
                  );
                  if (!files.length) return;
                  event.preventDefault();
                  void uploadAsset(b, files);
                }}
              >
                <article
                  className={`lessonBlock ${selected === b.id ? "selected" : ""} ${dragging === b.id ? "dragging" : ""} ${dropTarget?.id === b.id && dragging !== b.id ? (dropTarget.edge === "before" ? "dropBefore" : "dropAfter") : ""}`}
                  onClick={(event) => {
                    event.currentTarget.parentElement?.focus();
                    if (selected === b.id) {
                      setClosingEditor(b.id);
                      if (closeEditorTimerRef.current !== null)
                        window.clearTimeout(closeEditorTimerRef.current);
                      closeEditorTimerRef.current = window.setTimeout(() => {
                        setSelected((current) =>
                          current === b.id ? "" : current,
                        );
                        setClosingEditor((current) =>
                          current === b.id ? "" : current,
                        );
                        closeEditorTimerRef.current = null;
                      }, 380);
                    } else {
                      if (closeEditorTimerRef.current !== null)
                        window.clearTimeout(closeEditorTimerRef.current);
                      closeEditorTimerRef.current = null;
                      setClosingEditor("");
                      setSelected(b.id);
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = paletteDragging
                      ? "copy"
                      : "move";
                    const rect = e.currentTarget.getBoundingClientRect();
                    const edge =
                      e.clientY < rect.top + rect.height / 2
                        ? "before"
                        : "after";
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
                    const rect = e.currentTarget.getBoundingClientRect();
                    const edge =
                      e.clientY < rect.top + rect.height / 2
                        ? "before"
                        : "after";
                    const draggedBlockId =
                      dragging ||
                      e.dataTransfer.getData(
                        "application/x-lingva-block-id",
                      ) ||
                      e.dataTransfer.getData("text/plain");
                    const paletteKind =
                      paletteDragging ||
                      (e.dataTransfer.getData(
                        "application/x-lingva-block-kind",
                      ) as BlockKind);
                    if (draggedBlockId && draggedBlockId !== b.id)
                      reorder(draggedBlockId, b.id, edge);
                    if (paletteKind)
                      dropPaletteBlock(paletteKind, b.id, edge);
                    if (draggedBlockId || paletteKind) completeDragDrop();
                    setDragging(null);
                    setPaletteDragging(null);
                    setPaletteDropActive(false);
                    setDropTarget(null);
                  }}
                >
                  <span
                    className="drag blockDragHandle"
                    role="button"
                    tabIndex={0}
                    title="Перетащить блок"
                    aria-label="Перетащить блок"
                    onPointerDown={(event) => beginBlockPointerDrag(event, b)}
                  >
                    <DragHandleIcon />
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
                      if (selected === b.id) {
                        setSelected("");
                        setClosingEditor("");
                      }
                      updateBlocks(
                          lesson.blocks.filter((x) => x.id !== b.id),
                        );
                      }}
                    >
                      ×
                    </button>
                  </div>
                </article>
                {selected === b.id && (
                  <div
                    className={`blockInspector inlineBlockInspector ${isTaskKind(b.kind) ? "taskBlockInspector" : ""} ${closingEditor === b.id ? "closing" : ""}`}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="inlineBlockInspectorHead">
                      <div>
                        <small>РЕДАКТОР БЛОКА</small>
                        <b>{b.title}</b>
                      </div>
                      <button
                        type="button"
                        aria-label="Закрыть редактор блока"
                        onClick={() => {
                          setClosingEditor(b.id);
                          if (closeEditorTimerRef.current !== null)
                            window.clearTimeout(closeEditorTimerRef.current);
                          closeEditorTimerRef.current = window.setTimeout(() => {
                            setSelected((current) =>
                              current === b.id ? "" : current,
                            );
                            setClosingEditor("");
                            closeEditorTimerRef.current = null;
                          }, 380);
                        }}
                      >
                        ×
                      </button>
                    </div>
                    <label>
                      Название
                      <input
                        placeholder={
                          palette.find(
                            (item) =>
                              item.kind ===
                              (b.kind === "media" ? "video" : b.kind),
                          )?.title || "Название блока"
                        }
                        value={b.title}
                        onChange={(event) =>
                          updateBlock(b.id, { title: event.target.value })
                        }
                      />
                    </label>
                    {isTaskKind(b.kind) ? (
                      <TaskBlockEditor
                        block={b}
                        onChange={(content) => updateBlock(b.id, { content })}
                      />
                    ) : b.kind === "text" ? (
                      <RichTextEditor
                        block={b}
                        onChange={(patch) => updateBlock(b.id, patch)}
                      />
                    ) : b.kind === "html" ? (
                      <div className="blockTextEditor">
                        <label>
                          Содержимое
                          <textarea
                            rows={8}
                            value={b.content}
                            onChange={(event) => updateBlock(b.id, { content: event.target.value })}
                          />
                        </label>
                      </div>
                    ) : (
                      <label>
                        {b.kind === "video" || b.kind === "media"
                          ? "Ссылка на YouTube или видео"
                          : b.kind === "audio"
                            ? "Ссылка на аудио"
                            : b.kind === "image"
                              ? "Ссылка на изображение"
                              : b.kind === "file"
                                ? "Ссылка на файл"
                              : "Содержимое"}
                        <input
                          type="url"
                          placeholder={
                            b.kind === "audio"
                              ? "https://.../audio.mp3"
                              : b.kind === "image"
                                ? "https://.../photo.jpg"
                                : b.kind === "file"
                                  ? "https://.../document.pdf"
                                  : "https://youtube.com/watch?v=..."
                          }
                          value={b.content}
                          onChange={(event) => {
                            const content = event.target.value;
                            updateBlock(
                              b.id,
                              b.kind === "image"
                                ? {
                                    content,
                                    images: content ? [content] : [],
                                  }
                                : b.kind === "file"
                                  ? {
                                      content,
                                      fileName: fileNameFromUrl(content),
                                      fileSize: undefined,
                                      fileType: undefined,
                                    }
                                  : { content },
                            );
                          }}
                        />
                      </label>
                    )}
                    {(b.kind === "video" ||
                      b.kind === "media" ||
                      b.kind === "audio" ||
                      b.kind === "image" ||
                      b.kind === "file") && (
                      <div className="mediaUploader">
                        <span>
                          {b.kind === "image"
                            ? "ЗАГРУЗИТЕ ФАЙЛ ИЛИ ВСТАВЬТЕ ЧЕРЕЗ CTRL + V"
                            : "ИЛИ ЗАГРУЗИТЕ ФАЙЛ"}
                        </span>
                        <label className={uploading ? "uploading" : ""}>
                          <UploadIcon />
                          <b>
                            {uploading
                              ? "Загрузка…"
                              : b.kind === "audio"
                                ? "Выбрать аудиофайл"
                              : b.kind === "image"
                                  ? "Выбрать фото для коллажа"
                                  : b.kind === "file"
                                    ? "Выбрать файл"
                                    : "Выбрать видеофайл"}
                          </b>
                          <small>
                            {b.kind === "audio"
                              ? "MP3, WAV или OGG"
                              : b.kind === "image"
                                ? "Можно выбрать несколько PNG, JPG или WebP"
                                : b.kind === "file"
                                  ? "PDF, Word, PowerPoint, Excel, TXT или ZIP"
                                  : "MP4, WebM или MOV"}
                          </small>
                          <input
                            type="file"
                            multiple={b.kind === "image"}
                            disabled={uploading}
                            accept={
                              b.kind === "audio"
                                ? "audio/mpeg,audio/wav,audio/ogg,audio/mp4"
                                : b.kind === "image"
                                  ? "image/jpeg,image/png,image/webp,image/gif,image/avif"
                                  : b.kind === "file"
                                    ? courseFileAccept
                                    : "video/mp4,video/webm,video/quicktime"
                            }
                            onChange={(event) => {
                              const files = [...(event.target.files || [])];
                              if (files.length)
                                void uploadAsset(
                                  b,
                                  b.kind === "image" ? files : files[0],
                                );
                              event.currentTarget.value = "";
                            }}
                          />
                        </label>
                        {uploadError && (
                          <p className="uploadError">{uploadError}</p>
                        )}
                        {b.content && (
                          <>
                            <p className="mediaReady">
                              <span aria-hidden="true">
                                <svg viewBox="0 0 20 20">
                                  <path d="m5.2 10.2 3 3.1 6.7-7" />
                                </svg>
                              </span>
                              <b>Материал добавлен</b>
                            </p>
                            {b.kind === "file" && (
                              <FileAttachmentPreview
                                block={b}
                                onRemove={() =>
                                  updateBlock(b.id, {
                                    content: "",
                                    fileName: undefined,
                                    fileSize: undefined,
                                    fileType: undefined,
                                  })
                                }
                              />
                            )}
                            {b.kind === "image" && (
                              <>
                                {getBlockImages(b).length > 1 && (
                                  <div className="collageLayoutPicker">
                                    <span>РАСКЛАДКА КОЛЛАЖА</span>
                                    <div>
                                      {(
                                        [
                                          ["grid", "Сетка"],
                                          ["mosaic", "Мозаика"],
                                          ["filmstrip", "Лента"],
                                        ] as const
                                      ).map(([value, label]) => (
                                        <button
                                          type="button"
                                          key={value}
                                          className={
                                            (b.imageLayout || "grid") === value
                                              ? "active"
                                              : ""
                                          }
                                          onClick={() =>
                                            updateBlock(b.id, {
                                              imageLayout: value,
                                            })
                                          }
                                        >
                                          {label}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                <div
                                  className={`imageCollageEditor layout-${b.imageLayout || "grid"}`}
                                >
                                  {getBlockImages(b).map((src, index) => (
                                    <figure key={`${src}-${index}`}>
                                      <img src={src} alt={`${b.title} ${index + 1}`} />
                                      <div>
                                        <button
                                          type="button"
                                          disabled={index === 0}
                                          aria-label="Переместить фото влево"
                                          onClick={() => moveImage(b, index, -1)}
                                        >
                                          ‹
                                        </button>
                                        <span>{index + 1}</span>
                                        <button
                                          type="button"
                                          disabled={
                                            index === getBlockImages(b).length - 1
                                          }
                                          aria-label="Переместить фото вправо"
                                          onClick={() => moveImage(b, index, 1)}
                                        >
                                          ›
                                        </button>
                                        <button
                                          type="button"
                                          className="removeImage"
                                          aria-label="Удалить фото из коллажа"
                                          onClick={() =>
                                            updateImageCollection(
                                              b,
                                              getBlockImages(b).filter(
                                                (_, itemIndex) => itemIndex !== index,
                                              ),
                                            )
                                          }
                                        >
                                          ×
                                        </button>
                                      </div>
                                    </figure>
                                  ))}
                                </div>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
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
          {lessonSettingsEditor}
          <div className="paletteHeader">
            <div className="paletteHeaderTitle">
              <span>Блоки</span>
              <small>{palette.length} типов</small>
            </div>
            <p>Перетащите блок в урок или нажмите на него</p>
          </div>
          {block && selected === "__legacy-sidebar-editor__" ? (
            <div
              className="blockInspector"
              onPaste={(event) => {
                if (block.kind !== "image") return;
                const file = [...event.clipboardData.files].find((item) =>
                  item.type.startsWith("image/"),
                );
                if (!file) return;
                event.preventDefault();
                void uploadAsset(block, file);
              }}
            >
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
                    : block.kind === "image"
                      ? "Ссылка на изображение"
                      : block.kind === "file"
                        ? "Ссылка на файл"
                      : "Содержимое"}
                {block.kind === "text" ||
                isTaskKind(block.kind) ||
                block.kind === "html" ? (
                  <textarea
                    rows={12}
                    placeholder={
                      isTaskKind(block.kind)
                        ? taskTemplates[block.kind]
                        : undefined
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
                ) : (
                  <input
                    type="url"
                    placeholder={
                      block.kind === "audio"
                        ? "https://.../audio.mp3"
                        : block.kind === "image"
                          ? "https://.../photo.jpg"
                          : block.kind === "file"
                            ? "https://.../document.pdf"
                            : "https://youtube.com/watch?v=..."
                    }
                    value={block.content}
                    onChange={(e) =>
                      updateBlocks(
                        lesson!.blocks.map((x) =>
                          x.id === block.id
                            ? block.kind === "file"
                              ? {
                                  ...x,
                                  content: e.target.value,
                                  fileName: fileNameFromUrl(e.target.value),
                                  fileSize: undefined,
                                  fileType: undefined,
                                }
                              : { ...x, content: e.target.value }
                            : x,
                        ),
                      )
                    }
                  />
                )}
              </label>
              {(block.kind === "video" ||
                block.kind === "media" ||
                block.kind === "audio" ||
                block.kind === "image" ||
                block.kind === "file") && (
                <div className="mediaUploader">
                  <span>ИЛИ ЗАГРУЗИТЕ ФАЙЛ</span>
                  <label className={uploading ? "uploading" : ""}>
                    <UploadIcon />
                    <b>
                      {uploading
                        ? "Загрузка…"
                        : block.kind === "audio"
                          ? "Выбрать аудиофайл"
                          : block.kind === "image"
                            ? "Выбрать фото"
                            : block.kind === "file"
                              ? "Выбрать файл"
                              : "Выбрать видеофайл"}
                    </b>
                    <small>
                      {block.kind === "audio"
                        ? "MP3, WAV или OGG"
                        : block.kind === "image"
                          ? "PNG, JPG, WebP или Ctrl + V"
                          : block.kind === "file"
                            ? "PDF, Word, PowerPoint, Excel, TXT или ZIP"
                            : "MP4, WebM или MOV"}
                    </small>
                    <input
                      type="file"
                      disabled={uploading}
                      accept={
                        block.kind === "audio"
                          ? "audio/mpeg,audio/wav,audio/ogg,audio/mp4"
                          : block.kind === "image"
                            ? "image/jpeg,image/png,image/webp,image/gif,image/avif"
                            : block.kind === "file"
                              ? courseFileAccept
                              : "video/mp4,video/webm,video/quicktime"
                      }
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void uploadAsset(block, file);
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>
                  {uploadError && <p className="uploadError">{uploadError}</p>}
                  {block.content && (
                    <>
                      <p className="mediaReady">
                        <span aria-hidden="true">
                          <svg viewBox="0 0 20 20">
                            <path d="m5.2 10.2 3 3.1 6.7-7" />
                          </svg>
                        </span>
                        <b>Материал добавлен</b>
                      </p>
                      {block.kind === "file" && (
                        <FileAttachmentPreview
                          block={block}
                          onRemove={() =>
                            updateBlock(block.id, {
                              content: "",
                              fileName: undefined,
                              fileSize: undefined,
                              fileType: undefined,
                            })
                          }
                        />
                      )}
                      {block.kind === "image" && (
                        <img
                          className="imageEditorPreview"
                          src={block.content}
                          alt={block.title}
                        />
                      )}
                    </>
                  )}
                </div>
              )}
              <button className="btn ghost" onClick={() => setSelected("")}>
                Готово
              </button>
            </div>
          ) : (
            palette.map((p, index) => (
              <Fragment key={p.kind}>
                {(index === 0 || palette[index - 1].group !== p.group) && (
                  <div className="paletteSectionTitle">
                    <div>
                      <span>{p.group}</span>
                      <small>
                        {palette.filter((item) => item.group === p.group).length}
                      </small>
                    </div>
                    <i />
                  </div>
                )}
                <button
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
                  <DragHandleIcon />
                </span>
                <em className="paletteAddIcon" aria-hidden="true">
                  <AddBlockIcon />
                </em>
                </button>
              </Fragment>
            ))
          )}
        </aside>
      </div>
      {dragVisual && (
        <div
          className={`editorFloatingDrag ${dragVisual.returning ? "returning" : ""}`}
          style={
            {
              left: Math.max(
                12,
                Math.min(
                  window.innerWidth - dragVisual.width - 12,
                  dragVisual.x - dragVisual.offsetX,
                ),
              ),
              top: Math.max(
                12,
                Math.min(window.innerHeight - 92, dragVisual.y - dragVisual.offsetY),
              ),
              width: dragVisual.width,
            } as CSSProperties
          }
          aria-hidden="true"
        >
          <span className="drag blockDragHandle">
            <DragHandleIcon />
          </span>
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
            <p style={{ fontFamily: textFontFamily(lesson?.descriptionStyle?.fontFamily), fontSize: `${lesson?.descriptionStyle?.fontSize || 16}px`, fontWeight: lesson?.descriptionStyle?.fontWeight || 400, textAlign: lesson?.descriptionStyle?.textAlign || "left" }}>{lesson?.description}</p>
            {rendered.map((b) => (
              <LessonBlockView key={b.id} block={b} />
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
