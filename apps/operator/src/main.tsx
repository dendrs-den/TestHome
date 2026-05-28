import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { StyledEngineProvider, ThemeProvider } from "@mui/material/styles";
import App from "./App";
import theme from "./styles/theme";
import "./index.css";
import "./responsive.css";

function stripNativeTitles() {
  const removeTitle = (el: Element | null) => {
    if (el instanceof HTMLElement && el.hasAttribute("title")) {
      el.removeAttribute("title");
    }
  };

  const onPointer = (event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    removeTitle(target);
    removeTitle(target.closest("[title]"));
    target.querySelectorAll?.("[title]").forEach((el) => removeTitle(el));
  };

  document.addEventListener("mouseover", onPointer, true);
  document.addEventListener("focusin", onPointer, true);
}

stripNativeTitles();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ThemeProvider>
    </StyledEngineProvider>
  </React.StrictMode>
);
