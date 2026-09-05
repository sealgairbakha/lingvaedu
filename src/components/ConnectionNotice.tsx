import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

export function ConnectionNotice() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  if (online) return null;
  return <div className="connectionNotice" role="status"><span aria-hidden="true">!</span><div><b>Нет подключения к интернету</b><p>Оставьте страницу открытой. Для сохранения изменений нужно восстановить связь.</p></div></div>;
}
