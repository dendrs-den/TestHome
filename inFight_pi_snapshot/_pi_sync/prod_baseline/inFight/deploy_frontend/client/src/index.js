import React from "react";
import ReactDOM from "react-dom";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import "./responsive.css";
import App from "./App";
import { StyledEngineProvider, ThemeProvider } from "@mui/material/styles";
import theme from "./styles/theme";

ReactDOM.render(
  <StyledEngineProvider injectFirst>
    <ThemeProvider theme={theme}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </StyledEngineProvider>,
  document.getElementById("root")
);
