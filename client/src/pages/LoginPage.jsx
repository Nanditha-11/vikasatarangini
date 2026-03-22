import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, setToken } from "../lib/api";

export function LoginPage() {
  const nav = useNavigate();
  const [view, setView] = useState("login"); // login | forgot | reset
  const [username] = useState("vikasatarangini");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onLogin(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const data = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      setToken(data.token);
      nav("/", { replace: true });
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  async function onSendOTP(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await apiFetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "vikasatarangini4@gmail.com" }),
      });
      setView("reset");
    } catch (err) {
      setError(err.message || "Failed to send OTP");
    } finally {
      setBusy(false);
    }
  }

  async function onReset(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await apiFetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp, newPassword }),
      });
      alert("Password reset success! Please login.");
      setView("login");
      setPassword("");
    } catch (err) {
      setError(err.message || "Reset failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page-wrapper">
      {/* Left Image */}
      <img src="/image1.jpg" alt="Left side" className="login-side-image" />

      {/* Login Card */}
      <div className="login-card-container">
        <div className="card">
          {view === "login" && (
            <>
              <h2 style={{ textAlign: "center", marginBottom: 6, marginTop: 10, fontStyle: "italic", fontSize: '2em' }}>
                Vikasa Tarangini
              </h2>
              <h3 style={{ textAlign: "center", marginBottom: 16, color: 'var(--muted)', fontSize: '1.2em' }}>
                Admin Login
              </h3>

              {error ? <div className="error">{error}</div> : null}

              <form onSubmit={onLogin} style={{ marginTop: 12 }}>
                <div className="field">
                  <label>Username</label>
                  <input
                    className="input"
                    value={username}
                    readOnly
                    style={{ backgroundColor: "rgba(255,255,255,0.05)", cursor: "not-allowed" }}
                  />
                </div>
                <div className="field">
                  <label>Password</label>
                  <input
                    className="input"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    autoComplete="current-password"
                  />
                </div>

                <button className="btn primary" disabled={busy} style={{ width: "100%", padding: '14px', fontSize: '1.1em' }}>
                  {busy ? "Signing in..." : "Login"}
                </button>
              </form>
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <button className="btn" style={{ borderColor: 'transparent', fontSize: '0.9em' }} onClick={() => setView("forgot")}>
                  Forgot Password?
                </button>
              </div>
            </>
          )}

          {view === "forgot" && (
            <>
              <h2 style={{ textAlign: "center" }}>Reset Password</h2>
              <p className="muted" style={{ textAlign: "center" }}>
                A 6-digit OTP will be sent via email.
              </p>
              {error ? <div className="error">{error}</div> : null}
              <form onSubmit={onSendOTP} style={{ marginTop: 20 }}>
                <button className="btn primary" disabled={busy} style={{ width: "100%" }}>
                  {busy ? "Sending OTP..." : "Send OTP"}
                </button>
                <button type="button" className="btn" style={{ width: "100%", marginTop: 10 }} onClick={() => setView("login")}>
                  Back to Login
                </button>
              </form>
            </>
          )}

          {view === "reset" && (
            <>
              <h2 style={{ textAlign: "center" }}>Enter OTP</h2>
              <p className="muted" style={{ textAlign: "center" }}>
                Enter the code sent to your email.
              </p>
              {error ? <div className="error">{error}</div> : null}
              <form onSubmit={onReset} style={{ marginTop: 20 }}>
                <div className="field">
                  <label>OTP Code</label>
                  <input
                    className="input"
                    placeholder="6-digit OTP"
                    value={otp}
                    onChange={e => setOtp(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>New Password</label>
                  <input
                    className="input"
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                  />
                </div>
                <button className="btn primary" disabled={busy} style={{ width: "100%" }}>
                  {busy ? "Processing..." : "Reset Password"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Right Image */}
      <img src="/image2.jpg" alt="Right side" className="login-side-image" />
    </div>
  );
}

