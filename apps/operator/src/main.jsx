import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import "./responsive.css";
import App from "./App";
import { StyledEngineProvider, ThemeProvider } from "@mui/material/styles";
import theme from "./styles/theme";

const root = document.getElementById("root");
ReactDOM.createRoot(root).render(
  React.createElement(
    StyledEngineProvider,
    { injectFirst: true },
    React.createElement(
      ThemeProvider,
      { theme },
      React.createElement(BrowserRouter, null, React.createElement(App))
    )
  )
);
