export const TRUE_FALSE_LANGUAGE_OPTIONS = [
  { value: "ru", code: "RU", label: "Русский", trueLabel: "Верно", falseLabel: "Неверно" },
  { value: "en", code: "EN", label: "English", trueLabel: "True", falseLabel: "False" },
  { value: "kz", code: "KZ", label: "Қазақша", trueLabel: "Дұрыс", falseLabel: "Дұрыс емес" },
  { value: "ko", code: "KO", label: "한국어", trueLabel: "참", falseLabel: "거짓" },
  { value: "zh", code: "ZH", label: "中文", trueLabel: "正确", falseLabel: "错误" },
  { value: "ja", code: "JA", label: "日本語", trueLabel: "正しい", falseLabel: "誤り" },
] as const;

export type TrueFalseLanguage = (typeof TRUE_FALSE_LANGUAGE_OPTIONS)[number]["value"];

export const getTrueFalseLabels = (language?: TrueFalseLanguage) =>
  TRUE_FALSE_LANGUAGE_OPTIONS.find((option) => option.value === language) ||
  TRUE_FALSE_LANGUAGE_OPTIONS[0];
