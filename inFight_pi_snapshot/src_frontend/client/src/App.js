import React, { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import InitialPage from "./pages/InitialPage";
import ScoreBoard from "./pages/ScoreBoard";
import SpectatorsScreenPage from "./pages/SpectatorScreen";

function App() {
  const [blockTitle, setBlockTitle] = useState("Tournaments");

  const changeBlockTitle = (value) => {
    setBlockTitle(value);
  };

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/terminal" replace />} />
      <Route path="/terminal/*" element={<InitialPage blockTitle={blockTitle} changeBlockTitle={changeBlockTitle} />} />
      <Route path="/infoboard/*" element={<SpectatorsScreenPage />} />
      <Route path="/scoreboard/*" element={<ScoreBoard />} />
      <Route path="*" element={<Navigate to="/terminal" replace />} />
    </Routes>
  );
}

export default App;
