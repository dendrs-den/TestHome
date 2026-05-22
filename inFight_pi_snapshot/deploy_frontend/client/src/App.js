import React, { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import InitialPage from "./pages/InitialPage";
import ScoreBoard from "./pages/ScoreBoard";
import SpectatorsScreenPage from "./pages/SpectatorScreen";
import NotFoundPage from "./pages/NotFoundPage";
import { LoginPage } from "./pages/LoginPage";

function App() {
  const [blockTitle, setBlockTitle] = useState("Tournaments");
  const [user, setUser] = useState(null);

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

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/terminal" replace /> : <Navigate to="/login" replace />} />
      <Route
        path="/terminal"
        element={
          user ? (
            <InitialPage blockTitle={blockTitle} changeBlockTitle={changeBlockTitle} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route path="/infoboard" element={<SpectatorsScreenPage />} />
      <Route path="/scoreboard" element={<ScoreBoard />} />
      <Route path="*" element={<NotFoundPage />} />
      <Route
        path="/login"
        element={!user ? <LoginPage setUser={setUser} /> : <Navigate to="/terminal" replace />}
      />
    </Routes>
  );
}

export default App;
