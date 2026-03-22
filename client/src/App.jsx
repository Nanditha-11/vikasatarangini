import { Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import { LoginPage } from "./pages/LoginPage";

import { AttendancePage } from "./pages/AttendancePage";
import { AttendanceHistoryPage } from "./pages/AttendanceHistoryPage";
import { AttendanceHistoryDetailPage } from "./pages/AttendanceHistoryDetailPage";
import { PaymentPage } from "./pages/PaymentPage";
import { ModifyStudentsPage } from "./pages/ModifyStudentsPage";

function RequireAuth({ children }) {
  const token = localStorage.getItem("vt_token");
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/history"
        element={
          <RequireAuth>
            <AttendanceHistoryPage />
          </RequireAuth>
        }
      />
      <Route
        path="/history/:date"
        element={
          <RequireAuth>
            <AttendanceHistoryDetailPage />
          </RequireAuth>
        }
      />
      <Route
        path="/modify"
        element={
          <RequireAuth>
            <ModifyStudentsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/:date?"
        element={
          <RequireAuth>
            <AttendancePage />
          </RequireAuth>
        }
      />
      <Route path="/pay" element={<PaymentPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
