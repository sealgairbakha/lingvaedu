import type { BlockKind } from "./types";

const taskKinds: BlockKind[] = [
  "drag-words",
  "select-words",
  "fill-blank",
  "quiz",
  "match",
  "true-false",
];

export function BlockIcon({ kind }: { kind: BlockKind }) {
  const normalized = kind === "media" ? "video" : kind;
  const isTask = taskKinds.includes(normalized);
  const isGame = normalized.startsWith("game-");

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
      {isTask && (
        <>
          <path d="m5 12 4 4L19 6" />
          <path d="M5 5h5M14 19h5" />
        </>
      )}
      {isGame && (
        <>
          <path d="M7.5 8.5h9a4.5 4.5 0 0 1 4.2 6.1l-1.1 3a2.2 2.2 0 0 1-3.7.8L14.5 17h-5l-1.4 1.4a2.2 2.2 0 0 1-3.7-.8l-1.1-3a4.5 4.5 0 0 1 4.2-6.1Z" />
          <path d="M8 11.5v4M6 13.5h4M16.5 12.5h.01M18.5 14.5h.01" />
        </>
      )}
      {normalized === "assignment" && (
        <>
          <path d="M5 4.5h14v11H9l-4 4Z" />
          <path d="M8 8h8M8 11.5h5" />
        </>
      )}
      {normalized === "html" && <path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16" />}
      {normalized === "file" && (
        <>
          <path d="M6 3.5h8l4 4V20H6Z" />
          <path d="M14 3.5V8h4M12 11v6M9.5 14.5 12 17l2.5-2.5" />
        </>
      )}
    </svg>
  );
}
