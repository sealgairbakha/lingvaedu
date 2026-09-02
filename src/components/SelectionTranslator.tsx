import { useEffect, useLayoutEffect, useRef, useState } from "react";

type SelectionTranslatorProps = {
  scopeSelector?: string;
  onAddToVocabulary?: (entry: { source: string; translation: string }) => void | Promise<void>;
};

type PopupState = {
  text: string;
  translation: string;
  status: "loading" | "success" | "error" | "limit";
  rect: { top: number; right: number; bottom: number; left: number };
  x: number;
  y: number;
};

const translationCache = new Map<string, string>();
const MAX_SELECTION_LENGTH = 100;
const POPUP_GAP = 10;
const VIEWPORT_PADDING = 12;

function isEnglishText(text: string) {
  return /[a-z]/i.test(text) && !/[а-яё]/i.test(text);
}

function normalizeSelectionText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function getSelectionRect(range: Range) {
  const clientRects = Array.from(range.getClientRects()).filter((rect) => rect.width || rect.height);
  const rect = clientRects.at(-1) || range.getBoundingClientRect();
  return { top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left };
}

export function SelectionTranslator({ scopeSelector = ".coursePlayer", onAddToVocabulary }: SelectionTranslatorProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<number | null>(null);
  const [popup, setPopup] = useState<PopupState | null>(null);
  const [vocabularyNote, setVocabularyNote] = useState("");
  const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window && !!popup && popup.status !== "limit" && isEnglishText(popup.text);

  useLayoutEffect(() => {
    if (!popup || !popupRef.current) return;
    const box = popupRef.current.getBoundingClientRect();
    const viewport = window.visualViewport;
    const viewportLeft = viewport?.offsetLeft || 0;
    const viewportTop = viewport?.offsetTop || 0;
    const viewportRight = viewportLeft + (viewport?.width || window.innerWidth);
    const viewportBottom = viewportTop + (viewport?.height || window.innerHeight);
    const minX = viewportLeft + VIEWPORT_PADDING;
    const maxX = Math.max(minX, viewportRight - box.width - VIEWPORT_PADDING);
    const x = Math.min(Math.max(popup.rect.left, minX), maxX);
    let y = popup.rect.bottom + POPUP_GAP;
    if (y + box.height > viewportBottom - VIEWPORT_PADDING) y = popup.rect.top - box.height - POPUP_GAP;
    const minY = viewportTop + VIEWPORT_PADDING;
    const maxY = Math.max(minY, viewportBottom - box.height - VIEWPORT_PADDING);
    y = Math.min(Math.max(y, minY), maxY);
    if (Math.abs(x - popup.x) > 1 || Math.abs(y - popup.y) > 1) setPopup((current) => current ? { ...current, x, y } : current);
  }, [popup]);

  useEffect(() => {
    const close = () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      abortRef.current?.abort();
      setPopup(null);
      setVocabularyNote("");
    };

    const translateSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) return close();
      const text = normalizeSelectionText(selection.toString());
      if (!text) return close();
      const range = selection.getRangeAt(0);
      const ancestor = range.commonAncestorContainer instanceof Element
        ? range.commonAncestorContainer
        : range.commonAncestorContainer.parentElement;
      if (!ancestor?.closest(scopeSelector) || ancestor.closest("input, textarea, [contenteditable='true'], .selectionTranslator")) return close();
      const rect = getSelectionRect(range);
      if (rect.right <= rect.left && rect.bottom <= rect.top) return close();
      if (text.length > MAX_SELECTION_LENGTH) {
        abortRef.current?.abort();
        setVocabularyNote("");
        setPopup({ text: "", translation: "", status: "limit", rect, x: rect.left, y: rect.bottom + POPUP_GAP });
        return;
      }
      const cached = translationCache.get(text);
      setVocabularyNote("");
      if (cached) {
        setPopup({ text, translation: cached, status: "success", rect, x: rect.left, y: rect.bottom + POPUP_GAP });
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const requestId = ++requestRef.current;
      setPopup({ text, translation: "", status: "loading", rect, x: rect.left, y: rect.bottom + POPUP_GAP });
      void fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      }).then(async (response) => {
        const data = await response.json().catch(() => null) as { translation?: string } | null;
        if (!response.ok || !data?.translation) throw new Error("Translation failed");
        if (requestId !== requestRef.current) return;
        translationCache.set(text, data.translation);
        setPopup((current) => current?.text === text ? { ...current, translation: data.translation!, status: "success" } : current);
      }).catch((error: unknown) => {
        if (controller.signal.aborted || requestId !== requestRef.current) return;
        console.warn("Translation request failed", error);
        setPopup((current) => current?.text === text ? { ...current, status: "error" } : current);
      });
    };

    const scheduleTranslation = (delay: number) => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(translateSelection, delay);
    };
    const handleSelectionEnd = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest(".selectionTranslator")) return;
      setPopup(null);
      setVocabularyNote("");
      scheduleTranslation("changedTouches" in event ? 320 : 80);
    };
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;
      scheduleTranslation(260);
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (popupRef.current && event.target instanceof Node && !popupRef.current.contains(event.target)) close();
    };
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.shiftKey || event.key.startsWith("Arrow")) scheduleTranslation(90);
    };

    document.addEventListener("mouseup", handleSelectionEnd);
    document.addEventListener("touchend", handleSelectionEnd);
    document.addEventListener("selectionchange", handleSelectionChange);
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    window.addEventListener("resize", close, { passive: true });
    window.addEventListener("scroll", close, { passive: true });
    window.visualViewport?.addEventListener("resize", close, { passive: true });
    window.visualViewport?.addEventListener("scroll", close, { passive: true });
    return () => {
      document.removeEventListener("mouseup", handleSelectionEnd);
      document.removeEventListener("touchend", handleSelectionEnd);
      document.removeEventListener("selectionchange", handleSelectionChange);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close);
      window.visualViewport?.removeEventListener("resize", close);
      window.visualViewport?.removeEventListener("scroll", close);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      abortRef.current?.abort();
    };
  }, [scopeSelector]);

  if (!popup) return null;

  const speak = () => {
    if (!canSpeak) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(popup.text);
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  };
  const addToVocabulary = async () => {
    if (popup.status !== "success") return;
    if (!onAddToVocabulary) {
      setVocabularyNote("Личный словарь появится в следующем обновлении");
      return;
    }
    try {
      await onAddToVocabulary({ source: popup.text, translation: popup.translation });
      setVocabularyNote("Добавлено в словарь");
    } catch {
      setVocabularyNote("Не удалось добавить в словарь");
    }
  };

  return <div ref={popupRef} className="selectionTranslator" role="dialog" aria-label="Перевод выделенного текста" style={{ left: popup.x, top: popup.y }}>
    {popup.status !== "limit" && <div className="selectionTranslatorSource">
      {canSpeak && <button type="button" onClick={speak} aria-label="Прослушать произношение" title="Прослушать"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9v6h4l5 4V5L9 9H5Z"/><path d="M17 9.2a4 4 0 0 1 0 5.6M19.5 6.8a7.5 7.5 0 0 1 0 10.4"/></svg></button>}
      <b>{popup.text}</b>
    </div>}
    <div className={`selectionTranslatorResult ${popup.status}`} aria-live="polite">
      {popup.status === "loading" && <><i />Переводим…</>}
      {popup.status === "error" && "Не удалось выполнить перевод"}
      {popup.status === "limit" && "Для перевода выделите текст до 100 символов"}
      {popup.status === "success" && popup.translation}
    </div>
    {popup.status !== "limit" && <button type="button" className="selectionVocabularyButton" disabled={popup.status !== "success"} onClick={() => void addToVocabulary()}>☆ Добавить в словарь</button>}
    {vocabularyNote && <small className="selectionVocabularyNote" aria-live="polite">{vocabularyNote}</small>}
  </div>;
}
