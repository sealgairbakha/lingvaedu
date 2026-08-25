import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "@fontsource-variable/onest";
import App from "./App";
import { AuthGate } from "./auth/AuthGate";
import { AuthProvider } from "./auth/AuthProvider";
import { CourseProvider } from "./features/courses/CourseProvider";
import "./styles/index.css";
import "./styles/typography.css";
import "./styles/editor-curtain.css";
import "./styles/groups.css";
import "./styles/selects.css";

const savedTheme = localStorage.getItem("lingvaedu-theme");
const initialTheme = savedTheme === "dark" || (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
document.documentElement.dataset.theme = initialTheme;
document.documentElement.style.colorScheme = initialTheme;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AuthGate><CourseProvider><App /></CourseProvider></AuthGate>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
