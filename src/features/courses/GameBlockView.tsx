import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { GameConfig, LessonBlock } from "./types";
import { getCourseTaskLocale, type CourseTaskLocale } from "./courseTaskLocale";

const shuffle = <T,>(values: T[]) => {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
};
const normalize = (value: string) => value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
const normalizeTranslation = (value: string) => normalize(value)
  .replace(/ё/g, "е")
  .replace(/[.,!?;:"“”«»()[\]{}]/g, "")
  .replace(/\s+/g, " ")
  .trim();
const isImageUrl = (value?: string) => Boolean(value && /^(https?:\/\/|data:image\/|blob:)/i.test(value));

type Props = { block: LessonBlock; courseLanguage?: string; onResult?: (passed: boolean) => void };
const GameLocaleContext = createContext<CourseTaskLocale>(getCourseTaskLocale());
const useGameLocale = () => useContext(GameLocaleContext);

const translationCopy = {
  ru: { instruction: "ПЕРЕВЕДИТЕ ПРЕДЛОЖЕНИЕ", answer: "Ваш перевод", placeholder: "Напишите перевод…", hints: "Подсказки", correct: "Верно! Отличный перевод.", wrong: "Пока не совпало. Проверьте перевод и попробуйте ещё раз.", showHint: "Показать подсказку", moreHint: "Ещё подсказка", empty: "Добавьте предложение и хотя бы один перевод.", wordCount: (count: number) => `В переводе ${count} ${count === 1 ? "слово" : count < 5 ? "слова" : "слов"}`, initialLetters: (mask: string) => `Первые буквы: ${mask}` },
  en: { instruction: "TRANSLATE THE SENTENCE", answer: "Your translation", placeholder: "Type your translation…", hints: "Hints", correct: "Correct! Great translation.", wrong: "Not quite yet. Check your translation and try again.", showHint: "Show a hint", moreHint: "Another hint", empty: "Add a sentence and at least one translation.", wordCount: (count: number) => `The translation has ${count} ${count === 1 ? "word" : "words"}`, initialLetters: (mask: string) => `First letters: ${mask}` },
  kk: { instruction: "СӨЙЛЕМДІ АУДАРЫҢЫЗ", answer: "Сіздің аудармаңыз", placeholder: "Аударманы жазыңыз…", hints: "Көмектер", correct: "Дұрыс! Тамаша аударма.", wrong: "Әзірге сәйкес емес. Аударманы тексеріп, қайталап көріңіз.", showHint: "Көмекті көрсету", moreHint: "Тағы бір көмек", empty: "Сөйлем мен кемінде бір аударма қосыңыз.", wordCount: (count: number) => `Аудармада ${count} сөз бар`, initialLetters: (mask: string) => `Алғашқы әріптер: ${mask}` },
  ko: { instruction: "문장을 번역하세요", answer: "번역", placeholder: "번역을 입력하세요…", hints: "힌트", correct: "정답입니다! 훌륭한 번역이에요.", wrong: "아직 일치하지 않습니다. 번역을 확인하고 다시 시도하세요.", showHint: "힌트 보기", moreHint: "다른 힌트", empty: "문장과 번역을 하나 이상 추가하세요.", wordCount: (count: number) => `번역은 ${count}개 단어입니다`, initialLetters: (mask: string) => `첫 글자: ${mask}` },
  "zh-CN": { instruction: "翻译句子", answer: "你的翻译", placeholder: "输入翻译…", hints: "提示", correct: "正确！翻译得很好。", wrong: "还不完全正确。请检查后重试。", showHint: "显示提示", moreHint: "再来一个提示", empty: "请添加句子和至少一个译文。", wordCount: (count: number) => `译文有 ${count} 个词`, initialLetters: (mask: string) => `首字母：${mask}` },
  ja: { instruction: "文を翻訳してください", answer: "あなたの翻訳", placeholder: "翻訳を入力…", hints: "ヒント", correct: "正解です！すばらしい翻訳です。", wrong: "まだ一致していません。翻訳を確認してもう一度お試しください。", showHint: "ヒントを見る", moreHint: "次のヒント", empty: "文と翻訳を1つ以上追加してください。", wordCount: (count: number) => `翻訳は${count}語です`, initialLetters: (mask: string) => `最初の文字：${mask}` },
};

function GameHeader({ title, current, total, score }: { title: string; current: number; total: number; score: number }) {
  const labels = useGameLocale();
  return <header className="gameHeader">
    <div><small>{labels.gameTask}</small><h3>{title}</h3></div>
    <div className="gameStats"><span>{labels.round} <b>{Math.min(current, total)} / {total}</b></span><span>{labels.score} <b>{score}</b></span></div>
  </header>;
}

function GameComplete({ score, total, onRestart }: { score: number; total: number; onRestart: () => void }) {
  const labels = useGameLocale();
  return <div className="gameComplete" role="status"><span>🏆</span><h4>{labels.gameComplete}</h4><p>{labels.correctOf(score, total)}</p><button type="button" onClick={onRestart}>{labels.playAgain}</button></div>;
}

function MemoryGame({ block, game, onResult }: { block: LessonBlock; game: Extract<GameConfig, { type: "memory" }>; onResult?: Props["onResult"] }) {
  const labels = useGameLocale();
  const validPairs = useMemo(() => game.pairs.filter((pair) => (pair.left.trim() || pair.leftImage) && (pair.right.trim() || pair.rightImage)), [game.pairs]);
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
    {!validPairs.length ? <p className="gameEmpty">{labels.emptyPairs}</p> : complete ? <GameComplete score={matched.length} total={validPairs.length} onRestart={restart} /> :
      <div className="memoryGrid">{deck.map((card) => {
        const isMatched = matched.includes(card.pairId);
        const visible = opened.includes(card.key) || isMatched;
        return <button type="button" key={card.key} className={`${visible ? "visible" : ""} ${isMatched ? "matched" : ""}`} onClick={() => choose(card.key)} aria-label={visible ? card.text || labels.emoji : labels.openCard}>
          <span className="memoryBack">{isMatched ? "✓" : "?"}</span><span className="memoryFace">{card.image && (isImageUrl(card.image) ? <img src={card.image} alt="" /> : <span className="gameCardEmoji" aria-hidden="true">{card.image}</span>)}{card.text}</span>
        </button>;
      })}</div>}
  </section>;
}

function BuildWordGame({ block, game, onResult }: { block: LessonBlock; game: Extract<GameConfig, { type: "build-word" }>; onResult?: Props["onResult"] }) {
  const labels = useGameLocale();
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
    {!items.length ? <p className="gameEmpty">{labels.emptyWord}</p> : complete ? <GameComplete score={score} total={items.length} onRestart={restart} /> : item && <div className="buildWordBoard">
      {item.image && (isImageUrl(item.image) ? <img className="gamePromptImage" src={item.image} alt="" /> : <span className="gamePromptEmoji" aria-hidden="true">{item.image}</span>)}
      <p className="gameClue">{item.clue || labels.buildWord}</p>
      <div className={`wordSlots ${feedback}`}>{[...item.word].map((_, index) => <button type="button" key={index} onClick={() => setChosen((value) => value.filter((__, chosenIndex) => chosenIndex !== index))}>{answer[index] || ""}</button>)}</div>
      <div className="letterBank">{letters.map((entry, index) => <button type="button" key={`${entry.index}-${index}`} disabled={chosen.includes(index)} onClick={() => setChosen((value) => [...value, index])}>{entry.letter}</button>)}</div>
      <div className="gameActions"><button type="button" className="secondary" onClick={() => setChosen([])}>{labels.clear}</button><button type="button" className="primary" disabled={chosen.length !== [...item.word].length} onClick={check}>{labels.check}</button></div>
    </div>}
  </section>;
}

function ListenChoiceGame({ block, game, onResult }: { block: LessonBlock; game: Extract<GameConfig, { type: "listen-choice" }>; onResult?: Props["onResult"] }) {
  const labels = useGameLocale();
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
    {!items.length ? <p className="gameEmpty">{labels.emptyQuestion}</p> : complete ? <GameComplete score={score} total={items.length} onRestart={restart} /> : item && <div className="listenBoard">
      <button type="button" className="listenButton" onClick={play}><span>🔊</span> {labels.listen}</button>
      <p>{labels.chooseCorrect}</p>
      <div className="listenOptions">{options.map((option) => <button type="button" key={option} disabled={checked} className={`${selected === option ? "selected" : ""} ${checked && normalize(option) === normalize(item.answer) ? "correct" : ""} ${checked && selected === option && normalize(option) !== normalize(item.answer) ? "wrong" : ""}`} onClick={() => setSelected(option)}>{option}</button>)}</div>
      <div className="gameActions">{checked ? <button type="button" className="primary" onClick={next}>{round === items.length - 1 ? labels.finish : labels.nextQuestion}</button> : <button type="button" className="primary" disabled={!selected} onClick={check}>{labels.check}</button>}</div>
    </div>}
  </section>;
}

type ChoiceRound = { id: string; prompt?: string; answer: string; options: string[]; explanation?: string };
function ChoiceGame({ block, rounds, onResult, mode, seconds = 0, heroName = "Герой" }: { block: LessonBlock; rounds: ChoiceRound[]; onResult?: Props["onResult"]; mode: "odd" | "speed" | "adventure"; seconds?: number; heroName?: string }) {
  const labels = useGameLocale();
  const valid = useMemo(() => rounds.filter((item) => item.answer.trim() && item.options.length), [rounds]);
  const [round, setRound] = useState(0); const [score, setScore] = useState(0); const [selected, setSelected] = useState(""); const [checked, setChecked] = useState(false); const [left, setLeft] = useState(seconds);
  const item = valid[round]; const complete = valid.length > 0 && round >= valid.length;
  const displayOptions = useMemo(() => item ? shuffle(item.options) : [], [item]);
  useEffect(() => { if (mode !== "speed" || !item || checked) return; const timer = window.setInterval(() => setLeft((value) => { if (value <= 1) { window.clearInterval(timer); setChecked(true); return 0; } return value - 1; }), 1000); return () => window.clearInterval(timer); }, [checked, item, mode]);
  const check = () => { if (!item || !selected) return; setChecked(true); if (normalize(selected) === normalize(item.answer)) setScore((value) => value + 1); };
  const next = () => { if (round === valid.length - 1) onResult?.(true); setRound((value) => value + 1); setSelected(""); setChecked(false); setLeft(seconds); };
  const restart = () => { setRound(0); setScore(0); setSelected(""); setChecked(false); setLeft(seconds); onResult?.(false); };
  return <section className={`learningBlock gameLearning choiceGame ${mode}`}><GameHeader title={block.title} current={round + 1} total={valid.length} score={score} />
    {!valid.length ? <p className="gameEmpty">{labels.emptyRound}</p> : complete ? <GameComplete score={score} total={valid.length} onRestart={restart} /> : item && <div className="choiceGameBoard">
      {mode === "adventure" && <div className="adventureTrail"><span>🧭</span><b>{heroName}</b><i style={{ width: `${(round / valid.length) * 100}%` }} /></div>}
      {mode === "speed" && <div className={`speedTimer ${left <= 3 ? "urgent" : ""}`}>⏱ {left} {labels.secondsShort}</div>}
      <p className="gameClue">{item.prompt || (mode === "odd" ? labels.oddOneOut : labels.chooseAnswer)}</p>
      <div className="listenOptions">{displayOptions.map((option) => <button type="button" key={option} disabled={checked} className={`${selected === option ? "selected" : ""} ${checked && normalize(option) === normalize(item.answer) ? "correct" : ""} ${checked && selected === option && normalize(option) !== normalize(item.answer) ? "wrong" : ""}`} onClick={() => setSelected(option)}>{option}</button>)}</div>
      {checked && item.explanation && <p className="gameExplanation">{item.explanation}</p>}
      <div className="gameActions">{checked ? <button type="button" className="primary" onClick={next}>{round === valid.length - 1 ? labels.finish : labels.next}</button> : <button type="button" className="primary" disabled={!selected} onClick={check}>{labels.check}</button>}</div>
    </div>}
  </section>;
}

function MissingGame({ block, game, onResult }: { block: LessonBlock; game: Extract<GameConfig, { type: "missing" }>; onResult?: Props["onResult"] }) {
  const labels = useGameLocale();
  const valid = useMemo(() => game.rounds.filter((item) => item.items.length > 1 && item.missing), [game.rounds]);
  const [round, setRound] = useState(0); const [phase, setPhase] = useState<"remember" | "answer">("remember"); const [selected, setSelected] = useState(""); const [checked, setChecked] = useState(false); const [score, setScore] = useState(0);
  const item = valid[round]; const complete = valid.length > 0 && round >= valid.length;
  const options = useMemo(() => item ? shuffle(item.items) : [], [item]);
  useEffect(() => { if (!item || phase !== "remember") return; const timer = window.setTimeout(() => setPhase("answer"), Math.max(2, game.revealSeconds) * 1000); return () => window.clearTimeout(timer); }, [game.revealSeconds, item, phase]);
  const next = () => { if (round === valid.length - 1) onResult?.(true); setRound((v) => v + 1); setPhase("remember"); setSelected(""); setChecked(false); };
  const restart = () => { setRound(0); setPhase("remember"); setSelected(""); setChecked(false); setScore(0); onResult?.(false); };
  return <section className="learningBlock gameLearning missingGame"><GameHeader title={block.title} current={round + 1} total={valid.length} score={score} />{!valid.length ? <p className="gameEmpty">{labels.emptyRound}</p> : complete ? <GameComplete score={score} total={valid.length} onRestart={restart} /> : item && <div className="missingBoard"><p className="gameClue">{phase === "remember" ? labels.rememberItems(game.revealSeconds) : labels.whatDisappeared}</p><div className="missingItems">{(phase === "remember" ? item.items : item.items.filter((value) => normalize(value) !== normalize(item.missing))).map((value) => <span key={value}>{value}</span>)}</div>{phase === "answer" && <><div className="listenOptions">{options.map((option) => <button type="button" key={option} disabled={checked} className={`${selected === option ? "selected" : ""} ${checked && normalize(option) === normalize(item.missing) ? "correct" : ""}`} onClick={() => setSelected(option)}>{option}</button>)}</div><div className="gameActions">{checked ? <button className="primary" type="button" onClick={next}>{labels.next}</button> : <button className="primary" type="button" disabled={!selected} onClick={() => { setChecked(true); if (normalize(selected) === normalize(item.missing)) setScore((v) => v + 1); }}>{labels.check}</button>}</div></>}</div>}</section>;
}

function TruthGame({ block, game, onResult }: { block: LessonBlock; game: Extract<GameConfig, { type: "truth" }>; onResult?: Props["onResult"] }) {
  const labels = useGameLocale();
  const rounds: ChoiceRound[] = game.rounds.map((item) => ({ id: item.id, prompt: `${item.prompt ? `${item.prompt}\n` : ""}${item.statement}`, answer: item.correct ? labels.trueLabel : labels.falseLabel, options: [labels.trueLabel, labels.falseLabel] }));
  return <ChoiceGame block={block} rounds={rounds} mode="odd" onResult={onResult} />;
}

function CategoriesGame({ block, game, onResult }: { block: LessonBlock; game: Extract<GameConfig, { type: "categories" }>; onResult?: Props["onResult"] }) {
  const labels = useGameLocale();
  const [placed, setPlaced] = useState<Record<string, string>>({}); const [active, setActive] = useState(""); const [checked, setChecked] = useState(false); const [complete, setComplete] = useState(false);
  const valid = game.items.filter((item) => item.text.trim()); const correct = valid.filter((item) => placed[item.id] === item.categoryId).length;
  const restart = () => { setPlaced({}); setActive(""); setChecked(false); setComplete(false); onResult?.(false); };
  return <section className="learningBlock gameLearning categoriesGame"><GameHeader title={block.title} current={Object.keys(placed).length} total={valid.length} score={checked ? correct : 0} />{complete ? <GameComplete score={correct} total={valid.length} onRestart={restart} /> : <div className="categoriesBoard"><p className="gameClue">{labels.selectWordCategory}</p><div className="categoryTokens">{valid.filter((item) => !placed[item.id]).map((item) => <button type="button" className={active === item.id ? "selected" : ""} onClick={() => { setActive(item.id); setChecked(false); }} key={item.id}>{item.text}</button>)}</div><div className="categoryBoxes">{game.categories.map((category) => <button type="button" key={category.id} onClick={() => { if (!active) return; setPlaced((value) => ({ ...value, [active]: category.id })); setActive(""); setChecked(false); }}><b>📦 {category.name}</b>{valid.filter((item) => placed[item.id] === category.id).map((item) => <span key={item.id}>{item.text}</span>)}</button>)}</div>{checked && correct !== valid.length && <p className="gameExplanation">{labels.categoryErrors}</p>}<div className="gameActions"><button type="button" className="secondary" onClick={() => setPlaced({})}>{labels.reset}</button><button type="button" className="primary" disabled={Object.keys(placed).length !== valid.length} onClick={() => { setChecked(true); if (correct === valid.length) { setComplete(true); onResult?.(true); } }}>{labels.check}</button></div></div>}</section>;
}

function SentenceGame({ block, game, onResult }: { block: LessonBlock; game: Extract<GameConfig, { type: "sentence" }>; onResult?: Props["onResult"] }) {
  const labels = useGameLocale();
  const items = useMemo(() => game.items.filter((item) => item.sentence.trim()), [game.items]); const [round, setRound] = useState(0); const [chosen, setChosen] = useState<number[]>([]); const [score, setScore] = useState(0); const [bad, setBad] = useState(false); const item = items[round];
  const words = useMemo(() => item ? shuffle(item.sentence.trim().split(/\s+/).map((word, id) => ({ word, id }))) : [], [item]); const answer = chosen.map((index) => words[index]?.word).join(" "); const complete = items.length > 0 && round >= items.length;
  const restart = () => { setRound(0); setChosen([]); setScore(0); setBad(false); onResult?.(false); };
  return <section className="learningBlock gameLearning sentenceGame"><GameHeader title={block.title} current={round + 1} total={items.length} score={score} />{!items.length ? <p className="gameEmpty">{labels.emptySentence}</p> : complete ? <GameComplete score={score} total={items.length} onRestart={restart} /> : item && <div className="sentenceBoard"><p className="gameClue">{item.clue || labels.buildSentence}</p><div className={`sentenceAnswer ${bad ? "wrong" : ""}`}>{answer || labels.tapWords}</div><div className="sentenceWords">{words.map((entry, index) => <button type="button" disabled={chosen.includes(index)} key={`${entry.id}-${entry.word}`} onClick={() => { setChosen((value) => [...value, index]); setBad(false); }}>{entry.word}</button>)}</div><div className="gameActions"><button type="button" className="secondary" onClick={() => setChosen([])}>{labels.clear}</button><button type="button" className="primary" disabled={chosen.length !== words.length} onClick={() => { if (normalize(answer) === normalize(item.sentence)) { const last = round === items.length - 1; setScore((v) => v + 1); setRound((v) => v + 1); setChosen([]); if (last) onResult?.(true); } else setBad(true); }}>{labels.check}</button></div></div>}</section>;
}

function makeTranslationHints(answer: string, copy: (typeof translationCopy)[keyof typeof translationCopy]) {
  const words = answer.trim().split(/\s+/).filter(Boolean);
  const mask = words.map((word) => `${word[0] || ""}${"•".repeat(Math.max(1, [...word].length - 1))}`).join(" ");
  return [copy.wordCount(words.length), copy.initialLetters(mask)];
}

function TranslateSentenceGame({ block, game, onResult }: { block: LessonBlock; game: Extract<GameConfig, { type: "translate-sentence" }>; onResult?: Props["onResult"] }) {
  const labels = useGameLocale();
  const copy = translationCopy[labels.htmlLang as keyof typeof translationCopy] || translationCopy.ru;
  const items = useMemo(() => game.items.filter((item) => item.sentence.trim() && item.answers.some((answer) => answer.trim())), [game.items]);
  const [round, setRound] = useState(0);
  const [answer, setAnswer] = useState("");
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<"idle" | "wrong" | "correct">("idle");
  const [visibleHints, setVisibleHints] = useState(0);
  const item = items[round];
  const complete = items.length > 0 && round >= items.length;
  const hints = useMemo(() => item ? (item.hints.filter((hint) => hint.trim()).length ? item.hints.filter((hint) => hint.trim()) : makeTranslationHints(item.answers[0] || "", copy)) : [], [copy, item]);
  const check = () => {
    if (!item || !answer.trim() || feedback === "correct") return;
    const isCorrect = item.answers.some((variant) => normalizeTranslation(variant) === normalizeTranslation(answer));
    if (isCorrect) {
      setFeedback("correct");
      setScore((value) => value + 1);
      if (round === items.length - 1) onResult?.(true);
    } else {
      setFeedback("wrong");
      setVisibleHints((value) => Math.max(1, value));
    }
  };
  const next = () => { setRound((value) => value + 1); setAnswer(""); setFeedback("idle"); setVisibleHints(0); };
  const restart = () => { setRound(0); setAnswer(""); setScore(0); setFeedback("idle"); setVisibleHints(0); onResult?.(false); };
  return <section className="learningBlock gameLearning translateSentenceGame">
    <GameHeader title={block.title} current={round + 1} total={items.length} score={score} />
    {!items.length ? <p className="gameEmpty">{copy.empty}</p> : complete ? <GameComplete score={score} total={items.length} onRestart={restart} /> : item && <form className="translateSentenceBoard" onSubmit={(event) => { event.preventDefault(); check(); }}>
      <div className="translatePrompt"><small>{copy.instruction}</small><p>{item.sentence}</p></div>
      <label className="translateAnswerField">{copy.answer}<textarea autoFocus value={answer} disabled={feedback === "correct"} className={feedback} placeholder={copy.placeholder} onChange={(event) => { setAnswer(event.target.value); if (feedback === "wrong") setFeedback("idle"); }} /></label>
      {visibleHints > 0 && <div className="translationHints" aria-live="polite"><b>{copy.hints}</b>{hints.slice(0, visibleHints).map((hint, index) => <p key={`${index}-${hint}`}><span>{index + 1}</span>{hint}</p>)}</div>}
      <div className={`translationFeedback ${feedback}`} aria-live="polite">{feedback === "correct" ? copy.correct : feedback === "wrong" ? copy.wrong : ""}</div>
      <div className="gameActions translateGameActions">
        {feedback !== "correct" && <button type="button" className="secondary hintButton" disabled={visibleHints >= hints.length} onClick={() => setVisibleHints((value) => Math.min(hints.length, value + 1))}>{visibleHints ? copy.moreHint : copy.showHint}</button>}
        {feedback === "correct" ? <button type="button" className="primary" onClick={next}>{round === items.length - 1 ? labels.finish : labels.next}</button> : <button type="submit" className="primary" disabled={!answer.trim()}>{labels.check}</button>}
      </div>
    </form>}
  </section>;
}

function GameBlockContent({ block, onResult }: Omit<Props, "courseLanguage">) {
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
  if (block.game.type === "translate-sentence") return <TranslateSentenceGame block={block} game={block.game} onResult={onResult} />;
  return <ChoiceGame block={block} rounds={block.game.stages} mode="adventure" heroName={block.game.heroName} onResult={onResult} />;
}

export function GameBlockView({ block, courseLanguage, onResult }: Props) {
  const labels = getCourseTaskLocale(courseLanguage);
  return <GameLocaleContext.Provider value={labels}>
    <GameBlockContent block={block} onResult={onResult} />
  </GameLocaleContext.Provider>;
}
