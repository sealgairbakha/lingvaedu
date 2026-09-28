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
import { trialCourseIdFromPath } from "./features/guest/guestRoutes";
import "./styles/index.css";
import "./styles/video-room-layout.css";
import "./styles/typography.css";
import "./styles/editor-curtain.css";
import "./styles/groups.css";
import "./styles/selects.css";
import "./styles/responsive.css";
import "./styles/platform.css";
import "./styles/workspace-backdrop.css";

// eslint-disable-next-line react-refresh/only-export-components
const App = lazy(() => import("./App"));
// eslint-disable-next-line react-refresh/only-export-components
const VideoRoomPage = lazy(() => import("./features/video/VideoRoomsPage").then((module) => ({ default: module.VideoRoomPage })));
// eslint-disable-next-line react-refresh/only-export-components
const GuestLandingPage = lazy(() => import("./features/guest/GuestLandingPage"));
// eslint-disable-next-line react-refresh/only-export-components
const GuestTrialPage = lazy(() => import("./features/guest/GuestTrialPage"));
// eslint-disable-next-line react-refresh/only-export-components
const GuestStudentPage = lazy(() => import("./features/guest/GuestStudentPage"));
// eslint-disable-next-line react-refresh/only-export-components
const GuestTeacherPage = lazy(() => import("./features/guest/GuestTeacherPage"));

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
  const trialCourseId = trialCourseIdFromPath(location.pathname);
  if (location.pathname === "/welcome" || location.pathname === "/welcome/") return <GuestLandingPage />;
  if (location.pathname === "/welcome/students" || location.pathname === "/welcome/students/") return <GuestStudentPage />;
  if (location.pathname === "/welcome/teachers" || location.pathname === "/welcome/teachers/") return <GuestTeacherPage />;
  if (trialCourseId !== null) return <GuestTrialPage courseId={trialCourseId} />;
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
