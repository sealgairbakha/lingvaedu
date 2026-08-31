export function EditorCardNumber({ index }: { index: number }) {
  return <span className="editorCardNumber">{String(index + 1).padStart(2, "0")}</span>;
}
