import { Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";

import { AttendancePage } from "./pages/AttendancePage";
import { AttendanceHistoryPage } from "./pages/AttendanceHistoryPage";
import { AttendanceHistoryDetailPage } from "./pages/AttendanceHistoryDetailPage";
import { PaymentPage } from "./pages/PaymentPage";
import { ModifyStudentsPage } from "./pages/ModifyStudentsPage";
import { AboutPage } from "./pages/AboutPage";

function RequireAuth({ children, adminOnly = false }) {
  const token = localStorage.getItem("vt_token");
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  
  if (!token) return <Navigate to="/login" replace />;
  
  // If Master tries to access regular pages, redirect them to dashboard
  if (adminOnly && user?.role === "master") {
    return <Navigate to="/master-dashboard" replace />;
  }
  
  return children;
}

function RequireMaster({ children }) {
  const token = localStorage.getItem("vt_token");
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  if (!token || user?.role !== "master") return <Navigate to="/" replace />;
  return children;
}

import MasterDashboard from "./pages/MasterDashboard";
import ApprovedAdminsPage from "./pages/ApprovedAdminsPage";
import DeniedAdminsPage from "./pages/DeniedAdminsPage";
import { Layout } from "./components/Layout";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/history"
        element={
          <RequireAuth adminOnly={true}>
            <AttendanceHistoryPage />
          </RequireAuth>
        }
      />
      <Route
        path="/history/:date"
        element={
          <RequireAuth adminOnly={true}>
            <AttendanceHistoryDetailPage />
          </RequireAuth>
        }
      />
      <Route
        path="/about"
        element={
          <RequireAuth adminOnly={true}>
            <AboutPage />
          </RequireAuth>
        }
      />
      <Route
        path="/:date?"
        element={
          <RequireAuth adminOnly={true}>
            <AttendancePage />
          </RequireAuth>
        }
      />
      <Route
        path="/master-dashboard"
        element={
          <RequireMaster>
            <Layout title="Master Control Panel">
              <MasterDashboard />
            </Layout>
          </RequireMaster>
        }
      />
      <Route
        path="/approved-admins"
        element={
          <RequireMaster>
            <Layout title="Approved Admins List">
              <ApprovedAdminsPage />
            </Layout>
          </RequireMaster>
        }
      />
      <Route
        path="/denied-admins"
        element={
          <RequireMaster>
            <Layout title="Denied Requests List">
              <DeniedAdminsPage />
            </Layout>
          </RequireMaster>
        }
      />
      <Route path="/pay" element={<PaymentPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
