import { Navigate, Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "./auth/ProtectedRoute";
import { AppShell } from "./components/AppShell";
import { GamePage } from "./pages/GamePage";
import { LoginPage } from "./pages/LoginPage";

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/game" replace />} />
        <Route
          path="/game"
          element={
            <ProtectedRoute>
              <GamePage />
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<LoginPage />} />
      </Route>
    </Routes>
  );
}
