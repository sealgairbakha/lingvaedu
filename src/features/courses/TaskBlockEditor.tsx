import type { LessonBlock } from "./types";

type Props = {
  block: LessonBlock;
  onChange: (content: string) => void;
};

const splitLines = (content: string) => content.split("\n").filter(Boolean);
const sentenceWithBlank = (line: string, answer: string) => {
  const clean = line.trim() || "___";
  return clean.includes("___")
    ? clean.replace("___", `[${answer}]`)
    : `${clean} [${answer}]`;
};
const parseGapRows = (content: string) =>
  splitLines(content).map((line) => {
    const match = line.match(/\[([^\]]+)\]/);
    return {
      sentence: match ? line.replace(match[0], "___") : line,
      answer: match?.[1] || "",
    };
  });
const serializeGapRows = (rows: { sentence: string; answer: string }[]) =>
  rows.map((row) => sentenceWithBlank(row.sentence, row.answer)).join("\n");

function EditorHeader({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="taskBuilderHeader">
      <div>
        <b>{title}</b>
        <p>{hint}</p>
      </div>
      <span aria-hidden="true">✦</span>
    </div>
  );
}

function RowActions({
  onRemove,
  canRemove,
}: {
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <button
      type="button"
      className="taskBuilderRemove"
      onClick={onRemove}
      disabled={!canRemove}
      aria-label="Удалить строку"
      title="Удалить"
    >
      ×
    </button>
  );
}

function GapTaskEditor({ block, onChange }: Props) {
  const rows = parseGapRows(block.content);
  const safeRows = rows.length ? rows : [{ sentence: "___", answer: "" }];
  const update = (next: typeof safeRows) => onChange(serializeGapRows(next));
  const isDrag = block.kind === "drag-words";
  return (
    <div className="taskBuilder">
      <EditorHeader
        title={isDrag ? "Предложения и слова" : "Предложения и ответы"}
        hint={
          isDrag
            ? "Ученик перетащит правильное слово в пропуск."
            : "Ученик самостоятельно впишет правильное слово."
        }
      />
      <div className="taskBuilderRows">
        {safeRows.map((row, index) => (
          <div className="taskBuilderRow gapBuilderRow" key={index}>
            <span className="taskRowNumber">{index + 1}</span>
            <label className="taskWideField">
              <span>Предложение</span>
              <input
                value={row.sentence}
                placeholder="Например: He went to work ___ being ill."
                onChange={(event) => {
                  const next = [...safeRows];
                  next[index] = { ...row, sentence: event.target.value };
                  update(next);
                }}
              />
              <small>Обозначьте место ответа тремя подчёркиваниями ___</small>
            </label>
            <label className="taskAnswerField">
              <span>Правильный ответ</span>
              <input
                value={row.answer}
                placeholder="despite"
                onChange={(event) => {
                  const next = [...safeRows];
                  next[index] = { ...row, answer: event.target.value };
                  update(next);
                }}
              />
            </label>
            <RowActions
              canRemove={safeRows.length > 1}
              onRemove={() => update(safeRows.filter((_, item) => item !== index))}
            />
          </div>
        ))}
      </div>
      <button
        type="button"
        className="taskBuilderAdd"
        onClick={() => update([...safeRows, { sentence: "___", answer: "" }])}
      >
        <span>＋</span> Добавить предложение
      </button>
    </div>
  );
}

function SelectWordsEditor({ block, onChange }: Props) {
  const parsed = splitLines(block.content).map((line) => {
    const match = line.match(/\[([^\]]+)\]/);
    return {
      sentence: match ? line.replace(match[0], "___") : line,
      options: match?.[1].split("|") || ["", ""],
    };
  });
  const rows = parsed.length
    ? parsed
    : [{ sentence: "___", options: ["", ""] }];
  const update = (next: typeof rows) =>
    onChange(
      next
        .map((row) => sentenceWithBlank(row.sentence, row.options.join("|")))
        .join("\n"),
    );
  return (
    <div className="taskBuilder">
      <EditorHeader
        title="Предложения и варианты"
        hint="Первый отмеченный вариант считается правильным."
      />
      <div className="taskBuilderRows">
        {rows.map((row, rowIndex) => (
          <div className="taskBuilderRow selectBuilderRow" key={rowIndex}>
            <span className="taskRowNumber">{rowIndex + 1}</span>
            <label className="taskWideField">
              <span>Предложение</span>
              <input
                value={row.sentence}
                placeholder="Sales increased. ___ we need new employees."
                onChange={(event) => {
                  const next = [...rows];
                  next[rowIndex] = { ...row, sentence: event.target.value };
                  update(next);
                }}
              />
            </label>
            <div className="taskOptionsEditor">
              <span>Варианты ответа</span>
              {row.options.map((option, optionIndex) => (
                <div key={optionIndex}>
                  <input
                    type="radio"
                    checked={optionIndex === 0}
                    onChange={() => {
                      if (optionIndex === 0) return;
                      const options = [...row.options];
                      const [correct] = options.splice(optionIndex, 1);
                      options.unshift(correct);
                      const next = [...rows];
                      next[rowIndex] = { ...row, options };
                      update(next);
                    }}
                    aria-label="Сделать правильным вариантом"
                  />
                  <input
                    value={option}
                    placeholder={optionIndex === 0 ? "Правильный вариант" : "Другой вариант"}
                    onChange={(event) => {
                      const options = [...row.options];
                      options[optionIndex] = event.target.value;
                      const next = [...rows];
                      next[rowIndex] = { ...row, options };
                      update(next);
                    }}
                  />
                  <button
                    type="button"
                    disabled={row.options.length <= 2}
                    onClick={() => {
                      const next = [...rows];
                      next[rowIndex] = {
                        ...row,
                        options: row.options.filter((_, item) => item !== optionIndex),
                      };
                      update(next);
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="taskOptionAdd"
                onClick={() => {
                  const next = [...rows];
                  next[rowIndex] = { ...row, options: [...row.options, ""] };
                  update(next);
                }}
              >
                ＋ Добавить вариант
              </button>
            </div>
            <RowActions
              canRemove={rows.length > 1}
              onRemove={() => update(rows.filter((_, item) => item !== rowIndex))}
            />
          </div>
        ))}
      </div>
      <button
        type="button"
        className="taskBuilderAdd"
        onClick={() => update([...rows, { sentence: "___", options: ["", ""] }])}
      >
        <span>＋</span> Добавить предложение
      </button>
    </div>
  );
}

function QuizEditor({ block, onChange }: Props) {
  const lines = block.content.split("\n");
  const question = lines[0] || "";
  const parsedOptions = lines.slice(1).map((line) => ({
    text: line.replace(/^\*/, ""),
    correct: line.startsWith("*"),
  }));
  const options = parsedOptions.length
    ? parsedOptions
    : [{ text: "", correct: true }, { text: "", correct: false }];
  const update = (nextQuestion: string, nextOptions: typeof options) =>
    onChange(
      [
        nextQuestion,
        ...nextOptions.map((option) => `${option.correct ? "*" : ""}${option.text}`),
      ].join("\n"),
    );
  return (
    <div className="taskBuilder">
      <EditorHeader title="Вопрос и ответы" hint="Выберите один правильный вариант." />
      <label className="taskStandaloneField">
        <span>Вопрос</span>
        <input
          value={question}
          placeholder="Введите вопрос"
          onChange={(event) => update(event.target.value, options)}
        />
      </label>
      <div className="taskOptionsEditor quizOptionsEditor">
        <span>Варианты ответа</span>
        {options.map((option, index) => (
          <div key={index}>
            <input
              type="radio"
              name={`correct-${block.id}`}
              checked={option.correct}
              onChange={() =>
                update(
                  question,
                  options.map((item, itemIndex) => ({
                    ...item,
                    correct: itemIndex === index,
                  })),
                )
              }
            />
            <input
              value={option.text}
              placeholder={option.correct ? "Правильный ответ" : "Вариант ответа"}
              onChange={(event) => {
                const next = [...options];
                next[index] = { ...option, text: event.target.value };
                update(question, next);
              }}
            />
            <button
              type="button"
              disabled={options.length <= 2}
              onClick={() => {
                const next = options.filter((_, item) => item !== index);
                if (!next.some((item) => item.correct) && next[0])
                  next[0] = { ...next[0], correct: true };
                update(question, next);
              }}
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          className="taskOptionAdd"
          onClick={() =>
            update(question, [
              ...options,
              { text: `Вариант ${options.length + 1}`, correct: false },
            ])
          }
        >
          ＋ Добавить вариант
        </button>
      </div>
    </div>
  );
}

function MatchEditor({ block, onChange }: Props) {
  const parsed = splitLines(block.content).map((line) => {
    const [left, ...right] = line.split("=");
    return { left: left?.trim() || "", right: right.join("=").trim() };
  });
  const rows = parsed.length ? parsed : [{ left: "", right: "" }];
  const update = (next: typeof rows) =>
    onChange(next.map((row) => `${row.left} = ${row.right}`).join("\n"));
  return (
    <div className="taskBuilder">
      <EditorHeader title="Пары для сопоставления" hint="Добавьте слово и соответствующий перевод или определение." />
      <div className="taskBuilderRows">
        {rows.map((row, index) => (
          <div className="taskBuilderRow matchBuilderRow" key={index}>
            <span className="taskRowNumber">{index + 1}</span>
            <label>
              <span>Слово или фраза</span>
              <input
                value={row.left}
                placeholder="a baby plant"
                onChange={(event) => {
                  const next = [...rows];
                  next[index] = { ...row, left: event.target.value };
                  update(next);
                }}
              />
            </label>
            <span className="matchEquals">↔</span>
            <label>
              <span>Пара</span>
              <input
                value={row.right}
                placeholder="a shoot"
                onChange={(event) => {
                  const next = [...rows];
                  next[index] = { ...row, right: event.target.value };
                  update(next);
                }}
              />
            </label>
            <RowActions canRemove={rows.length > 1} onRemove={() => update(rows.filter((_, item) => item !== index))} />
          </div>
        ))}
      </div>
      <button type="button" className="taskBuilderAdd" onClick={() => update([...rows, { left: "", right: "" }])}>
        <span>＋</span> Добавить пару
      </button>
    </div>
  );
}

function TrueFalseEditor({ block, onChange }: Props) {
  const parsed = splitLines(block.content).map((line) => {
    const [statement, value] = line.split("|");
    return { statement: statement?.trim() || "", value: value?.trim() === "true" };
  });
  const rows = parsed.length ? parsed : [{ statement: "", value: true }];
  const update = (next: typeof rows) =>
    onChange(next.map((row) => `${row.statement} | ${row.value ? "true" : "false"}`).join("\n"));
  return (
    <div className="taskBuilder">
      <EditorHeader title="Утверждения" hint="Для каждого утверждения отметьте правильный ответ." />
      <div className="taskBuilderRows">
        {rows.map((row, index) => (
          <div className="taskBuilderRow trueFalseBuilderRow" key={index}>
            <span className="taskRowNumber">{index + 1}</span>
            <label className="taskWideField">
              <span>Утверждение</span>
              <input
                value={row.statement}
                placeholder="Введите утверждение"
                onChange={(event) => {
                  const next = [...rows];
                  next[index] = { ...row, statement: event.target.value };
                  update(next);
                }}
              />
            </label>
            <div className="trueFalseToggle" role="group" aria-label="Правильный ответ">
              <button type="button" className={row.value ? "active true" : ""} onClick={() => {
                const next = [...rows]; next[index] = { ...row, value: true }; update(next);
              }}>Верно</button>
              <button type="button" className={!row.value ? "active false" : ""} onClick={() => {
                const next = [...rows]; next[index] = { ...row, value: false }; update(next);
              }}>Неверно</button>
            </div>
            <RowActions canRemove={rows.length > 1} onRemove={() => update(rows.filter((_, item) => item !== index))} />
          </div>
        ))}
      </div>
      <button type="button" className="taskBuilderAdd" onClick={() => update([...rows, { statement: "", value: true }])}>
        <span>＋</span> Добавить утверждение
      </button>
    </div>
  );
}

export function TaskBlockEditor(props: Props) {
  if (props.block.kind === "drag-words" || props.block.kind === "fill-blank")
    return <GapTaskEditor {...props} />;
  if (props.block.kind === "select-words") return <SelectWordsEditor {...props} />;
  if (props.block.kind === "quiz") return <QuizEditor {...props} />;
  if (props.block.kind === "match") return <MatchEditor {...props} />;
  if (props.block.kind === "true-false") return <TrueFalseEditor {...props} />;
  return null;
}
