import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiFetch, setToken } from "../lib/api";

export function LoginPage() {
  const nav = useNavigate();
  const [view, setView] = useState("login"); // login | forgot | otp | reset
  
  const districts = [
    "Main", "Adilabad", "Bhadradri Kothagudem", "Hanumakonda", "Hyderabad", 
    "Jagtial", "Jangaon", "Jayashankar Bhupalpally", "Jogulamba Gadwal", 
    "Kamareddy", "Karimnagar", "Khammam", "Kumuram Bheem", "Mahabubabad", 
    "Mahabubnagar", "Mancherial", "Medak", "Medchal–Malkajgiri", "Mulugu", 
    "Nagarkurnool", "Nalgonda", "Narayanpet", "Nirmal", "Nizamabad", 
    "Peddapalli", "Rajanna Sircilla", "Rangareddy", "Sangareddy", "Siddipet", 
    "Suryapet", "Vikarabad", "Wanaparthy", "Warangal", "Yadadri Bhuvanagiri"
  ];

  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedPlace, setSelectedPlace] = useState("");
  const [places, setPlaces] = useState([]);
  const [loadingPlaces, setLoadingPlaces] = useState(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const otpRefs = [useRef(), useRef(), useRef(), useRef()];

  // Fetch unique approved places when district changes
  useEffect(() => {
    async function fetchPlaces() {
      if (!selectedDistrict) {
        setPlaces([]);
        return;
      }
      setLoadingPlaces(true);
      try {
        const data = await apiFetch(`/api/auth/places/${selectedDistrict}`);
        const formatted = data.map(p => p.charAt(0).toUpperCase() + p.slice(1));
        // Remove duplicates after capitalization
        setPlaces([...new Set(formatted)]);
        setSelectedPlace("");
      } catch (err) {
        console.error("Failed to fetch places:", err);
        setError("Could not load places for this district. The server might be starting up or disconnected.");
        setPlaces([]);
      } finally {
        setLoadingPlaces(false);
      }
    }
    fetchPlaces();
  }, [selectedDistrict]);

  // Clear error when switching views
  useEffect(() => {
    setError("");
  }, [view]);

  async function onLogin(e) {
    e.preventDefault();
    if (!selectedDistrict || !selectedPlace) {
      return setError("Please select both District and Place");
    }
    setError("");
    setBusy(true);
    try {
      const data = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          username, 
          password, 
          district: selectedDistrict, 
          place: selectedPlace 
        }),
      });
      setToken(data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      nav("/", { replace: true });
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  // OTP and Reset functions remain the same...
  async function onForgot(e) {
    e.preventDefault();
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
      setError(err.message || "Email not found");
    } finally {
      setBusy(false);
    }
  }

  async function onVerifyOtp(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await apiFetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: otp.join("") }),
      });
      setView("reset");
    } catch (err) {
      setError(err.message || "Invalid OTP");
    } finally {
      setBusy(false);
    }
  }

  async function onReset(e) {
    e.preventDefault();
    if (newPassword !== confirmPassword) return setError("Passwords don't match");
    
    // Check complexity
    if (newPassword.length < 8 || !/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
      return setError("Password must be at least 8 characters and contain letters, numbers, and special characters.");
    }

    setError("");
    setBusy(true);
    try {
      await apiFetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, newPassword, otp: otp.join("") }),
      });
      setView("login");
      alert("Password reset successful! Please login.");
    } catch (err) {
      setError(err.message || "Reset failed");
    } finally {
      setBusy(false);
    }
  }

  if (view === "forgot") {
    return (
      <div className="login-page-wrapper">
        <img src="/image1.jpg" alt="Left side" className="login-side-image" />
        <div className="login-card-container">
          <div className="card">
            <h2 style={{ textAlign: "center", marginBottom: 20 }}>Forgot Password</h2>
            {error && <div className="error">{error}</div>}
            <form onSubmit={onForgot}>
              <div className="field">
                <label>Email Address</label>
                <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter Email" required />
              </div>
              <button className="btn primary" disabled={busy} style={{ width: "100%", padding: '14px' }}>
                {busy ? "Sending..." : "Send Reset OTP"}
              </button>
              <button type="button" className="btn" onClick={() => setView("login")} style={{ width: "100%", marginTop: 10 }}>Back to Login</button>
            </form>
          </div>
        </div>
        <img src="/image2.jpg" alt="Right side" className="login-side-image" />
      </div>
    );
  }

  if (view === "otp") {
    return (
      <div className="login-page-wrapper">
        <img src="/image1.jpg" alt="Left side" className="login-side-image" />
        <div className="login-card-container">
          <div className="card">
            <h2 style={{ textAlign: "center", marginBottom: 10 }}>Verify OTP</h2>
            <p style={{ textAlign: "center", color: "#64748b", marginBottom: 20 }}>Enter the 4-digit code sent to your email</p>
            {error && <div className="error">{error}</div>}
            <form onSubmit={onVerifyOtp}>
              <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 20 }}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={otpRefs[i]}
                    className="input"
                    style={{ width: 50, textAlign: "center", fontSize: 24, fontWeight: "bold" }}
                    maxLength={1}
                    value={digit}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, "");
                      const newOtp = [...otp];
                      newOtp[i] = val;
                      setOtp(newOtp);
                      if (val && i < 3) otpRefs[i + 1].current.focus();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Backspace" && !otp[i] && i > 0) otpRefs[i - 1].current.focus();
                    }}
                  />
                ))}
              </div>
              <button className="btn primary" disabled={busy} style={{ width: "100%", padding: '14px' }}>Verify OTP</button>
            </form>
          </div>
        </div>
        <img src="/image2.jpg" alt="Right side" className="login-side-image" />
      </div>
    );
  }

  if (view === "reset") {
    return (
      <div className="login-page-wrapper">
        <img src="/image1.jpg" alt="Left side" className="login-side-image" />
        <div className="login-card-container">
          <div className="card">
            <h2 style={{ textAlign: "center", marginBottom: 20 }}>New Password</h2>
            {error && <div className="error">{error}</div>}
            <form onSubmit={onReset}>
              <div className="field"><label>New Password</label><input className="input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required /></div>
              <div className="field"><label>Confirm Password</label><input className="input" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required /></div>
              <button className="btn primary" disabled={busy} style={{ width: "100%", padding: '14px' }}>Update Password</button>
            </form>
          </div>
        </div>
        <img src="/image2.jpg" alt="Right side" className="login-side-image" />
      </div>
    );
  }

  return (
    <div className="login-page-wrapper">
      <img src="/image1.jpg" alt="Left side" className="login-side-image" />

      <div className="login-card-container">
        <div className="card">
          <h2 style={{ textAlign: "center", marginBottom: 6, fontStyle: "italic", fontSize: '2.4em', color: '#0d2866', fontWeight: '900' }}>
            Vikasa Tarangini
          </h2>
          <h3 style={{ textAlign: "center", marginBottom: 24, color: '#475569', fontSize: '1.2em', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 'bold' }}>
            Admin Login
          </h3>

          {error && <div className="error">{error}</div>}

          <form onSubmit={onLogin} style={{ marginTop: 12 }}>
            <div className="field">
              <label>District</label>
              <select
                className="input"
                name="district"
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                required
                style={{ appearance: 'auto', paddingRight: '30px' }}
              >
                <option value="">-- Select District --</option>
                {districts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div className="field">
              <label>Place</label>
              <select
                className="input"
                name="place"
                value={selectedPlace}
                onChange={(e) => setSelectedPlace(e.target.value)}
                required
                disabled={!selectedDistrict || loadingPlaces}
                style={{ appearance: 'auto', paddingRight: '30px' }}
              >
                <option value="">{loadingPlaces ? "Loading..." : "-- Select Place --"}</option>
                {places.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            {selectedDistrict && selectedPlace && (
              <>
                <div className="field">
                  <label>Username</label>
                  <input
                    className="input"
                    value={username}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) {
                        setUsername(val.charAt(0).toUpperCase() + val.slice(1));
                      } else {
                        setUsername("");
                      }
                    }}
                    placeholder="Enter username"
                    required
                  />
                </div>

                <div className="field">
                  <label>Password</label>
                  <input
                    className="input"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••••"
                    required
                  />
                </div>

                <button 
                  className="btn" 
                  disabled={busy} 
                  style={{ 
                    width: "100%", 
                    padding: '16px', 
                    fontSize: '1.2em', 
                    marginTop: '20px', 
                    background: 'linear-gradient(135deg, #0d2866, #0072ff)', 
                    color: 'white', 
                    border: 'none', 
                    fontWeight: 'bold', 
                    letterSpacing: '1px',
                    boxShadow: '0 10px 20px rgba(13, 40, 102, 0.2)',
                    justifyContent: 'center'
                  }}
                >
                  {busy ? "Logging in..." : "Login"}
                </button>
              </>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 24, padding: '15px 0', borderTop: '1px solid #eee', alignItems: 'center' }}>
              {selectedDistrict && selectedPlace && (
                <button type="button" className="btn" style={{ background: 'none', border: 'none', padding: 0, height: 'auto', color: '#0d2866', fontSize: 13, fontWeight: 'bold' }} onClick={() => setView("forgot")}>
                  Forgot Password?
                </button>
              )}
              <p style={{ margin: 0, fontSize: '1.1em', textAlign: 'center' }}>
                Need an account? <Link to="/register" style={{ color: '#0d2866', fontWeight: 'bold' }}>Register Here</Link>
              </p>
            </div>
          </form>
        </div>
      </div>

      <img src="/image2.jpg" alt="Right side" className="login-side-image" />
    </div>
  );
}
