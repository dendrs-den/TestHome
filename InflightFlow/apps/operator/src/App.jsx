import React, { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import InitialPage from "./pages/InitialPage";
import ScoreBoard from "./pages/ScoreBoard";
import SpectatorsScreenPage from "./pages/SpectatorScreen";
import NotFoundPage from "./pages/NotFoundPage";
import { LoginPage } from "./pages/LoginPage";
import LegacyRefPanel from "./pages/LegacyRefPanel";

function App() {
  const [blockTitle, setBlockTitle] = useState("Tournaments");
  const [user, setUser] = useState({ login: "dev", password: "dev" });
  const [ctxMenu, setCtxMenu] = useState(null);

  React.useEffect(() => {
    const storedUser = sessionStorage.getItem("user");

    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
    }
  }, []);

  const changeBlockTitle = (value) => {
    setBlockTitle(value);
  };

  if (window.location.pathname !== "/login") {
    sessionStorage.setItem("fallback", window.location.pathname);
  }

  const loginRequired = false;

  React.useEffect(() => {
    const onContextMenuCapture = (event) => {
      event.preventDefault();
      event.stopPropagation();
      const menuWidth = 180;
      const menuHeight = 84;
      const maxX = Math.max(8, window.innerWidth - menuWidth - 8);
      const maxY = Math.max(8, window.innerHeight - menuHeight - 8);
      setCtxMenu({
        x: Math.min(event.clientX, maxX),
        y: Math.min(event.clientY, maxY),
      });
    };

    const closeMenu = () => setCtxMenu(null);

    document.addEventListener("contextmenu", onContextMenuCapture, true);
    window.addEventListener("contextmenu", onContextMenuCapture, true);
    window.addEventListener("click", closeMenu);
    window.addEventListener("blur", closeMenu);
    window.addEventListener("resize", closeMenu);
    return () => {
      document.removeEventListener("contextmenu", onContextMenuCapture, true);
      window.removeEventListener("contextmenu", onContextMenuCapture, true);
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("blur", closeMenu);
      window.removeEventListener("resize", closeMenu);
    };
  }, []);

  return (
    <React.Fragment>
      <Routes>
        <Route
          path="/"
          element={
            loginRequired ? (user ? <Navigate to="/terminal" replace /> : <Navigate to="/login" replace />) : <Navigate to="/terminal" replace />
          }
        />
        <Route
          path="/terminal"
          element={
            !loginRequired || user ? (
              <InitialPage blockTitle={blockTitle} changeBlockTitle={changeBlockTitle} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="/legacy-ref" element={<LegacyRefPanel />} />
        <Route path="/infoboard" element={<SpectatorsScreenPage />} />
        <Route path="/scoreboard" element={<ScoreBoard />} />
        <Route path="*" element={<NotFoundPage />} />
        <Route
          path="/login"
          element={
            loginRequired ? (!user ? <LoginPage setUser={setUser} /> : <Navigate to="/terminal" replace />) : <Navigate to="/terminal" replace />
          }
        />
      </Routes>

      {ctxMenu && (
        <div
          className="app-context-menu"
          style={{ top: `${ctxMenu.y}px`, left: `${ctxMenu.x}px` }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="app-context-menu__item"
            onClick={() => {
              setCtxMenu(null);
              window.location.reload();
            }}
          >
            Обновить
          </button>
          <button
            type="button"
            className="app-context-menu__item"
            onClick={() => {
              setCtxMenu(null);
              window.close();
            }}
          >
            Выход
          </button>
        </div>
      )}
    </React.Fragment>
  );
}

export default App;
