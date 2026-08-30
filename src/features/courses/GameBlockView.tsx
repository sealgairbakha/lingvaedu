import { useEffect, useMemo, useRef, useState } from "react";
import type { GameConfig, LessonBlock } from "./types";

const shuffle = <T,>(values: T[]) => {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
};
const normalize = (value: string) => value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
const isImageUrl = (value?: string) => Boolean(value && /^(https?:\/\/|data:image\/|blob:)/i.test(value));

type Props = { block: LessonBlock; onResult?: (passed: boolean) => void };

function GameHeader({ title, current, total, score }: { title: string; current: number; total: number; score: number }) {
  return <header className="gameHeader">
    <div><small>ИГРОВОЕ ЗАДАНИЕ</small><h3>{title}</h3></div>
    <div className="gameStats"><span>Раунд <b>{Math.min(current, total)} / {total}</b></span><span>Очки <b>{score}</b></span></div>
  </header>;
}

function GameComplete({ score, total, onRestart }: { score: number; total: number; onRestart: () => void }) {
  return <div className="gameComplete" role="status"><span>🏆</span><h4>Игра пройдена!</h4><p>{score} из {total} правильных</p><button type="button" onClick={onRestart}>Сыграть ещё раз</button></div>;
}

function MemoryGame({ block, game, onResult }: { block: LessonBlock; game: Extract<GameConfig, { type: "memory" }>; onResult?: Props["onResult"] }) {
  const validPairs = useMemo(() => game.pairs.filter((pair) => pair.left.trim() && pair.right.trim()), [game.pairs]);
  const createDeck = () => shuffle(validPairs.flatMap((pair) => [
    { key: `${pair.id}-left`, pairId: pair.id, text: pair.left, image: pair.leftImage },
    { key: `${pair.id}-right`, pairId: pair.id, text: pair.right, image: pair.rightImage },
  ]));
  const [deck, setDeck] = useState(createDeck);
  const [opened, setOpened] = useState<string[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [locked, setLocked] = useState(false);
  const complete = validPairs.length > 0 && matched.length === validPairs.length;
  const choose = (key: string) => {
    if (locked || opened.includes(key) || matched.some((pairId) => deck.find((card) => card.key === key)?.pairId === pairId)) return;
    const next = [...opened, key];
    setOpened(next);
    if (next.length < 2) return;
    const [first, second] = next.map((item) => deck.find((card) => card.key === item));
    if (first && second && first.pairId === second.pairId) {
      window.setTimeout(() => {
        const result = [...matched, first.pairId];
        setMatched(result);
        if (result.length === validPairs.length) onResult?.(true);
        setOpened([]);
      }, 450);
    } else {
      setLocked(true);
      window.setTimeout(() => { setOpened([]); setLocked(false); }, 850);
    }
  };
  const restart = () => { setDeck(createDeck()); setOpened([]); setMatched([]); setLocked(false); onResult?.(false); };
  return <section className="learningBlock gameLearning memoryGame">
    <GameHeader title={block.title} current={matched.length} total={validPairs.length} score={matched.length} />
    {!validPairs.length ? <p className="gameEmpty">Добавьте хотя бы две заполненные пары.</p> : complete ? <GameComplete score={matched.length} total={validPairs.length} onRestart={restart} /> :
      <div className="memoryGrid">{deck.map((card) => {
        const visible = opened.includes(card.key) || matched.includes(card.pairId);
        return <button type="button" key={card.key} className={`${visible ? "visible" : ""} ${matched.includes(card.pairId) ? "matched" : ""}`} onClick={() => choose(card.key)} aria-label={visible ? card.text : "Открыть карточку"}>
          <span className="memoryBack">?</span><span className="memoryFace">{card.image && (isImageUrl(card.image) ? <img src={card.image} alt="" /> : <span className="gameCardEmoji" aria-hidden="true">{card.image}</span>)}{card.text}</span>
        </button>;
      })}</div>}
  </section>;
}

function BuildWordGame({ block, game, onResult }: { block: LessonBlock; game: Extract<GameConfig, { type: "build-word" }>; onResult?: Props["onResult"] }) {
  const items = useMemo(() => game.items.filter((item) => item.word.trim()), [game.items]);
  const [round, setRound] = useState(0);
  const [chosen, setChosen] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<"" | "good" | "bad">("");
  const item = items[round];
  const letters = useMemo(() => item ? shuffle([...item.word].map((letter, index) => ({ letter, index }))) : [], [item]);
  const answer = chosen.map((index) => letters[index]?.letter || "").join("");
  const complete = items.length > 0 && round >= items.length;
  const check = () => {
    if (!item || !answer) return;
    if (normalize(answer) === normalize(item.word)) {
      setScore((value) => value + 1); setFeedback("good");
      window.setTimeout(() => {
        if (round === items.length - 1) onResult?.(true);
        setRound((value) => value + 1); setChosen([]); setFeedback("");
      }, 650);
    } else { setFeedback("bad"); window.setTimeout(() => setFeedback(""), 800); }
  };
  const restart = () => { setRound(0); setChosen([]); setScore(0); setFeedback(""); onResult?.(false); };
  return <section className="learningBlock gameLearning buildWordGame">
    <GameHeader title={block.title} current={round + 1} total={items.length} score={score} />
    {!items.length ? <p className="gameEmpty">Добавьте хотя бы одно слово.</p> : complete ? <GameComplete score={score} total={items.length} onRestart={restart} /> : item && <div className="buildWordBoard">
      {item.image && (isImageUrl(item.image) ? <img className="gamePromptImage" src={item.image} alt="" /> : <span className="gamePromptEmoji" aria-hidden="true">{item.image}</span>)}
      <p className="gameClue">{item.clue || "Соберите слово"}</p>
      <div className={`wordSlots ${feedback}`}>{[...item.word].map((_, index) => <button type="button" key={index} onClick={() => setChosen((value) => value.filter((__, chosenIndex) => chosenIndex !== index))}>{answer[index] || ""}</button>)}</div>
      <div className="letterBank">{letters.map((entry, index) => <button type="button" key={`${entry.index}-${index}`} disabled={chosen.includes(index)} onClick={() => setChosen((value) => [...value, index])}>{entry.letter}</button>)}</div>
      <div className="gameActions"><button type="button" className="secondary" onClick={() => setChosen([])}>Очистить</button><button type="button" className="primary" disabled={chosen.length !== [...item.word].length} onClick={check}>Проверить</button></div>
    </div>}
  </section>;
}

function ListenChoiceGame({ block, game, onResult }: { block: LessonBlock; game: Extract<GameConfig, { type: "listen-choice" }>; onResult?: Props["onResult"] }) {
  const items = useMemo(() => game.items.filter((item) => item.phrase.trim() && item.answer.trim()), [game.items]);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState("");
  const [checked, setChecked] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const item = items[round];
  const options = useMemo(() => item ? shuffle(Array.from(new Set([item.answer, ...item.options].filter(Boolean)))) : [], [item]);
  const complete = items.length > 0 && round >= items.length;
  const play = () => {
    if (!item) return;
    if (item.audio) { audioRef.current?.pause(); audioRef.current = new Audio(item.audio); void audioRef.current.play(); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(item.phrase); utterance.lang = game.language || "en-US"; window.speechSynthesis.speak(utterance);
  };
  const check = () => { if (!item || !selected) return; setChecked(true); if (normalize(selected) === normalize(item.answer)) setScore((value) => value + 1); };
  const next = () => {
    if (round === items.length - 1) onResult?.(true);
    setRound((value) => value + 1); setSelected(""); setChecked(false);
  };
  const restart = () => { setRound(0); setScore(0); setSelected(""); setChecked(false); onResult?.(false); };
  return <section className="learningBlock gameLearning listenChoiceGame">
    <GameHeader title={block.title} current={round + 1} total={items.length} score={score} />
    {!items.length ? <p className="gameEmpty">Добавьте хотя бы один заполненный вопрос.</p> : complete ? <GameComplete score={score} total={items.length} onRestart={restart} /> : item && <div className="listenBoard">
      <button type="button" className="listenButton" onClick={play}><span>🔊</span> Прослушать</button>
      <p>Выберите правильный ответ</p>
      <div className="listenOptions">{options.map((option) => <button type="button" key={option} disabled={checked} className={`${selected === option ? "selected" : ""} ${checked && normalize(option) === normalize(item.answer) ? "correct" : ""} ${checked && selected === option && normalize(option) !== normalize(item.answer) ? "wrong" : ""}`} onClick={() => setSelected(option)}>{option}</button>)}</div>
      <div className="gameActions">{checked ? <button type="button" className="primary" onClick={next}>{round === items.length - 1 ? "Завершить" : "Следующий вопрос"}</button> : <button type="button" className="primary" disabled={!selected} onClick={check}>Проверить</button>}</div>
    </div>}
  </section>;
}

type ChoiceRound = { id: string; prompt?: string; answer: string; options: string[]; explanation?: string };
function ChoiceGame({ block, rounds, onResult, mode, seconds = 0, heroName = "Герой" }: { block: LessonBlock; rounds: ChoiceRound[]; onResult?: Props["onResult"]; mode: "odd" | "speed" | "adventure"; seconds?: number; heroName?: string }) {
  const valid = useMemo(() => rounds.filter((item) => item.answer.trim() && item.options.length), [rounds]);
  const [round, setRound] = useState(0); const [score, setScore] = useState(0); const [selected, setSelected] = useState(""); const [checked, setChecked] = useState(false); const [left, setLeft] = useState(seconds);
  const item = valid[round]; const complete = valid.length > 0 && round >= valid.length;
  const displayOptions = useMemo(() => item ? shuffle(item.options) : [], [item]);
  useEffect(() => { if (mode !== "speed" || !item || checked) return; const timer = window.setInterval(() => setLeft((value) => { if (value <= 1) { window.clearInterval(timer); setChecked(true); return 0; } return value - 1; }), 1000); return () => window.clearInterval(timer); }, [checked, item, mode]);
  const check = () => { if (!item || !selected) return; setChecked(true); if (normalize(selected) === normalize(item.answer)) setScore((value) => value + 1); };
  const next = () => { if (round === valid.length - 1) onResult?.(true); setRound((value) => value + 1); setSelected(""); setChecked(false); setLeft(seconds); };
  const restart = () => { setRound(0); setScore(0); setSelected(""); setChecked(false); setLeft(seconds); onResult?.(false); };
  return <section className={`learningBlock gameLearning choiceGame ${mode}`}><GameHeader title={block.title} current={round + 1} total={valid.length} score={score} />
    {!valid.length ? <p className="gameEmpty">Добавьте хотя бы один заполненный раунд.</p> : complete ? <GameComplete score={score} total={valid.length} onRestart={restart} /> : item && <div className="choiceGameBoard">
      {mode === "adventure" && <div className="adventureTrail"><span>🧭</span><b>{heroName}</b><i style={{ width: `${(round / valid.length) * 100}%` }} /></div>}
      {mode === "speed" && <div className={`speedTimer ${left <= 3 ? "urgent" : ""}`}>⏱ {left} сек.</div>}
      <p className="gameClue">{item.prompt || (mode === "odd" ? "Найдите лишнее слово" : "Выберите ответ")}</p>
      <div className="listenOptions">{displayOptions.map((option) => <button type="button" key={option} disabled={checked} className={`${selected === option ? "selected" : ""} ${checked && normalize(option) === normalize(item.answer) ? "correct" : ""} ${checked && selected === option && normalize(option) !== normalize(item.answer) ? "wrong" : ""}`} onClick={() => setSelected(option)}>{option}</button>)}</div>
      {checked && item.explanation && <p className="gameExplanation">{item.explanation}</p>}
      <div className="gameActions">{checked ? <button type="button" className="primary" onClick={next}>{round === valid.length - 1 ? "Завершить" : "Дальше"}</button> : <button type="button" className="primary" disabled={!selected} onClick={check}>Проверить</button>}</div>
    </div>}
  </section>;
}

function MissingGame({ block, game, onResult }: { block: LessonBlock; game: Extract<GameConfig, { type: "missing" }>; onResult?: Props["onResult"] }) {
  const valid = useMemo(() => game.rounds.filter((item) => item.items.length > 1 && item.missing), [game.rounds]);
  const [round, setRound] = useState(0); const [phase, setPhase] = useState<"remember" | "answer">("remember"); const [selected, setSelected] = useState(""); const [checked, setChecked] = useState(false); const [score, setScore] = useState(0);
  const item = valid[round]; const complete = valid.length > 0 && round >= valid.length;
  const options = useMemo(() => item ? shuffle(item.items) : [], [item]);
  useEffect(() => { if (!item || phase !== "remember") return; const timer = window.setTimeout(() => setPhase("answer"), Math.max(2, game.revealSeconds) * 1000); return () => window.clearTimeout(timer); }, [game.revealSeconds, item, phase]);
  const next = () => { if (round === valid.length - 1) onResult?.(true); setRound((v) => v + 1); setPhase("remember"); setSelected(""); setChecked(false); };
  const restart = () => { setRound(0); setPhase("remember"); setSelected(""); setChecked(false); setScore(0); onResult?.(false); };
  return <section className="learningBlock gameLearning missingGame"><GameHeader title={block.title} current={round + 1} total={valid.length} score={score} />{!valid.length ? <p className="gameEmpty">Добавьте заполненный раунд.</p> : complete ? <GameComplete score={score} total={valid.length} onRestart={restart} /> : item && <div className="missingBoard"><p className="gameClue">{phase === "remember" ? `Запомните предметы — ${game.revealSeconds} сек.` : "Что исчезло?"}</p><div className="missingItems">{(phase === "remember" ? item.items : item.items.filter((value) => normalize(value) !== normalize(item.missing))).map((value) => <span key={value}>{value}</span>)}</div>{phase === "answer" && <><div className="listenOptions">{options.map((option) => <button type="button" key={option} disabled={checked} className={`${selected === option ? "selected" : ""} ${checked && normalize(option) === normalize(item.missing) ? "correct" : ""}`} onClick={() => setSelected(option)}>{option}</button>)}</div><div className="gameActions">{checked ? <button className="primary" type="button" onClick={next}>Дальше</button> : <button className="primary" type="button" disabled={!selected} onClick={() => { setChecked(true); if (normalize(selected) === normalize(item.missing)) setScore((v) => v + 1); }}>Проверить</button>}</div></>}</div>}</section>;
}

function TruthGame({ block, game, onResult }: { block: LessonBlock; game: Extract<GameConfig, { type: "truth" }>; onResult?: Props["onResult"] }) {
  const rounds: ChoiceRound[] = game.rounds.map((item) => ({ id: item.id, prompt: `${item.prompt ? `${item.prompt}\n` : ""}${item.statement}`, answer: item.correct ? "Правда" : "Ошибка", options: ["Правда", "Ошибка"] }));
  return <ChoiceGame block={block} rounds={rounds} mode="odd" onResult={onResult} />;
}

function CategoriesGame({ block, game, onResult }: { block: LessonBlock; game: Extract<GameConfig, { type: "categories" }>; onResult?: Props["onResult"] }) {
  const [placed, setPlaced] = useState<Record<string, string>>({}); const [active, setActive] = useState(""); const [checked, setChecked] = useState(false); const [complete, setComplete] = useState(false);
  const valid = game.items.filter((item) => item.text.trim()); const correct = valid.filter((item) => placed[item.id] === item.categoryId).length;
  const restart = () => { setPlaced({}); setActive(""); setChecked(false); setComplete(false); onResult?.(false); };
  return <section className="learningBlock gameLearning categoriesGame"><GameHeader title={block.title} current={Object.keys(placed).length} total={valid.length} score={checked ? correct : 0} />{complete ? <GameComplete score={correct} total={valid.length} onRestart={restart} /> : <div className="categoriesBoard"><p className="gameClue">Выберите слово, затем его коробку</p><div className="categoryTokens">{valid.filter((item) => !placed[item.id]).map((item) => <button type="button" className={active === item.id ? "selected" : ""} onClick={() => { setActive(item.id); setChecked(false); }} key={item.id}>{item.text}</button>)}</div><div className="categoryBoxes">{game.categories.map((category) => <button type="button" key={category.id} onClick={() => { if (!active) return; setPlaced((value) => ({ ...value, [active]: category.id })); setActive(""); setChecked(false); }}><b>📦 {category.name}</b>{valid.filter((item) => placed[item.id] === category.id).map((item) => <span key={item.id}>{item.text}</span>)}</button>)}</div>{checked && correct !== valid.length && <p className="gameExplanation">Есть ошибки — нажмите на слово в коробке, чтобы вернуть его.</p>}<div className="gameActions"><button type="button" className="secondary" onClick={() => setPlaced({})}>Сбросить</button><button type="button" className="primary" disabled={Object.keys(placed).length !== valid.length} onClick={() => { setChecked(true); if (correct === valid.length) { setComplete(true); onResult?.(true); } }}>Проверить</button></div></div>}</section>;
}

function SentenceGame({ block, game, onResult }: { block: LessonBlock; game: Extract<GameConfig, { type: "sentence" }>; onResult?: Props["onResult"] }) {
  const items = useMemo(() => game.items.filter((item) => item.sentence.trim()), [game.items]); const [round, setRound] = useState(0); const [chosen, setChosen] = useState<number[]>([]); const [score, setScore] = useState(0); const [bad, setBad] = useState(false); const item = items[round];
  const words = useMemo(() => item ? shuffle(item.sentence.trim().split(/\s+/).map((word, id) => ({ word, id }))) : [], [item]); const answer = chosen.map((index) => words[index]?.word).join(" "); const complete = items.length > 0 && round >= items.length;
  const restart = () => { setRound(0); setChosen([]); setScore(0); setBad(false); onResult?.(false); };
  return <section className="learningBlock gameLearning sentenceGame"><GameHeader title={block.title} current={round + 1} total={items.length} score={score} />{!items.length ? <p className="gameEmpty">Добавьте предложение.</p> : complete ? <GameComplete score={score} total={items.length} onRestart={restart} /> : item && <div className="sentenceBoard"><p className="gameClue">{item.clue || "Составьте предложение"}</p><div className={`sentenceAnswer ${bad ? "wrong" : ""}`}>{answer || "Нажимайте на слова по порядку"}</div><div className="sentenceWords">{words.map((entry, index) => <button type="button" disabled={chosen.includes(index)} key={`${entry.id}-${entry.word}`} onClick={() => { setChosen((value) => [...value, index]); setBad(false); }}>{entry.word}</button>)}</div><div className="gameActions"><button type="button" className="secondary" onClick={() => setChosen([])}>Очистить</button><button type="button" className="primary" disabled={chosen.length !== words.length} onClick={() => { if (normalize(answer) === normalize(item.sentence)) { const last = round === items.length - 1; setScore((v) => v + 1); setRound((v) => v + 1); setChosen([]); if (last) onResult?.(true); } else setBad(true); }}>Проверить</button></div></div>}</section>;
}

export function GameBlockView({ block, onResult }: Props) {
  if (!block.game) return <section className="learningBlock gameLearning"><p className="gameEmpty">Настройте игру в редакторе курса.</p></section>;
  if (block.game.type === "memory") return <MemoryGame block={block} game={block.game} onResult={onResult} />;
  if (block.game.type === "build-word") return <BuildWordGame block={block} game={block.game} onResult={onResult} />;
  if (block.game.type === "listen-choice") return <ListenChoiceGame block={block} game={block.game} onResult={onResult} />;
  if (block.game.type === "missing") return <MissingGame block={block} game={block.game} onResult={onResult} />;
  if (block.game.type === "odd-one-out") return <ChoiceGame block={block} rounds={block.game.rounds} mode="odd" onResult={onResult} />;
  if (block.game.type === "speed") return <ChoiceGame block={block} rounds={block.game.rounds} mode="speed" seconds={block.game.seconds} onResult={onResult} />;
  if (block.game.type === "truth") return <TruthGame block={block} game={block.game} onResult={onResult} />;
  if (block.game.type === "categories") return <CategoriesGame block={block} game={block.game} onResult={onResult} />;
  if (block.game.type === "sentence") return <SentenceGame block={block} game={block.game} onResult={onResult} />;
  return <ChoiceGame block={block} rounds={block.game.stages} mode="adventure" heroName={block.game.heroName} onResult={onResult} />;
}
