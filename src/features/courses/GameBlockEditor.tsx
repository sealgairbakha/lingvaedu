import type { GameConfig, LessonBlock } from "./types";
import { uid } from "./types";

type Props = {
  block: LessonBlock;
  onChange: (game: GameConfig) => void;
};

function RemoveButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return <button type="button" className="gameEditorRemove" onClick={onClick} disabled={disabled} aria-label="Удалить строку">×</button>;
}

function MemoryEditor({ game, onChange }: { game: Extract<GameConfig, { type: "memory" }>; onChange: Props["onChange"] }) {
  const update = (pairs: typeof game.pairs) => onChange({ ...game, pairs });
  return <div className="gameBlockEditor">
    <p className="gameEditorHint">Добавьте пары. К каждой стороне можно указать текст, картинку или оба варианта.</p>
    {game.pairs.map((pair, index) => <div className="gameEditorCard memoryEditorRow" key={pair.id}>
      <span className="gameEditorNumber">{index + 1}</span>
      <div className="gameEditorSide">
        <label>Первая карточка<input value={pair.left} placeholder="apple" onChange={(event) => update(game.pairs.map((item) => item.id === pair.id ? { ...item, left: event.target.value } : item))} /></label>
        <label>Картинка (необязательно)<input type="url" value={pair.leftImage || ""} placeholder="https://..." onChange={(event) => update(game.pairs.map((item) => item.id === pair.id ? { ...item, leftImage: event.target.value } : item))} /></label>
      </div>
      <span className="gameEditorArrow">↔</span>
      <div className="gameEditorSide">
        <label>Парная карточка<input value={pair.right} placeholder="яблоко" onChange={(event) => update(game.pairs.map((item) => item.id === pair.id ? { ...item, right: event.target.value } : item))} /></label>
        <label>Картинка (необязательно)<input type="url" value={pair.rightImage || ""} placeholder="https://..." onChange={(event) => update(game.pairs.map((item) => item.id === pair.id ? { ...item, rightImage: event.target.value } : item))} /></label>
      </div>
      <RemoveButton disabled={game.pairs.length <= 2} onClick={() => update(game.pairs.filter((item) => item.id !== pair.id))} />
    </div>)}
    <button type="button" className="gameEditorAdd" onClick={() => update([...game.pairs, { id: uid(), left: "", right: "" }])}>＋ Добавить пару</button>
  </div>;
}

function BuildWordEditor({ game, onChange }: { game: Extract<GameConfig, { type: "build-word" }>; onChange: Props["onChange"] }) {
  const update = (items: typeof game.items) => onChange({ ...game, items });
  return <div className="gameBlockEditor">
    <p className="gameEditorHint">Ученик увидит подсказку и соберёт ответ из перемешанных букв.</p>
    {game.items.map((item, index) => <div className="gameEditorCard buildWordEditorRow" key={item.id}>
      <span className="gameEditorNumber">{index + 1}</span>
      <label>Слово<input value={item.word} placeholder="apple" onChange={(event) => update(game.items.map((entry) => entry.id === item.id ? { ...entry, word: event.target.value } : entry))} /></label>
      <label>Подсказка<input value={item.clue || ""} placeholder="яблоко" onChange={(event) => update(game.items.map((entry) => entry.id === item.id ? { ...entry, clue: event.target.value } : entry))} /></label>
      <label>Картинка (необязательно)<input type="url" value={item.image || ""} placeholder="https://..." onChange={(event) => update(game.items.map((entry) => entry.id === item.id ? { ...entry, image: event.target.value } : entry))} /></label>
      <RemoveButton disabled={game.items.length <= 1} onClick={() => update(game.items.filter((entry) => entry.id !== item.id))} />
    </div>)}
    <button type="button" className="gameEditorAdd" onClick={() => update([...game.items, { id: uid(), word: "", clue: "" }])}>＋ Добавить слово</button>
  </div>;
}

function ListenEditor({ game, onChange }: { game: Extract<GameConfig, { type: "listen-choice" }>; onChange: Props["onChange"] }) {
  const updateItems = (items: typeof game.items) => onChange({ ...game, items });
  return <div className="gameBlockEditor">
    <div className="gameEditorSettings"><label>Язык озвучки<input value={game.language} placeholder="en-US" onChange={(event) => onChange({ ...game, language: event.target.value })} /></label></div>
    <p className="gameEditorHint">Без аудиоссылки браузер произнесёт фразу автоматически. Варианты разделяйте запятыми.</p>
    {game.items.map((item, index) => <div className="gameEditorCard listenEditorRow" key={item.id}>
      <span className="gameEditorNumber">{index + 1}</span>
      <label>Что произнести<input value={item.phrase} placeholder="apple" onChange={(event) => updateItems(game.items.map((entry) => entry.id === item.id ? { ...entry, phrase: event.target.value } : entry))} /></label>
      <label>Правильный ответ<input value={item.answer} placeholder="яблоко" onChange={(event) => updateItems(game.items.map((entry) => entry.id === item.id ? { ...entry, answer: event.target.value } : entry))} /></label>
      <label>Все варианты<input value={item.options.join(", ")} placeholder="яблоко, груша, банан" onChange={(event) => updateItems(game.items.map((entry) => entry.id === item.id ? { ...entry, options: event.target.value.split(",").map((value) => value.trim()).filter(Boolean) } : entry))} /></label>
      <label>Аудиофайл (необязательно)<input type="url" value={item.audio || ""} placeholder="https://.../apple.mp3" onChange={(event) => updateItems(game.items.map((entry) => entry.id === item.id ? { ...entry, audio: event.target.value } : entry))} /></label>
      <RemoveButton disabled={game.items.length <= 1} onClick={() => updateItems(game.items.filter((entry) => entry.id !== item.id))} />
    </div>)}
    <button type="button" className="gameEditorAdd" onClick={() => updateItems([...game.items, { id: uid(), phrase: "", answer: "", options: [] }])}>＋ Добавить вопрос</button>
  </div>;
}

export function GameBlockEditor({ block, onChange }: Props) {
  if (!block.game) return null;
  if (block.game.type === "memory") return <MemoryEditor game={block.game} onChange={onChange} />;
  if (block.game.type === "build-word") return <BuildWordEditor game={block.game} onChange={onChange} />;
  return <ListenEditor game={block.game} onChange={onChange} />;
}
