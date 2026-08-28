import { useMemo, useRef, useState } from "react";
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
          <span className="memoryBack">?</span><span className="memoryFace">{card.image && <img src={card.image} alt="" />}{card.text}</span>
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
      {item.image && <img className="gamePromptImage" src={item.image} alt="" />}
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

export function GameBlockView({ block, onResult }: Props) {
  if (!block.game) return <section className="learningBlock gameLearning"><p className="gameEmpty">Настройте игру в редакторе курса.</p></section>;
  if (block.game.type === "memory") return <MemoryGame block={block} game={block.game} onResult={onResult} />;
  if (block.game.type === "build-word") return <BuildWordGame block={block} game={block.game} onResult={onResult} />;
  return <ListenChoiceGame block={block} game={block.game} onResult={onResult} />;
}
