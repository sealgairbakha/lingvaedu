import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useAuth } from "../../auth/AuthProvider";
import { supabase } from "../../lib/supabase";
import { LearningBlockHeader } from "./LearningBlockHeader";
import type { LessonBlock } from "./types";
import { getCourseTaskLocale } from "./courseTaskLocale";

type AssignmentSubmission = {
  id: string;
  userId: string;
  studentName: string;
  courseId: string;
  lessonId: string;
  blockId: string;
  body: string;
  attachmentPath: string | null;
  attachmentName: string | null;
  attachmentType: string | null;
  attachmentSize: number | null;
  createdAt: string;
  updatedAt: string;
};

type AssignmentReply = {
  id: string;
  submissionId: string;
  staffId: string;
  staffName: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

type LocalAssignmentStore = {
  submissions: AssignmentSubmission[];
  replies: AssignmentReply[];
};

type SubmissionRow = {
  id: string;
  user_id: string;
  student_name: string;
  course_id: string;
  lesson_id: string;
  block_id: string;
  body: string;
  attachment_path: string | null;
  attachment_name: string | null;
  attachment_type: string | null;
  attachment_size: number | null;
  created_at: string;
  updated_at: string;
};

type ReplyRow = {
  id: string;
  submission_id: string;
  staff_id: string;
  staff_name: string;
  body: string;
  created_at: string;
  updated_at: string;
};

const LOCAL_KEY = "lingvaedu-assignment-submissions-v1";
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const assignmentAccept = [
  "image/*",
  "application/pdf",
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

const readLocalStore = (): LocalAssignmentStore => {
  try {
    const value = JSON.parse(localStorage.getItem(LOCAL_KEY) || "{}");
    return {
      submissions: Array.isArray(value.submissions) ? value.submissions : [],
      replies: Array.isArray(value.replies) ? value.replies : [],
    };
  } catch {
    return { submissions: [], replies: [] };
  }
};

const notifyAssignmentChange = () =>
  window.dispatchEvent(new Event("lingvaedu:notifications-changed"));

const writeLocalStore = (value: LocalAssignmentStore) => {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(value));
  notifyAssignmentChange();
};

const mapSubmission = (row: SubmissionRow): AssignmentSubmission => ({
  id: row.id,
  userId: row.user_id,
  studentName: row.student_name,
  courseId: row.course_id,
  lessonId: row.lesson_id,
  blockId: row.block_id,
  body: row.body,
  attachmentPath: row.attachment_path,
  attachmentName: row.attachment_name,
  attachmentType: row.attachment_type,
  attachmentSize: row.attachment_size,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapReply = (row: ReplyRow): AssignmentReply => ({
  id: row.id,
  submissionId: row.submission_id,
  staffId: row.staff_id,
  staffName: row.staff_name,
  body: row.body,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const formatMessageDate = (value: string, locale = "ru") =>
  new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));

const formatMessageTime = (value: string, locale = "ru") =>
  new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(new Date(value));

const isSameMessageDay = (left: string, right: string) =>
  new Date(left).toDateString() === new Date(right).toDateString();

const formatSize = (bytes: number | null) => {
  if (!bytes) return "Файл";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
};

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

function AttachmentIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 12.5 5.6-5.6a3.2 3.2 0 0 1 4.5 4.5l-7.2 7.2a5 5 0 0 1-7.1-7.1l7-7" /></svg>;
}

function SendIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5m0 0-5 5m5-5 5 5" /></svg>;
}

export function CourseAssignmentBlock({
  block,
  courseId,
  lessonId,
  courseLanguage,
  onSubmitted,
}: {
  block: LessonBlock;
  courseId?: string;
  lessonId?: string;
  courseLanguage?: string;
  onSubmitted?: (submitted: boolean) => void;
}) {
  const labels = getCourseTaskLocale(courseLanguage);
  const { user, displayName, canEditCourses } = useAuth();
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [replies, setReplies] = useState<AssignmentReply[]>([]);
  const [body, setBody] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(Boolean(courseId && lessonId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const reportedSubmittedRef = useRef<boolean | null>(null);
  const learnerId = user?.id || "guest";
  const ownSubmission = submissions.find((item) => item.userId === learnerId);

  useEffect(() => {
    if (!courseId || !lessonId) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      if (supabase && user) {
        let query = supabase
          .from("course_assignment_submissions")
          .select("*")
          .eq("course_id", courseId)
          .eq("lesson_id", lessonId)
          .eq("block_id", block.id)
          .order("updated_at", { ascending: false });
        if (!canEditCourses) query = query.eq("user_id", user.id);
        const { data, error: loadError } = await query;
        if (!loadError) {
          const nextSubmissions = ((data || []) as SubmissionRow[]).map(mapSubmission);
          const submissionIds = nextSubmissions.map((item) => item.id);
          let nextReplies: AssignmentReply[] = [];
          if (submissionIds.length) {
            const { data: replyData, error: replyError } = await supabase
              .from("course_assignment_replies")
              .select("*")
              .in("submission_id", submissionIds);
            if (!replyError) nextReplies = ((replyData || []) as ReplyRow[]).map(mapReply);
          }
          if (active) {
            setSubmissions(nextSubmissions);
            setReplies(nextReplies);
            setBody(nextSubmissions.find((item) => item.userId === user.id)?.body || "");
            setReplyDrafts({});
            setLoading(false);
          }
          const urls: Record<string, string> = {};
          await Promise.all(nextSubmissions.map(async (item) => {
            if (!item.attachmentPath) return;
            const { data: signed } = await supabase!.storage
              .from("course-submissions")
              .createSignedUrl(item.attachmentPath, 3600);
            if (signed?.signedUrl) urls[item.id] = signed.signedUrl;
          }));
          if (active) setAttachmentUrls(urls);
          return;
        }
        console.error("Could not load assignment submissions", loadError.message);
      }
      const local = readLocalStore();
      const nextSubmissions = local.submissions.filter(
        (item) =>
          item.courseId === courseId &&
          item.lessonId === lessonId &&
          item.blockId === block.id &&
          (canEditCourses || item.userId === learnerId),
      );
      const ids = new Set(nextSubmissions.map((item) => item.id));
      const nextReplies = local.replies.filter((item) => ids.has(item.submissionId));
      if (active) {
        setSubmissions(nextSubmissions);
        setReplies(nextReplies);
        setBody(nextSubmissions.find((item) => item.userId === learnerId)?.body || "");
        setReplyDrafts({});
        setAttachmentUrls(Object.fromEntries(nextSubmissions.filter((item) => item.attachmentPath?.startsWith("data:")).map((item) => [item.id, item.attachmentPath || ""])));
        setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [block.id, canEditCourses, courseId, learnerId, lessonId, user]);

  useEffect(() => {
    const submitted = canEditCourses || Boolean(ownSubmission);
    if (reportedSubmittedRef.current === submitted) return;
    reportedSubmittedRef.current = submitted;
    onSubmitted?.(submitted);
  }, [canEditCourses, onSubmitted, ownSubmission]);

  const resizeComposer = () => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 180)}px`;
  };

  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      setError(labels.fileTooLarge);
      return;
    }
    setError("");
    setPendingFile(file);
  };

  const submitAssignment = async () => {
    if ((!body.trim() && !pendingFile && !ownSubmission?.attachmentPath) || !courseId || !lessonId) return;
    setSaving(true);
    setError("");
    const now = new Date().toISOString();
    try {
      let attachmentPath = ownSubmission?.attachmentPath || null;
      let attachmentName = ownSubmission?.attachmentName || null;
      let attachmentType = ownSubmission?.attachmentType || null;
      let attachmentSize = ownSubmission?.attachmentSize || null;
      if (pendingFile) {
        attachmentName = pendingFile.name;
        attachmentType = pendingFile.type;
        attachmentSize = pendingFile.size;
        if (supabase && user) {
          const safeName = pendingFile.name.replace(/[^a-zA-Z0-9._-]+/g, "-");
          attachmentPath = `${user.id}/${courseId}/${block.id}/${Date.now()}-${safeName}`;
          const { error: uploadError } = await supabase.storage
            .from("course-submissions")
            .upload(attachmentPath, pendingFile, { upsert: false, contentType: pendingFile.type || undefined });
          if (uploadError) throw uploadError;
        } else {
          attachmentPath = pendingFile.size <= 2 * 1024 * 1024
            ? await fileToDataUrl(pendingFile)
            : null;
        }
      }
      const id = ownSubmission?.id || crypto.randomUUID();
      const next: AssignmentSubmission = {
        id,
        userId: learnerId,
        studentName: displayName,
        courseId,
        lessonId,
        blockId: block.id,
        body: body.trim(),
        attachmentPath,
        attachmentName,
        attachmentType,
        attachmentSize,
        createdAt: ownSubmission?.createdAt || now,
        updatedAt: now,
      };
      if (supabase && user) {
        const { data, error: saveError } = await supabase
          .from("course_assignment_submissions")
          .upsert({
            id: next.id,
            user_id: next.userId,
            student_name: next.studentName,
            course_id: next.courseId,
            lesson_id: next.lessonId,
            block_id: next.blockId,
            body: next.body,
            attachment_path: next.attachmentPath,
            attachment_name: next.attachmentName,
            attachment_type: next.attachmentType,
            attachment_size: next.attachmentSize,
            updated_at: next.updatedAt,
          }, { onConflict: "user_id,course_id,block_id" })
          .select("*")
          .single();
        if (saveError) throw saveError;
        const saved = mapSubmission(data as SubmissionRow);
        setSubmissions((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
        if (saved.attachmentPath) {
          const { data: signed } = await supabase.storage.from("course-submissions").createSignedUrl(saved.attachmentPath, 3600);
          if (signed?.signedUrl) setAttachmentUrls((current) => ({ ...current, [saved.id]: signed.signedUrl }));
        }
      } else {
        const local = readLocalStore();
        writeLocalStore({
          ...local,
          submissions: [next, ...local.submissions.filter((item) => item.id !== next.id && !(item.userId === next.userId && item.courseId === next.courseId && item.blockId === next.blockId))],
        });
        setSubmissions((current) => [next, ...current.filter((item) => item.id !== next.id)]);
        if (next.attachmentPath?.startsWith("data:")) setAttachmentUrls((current) => ({ ...current, [next.id]: next.attachmentPath || "" }));
      }
      setPendingFile(null);
      onSubmitted?.(true);
      notifyAssignmentChange();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : labels.sendFailed;
      setError(/bucket not found/i.test(message) ? "Хранилище ответов ещё не создано. Выполните миграцию 012." : message);
    } finally {
      setSaving(false);
    }
  };

  const saveReply = async (submission: AssignmentSubmission) => {
    const replyBody = (replyDrafts[submission.id] || "").trim();
    if (!replyBody) return;
    setSaving(true);
    setError("");
    const existing = replies.find((item) => item.submissionId === submission.id);
    const now = new Date().toISOString();
    const next: AssignmentReply = {
      id: existing?.id || crypto.randomUUID(),
      submissionId: submission.id,
      staffId: user?.id || "local-staff",
      staffName: displayName,
      body: replyBody,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    try {
      if (supabase && user) {
        const { data, error: replyError } = await supabase
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
        if (replyError) throw replyError;
        const saved = mapReply(data as ReplyRow);
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
      notifyAssignmentChange();
    } catch (replyError) {
      setError(replyError instanceof Error ? replyError.message : "Не удалось сохранить ответ.");
    } finally {
      setSaving(false);
    }
  };

  if (!courseId || !lessonId) {
    return (
      <section className="learningBlock assignmentLearning assignmentPreview">
        <LearningBlockHeader kind={block.kind} title={block.title} category="assignment" language={courseLanguage} />
        <p className="assignmentPrompt">{block.content || labels.assignmentPrompt}</p>
        <div className="assignmentComposer previewComposer"><AttachmentIcon /><span>{labels.assignmentPreview}</span><i><SendIcon /></i></div>
      </section>
    );
  }

  return (
    <section className="learningBlock assignmentLearning">
      <LearningBlockHeader kind={block.kind} title={block.title} category="assignment" language={courseLanguage} />
      <p className="assignmentPrompt">{block.content || labels.assignmentPrompt}</p>
      {loading ? <div className="assignmentLoading">Загружаем ответы…</div> : canEditCourses ? (
        <div className="assignmentReviewList">
          <div className="assignmentReviewSummary"><b>{submissions.length}</b><span>{submissions.length === 1 ? "отправленная работа" : "отправленных работ"}</span></div>
          {!submissions.length && <div className="assignmentEmpty">Ученики ещё не отправляли это задание.</div>}
          {submissions.map((submission) => {
            const reply = replies.find((item) => item.submissionId === submission.id);
            return <article className="assignmentThread" key={submission.id}>
              <time className="assignmentConversationDate">{formatMessageDate(submission.updatedAt, labels.htmlLang)}</time>
              <div className="assignmentMessage studentMessage">
                <div className="assignmentMessageMeta"><b>{submission.studentName}</b></div>
                {submission.body && <p>{submission.body}</p>}
                {submission.attachmentName && <a className="assignmentAttachment" href={attachmentUrls[submission.id] || undefined} target="_blank" rel="noreferrer"><AttachmentIcon /><span><b>{submission.attachmentName}</b><small>{formatSize(submission.attachmentSize)}</small></span></a>}
                <time className="assignmentMessageTime">{formatMessageTime(submission.updatedAt, labels.htmlLang)}</time>
              </div>
              {reply && <>{!isSameMessageDay(submission.updatedAt, reply.updatedAt) && <time className="assignmentConversationDate">{formatMessageDate(reply.updatedAt, labels.htmlLang)}</time>}<div className="assignmentMessage teacherMessage"><div className="assignmentMessageMeta"><b>{reply.staffName}</b></div><p>{reply.body}</p><time className="assignmentMessageTime">{formatMessageTime(reply.updatedAt, labels.htmlLang)}</time></div></>}
              <div className="teacherReplyComposer">
                <textarea rows={2} aria-label={`Ответ ученику ${submission.studentName}`} placeholder="Ответить ученику…" value={replyDrafts[submission.id] || ""} onChange={(event) => setReplyDrafts((current) => ({ ...current, [submission.id]: event.target.value }))} />
                <button type="button" disabled={saving || !(replyDrafts[submission.id] || "").trim()} onClick={() => void saveReply(submission)} aria-label="Отправить ответ"><SendIcon /></button>
              </div>
            </article>;
          })}
        </div>
      ) : (
        <div className="assignmentStudentArea">
          {ownSubmission && <div className="assignmentThread ownAssignmentThread">
            <time className="assignmentConversationDate">{formatMessageDate(ownSubmission.updatedAt, labels.htmlLang)}</time>
            <div className="assignmentMessage studentMessage"><div className="assignmentMessageMeta"><b>{labels.you}</b></div>{ownSubmission.body && <p>{ownSubmission.body}</p>}{ownSubmission.attachmentName && <a className="assignmentAttachment" href={attachmentUrls[ownSubmission.id] || undefined} target="_blank" rel="noreferrer"><AttachmentIcon /><span><b>{ownSubmission.attachmentName}</b><small>{formatSize(ownSubmission.attachmentSize)}</small></span></a>}<time className="assignmentMessageTime">{formatMessageTime(ownSubmission.updatedAt, labels.htmlLang)}</time></div>
            {replies.find((item) => item.submissionId === ownSubmission.id) && (() => { const reply = replies.find((item) => item.submissionId === ownSubmission.id)!; return <>{!isSameMessageDay(ownSubmission.updatedAt, reply.updatedAt) && <time className="assignmentConversationDate">{formatMessageDate(reply.updatedAt, labels.htmlLang)}</time>}<div className="assignmentMessage teacherMessage"><div className="assignmentMessageMeta"><b>{reply.staffName}</b></div><p>{reply.body}</p><time className="assignmentMessageTime">{formatMessageTime(reply.updatedAt, labels.htmlLang)}</time></div></>; })()}
          </div>}
          <div className="assignmentComposer">
            {pendingFile && <div className="assignmentPendingFile"><AttachmentIcon /><span><b>{pendingFile.name}</b><small>{formatSize(pendingFile.size)}</small></span><button type="button" onClick={() => setPendingFile(null)} aria-label={labels.removeFile}>×</button></div>}
            <textarea ref={textareaRef} rows={1} aria-label={labels.answer} placeholder={labels.writeAnswer} value={body} onInput={resizeComposer} onChange={(event) => setBody(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submitAssignment(); } }} />
            <div className="assignmentComposerActions">
              <label title={labels.attachFile}><AttachmentIcon /><input type="file" accept={assignmentAccept} onChange={chooseFile} /></label>
              <small>{labels.keyboardHint}</small>
              <button type="button" disabled={saving || (!body.trim() && !pendingFile && !ownSubmission?.attachmentPath)} onClick={() => void submitAssignment()} aria-label={labels.sendAssignment}><SendIcon /></button>
            </div>
          </div>
          {ownSubmission && <p className="assignmentSavedNote">{labels.savedSubmission}</p>}
        </div>
      )}
      {error && <p className="assignmentError" role="alert">{error}</p>}
    </section>
  );
}
