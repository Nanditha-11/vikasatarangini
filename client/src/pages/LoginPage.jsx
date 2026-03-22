import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, setToken } from "../lib/api";

export function LoginPage() {
  const nav = useNavigate();
  const [view, setView] = useState("login"); // login | forgot | otp | reset
  const [username] = useState("vikasatarangini");
  const [password, setPassword] = useState("");
  
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const otpRefs = [useRef(), useRef(), useRef(), useRef()];

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
    if (e) e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await apiFetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setView("otp");
    } catch (err) {
      setError(err.message || "Failed to send OTP");
    } finally {
      setBusy(false);
    }
  }

  const handleOtpChange = (index, value) => {
    if (value.length > 1) value = value[value.length - 1];
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next
    if (value && index < 3) {
      otpRefs[index + 1].current.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs[index - 1].current.focus();
    }
  };

  async function onVerifyOTP(e) {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < 4) return setError("Please enter the 4-digit OTP");
    setView("reset");
  }

  async function onReset(e) {
    e.preventDefault();
    if (newPassword !== confirmPassword) return setError("Passwords do not match");
    
    setError("");
    setBusy(true);
    try {
      await apiFetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: otp.join(""), newPassword }),
      });
      alert("Password reset success! Please login.");
      setView("login");
      setPassword("");
      setOtp(["", "", "", ""]);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.message || "Reset failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page-wrapper">
      <img src="/image1.jpg" alt="Left side" className="login-side-image" />

      <div className="login-card-container" style={{ width: '100%', maxWidth: '480px', zIndex: 2 }}>
        <div className="card">
          {view === "login" && (
            <>
              <h2 style={{ textAlign: "center", marginBottom: 6, marginTop: 10, fontStyle: "italic", fontSize: '2em' }}>
                Vikasa Tarangini
              </h2>
              <h3 style={{ textAlign: "center", marginBottom: 16, color: 'var(--muted)', fontSize: '1.2em' }}>
                Admin Login
              </h3>

              {error && <div className="error">{error}</div>}

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
                <button 
                  className="btn" 
                  disabled={busy}
                  style={{ borderColor: 'transparent', fontSize: '0.9em' }} 
                  onClick={() => setView("forgot")}
                >
                  Forgot Password?
                </button>
              </div>
            </>
          )}

          {view === "forgot" && (
            <>
              <h2 style={{ textAlign: "center" }}>Forgot Password</h2>
              <p className="muted" style={{ textAlign: "center" }}>
                Enter your registered email to receive a 4-digit OTP.
              </p>
              {error && <div className="error">{error}</div>}
              <form onSubmit={onSendOTP} style={{ marginTop: 20 }}>
                <div className="field">
                  <label>Registered Email</label>
                  <input
                    className="input"
                    type="email"
                    placeholder="Enter email address"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
                <button className="btn primary" disabled={busy} style={{ width: "100%" }}>
                  {busy ? "Sending OTP..." : "Send OTP"}
                </button>
                <button type="button" className="btn" style={{ width: "100%", marginTop: 10 }} onClick={() => setView("login")}>
                  Back to Login
                </button>
              </form>
            </>
          )}

          {view === "otp" && (
            <>
              <h2 style={{ textAlign: "center" }}>Enter OTP</h2>
              <p className="muted" style={{ textAlign: "center" }}>
                Enter the 4-digit code sent to {email}.
              </p>
              {error && <div className="error">{error}</div>}
              <form onSubmit={onVerifyOTP} style={{ marginTop: 20 }}>
                <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginBottom: '24px' }}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={otpRefs[i]}
                      className="input"
                      style={{ width: '50px', height: '60px', textAlign: 'center', fontSize: '1.5em', fontWeight: 'bold' }}
                      value={digit}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      autoComplete="one-time-code"
                      inputMode="numeric"
                    />
                  ))}
                </div>
                <button className="btn primary" style={{ width: "100%" }}>
                  Verify OTP
                </button>
                <button type="button" className="btn" style={{ width: "100%", marginTop: 10 }} onClick={() => setView("forgot")}>
                  Resend OTP
                </button>
              </form>
            </>
          )}

          {view === "reset" && (
            <>
              <h2 style={{ textAlign: "center" }}>Create New Password</h2>
              <p className="muted" style={{ textAlign: "center" }}>
                Set a strong password for your account.
              </p>
              {error && <div className="error">{error}</div>}
              <form onSubmit={onReset} style={{ marginTop: 20 }}>
                <div className="field">
                  <label>New Password</label>
                  <input
                    className="input"
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label>Confirm Password</label>
                  <input
                    className="input"
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                <button className="btn primary" disabled={busy} style={{ width: "100%" }}>
                  {busy ? "Saving..." : "Change Password"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      <img src="/image2.jpg" alt="Right side" className="login-side-image" />
    </div>
  );
}

