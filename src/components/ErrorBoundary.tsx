import { Component, type ErrorInfo, type ReactNode } from "react";
import { PageState } from "./PageState";

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() { return { failed: true }; }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep diagnostics local; never send lesson content or account data to a third party.
    console.error("Unable to display this page", error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return <div className="pageRecovery"><PageState
      title="Не удалось открыть страницу"
      description="Попробуйте загрузить её снова. Если ошибка повторяется, вернитесь к списку курсов."
      action={<><button className="btn primary" onClick={() => window.location.reload()}>Загрузить снова</button><a className="btn ghost" href="/courses">К курсам</a></>}
    /></div>;
  }
}
