import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, useLocation } from "react-router-dom";
import "@fontsource-variable/onest";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { PageState } from "./components/PageState";
import { useAuth } from "./auth/AuthProvider";
import { AuthGate } from "./auth/AuthGate";
import { AuthProvider } from "./auth/AuthProvider";
import { CourseProvider } from "./features/courses/CourseProvider";
import "./styles/index.css";
import "./styles/video-room-layout.css";
import "./styles/typography.css";
import "./styles/editor-curtain.css";
import "./styles/groups.css";
import "./styles/selects.css";
import "./styles/responsive.css";
import "./styles/platform.css";

// eslint-disable-next-line react-refresh/only-export-components
const App = lazy(() => import("./App"));
// eslint-disable-next-line react-refresh/only-export-components
const VideoRoomPage = lazy(() => import("./features/video/VideoRoomsPage").then((module) => ({ default: module.VideoRoomPage })));

let savedTheme: string | null = null;
try { savedTheme = localStorage.getItem("lingvaedu-theme"); } catch { /* Use the system theme if storage is restricted. */ }
const initialTheme = savedTheme === "dark" || (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
document.documentElement.dataset.theme = initialTheme;
document.documentElement.style.colorScheme = initialTheme;

// eslint-disable-next-line react-refresh/only-export-components
function RootRoutes() {
  const location = useLocation();
  const { user } = useAuth();
  const isVideoRoom = /^\/video-room\/[a-f0-9]{32}\/?$/i.test(location.pathname);
  return isVideoRoom
    ? <VideoRoomPage />
    : <AuthGate><CourseProvider key={user?.id || "anonymous"}><App /></CourseProvider></AuthGate>;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary><BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<div className="pageRecovery"><PageState title="Открываем LingvaEdu" description="Готовим ваше рабочее пространство…" loading /></div>}><RootRoutes /></Suspense>
      </AuthProvider>
    </BrowserRouter></ErrorBoundary>
  </StrictMode>,
);
