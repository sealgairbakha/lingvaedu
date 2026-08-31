import EmojiPicker, { EmojiStyle, Theme } from "emoji-picker-react";
import ruEmojiData from "emoji-picker-react/dist/data/emojis-ru";

export default function FullEmojiPicker({ onSelect }: { onSelect: (emoji: string) => void }) {
  const darkTheme = document.documentElement.dataset.theme === "dark";
  return <EmojiPicker
    emojiData={ruEmojiData}
    emojiStyle={EmojiStyle.NATIVE}
    theme={darkTheme ? Theme.DARK : Theme.LIGHT}
    width="100%"
    height={390}
    lazyLoadEmojis
    searchPlaceholder="Поиск эмодзи…"
    searchClearButtonLabel="Очистить поиск"
    previewConfig={{ showPreview: false }}
    onEmojiClick={(emoji) => onSelect(emoji.emoji)}
  />;
}
