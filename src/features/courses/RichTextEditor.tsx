import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { LessonBlock } from "./types";
import { plainTextToRichHtml, sanitizeRichText } from "./richText";

const fontOptions = [
  { value: "onest", label: "Onest", command: "Onest" },
  { value: "serif", label: "Книжный", command: "Georgia" },
  { value: "rounded", label: "Округлый", command: "Trebuchet MS" },
  { value: "mono", label: "Моно", command: "Consolas" },
] as const;

const fontFamilyMap: Record<string, string> = {
  onest: '"Onest Variable", Onest, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  rounded: '"Trebuchet MS", Arial, sans-serif',
  mono: '"Cascadia Code", Consolas, monospace',
};

type Props = {
  block: LessonBlock;
  onChange: (patch: Partial<LessonBlock>) => void;
};

type BubblePosition = { left: number; top: number } | null;

function AlignIcon({ align }: { align: "left" | "center" | "right" }) {
  const widths = align === "left" ? [18, 13, 18, 10] : align === "center" ? [18, 12, 18, 10] : [18, 13, 18, 10];
  return <svg viewBox="0 0 24 24" aria-hidden="true">
    {widths.map((width, index) => {
      const x = align === "left" ? 3 : align === "center" ? (24 - width) / 2 : 21 - width;
      return <path key={index} d={`M${x} ${5 + index * 5}h${width}`} />;
    })}
  </svg>;
}

export function RichTextEditor({ block, onChange }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const hydratedBlockIdRef = useRef("");
  const [open, setOpen] = useState(false);
  const [bubble, setBubble] = useState<BubblePosition>(null);
  const [fontFamily, setFontFamily] = useState(block.textStyle?.fontFamily || "onest");
  const [fontSize, setFontSize] = useState(block.textStyle?.fontSize || 16);
  const [textColor, setTextColor] = useState("#162036");
  const [highlightColor, setHighlightColor] = useState("#fff2a8");

  const initialHtml = block.richContent || plainTextToRichHtml(block.content);

  useLayoutEffect(() => {
    if (!editorRef.current) return;
    if (hydratedBlockIdRef.current === block.id) return;
    editorRef.current.innerHTML = sanitizeRichText(initialHtml);
    hydratedBlockIdRef.current = block.id;
  }, [block.id, initialHtml]);

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setBubble(null);
      }
    };
    document.addEventListener("pointerdown", closeOutside, true);
    return () => document.removeEventListener("pointerdown", closeOutside, true);
  }, []);

  const syncContent = () => {
    const editor = editorRef.current;
    if (!editor) return;
    onChange({
      content: editor.innerText.replace(/\u00a0/g, " ").replace(/\n{3,}/g, "\n\n"),
      richContent: sanitizeRichText(editor.innerHTML),
    });
  };

  const rememberSelection = () => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return;
    savedRangeRef.current = range.cloneRange();
    if (range.collapsed) {
      setBubble(null);
      return;
    }
    const rect = range.getBoundingClientRect();
    const rootRect = rootRef.current?.getBoundingClientRect();
    if (!rootRect || (!rect.width && !rect.height)) return setBubble(null);
    setBubble({
      left: Math.max(96, Math.min(rootRect.width - 96, rect.left - rootRect.left + rect.width / 2)),
      top: Math.max(8, rect.top - rootRect.top - 50),
    });
  };

  const restoreSelection = () => {
    const range = savedRangeRef.current;
    if (!range) return;
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  };

  const runCommand = (command: string, value?: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus({ preventScroll: true });
    restoreSelection();
    document.execCommand(command, false, value);
    savedRangeRef.current = window.getSelection()?.rangeCount
      ? window.getSelection()!.getRangeAt(0).cloneRange()
      : null;
    syncContent();
    window.requestAnimationFrame(rememberSelection);
  };

  const applyFontSize = (size: number) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus({ preventScroll: true });
    restoreSelection();
    document.execCommand("fontSize", false, "7");
    editor.querySelectorAll<HTMLElement>('font[size="7"]').forEach((font) => {
      const span = document.createElement("span");
      span.style.fontSize = `${size}px`;
      while (font.firstChild) span.append(font.firstChild);
      font.replaceWith(span);
    });
    setFontSize(size as typeof fontSize);
    syncContent();
    window.requestAnimationFrame(rememberSelection);
  };

  const handleInput = (_event: FormEvent<HTMLDivElement>) => {
    syncContent();
    rememberSelection();
  };

  const preventSelectionLoss = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  const button = (command: "bold" | "italic" | "underline", label: string, glyph: string) => (
    <button
      type="button"
      className={`richFormatButton richFormat${command}`}
      aria-label={label}
      title={label}
      onPointerDown={preventSelectionLoss}
      onClick={() => runCommand(command)}
    >
      {glyph}
    </button>
  );

  return (
    <div ref={rootRef} className={`richTextEditor ${open ? "formattingOpen" : ""}`}>
      <div className={`fontToolbarCurtain richTextToolbarCurtain ${open ? "open" : ""}`}>
        <div className="textFormatToolbar richTextToolbar" aria-label="Оформление текста">
          <label>
            <span className="formatControlLabel">Шрифт</span>
            <select
              aria-label="Шрифт"
              value={fontFamily}
              onPointerDown={rememberSelection}
              onChange={(event) => {
                const value = event.target.value as typeof fontFamily;
                setFontFamily(value);
                runCommand("fontName", fontOptions.find((item) => item.value === value)?.command || "Onest");
              }}
            >
              {fontOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label>
            <span className="formatControlLabel">Размер</span>
            <select
              aria-label="Размер шрифта"
              value={fontSize}
              onPointerDown={rememberSelection}
              onChange={(event) => applyFontSize(Number(event.target.value))}
            >
              {[14, 16, 18, 20, 24].map((size) => <option key={size} value={size}>{size} px</option>)}
            </select>
          </label>
          <div className="richInlineActions" aria-label="Начертание текста">
            {button("bold", "Жирный", "B")}
            {button("italic", "Курсив", "I")}
            {button("underline", "Подчёркнутый", "U")}
          </div>
          <div className="textAlignPicker richAlignPicker" aria-label="Выравнивание текста">
            {(["left", "center", "right"] as const).map((align) => (
              <button
                key={align}
                type="button"
                aria-label={align === "left" ? "По левому краю" : align === "center" ? "По центру" : "По правому краю"}
                title={align === "left" ? "По левому краю" : align === "center" ? "По центру" : "По правому краю"}
                onPointerDown={preventSelectionLoss}
                onClick={() => runCommand(`justify${align[0].toUpperCase()}${align.slice(1)}`)}
              >
                <AlignIcon align={align} />
              </button>
            ))}
          </div>
          <div className="richColorActions" aria-label="Цвет текста и заливки">
            <label title="Цвет текста" aria-label="Цвет текста">
              <span>A</span>
              <i style={{ backgroundColor: textColor }} />
              <input
                type="color"
                value={textColor}
                onPointerDown={rememberSelection}
                onChange={(event) => {
                  setTextColor(event.target.value);
                  runCommand("foreColor", event.target.value);
                }}
              />
            </label>
            <label title="Заливка текста" aria-label="Заливка текста">
              <span className="richHighlightGlyph">A</span>
              <i style={{ backgroundColor: highlightColor }} />
              <input
                type="color"
                value={highlightColor}
                onPointerDown={rememberSelection}
                onChange={(event) => {
                  setHighlightColor(event.target.value);
                  runCommand("hiliteColor", event.target.value);
                }}
              />
            </label>
          </div>
        </div>
      </div>

      <div
        ref={editorRef}
        className="richTextSurface"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Содержимое"
        data-placeholder="Начните писать текст"
        style={{
          "--rich-font-family": fontFamilyMap[block.textStyle?.fontFamily || "onest"],
          "--rich-font-size": `${block.textStyle?.fontSize || 16}px`,
        } as CSSProperties}
        onFocus={() => setOpen(true)}
        onInput={handleInput}
        onKeyUp={rememberSelection}
        onMouseUp={rememberSelection}
        onTouchEnd={rememberSelection}
      />

      {bubble && (
        <div
          className="richSelectionBubble"
          style={{ left: bubble.left, top: bubble.top }}
        >
          {button("bold", "Жирный", "B")}
          {button("italic", "Курсив", "I")}
          {button("underline", "Подчёркнутый", "U")}
          <label title="Цвет текста">
            <span>A</span>
            <i style={{ backgroundColor: textColor }} />
            <input type="color" value={textColor} onPointerDown={rememberSelection} onChange={(event) => { setTextColor(event.target.value); runCommand("foreColor", event.target.value); }} />
          </label>
          <label title="Заливка текста">
            <span className="richHighlightGlyph">A</span>
            <i style={{ backgroundColor: highlightColor }} />
            <input type="color" value={highlightColor} onPointerDown={rememberSelection} onChange={(event) => { setHighlightColor(event.target.value); runCommand("hiliteColor", event.target.value); }} />
          </label>
        </div>
      )}
    </div>
  );
}
