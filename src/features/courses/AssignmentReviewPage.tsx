import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import { supabase } from "../../lib/supabase";
import { useCourses } from "./CourseProvider";
import { PageState } from "../../components/PageState";

type ReviewSubmission = {
  id: string;
  userId: string;
  studentName: string;
  courseId: string;
  lessonId: string;
  blockId: string;
  body: string;
  attachmentPath: string | null;
  attachmentName: string | null;
  attachmentSize: number | null;
  createdAt: string;
  updatedAt: string;
};

type ReviewReply = {
  id: string;
  submissionId: string;
  staffId: string;
  staffName: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

type LocalStore = { submissions?: ReviewSubmission[]; replies?: ReviewReply[] };

const LOCAL_KEY = "lingvaedu-assignment-submissions-v1";

const mapSubmission = (row: Record<string, unknown>): ReviewSubmission => ({
  id: String(row.id),
  userId: String(row.user_id),
  studentName: String(row.student_name || "Ученик"),
  courseId: String(row.course_id),
  lessonId: String(row.lesson_id),
  blockId: String(row.block_id),
  body: String(row.body || ""),
  attachmentPath: row.attachment_path ? String(row.attachment_path) : null,
  attachmentName: row.attachment_name ? String(row.attachment_name) : null,
  attachmentSize: typeof row.attachment_size === "number" ? row.attachment_size : null,
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at),
});

const mapReply = (row: Record<string, unknown>): ReviewReply => ({
  id: String(row.id),
  submissionId: String(row.submission_id),
  staffId: String(row.staff_id || ""),
  staffName: String(row.staff_name || "Преподаватель"),
  body: String(row.body || ""),
  createdAt: String(row.created_at || row.updated_at),
  updatedAt: String(row.updated_at),
});

const readLocalStore = (): { submissions: ReviewSubmission[]; replies: ReviewReply[] } => {
  try {
    const value = JSON.parse(localStorage.getItem(LOCAL_KEY) || "{}") as LocalStore;
    return {
      submissions: Array.isArray(value.submissions) ? value.submissions : [],
      replies: Array.isArray(value.replies) ? value.replies : [],
    };
  } catch {
    return { submissions: [], replies: [] };
  }
};

const writeLocalStore = (value: { submissions: ReviewSubmission[]; replies: ReviewReply[] }) => {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(value));
  window.dispatchEvent(new Event("lingvaedu:notifications-changed"));
};

const formatDate = (value: string) => new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric",
}).format(new Date(value));

const formatTime = (value: string) => new Intl.DateTimeFormat("ru-RU", {
  hour: "2-digit",
  minute: "2-digit",
}).format(new Date(value));

const formatSize = (bytes: number | null) => {
  if (!bytes) return "Файл";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
};

type ReviewState = "replied" | "waiting" | "overdue";

const getReviewState = (submission: ReviewSubmission, replied: boolean): ReviewState => {
  if (replied) return "replied";
  const age = Date.now() - new Date(submission.updatedAt).getTime();
  return age >= 2 * 24 * 60 * 60 * 1000 ? "overdue" : "waiting";
};

const reviewStateLabels: Record<ReviewState, string> = {
  replied: "Проверено",
  waiting: "Нужно проверить",
  overdue: "Не проверено больше двух дней",
};

function ReviewStatusDot({ state }: { state: ReviewState }) {
  const label = reviewStateLabels[state];
  return <span className={`assignmentReviewDot ${state}`} aria-label={label} title={label}>
    {state === "replied" ? <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5.5 10.2 2.8 2.8 6.2-6.2"/></svg> : <span aria-hidden="true">!</span>}
  </span>;
}

function FolderIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 6.5h6l2 2H20.5v10.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2Z"/><path d="M3.5 9h17"/></svg>;
}

function FileIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3.5h8l4 4V20H6Z"/><path d="M14 3.5V8h4M9 12h6M9 15.5h4"/></svg>;
}

function SendIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 4 17 8-17 8 3-8Z"/><path d="M7 12h14"/></svg>;
}

function ChevronDownIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 9.5 5 5 5-5"/></svg>;
}

function AutoGrowingReply({
  value,
  label,
  placeholder,
  onChange,
}: {
  value: string;
  label: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const nextHeight = Math.min(Math.max(textarea.scrollHeight, 38), 150);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > 150 ? "auto" : "hidden";
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      rows={1}
      aria-label={label}
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export function AssignmentReviewPage() {
  const navigate = useNavigate();
  const { courses } = useCourses();
  const { user, displayName } = useAuth();
  const [submissions, setSubmissions] = useState<ReviewSubmission[]>([]);
  const [replies, setReplies] = useState<ReviewReply[]>([]);
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [savingReply, setSavingReply] = useState(false);
  const [replyError, setReplyError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [reloadVersion, setReloadVersion] = useState(0);
  const [statusFilter, setStatusFilter] = useState<ReviewState | "all">("all");

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setLoadError("");
      try {
      if (supabase && user) {
        const { data, error } = await supabase
          .from("course_assignment_submissions")
          .select("*")
          .order("updated_at", { ascending: false });
        if (error) throw error;
        if (!error) {
          const nextSubmissions = ((data || []) as Record<string, unknown>[]).map(mapSubmission);
          const ids = nextSubmissions.map((item) => item.id);
          let nextReplies: ReviewReply[] = [];
          if (ids.length) {
            const { data: replyRows, error: replyError } = await supabase
              .from("course_assignment_replies")
              .select("*")
              .in("submission_id", ids);
            if (replyError) throw replyError;
            nextReplies = ((replyRows || []) as Record<string, unknown>[]).map(mapReply);
          }
          const urls: Record<string, string> = {};
          await Promise.all(nextSubmissions.map(async (item) => {
            if (!item.attachmentPath) return;
            const { data: signed } = await supabase!.storage
              .from("course-submissions")
              .createSignedUrl(item.attachmentPath, 3600);
            if (signed?.signedUrl) urls[item.id] = signed.signedUrl;
          }));
          if (active) {
            setSubmissions(nextSubmissions);
            setReplies(nextReplies);
            setAttachmentUrls(urls);
            setSelectedId((current) => current || nextSubmissions[0]?.id || "");
            setLoading(false);
          }
          return;
        }
      }
      const local = readLocalStore();
      if (active) {
        setSubmissions(local.submissions);
        setReplies(local.replies);
        setAttachmentUrls(Object.fromEntries(local.submissions
          .filter((item) => item.attachmentPath?.startsWith("data:"))
          .map((item) => [item.id, item.attachmentPath || ""])));
        setSelectedId((current) => current || local.submissions[0]?.id || "");
        setLoading(false);
      }
      } catch {
        if (active) {
          setLoadError("Не удалось загрузить работы учеников. Проверьте подключение и попробуйте снова.");
          setLoading(false);
        }
      }
    };
    void load();
    return () => { active = false; };
  }, [user, reloadVersion]);

  const contexts = useMemo(() => submissions.map((submission) => {
    const course = courses.find((item) => item.id === submission.courseId);
    const module = course?.modules.find((item) => item.lessons.some((lesson) => lesson.id === submission.lessonId));
    const lesson = module?.lessons.find((item) => item.id === submission.lessonId);
    const block = lesson?.blocks.find((item) => item.id === submission.blockId);
    return {
      submission,
      courseTitle: course?.title || "Удалённый курс",
      moduleTitle: module?.title || "Модуль",
      lessonTitle: lesson?.title || "Урок",
      blockTitle: block?.title || "Развёрнутое задание",
    };
  }), [courses, submissions]);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return contexts.filter((item) => {
      const state = getReviewState(item.submission, replies.some((reply) => reply.submissionId === item.submission.id));
      return (statusFilter === "all" || state === statusFilter) && (!query || [item.courseTitle, item.moduleTitle, item.lessonTitle, item.blockTitle, item.submission.studentName]
        .some((value) => value.toLocaleLowerCase().includes(query)));
    });
  }, [contexts, search, replies, statusFilter]);

  const folders = useMemo(() => {
    const result = new Map<string, { id: string; title: string; items: typeof filtered }>();
    filtered.forEach((item) => {
      const folder = result.get(item.submission.courseId) || { id: item.submission.courseId, title: item.courseTitle, items: [] };
      folder.items.push(item);
      result.set(item.submission.courseId, folder);
    });
    return [...result.values()].sort((a, b) => a.title.localeCompare(b.title, "ru"));
  }, [filtered]);

  const selected = filtered.find((item) => item.submission.id === selectedId) || filtered[0];
  const selectedReply = selected ? replies.find((item) => item.submissionId === selected.submission.id) : undefined;
  const answered = new Set(replies.map((item) => item.submissionId)).size;

  const saveReply = async (submission: ReviewSubmission) => {
    const body = (replyDrafts[submission.id] || "").trim();
    if (!body || savingReply) return;
    setSavingReply(true);
    setReplyError("");
    const existing = replies.find((item) => item.submissionId === submission.id);
    const now = new Date().toISOString();
    const next: ReviewReply = {
      id: existing?.id || crypto.randomUUID(),
      submissionId: submission.id,
      staffId: user?.id || "local-staff",
      staffName: displayName,
      body,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    try {
      if (supabase && user) {
        const { data, error } = await supabase
          .from("course_assignment_replies")
          .upsert({
            id: next.id,
            submission_id: next.submissionId,
            staff_id: next.staffId,
            staff_name: next.staffName,
            body: next.body,
            updated_at: next.updatedAt,
          }, { onConflict: "submission_id" })
          .select("*")
          .single();
        if (error) throw error;
        const saved = mapReply(data as Record<string, unknown>);
        setReplies((current) => [saved, ...current.filter((item) => item.submissionId !== saved.submissionId)]);
      } else {
        const local = readLocalStore();
        writeLocalStore({
          ...local,
          replies: [next, ...local.replies.filter((item) => item.submissionId !== next.submissionId)],
        });
        setReplies((current) => [next, ...current.filter((item) => item.submissionId !== next.submissionId)]);
      }
      setReplyDrafts((current) => ({ ...current, [submission.id]: "" }));
      window.dispatchEvent(new Event("lingvaedu:notifications-changed"));
    } catch (error) {
      setReplyError(error instanceof Error ? error.message : "Не удалось отправить ответ.");
    } finally {
      setSavingReply(false);
    }
  };

  return (
    <main className="content fade assignmentArchivePage">
      <div className="assignmentArchiveHero">
        <div>
          <span>ЦЕНТР ПРОВЕРКИ</span>
          <h1>Задания учеников</h1>
          <p>Все отправленные работы аккуратно разложены по курсам, модулям и урокам.</p>
        </div>
        <div className="assignmentArchiveStats">
          <span><b>{submissions.length}</b><small>всего работ</small></span>
          <span><b>{Math.max(0, submissions.length - answered)}</b><small>ждут ответа</small></span>
          <span><b>{folders.length}</b><small>курсов</small></span>
        </div>
      </div>

      <label className="assignmentArchiveSearch">
        <span aria-hidden="true">⌕</span>
        <input aria-label="Поиск по работам учеников" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Найти курс, урок, задание или ученика" />
      </label>
      <div className="assignmentStatusLegend" aria-label="Статусы проверки">
        {(["replied", "waiting", "overdue"] as ReviewState[]).map((state) => <span key={state}><ReviewStatusDot state={state}/>{reviewStateLabels[state]}</span>)}
      </div>

      <div className="assignmentReviewControls" role="group" aria-label="Фильтр по статусу работы">
        {(["all", "waiting", "overdue", "replied"] as const).map((state) => <button key={state} aria-pressed={statusFilter === state} onClick={() => setStatusFilter(state)}>{({ all: "Все", waiting: "Ждут ответа", overdue: "Просрочены", replied: "Проверены" })[state]}{" "}<span>{state === "all" ? submissions.length : submissions.filter((item) => getReviewState(item, replies.some((reply) => reply.submissionId === item.id)) === state).length}</span></button>)}
        <button className="assignmentRefresh" disabled={loading} onClick={() => setReloadVersion((value) => value + 1)}>Обновить</button>
      </div>

      {loading ? <PageState title="Загружаем работы" description="Собираем задания и ответы преподавателей." loading /> : loadError ? <PageState title="Работы временно недоступны" description={loadError} action={<button className="btn primary" onClick={() => setReloadVersion((value) => value + 1)}>Попробовать снова</button>} /> : !submissions.length ? (
        <div className="assignmentArchiveEmpty"><FileIcon/><h2>Работ пока нет</h2><p>Здесь появятся задания, которые отправят ученики.</p></div>
      ) : !filtered.length ? <PageState title="Подходящих работ нет" description="Попробуйте другой запрос или снимите фильтр по статусу." action={<button className="btn ghost" onClick={() => { setSearch(""); setStatusFilter("all"); }}>Сбросить фильтры</button>} /> : (
        <div className="assignmentArchiveLayout">
          <section className="assignmentFolderList" aria-label="Папки курсов">
            {!folders.length && <div className="assignmentArchiveEmpty"><p>По вашему запросу ничего не найдено.</p></div>}
            {folders.map((folder) => {
              const modules = new Map<string, typeof folder.items>();
              folder.items.forEach((item) => modules.set(item.moduleTitle, [...(modules.get(item.moduleTitle) || []), item]));
              return (
                <details className="assignmentCourseFolder" open key={folder.id}>
                  <summary>
                    <span className="assignmentFolderIcon"><FolderIcon/></span>
                    <span><b>{folder.title}</b><small>{folder.items.length} {folder.items.length === 1 ? "работа" : "работ"}</small></span>
                    <i><ChevronDownIcon /></i>
                  </summary>
                  <div className="assignmentFolderContent">
                    {[...modules.entries()].map(([moduleTitle, moduleItems]) => (
                      <div className="assignmentModuleFolder" key={moduleTitle}>
                        <div className="assignmentModuleTitle"><FolderIcon/><b>{moduleTitle}</b><span>{moduleItems.length}</span></div>
                        {moduleItems.map((item) => {
                          const replied = replies.some((reply) => reply.submissionId === item.submission.id);
                          const reviewState = getReviewState(item.submission, replied);
                          return (
                            <button className={selected?.submission.id === item.submission.id ? "active" : ""} onClick={() => setSelectedId(item.submission.id)} key={item.submission.id}>
                              <span className="assignmentStudentAvatar">{item.submission.studentName.trim().slice(0, 1).toUpperCase()}</span>
                              <span><b>{item.submission.studentName}</b><small>{item.lessonTitle} · {item.blockTitle}</small></span>
                              <ReviewStatusDot state={reviewState} />
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </details>
              );
            })}
          </section>

          <aside className="assignmentArchivePreview">
            {selected && <>
              <div className="assignmentPreviewHead">
                <span className="assignmentStudentAvatar">{selected.submission.studentName.trim().slice(0, 1).toUpperCase()}</span>
                <div><small>РАБОТА УЧЕНИКА</small><h2>{selected.submission.studentName}</h2></div>
                <ReviewStatusDot state={getReviewState(selected.submission, Boolean(selectedReply))} />
              </div>
              <div className="assignmentPreviewBreadcrumbs">{selected.courseTitle}<span>›</span>{selected.moduleTitle}<span>›</span>{selected.lessonTitle}</div>
              <div className="assignmentPreviewTask"><small>ЗАДАНИЕ</small><b>{selected.blockTitle}</b></div>
              <time className="assignmentPreviewDate">{formatDate(selected.submission.updatedAt)}</time>
              <article className="assignmentPreviewMessage">
                <p>{selected.submission.body || "Текстовый ответ не добавлен."}</p>
                {selected.submission.attachmentName && <a href={attachmentUrls[selected.submission.id] || undefined} target="_blank" rel="noreferrer"><FileIcon/><span><b>{selected.submission.attachmentName}</b><small>{formatSize(selected.submission.attachmentSize)}</small></span></a>}
                <time>{formatTime(selected.submission.updatedAt)}</time>
              </article>
              {selectedReply && <div className="assignmentPreviewReply"><span>Ответил: {selectedReply.staffName}</span><p>{selectedReply.body}</p><time>{formatTime(selectedReply.updatedAt)}</time></div>}
              <form className="assignmentArchiveComposer" onSubmit={(event) => { event.preventDefault(); void saveReply(selected.submission); }}>
                <AutoGrowingReply
                  label={`Ответ ученику ${selected.submission.studentName}`}
                  placeholder={selectedReply ? "Написать новый ответ…" : "Ответить ученику…"}
                  value={replyDrafts[selected.submission.id] || ""}
                  onChange={(value) => setReplyDrafts((current) => ({ ...current, [selected.submission.id]: value }))}
                />
                <button type="submit" disabled={savingReply || !(replyDrafts[selected.submission.id] || "").trim()} aria-label="Отправить ответ">
                  <SendIcon />
                </button>
              </form>
              {replyError && <p className="assignmentArchiveReplyError" role="alert">{replyError}</p>}
              <button className="btn primary assignmentOpenCourse" onClick={() => navigate(`/courses/learn?course=${selected.submission.courseId}`)}>Открыть в курсе →</button>
            </>}
          </aside>
        </div>
      )}
    </main>
  );
}
