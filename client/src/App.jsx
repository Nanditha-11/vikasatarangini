import { useEffect } from "react";
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
import { PublicStudentHistoryPage } from "./pages/PublicStudentHistoryPage";
import { QRCodesPage } from "./pages/QRCodesPage";
import { ScanPage } from "./pages/ScanPage";

function checkSessionExpired() {
  const token = localStorage.getItem("vt_token");
  if (!token) return false;
  
  const loginTime = localStorage.getItem("vt_login_time");
  if (!loginTime) {
    // Start countdown now for any active sessions signed in before this feature update
    localStorage.setItem("vt_login_time", String(Date.now()));
    return false;
  }
  
  const FIVE_HOURS = 5 * 60 * 60 * 1000;
  if (Date.now() - Number(loginTime) > FIVE_HOURS) {
    localStorage.removeItem("vt_token");
    localStorage.removeItem("user");
    localStorage.removeItem("vt_login_time");
    return true;
  }
  return false;
}

function RequireAuth({ children, adminOnly = false }) {
  const isExpired = checkSessionExpired();
  const token = localStorage.getItem("vt_token");
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  
  if (isExpired || !token) {
    const fullUrl = window.location.pathname + window.location.search;
    if (fullUrl !== "/" && fullUrl !== "/login") {
      localStorage.setItem("vt_redirect", fullUrl);
    }
    return <Navigate to="/login" replace />;
  }
  
  // Master Admins are allowed to access these pages in Audit Mode
  if (user?.role === "master") {
    return children;
  }
  
  return children;
}

function RequireMaster({ children }) {
  const isExpired = checkSessionExpired();
  const token = localStorage.getItem("vt_token");
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  
  if (isExpired || !token || user?.role !== "master") {
    return <Navigate to="/" replace />;
  }
  return children;
}

import MasterDashboard from "./pages/MasterDashboard";
import ApprovedAdminsPage from "./pages/ApprovedAdminsPage";
import DeniedAdminsPage from "./pages/DeniedAdminsPage";
import { Layout } from "./components/Layout";

export default function App() {
  useEffect(() => {
    const checkTimeout = () => {
      const token = localStorage.getItem("vt_token");
      if (!token) return;

      const loginTime = localStorage.getItem("vt_login_time");
      if (loginTime) {
        const FIVE_HOURS = 5 * 60 * 60 * 1000;
        if (Date.now() - Number(loginTime) > FIVE_HOURS) {
          localStorage.removeItem("vt_token");
          localStorage.removeItem("user");
          localStorage.removeItem("vt_login_time");
          alert("⏱️ Your session has expired after 5 hours. Please login again.");
          window.location.href = "/login";
        }
      }
    };

    // Run check immediately on load
    checkTimeout();

    // Check periodically every 30 seconds
    const interval = setInterval(checkTimeout, 30000);
    return () => clearInterval(interval);
  }, []);

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
      <Route
        path="/modify"
        element={
          <RequireAuth adminOnly={true}>
            <ModifyStudentsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/qrcodes"
        element={
          <RequireAuth adminOnly={true}>
            <QRCodesPage />
          </RequireAuth>
        }
      />
      <Route
        path="/scan"
        element={
          <RequireAuth adminOnly={true}>
            <ScanPage />
          </RequireAuth>
        }
      />
      <Route path="/pay" element={<PaymentPage />} />
      <Route path="/student-history" element={<PublicStudentHistoryPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />

    </Routes>
  );
}
