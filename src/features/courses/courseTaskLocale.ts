export type CourseTaskLocale = {
  htmlLang: string;
  trueLabel: string;
  falseLabel: string;
  check: string;
  reset: string;
  clear: string;
  next: string;
  nextQuestion: string;
  finish: string;
  nextTask: string;
  finishLesson: string;
  nextLesson: string;
  finishCourse: string;
  previous: string;
  completeTasks: string;
  completeTasksFirst: string;
  dragWord: string;
  select: string;
  answer: string;
  chooseAnswer: string;
  excellent: string;
  allCorrect: string;
  correctCount: (correct: number, total: number) => string;
  taskComplete: string;
  fixAnswers: string;
  readyToCheck: string;
  completedCount: (answered: number, total: number) => string;
  allAnswered: string;
  answerAll: string;
  gameTask: string;
  round: string;
  score: string;
  gameComplete: string;
  correctOf: (score: number, total: number) => string;
  playAgain: string;
  openCard: string;
  emoji: string;
  buildWord: string;
  listen: string;
  chooseCorrect: string;
  oddOneOut: string;
  secondsShort: string;
  rememberItems: (seconds: number) => string;
  whatDisappeared: string;
  selectWordCategory: string;
  categoryErrors: string;
  buildSentence: string;
  tapWords: string;
  emptyPairs: string;
  emptyWord: string;
  emptyQuestion: string;
  emptyRound: string;
  emptySentence: string;
  correct: string;
  attemptsUsed: (used: number) => string;
  assignmentPrompt: string;
  assignmentPreview: string;
  writeAnswer: string;
  attachFile: string;
  removeFile: string;
  sendAssignment: string;
  savedSubmission: string;
  keyboardHint: string;
  you: string;
  fileTooLarge: string;
  sendFailed: string;
};

const shared = {
  ru: { nextLesson: "Следующий урок →", finishCourse: "Завершить курс", previous: "Назад", completeTasks: "Выполните задания", completeTasksFirst: "Сначала правильно выполните все задания урока", assignmentPrompt: "Выполните задание и отправьте ответ преподавателю.", assignmentPreview: "Написать ответ или прикрепить файл…", writeAnswer: "Напишите ответ…", attachFile: "Прикрепить файл", removeFile: "Убрать файл", sendAssignment: "Отправить задание", savedSubmission: "Работа сохранена. Вы можете дополнить ответ и отправить его снова.", keyboardHint: "Enter — отправить · Shift + Enter — новая строка", you: "Вы", fileTooLarge: "Файл должен быть не больше 50 МБ.", sendFailed: "Не удалось отправить задание." },
  en: { nextLesson: "Next lesson →", finishCourse: "Finish course", previous: "Back", completeTasks: "Complete the tasks", completeTasksFirst: "Complete all lesson tasks correctly first", assignmentPrompt: "Complete the task and send your answer to the teacher.", assignmentPreview: "Write an answer or attach a file…", writeAnswer: "Write your answer…", attachFile: "Attach a file", removeFile: "Remove file", sendAssignment: "Submit assignment", savedSubmission: "Your work is saved. You can update your answer and submit it again.", keyboardHint: "Enter — submit · Shift + Enter — new line", you: "You", fileTooLarge: "The file must be no larger than 50 MB.", sendFailed: "Could not submit the assignment." },
  kz: { nextLesson: "Келесі сабақ →", finishCourse: "Курсты аяқтау", previous: "Артқа", completeTasks: "Тапсырмаларды орындаңыз", completeTasksFirst: "Алдымен сабақтың барлық тапсырмасын дұрыс орындаңыз", assignmentPrompt: "Тапсырманы орындап, жауабыңызды мұғалімге жіберіңіз.", assignmentPreview: "Жауап жазыңыз немесе файл тіркеңіз…", writeAnswer: "Жауабыңызды жазыңыз…", attachFile: "Файл тіркеу", removeFile: "Файлды алып тастау", sendAssignment: "Тапсырманы жіберу", savedSubmission: "Жұмыс сақталды. Жауапты толықтырып, қайта жібере аласыз.", keyboardHint: "Enter — жіберу · Shift + Enter — жаңа жол", you: "Сіз", fileTooLarge: "Файл көлемі 50 МБ-тан аспауы керек.", sendFailed: "Тапсырманы жіберу мүмкін болмады." },
  ko: { nextLesson: "다음 수업 →", finishCourse: "과정 완료", previous: "뒤로", completeTasks: "과제를 완료하세요", completeTasksFirst: "먼저 모든 수업 과제를 올바르게 완료하세요", assignmentPrompt: "과제를 완료하고 선생님에게 답변을 보내세요.", assignmentPreview: "답변을 작성하거나 파일을 첨부하세요…", writeAnswer: "답변을 작성하세요…", attachFile: "파일 첨부", removeFile: "파일 제거", sendAssignment: "과제 제출", savedSubmission: "과제가 저장되었습니다. 답변을 수정하여 다시 제출할 수 있습니다.", keyboardHint: "Enter — 제출 · Shift + Enter — 줄 바꿈", you: "나", fileTooLarge: "파일 크기는 50MB 이하여야 합니다.", sendFailed: "과제를 제출하지 못했습니다." },
  zh: { nextLesson: "下一课 →", finishCourse: "完成课程", previous: "返回", completeTasks: "完成任务", completeTasksFirst: "请先正确完成本课的所有任务", assignmentPrompt: "完成任务并将答案发送给老师。", assignmentPreview: "填写答案或附加文件…", writeAnswer: "填写答案…", attachFile: "附加文件", removeFile: "移除文件", sendAssignment: "提交任务", savedSubmission: "作业已保存。您可以补充答案并再次提交。", keyboardHint: "Enter — 提交 · Shift + Enter — 换行", you: "您", fileTooLarge: "文件大小不得超过 50 MB。", sendFailed: "无法提交任务。" },
  ja: { nextLesson: "次のレッスン →", finishCourse: "コースを完了", previous: "戻る", completeTasks: "課題を完了してください", completeTasksFirst: "まずレッスンのすべての課題に正解してください", assignmentPrompt: "課題を完了し、先生に回答を送信してください。", assignmentPreview: "回答を書くか、ファイルを添付…", writeAnswer: "回答を入力…", attachFile: "ファイルを添付", removeFile: "ファイルを削除", sendAssignment: "課題を提出", savedSubmission: "課題を保存しました。回答を追加して再提出できます。", keyboardHint: "Enter — 提出 · Shift + Enter — 改行", you: "あなた", fileTooLarge: "ファイルは50MB以下にしてください。", sendFailed: "課題を提出できませんでした。" },
};

const ru: CourseTaskLocale = {
  ...shared.ru,
  htmlLang: "ru", trueLabel: "Верно", falseLabel: "Неверно", check: "Проверить", reset: "Сбросить ответы", clear: "Очистить", next: "Дальше", nextQuestion: "Следующий вопрос", finish: "Завершить", nextTask: "Следующее задание →", finishLesson: "Завершить урок", dragWord: "Перетащите слово", select: "Выберите", answer: "Ответ", chooseAnswer: "Выберите ответ", excellent: "Отлично!", allCorrect: "Всё верно", correctCount: (correct, total) => `Верно: ${correct} из ${total}`, taskComplete: "Задание выполнено.", fixAnswers: "Исправьте отмеченные ответы и проверьте ещё раз.", readyToCheck: "Можно проверять", completedCount: (answered, total) => `Выполнено: ${answered} из ${total}`, allAnswered: "Все ответы заполнены.", answerAll: "Ответьте на все пункты задания.", gameTask: "ИГРОВОЕ ЗАДАНИЕ", round: "Раунд", score: "Очки", gameComplete: "Игра пройдена!", correctOf: (score, total) => `${score} из ${total} правильных`, playAgain: "Сыграть ещё раз", openCard: "Открыть карточку", emoji: "Эмодзи", buildWord: "Соберите слово", listen: "Прослушать", chooseCorrect: "Выберите правильный ответ", oddOneOut: "Найдите лишнее слово", secondsShort: "сек.", rememberItems: (seconds) => `Запомните предметы — ${seconds} сек.`, whatDisappeared: "Что исчезло?", selectWordCategory: "Выберите слово, затем его коробку", categoryErrors: "Есть ошибки — нажмите на слово в коробке, чтобы вернуть его.", buildSentence: "Составьте предложение", tapWords: "Нажимайте на слова по порядку", emptyPairs: "Добавьте хотя бы две заполненные пары.", emptyWord: "Добавьте хотя бы одно слово.", emptyQuestion: "Добавьте хотя бы один заполненный вопрос.", emptyRound: "Добавьте хотя бы один заполненный раунд.", emptySentence: "Добавьте предложение.", correct: "Верно", attemptsUsed: (used) => `${used} из 4 попыток использовано`,
};

const en: CourseTaskLocale = {
  ...shared.en,
  htmlLang: "en", trueLabel: "True", falseLabel: "False", check: "Check", reset: "Reset answers", clear: "Clear", next: "Next", nextQuestion: "Next question", finish: "Finish", nextTask: "Next task →", finishLesson: "Finish lesson", dragWord: "Drag a word", select: "Select", answer: "Answer", chooseAnswer: "Choose an answer", excellent: "Excellent!", allCorrect: "All answers are correct", correctCount: (correct, total) => `Correct: ${correct} of ${total}`, taskComplete: "Task completed.", fixAnswers: "Correct the highlighted answers and check again.", readyToCheck: "Ready to check", completedCount: (answered, total) => `Completed: ${answered} of ${total}`, allAnswered: "All answers are filled in.", answerAll: "Answer every item in the task.", gameTask: "GAME TASK", round: "Round", score: "Score", gameComplete: "Game completed!", correctOf: (score, total) => `${score} of ${total} correct`, playAgain: "Play again", openCard: "Open card", emoji: "Emoji", buildWord: "Build the word", listen: "Listen", chooseCorrect: "Choose the correct answer", oddOneOut: "Find the odd one out", secondsShort: "sec.", rememberItems: (seconds) => `Remember the items — ${seconds} sec.`, whatDisappeared: "What disappeared?", selectWordCategory: "Choose a word, then its category", categoryErrors: "Some answers are incorrect — tap a word in a category to return it.", buildSentence: "Build the sentence", tapWords: "Tap the words in the correct order", emptyPairs: "Add at least two complete pairs.", emptyWord: "Add at least one word.", emptyQuestion: "Add at least one complete question.", emptyRound: "Add at least one complete round.", emptySentence: "Add a sentence.", correct: "Correct", attemptsUsed: (used) => `${used} of 4 attempts used`,
};

const kz: CourseTaskLocale = {
  ...shared.kz,
  htmlLang: "kk", trueLabel: "Дұрыс", falseLabel: "Дұрыс емес", check: "Тексеру", reset: "Жауаптарды қалпына келтіру", clear: "Тазалау", next: "Әрі қарай", nextQuestion: "Келесі сұрақ", finish: "Аяқтау", nextTask: "Келесі тапсырма →", finishLesson: "Сабақты аяқтау", dragWord: "Сөзді сүйреп апарыңыз", select: "Таңдаңыз", answer: "Жауап", chooseAnswer: "Жауапты таңдаңыз", excellent: "Өте жақсы!", allCorrect: "Барлығы дұрыс", correctCount: (correct, total) => `Дұрыс: ${correct} / ${total}`, taskComplete: "Тапсырма орындалды.", fixAnswers: "Белгіленген жауаптарды түзетіп, қайта тексеріңіз.", readyToCheck: "Тексеруге дайын", completedCount: (answered, total) => `Орындалды: ${answered} / ${total}`, allAnswered: "Барлық жауап толтырылды.", answerAll: "Тапсырманың барлық тармағына жауап беріңіз.", gameTask: "ОЙЫН ТАПСЫРМАСЫ", round: "Кезең", score: "Ұпай", gameComplete: "Ойын аяқталды!", correctOf: (score, total) => `${score} / ${total} дұрыс`, playAgain: "Қайта ойнау", openCard: "Картаны ашу", emoji: "Эмодзи", buildWord: "Сөзді құрастырыңыз", listen: "Тыңдау", chooseCorrect: "Дұрыс жауапты таңдаңыз", oddOneOut: "Артық сөзді табыңыз", secondsShort: "сек.", rememberItems: (seconds) => `Заттарды есте сақтаңыз — ${seconds} сек.`, whatDisappeared: "Не жоғалды?", selectWordCategory: "Сөзді, содан кейін оның санатын таңдаңыз", categoryErrors: "Қателер бар — сөзді қайтару үшін санаттағы сөзді басыңыз.", buildSentence: "Сөйлем құрастырыңыз", tapWords: "Сөздерді дұрыс ретпен басыңыз", emptyPairs: "Кемінде екі толық жұп қосыңыз.", emptyWord: "Кемінде бір сөз қосыңыз.", emptyQuestion: "Кемінде бір толық сұрақ қосыңыз.", emptyRound: "Кемінде бір толық кезең қосыңыз.", emptySentence: "Сөйлем қосыңыз.", correct: "Дұрыс", attemptsUsed: (used) => `4 әрекеттің ${used} пайдаланылды`,
};

const ko: CourseTaskLocale = {
  ...shared.ko,
  htmlLang: "ko", trueLabel: "참", falseLabel: "거짓", check: "확인", reset: "답변 초기화", clear: "지우기", next: "다음", nextQuestion: "다음 질문", finish: "완료", nextTask: "다음 과제 →", finishLesson: "수업 완료", dragWord: "단어를 끌어오세요", select: "선택", answer: "답변", chooseAnswer: "답을 선택하세요", excellent: "훌륭해요!", allCorrect: "모두 정답입니다", correctCount: (correct, total) => `정답: ${correct} / ${total}`, taskComplete: "과제를 완료했습니다.", fixAnswers: "표시된 답을 수정하고 다시 확인하세요.", readyToCheck: "확인할 수 있습니다", completedCount: (answered, total) => `완료: ${answered} / ${total}`, allAnswered: "모든 답을 입력했습니다.", answerAll: "모든 항목에 답하세요.", gameTask: "게임 과제", round: "라운드", score: "점수", gameComplete: "게임 완료!", correctOf: (score, total) => `${total}개 중 ${score}개 정답`, playAgain: "다시 하기", openCard: "카드 열기", emoji: "이모지", buildWord: "단어를 만드세요", listen: "듣기", chooseCorrect: "정답을 선택하세요", oddOneOut: "다른 하나를 찾으세요", secondsShort: "초", rememberItems: (seconds) => `${seconds}초 동안 항목을 기억하세요.`, whatDisappeared: "무엇이 사라졌나요?", selectWordCategory: "단어를 선택한 다음 분류를 선택하세요", categoryErrors: "오답이 있습니다. 분류 안의 단어를 눌러 되돌리세요.", buildSentence: "문장을 만드세요", tapWords: "올바른 순서로 단어를 누르세요", emptyPairs: "완성된 짝을 두 개 이상 추가하세요.", emptyWord: "단어를 하나 이상 추가하세요.", emptyQuestion: "완성된 질문을 하나 이상 추가하세요.", emptyRound: "완성된 라운드를 하나 이상 추가하세요.", emptySentence: "문장을 추가하세요.", correct: "정답", attemptsUsed: (used) => `4번 중 ${used}번 사용`,
};

const zh: CourseTaskLocale = {
  ...shared.zh,
  htmlLang: "zh-CN", trueLabel: "正确", falseLabel: "错误", check: "检查", reset: "重置答案", clear: "清除", next: "下一步", nextQuestion: "下一题", finish: "完成", nextTask: "下一项任务 →", finishLesson: "完成本课", dragWord: "拖动单词", select: "请选择", answer: "答案", chooseAnswer: "请选择答案", excellent: "太棒了！", allCorrect: "全部正确", correctCount: (correct, total) => `正确：${correct} / ${total}`, taskComplete: "任务已完成。", fixAnswers: "请修改标出的答案并再次检查。", readyToCheck: "可以检查了", completedCount: (answered, total) => `已完成：${answered} / ${total}`, allAnswered: "所有答案均已填写。", answerAll: "请回答任务中的所有题目。", gameTask: "游戏任务", round: "回合", score: "得分", gameComplete: "游戏完成！", correctOf: (score, total) => `${total} 题中答对 ${score} 题`, playAgain: "再玩一次", openCard: "翻开卡片", emoji: "表情符号", buildWord: "拼出单词", listen: "听一听", chooseCorrect: "请选择正确答案", oddOneOut: "找出不同项", secondsShort: "秒", rememberItems: (seconds) => `记住这些物品 — ${seconds} 秒`, whatDisappeared: "什么不见了？", selectWordCategory: "先选择单词，再选择它的分类", categoryErrors: "有错误——点击分类中的单词将其移回。", buildSentence: "组成句子", tapWords: "按正确顺序点击单词", emptyPairs: "请至少添加两组完整配对。", emptyWord: "请至少添加一个单词。", emptyQuestion: "请至少添加一道完整题目。", emptyRound: "请至少添加一个完整回合。", emptySentence: "请添加一个句子。", correct: "正确", attemptsUsed: (used) => `已使用 ${used} / 4 次尝试`,
};

const ja: CourseTaskLocale = {
  ...shared.ja,
  htmlLang: "ja", trueLabel: "正しい", falseLabel: "誤り", check: "確認する", reset: "回答をリセット", clear: "クリア", next: "次へ", nextQuestion: "次の問題", finish: "完了", nextTask: "次の課題 →", finishLesson: "レッスンを完了", dragWord: "単語をドラッグ", select: "選択してください", answer: "回答", chooseAnswer: "回答を選択してください", excellent: "すばらしい！", allCorrect: "すべて正解です", correctCount: (correct, total) => `正解：${correct} / ${total}`, taskComplete: "課題を完了しました。", fixAnswers: "強調された回答を直して、もう一度確認してください。", readyToCheck: "確認できます", completedCount: (answered, total) => `完了：${answered} / ${total}`, allAnswered: "すべての回答が入力されています。", answerAll: "すべての項目に回答してください。", gameTask: "ゲーム課題", round: "ラウンド", score: "スコア", gameComplete: "ゲームクリア！", correctOf: (score, total) => `${total}問中${score}問正解`, playAgain: "もう一度プレイ", openCard: "カードを開く", emoji: "絵文字", buildWord: "単語を作ってください", listen: "聞く", chooseCorrect: "正しい答えを選んでください", oddOneOut: "仲間外れを見つけてください", secondsShort: "秒", rememberItems: (seconds) => `${seconds}秒間、アイテムを覚えてください`, whatDisappeared: "何が消えましたか？", selectWordCategory: "単語を選び、次に分類を選んでください", categoryErrors: "間違いがあります。分類内の単語を押して戻してください。", buildSentence: "文を作ってください", tapWords: "正しい順番で単語を押してください", emptyPairs: "完成したペアを2組以上追加してください。", emptyWord: "単語を1つ以上追加してください。", emptyQuestion: "完成した問題を1つ以上追加してください。", emptyRound: "完成したラウンドを1つ以上追加してください。", emptySentence: "文を追加してください。", correct: "正解", attemptsUsed: (used) => `4回中${used}回使用`,
};

const locales = { ru, en, kz, ko, zh, ja };
const aliases: Array<[keyof typeof locales, RegExp]> = [
  ["en", /^(en|english|английский)/i], ["ru", /^(ru|russian|русский)/i],
  ["kz", /^(kz|kk|kazakh|қазақ|казахский)/i], ["ko", /^(ko|korean|한국|корейский)/i],
  ["zh", /^(zh|chinese|中文|китайский)/i], ["ja", /^(ja|jp|japanese|日本|японский)/i],
];

export const getCourseTaskLocale = (language?: string): CourseTaskLocale => {
  const normalized = language?.trim() || "";
  const code = aliases.find(([, pattern]) => pattern.test(normalized))?.[0] || "ru";
  return locales[code];
};
