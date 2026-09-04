import { lazy, Suspense, useState } from "react";
import type { GameConfig, LessonBlock } from "./types";
import { uid } from "./types";
import { EditorCardNumber } from "./EditorCardNumber";
import { getCourseTaskLocale } from "./courseTaskLocale";

const FullEmojiPicker = lazy(() => import("./FullEmojiPicker"));

type Props = {
  block: LessonBlock;
  courseLanguage?: string;
  onChange: (game: GameConfig) => void;
};

function RemoveButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return <button type="button" className="gameEditorRemove" onClick={onClick} disabled={disabled} aria-label="Удалить строку">×</button>;
}

const emojiOptions = [
  ["🍎", "яблоко apple фрукт"], ["🍐", "груша pear фрукт"], ["🍊", "апельсин orange фрукт"], ["🍋", "лимон lemon фрукт"],
  ["🍌", "банан banana фрукт"], ["🍉", "арбуз watermelon"], ["🍇", "виноград grapes"], ["🍓", "клубника strawberry"],
  ["🍒", "вишня cherry"], ["🍑", "персик peach"], ["🥕", "морковь carrot"], ["🍅", "помидор tomato"],
  ["🍞", "хлеб bread"], ["🧀", "сыр cheese"], ["🥛", "молоко milk"], ["☕", "кофе coffee"],
  ["🐶", "собака dog животное"], ["🐱", "кошка cat животное"], ["🐭", "мышь mouse животное"], ["🐰", "кролик rabbit животное"],
  ["🦊", "лиса fox животное"], ["🐻", "медведь bear животное"], ["🐼", "панда panda животное"], ["🐸", "лягушка frog животное"],
  ["🐵", "обезьяна monkey"], ["🦁", "лев lion"], ["🐯", "тигр tiger"], ["🐮", "корова cow"],
  ["🚗", "машина car транспорт"], ["🚌", "автобус bus"], ["🚲", "велосипед bicycle"], ["✈️", "самолёт plane"],
  ["🚂", "поезд train"], ["🚢", "корабль ship"], ["🏠", "дом house"], ["🏫", "школа school"],
  ["📚", "книги books учеба"], ["✏️", "карандаш pencil"], ["🖊️", "ручка pen"], ["🎒", "рюкзак backpack"],
  ["⚽", "футбол football мяч"], ["🏀", "баскетбол basketball"], ["🎾", "теннис tennis"], ["🏆", "кубок trophy"],
  ["☀️", "солнце sun погода"], ["🌙", "луна moon"], ["⭐", "звезда star"], ["☁️", "облако cloud"],
  ["🌧️", "дождь rain"], ["❄️", "снег snow"], ["🔥", "огонь fire"], ["💧", "вода water"],
  ["❤️", "сердце heart любовь"], ["😊", "улыбка smile happy"], ["😢", "грусть sad"], ["👍", "палец вверх yes good"],
  ["🥝", "киви kiwi фрукт"], ["🍍", "ананас pineapple фрукт"], ["🥭", "манго mango фрукт"], ["🥥", "кокос coconut"],
  ["🥑", "авокадо avocado"], ["🥦", "брокколи broccoli овощ"], ["🌽", "кукуруза corn"], ["🥔", "картофель potato"],
  ["🍄", "гриб mushroom"], ["🥚", "яйцо egg"], ["🍕", "пицца pizza"], ["🍔", "бургер hamburger"],
  ["🍟", "картофель фри fries"], ["🍰", "торт cake"], ["🍦", "мороженое ice cream"], ["🍫", "шоколад chocolate"],
  ["🐷", "свинья pig животное"], ["🐴", "лошадь horse животное"], ["🐑", "овца sheep"], ["🐐", "коза goat"],
  ["🐘", "слон elephant"], ["🦒", "жираф giraffe"], ["🦓", "зебра zebra"], ["🦘", "кенгуру kangaroo"],
  ["🐔", "курица chicken птица"], ["🦆", "утка duck птица"], ["🦉", "сова owl птица"], ["🦋", "бабочка butterfly"],
  ["🐝", "пчела bee"], ["🐞", "божья коровка ladybug"], ["🐟", "рыба fish"], ["🐬", "дельфин dolphin"],
  ["🌳", "дерево tree природа"], ["🌲", "ёлка fir tree"], ["🌴", "пальма palm"], ["🌵", "кактус cactus"],
  ["🌷", "тюльпан tulip цветок"], ["🌹", "роза rose цветок"], ["🌻", "подсолнух sunflower"], ["🌈", "радуга rainbow"],
  ["⛰️", "гора mountain"], ["🏖️", "пляж beach"], ["🌊", "волна море wave sea"], ["🌍", "земля мир earth world"],
  ["🚕", "такси taxi"], ["🚓", "полиция police car"], ["🚑", "скорая помощь ambulance"], ["🚒", "пожарная машина fire truck"],
  ["🏍️", "мотоцикл motorcycle"], ["🛴", "самокат scooter"], ["🚁", "вертолёт helicopter"], ["🚀", "ракета rocket"],
  ["⛵", "парусник sailboat"], ["🚦", "светофор traffic light"], ["🗺️", "карта map"], ["🧭", "компас compass"],
  ["📱", "телефон phone"], ["💻", "ноутбук laptop computer"], ["⌚", "часы watch"], ["📷", "камера camera"],
  ["📺", "телевизор tv"], ["💡", "лампа идея light idea"], ["🔑", "ключ key"], ["🔒", "замок lock"],
  ["✂️", "ножницы scissors"], ["📏", "линейка ruler"], ["📌", "кнопка pin"], ["🧸", "игрушка мишка toy teddy"],
  ["👕", "футболка shirt одежда"], ["👖", "брюки pants одежда"], ["👗", "платье dress"], ["👟", "кроссовок shoe"],
  ["🎵", "музыка music нота"], ["🎸", "гитара guitar"], ["🎹", "пианино piano"], ["🎨", "рисование art palette"],
  ["🎬", "кино movie"], ["🎁", "подарок gift"], ["🎈", "шар balloon"], ["🎂", "день рождения birthday cake"],
  ["🏊", "плавание swimming"], ["🚴", "велоспорт cycling"], ["🏃", "бег running"], ["⛷️", "лыжи skiing"],
  ["😀", "радость happy grin"], ["😂", "смех laugh"], ["😍", "влюблённость love"], ["🤔", "думаю think"],
  ["😴", "сон sleep"], ["😡", "злость angry"], ["😎", "крутой cool"], ["🥳", "праздник party"],
  ["✅", "верно правильно correct yes"], ["❌", "неверно ошибка wrong no"], ["❓", "вопрос question"], ["💯", "сто отлично perfect"],
] as const;

function EmojiPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const legacyImage = /^(https?:\/\/|data:image\/|blob:)/i.test(value);
  return <div className="emojiPicker" data-curated-count={emojiOptions.length}>
    <button type="button" className={`emojiPickerTrigger ${value ? "selected" : ""}`} onClick={() => setOpen((current) => !current)} aria-expanded={open}>
      <span>{legacyImage ? "🖼️" : value || "🙂"}</span><b>{legacyImage ? "Заменить картинку на эмодзи" : value ? "Изменить эмодзи" : "Выбрать эмодзи"}</b><i><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 9.5 5 5 5-5" /></svg></i>
    </button>
    {open && <div className="emojiPickerPopover">
      <Suspense fallback={<div className="emojiPickerLoading">Загружаем все эмодзи…</div>}>
        <FullEmojiPicker onSelect={(emoji) => { onChange(emoji); setOpen(false); }} />
      </Suspense>
      {value && <button type="button" className="emojiPickerClear" onClick={() => { onChange(""); setOpen(false); }}>Убрать эмодзи</button>}
    </div>}
  </div>;
}

function MemoryEditor({ game, onChange }: { game: Extract<GameConfig, { type: "memory" }>; onChange: Props["onChange"] }) {
  const update = (pairs: typeof game.pairs) => onChange({ ...game, pairs });
  return <div className="gameBlockEditor">
    <p className="gameEditorHint">Добавьте пары и выберите формат карточек: слова или эмодзи с необязательными подписями.</p>
    {game.pairs.map((pair, index) => { const emojiMode = Boolean(pair.leftImage || pair.rightImage); const patchPair = (patch: Partial<typeof pair>) => update(game.pairs.map((item) => item.id === pair.id ? { ...item, ...patch } : item)); return <div className="gameEditorCard memoryEditorRow" key={pair.id}>
      <div className="memoryCardHeader">
        <EditorCardNumber index={index} />
        <div className="memoryContentMode" role="group" aria-label="Формат пары">
          <button type="button" className={!emojiMode ? "active" : ""} onClick={() => patchPair({ leftImage: "", rightImage: "" })}>Слова</button>
          <button type="button" className={emojiMode ? "active" : ""} onClick={() => patchPair({ leftImage: pair.leftImage || "🙂", rightImage: pair.rightImage || "🙂" })}>Эмодзи</button>
        </div>
      </div>
      <div className="gameEditorSide">
        {emojiMode && <label>Эмодзи<EmojiPicker value={pair.leftImage || ""} onChange={(value) => patchPair({ leftImage: value })} /></label>}
        <label>{emojiMode ? "Подпись (необязательно)" : "Первая карточка"}<input value={pair.left} placeholder={emojiMode ? "Например: apple" : "apple"} onChange={(event) => patchPair({ left: event.target.value })} /></label>
      </div>
      <span className="gameEditorArrow" aria-label="Связанная пара"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="12" r="2.5" /><path d="M8.5 12h7" /><circle cx="18" cy="12" r="2.5" /></svg></span>
      <div className="gameEditorSide">
        {emojiMode && <label>Парный эмодзи<EmojiPicker value={pair.rightImage || ""} onChange={(value) => patchPair({ rightImage: value })} /></label>}
        <label>{emojiMode ? "Подпись (необязательно)" : "Парная карточка"}<input value={pair.right} placeholder={emojiMode ? "Например: яблоко" : "яблоко"} onChange={(event) => patchPair({ right: event.target.value })} /></label>
      </div>
      <RemoveButton disabled={game.pairs.length <= 2} onClick={() => update(game.pairs.filter((item) => item.id !== pair.id))} />
    </div>; })}
    <button type="button" className="gameEditorAdd" onClick={() => update([...game.pairs, { id: uid(), left: "", right: "" }])}>＋ Добавить пару</button>
  </div>;
}

function BuildWordEditor({ game, onChange }: { game: Extract<GameConfig, { type: "build-word" }>; onChange: Props["onChange"] }) {
  const update = (items: typeof game.items) => onChange({ ...game, items });
  return <div className="gameBlockEditor">
    <p className="gameEditorHint">Ученик увидит подсказку и соберёт ответ из перемешанных букв.</p>
    {game.items.map((item, index) => <div className="gameEditorCard buildWordEditorRow" key={item.id}>
      <div className="gameCardHeader"><EditorCardNumber index={index} /></div>
      <label>Слово<input value={item.word} placeholder="apple" onChange={(event) => update(game.items.map((entry) => entry.id === item.id ? { ...entry, word: event.target.value } : entry))} /></label>
      <label>Подсказка<input value={item.clue || ""} placeholder="яблоко" onChange={(event) => update(game.items.map((entry) => entry.id === item.id ? { ...entry, clue: event.target.value } : entry))} /></label>
      <label>Эмодзи (необязательно)<EmojiPicker value={item.image || ""} onChange={(value) => update(game.items.map((entry) => entry.id === item.id ? { ...entry, image: value } : entry))} /></label>
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
      <div className="gameCardHeader"><EditorCardNumber index={index} /></div>
      <label>Что произнести<input value={item.phrase} placeholder="apple" onChange={(event) => updateItems(game.items.map((entry) => entry.id === item.id ? { ...entry, phrase: event.target.value } : entry))} /></label>
      <label>Правильный ответ<input value={item.answer} placeholder="яблоко" onChange={(event) => updateItems(game.items.map((entry) => entry.id === item.id ? { ...entry, answer: event.target.value } : entry))} /></label>
      <label>Все варианты<input value={item.options.join(", ")} placeholder="яблоко, груша, банан" onChange={(event) => updateItems(game.items.map((entry) => entry.id === item.id ? { ...entry, options: event.target.value.split(",").map((value) => value.trim()).filter(Boolean) } : entry))} /></label>
      <label>Аудиофайл (необязательно)<input type="url" value={item.audio || ""} placeholder="https://.../apple.mp3" onChange={(event) => updateItems(game.items.map((entry) => entry.id === item.id ? { ...entry, audio: event.target.value } : entry))} /></label>
      <RemoveButton disabled={game.items.length <= 1} onClick={() => updateItems(game.items.filter((entry) => entry.id !== item.id))} />
    </div>)}
    <button type="button" className="gameEditorAdd" onClick={() => updateItems([...game.items, { id: uid(), phrase: "", answer: "", options: [] }])}>＋ Добавить вопрос</button>
  </div>;
}

const csv = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);

function RoundsEditor({ game, courseLanguage, onChange }: { game: Extract<GameConfig, { type: "missing" | "odd-one-out" | "speed" | "truth" | "adventure" }>; courseLanguage?: string; onChange: Props["onChange"] }) {
  const taskLocale = getCourseTaskLocale(courseLanguage);
  const rounds = game.type === "adventure" ? game.stages : game.rounds;
  const update = (next: typeof rounds) => game.type === "adventure" ? onChange({ ...game, stages: next as typeof game.stages }) : onChange({ ...game, rounds: next as never });
  const patchRound = (id: string, patch: Record<string, unknown>) => update(rounds.map((round) => round.id === id ? { ...round, ...patch } : round) as typeof rounds);
  const makeRound = () => {
    if (game.type === "missing") return { id: uid(), items: ["apple", "pear", "banana"], missing: "banana" };
    if (game.type === "odd-one-out") return { id: uid(), options: ["apple", "pear", "car"], answer: "car", explanation: "" };
    if (game.type === "speed") return { id: uid(), prompt: "apple", answer: "яблоко", options: ["яблоко", "груша"] };
    if (game.type === "truth") return { id: uid(), prompt: "", statement: "Apple означает яблоко", correct: true };
    return { id: uid(), prompt: "Новый этап", answer: "ответ", options: ["ответ", "другой вариант"] };
  };
  return <div className="gameBlockEditor">
    {game.type === "missing" && <div className="gameEditorSettings"><label>Секунд на запоминание<input type="number" min="2" max="30" value={game.revealSeconds} onChange={(e) => onChange({ ...game, revealSeconds: Number(e.target.value) || 4 })} /></label></div>}
    {game.type === "speed" && <div className="gameEditorSettings"><label>Секунд на ответ<input type="number" min="3" max="60" value={game.seconds} onChange={(e) => onChange({ ...game, seconds: Number(e.target.value) || 10 })} /></label></div>}
    {game.type === "adventure" && <div className="gameEditorSettings"><label>Имя героя<input value={game.heroName} onChange={(e) => onChange({ ...game, heroName: e.target.value })} /></label></div>}
    <p className="gameEditorHint">{game.type === "truth" ? "Для каждого утверждения выберите правильный ответ." : "Варианты перечисляйте через запятую. Правильный ответ должен присутствовать среди вариантов."}</p>
    {rounds.map((round, index) => { const entry = round as { id: string; items: string[]; missing: string; prompt: string; statement: string; correct: boolean; options: string[]; answer: string; explanation?: string }; return <div className={`gameEditorCard universalGameEditorRow ${game.type === "truth" ? "truthGameEditorRow" : ""}`} key={entry.id}>
      <div className="gameCardHeader"><EditorCardNumber index={index} /></div>
      {game.type === "missing" ? <>
        <label>Предметы<input value={entry.items.join(", ")} onChange={(e) => patchRound(entry.id, { items: csv(e.target.value) })} /></label>
        <label>Что исчезнет<input value={entry.missing} onChange={(e) => patchRound(entry.id, { missing: e.target.value })} /></label>
      </> : game.type === "truth" ? <>
        <label>Контекст<input value={entry.prompt} onChange={(e) => patchRound(entry.id, { prompt: e.target.value })} /></label>
        <label>Утверждение<input value={entry.statement} onChange={(e) => patchRound(entry.id, { statement: e.target.value })} /></label>
        <div className="gameTruthAnswer">
          <span>Правильный ответ</span>
          <div className="trueFalseToggle" role="group" aria-label="Правильный ответ">
            <button type="button" className={entry.correct ? "active true" : ""} onClick={() => patchRound(entry.id, { correct: true })}>{taskLocale.trueLabel}</button>
            <button type="button" className={!entry.correct ? "active false" : ""} onClick={() => patchRound(entry.id, { correct: false })}>{taskLocale.falseLabel}</button>
          </div>
        </div>
      </> : <>
        {game.type !== "odd-one-out" && <label>Вопрос / подсказка<input value={entry.prompt || ""} onChange={(e) => patchRound(entry.id, { prompt: e.target.value })} /></label>}
        <label>Варианты<input value={entry.options.join(", ")} onChange={(e) => patchRound(entry.id, { options: csv(e.target.value) })} /></label>
        <label>Правильный ответ<input value={entry.answer} onChange={(e) => patchRound(entry.id, { answer: e.target.value })} /></label>
        {game.type === "odd-one-out" && <label>Объяснение<input value={entry.explanation || ""} onChange={(e) => patchRound(entry.id, { explanation: e.target.value })} /></label>}
      </>}
      <RemoveButton disabled={rounds.length <= 1} onClick={() => update(rounds.filter((item) => item.id !== entry.id) as typeof rounds)} />
    </div>; })}
    <button type="button" className={game.type === "truth" ? "taskBuilderAdd gameTruthAdd" : "gameEditorAdd"} onClick={() => update([...rounds, makeRound()] as typeof rounds)}>{game.type === "truth" ? <><span>＋</span> Добавить утверждение</> : <>＋ Добавить раунд</>}</button>
  </div>;
}

function CategoriesEditor({ game, onChange }: { game: Extract<GameConfig, { type: "categories" }>; onChange: Props["onChange"] }) {
  return <div className="gameBlockEditor"><p className="gameEditorHint">Создайте коробки, затем назначьте каждому слову правильную коробку.</p>
    <div className="gameEditorCard categoryNamesEditor">{game.categories.map((category) => <label key={category.id}>Название коробки<input value={category.name} onChange={(e) => onChange({ ...game, categories: game.categories.map((item) => item.id === category.id ? { ...item, name: e.target.value } : item) })} /></label>)}<button type="button" className="gameEditorAdd" onClick={() => onChange({ ...game, categories: [...game.categories, { id: uid(), name: "Новая категория" }] })}>＋ Коробка</button></div>
    {game.items.map((item, index) => <div className="gameEditorCard categoryItemEditor" key={item.id}><div className="gameCardHeader"><EditorCardNumber index={index} /></div><label>Слово<input value={item.text} onChange={(e) => onChange({ ...game, items: game.items.map((entry) => entry.id === item.id ? { ...entry, text: e.target.value } : entry) })} /></label><label>Коробка<select value={item.categoryId} onChange={(e) => onChange({ ...game, items: game.items.map((entry) => entry.id === item.id ? { ...entry, categoryId: e.target.value } : entry) })}>{game.categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label><RemoveButton disabled={game.items.length <= 1} onClick={() => onChange({ ...game, items: game.items.filter((entry) => entry.id !== item.id) })} /></div>)}
    <button type="button" className="gameEditorAdd" onClick={() => onChange({ ...game, items: [...game.items, { id: uid(), text: "", categoryId: game.categories[0]?.id || "" }] })}>＋ Добавить слово</button>
  </div>;
}

function SentenceEditor({ game, onChange }: { game: Extract<GameConfig, { type: "sentence" }>; onChange: Props["onChange"] }) {
  return <div className="gameBlockEditor"><p className="gameEditorHint">Слова предложения будут автоматически перемешаны.</p>{game.items.map((item, index) => <div className="gameEditorCard sentenceEditorRow" key={item.id}><div className="gameCardHeader"><EditorCardNumber index={index} /></div><label>Предложение<input value={item.sentence} onChange={(e) => onChange({ ...game, items: game.items.map((entry) => entry.id === item.id ? { ...entry, sentence: e.target.value } : entry) })} /></label><label>Подсказка<input value={item.clue || ""} onChange={(e) => onChange({ ...game, items: game.items.map((entry) => entry.id === item.id ? { ...entry, clue: e.target.value } : entry) })} /></label><RemoveButton disabled={game.items.length <= 1} onClick={() => onChange({ ...game, items: game.items.filter((entry) => entry.id !== item.id) })} /></div>)}<button type="button" className="gameEditorAdd" onClick={() => onChange({ ...game, items: [...game.items, { id: uid(), sentence: "", clue: "" }] })}>＋ Добавить предложение</button></div>;
}

function TranslateSentenceEditor({ game, onChange }: { game: Extract<GameConfig, { type: "translate-sentence" }>; onChange: Props["onChange"] }) {
  const update = (items: typeof game.items) => onChange({ ...game, items });
  const patchItem = (id: string, patch: Partial<(typeof game.items)[number]>) => update(game.items.map((item) => item.id === id ? { ...item, ...patch } : item));
  return <div className="gameBlockEditor translateSentenceEditor">
    <p className="gameEditorHint">Ученик напечатает перевод. Допустимые варианты разделяйте знаком |, а каждую подсказку пишите с новой строки.</p>
    {game.items.map((item, index) => <div className="gameEditorCard translateSentenceEditorRow" key={item.id}>
      <div className="gameCardHeader"><EditorCardNumber index={index} /></div>
      <label>Предложение для перевода<input value={item.sentence} placeholder="Where are you from?" onChange={(event) => patchItem(item.id, { sentence: event.target.value })} /></label>
      <label>Допустимые переводы<input value={item.answers.join(" | ")} placeholder="Откуда ты? | Откуда вы?" onChange={(event) => patchItem(item.id, { answers: event.target.value.split("|").map((value) => value.trim()) })} /></label>
      <label className="translateHintsField">Подсказки<textarea value={item.hints.join("\n")} placeholder={'Начните со слова «Откуда»\nВ переводе два слова'} onChange={(event) => patchItem(item.id, { hints: event.target.value.split("\n").map((value) => value.trim()) })} /></label>
      <RemoveButton disabled={game.items.length <= 1} onClick={() => update(game.items.filter((entry) => entry.id !== item.id))} />
    </div>)}
    <button type="button" className="gameEditorAdd" onClick={() => update([...game.items, { id: uid(), sentence: "", answers: [], hints: [] }])}>＋ Добавить предложение</button>
  </div>;
}

export function GameBlockEditor({ block, courseLanguage, onChange }: Props) {
  if (!block.game) return null;
  if (block.game.type === "memory") return <MemoryEditor game={block.game} onChange={onChange} />;
  if (block.game.type === "build-word") return <BuildWordEditor game={block.game} onChange={onChange} />;
  if (block.game.type === "listen-choice") return <ListenEditor game={block.game} onChange={onChange} />;
  if (block.game.type === "categories") return <CategoriesEditor game={block.game} onChange={onChange} />;
  if (block.game.type === "sentence") return <SentenceEditor game={block.game} onChange={onChange} />;
  if (block.game.type === "translate-sentence") return <TranslateSentenceEditor game={block.game} onChange={onChange} />;
  return <RoundsEditor game={block.game} courseLanguage={courseLanguage} onChange={onChange} />;
}
