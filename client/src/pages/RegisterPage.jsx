import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiFetch } from "../lib/api";

export function RegisterPage() {
  const nav = useNavigate();
  const [step, setStep] = useState(1); // 1: Location, 2: Email, 3: OTP, 4: Details
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // District/Place
  const districts = [
    "Adilabad", "Bhadradri Kothagudem", "Hanumakonda", "Hyderabad", "Jagtial", 
    "Jangaon", "Jayashankar Bhupalpally", "Jogulamba Gadwal", "Kamareddy", 
    "Karimnagar", "Khammam", "Kumuram Bheem", "Mahabubabad", "Mahabubnagar", 
    "Mancherial", "Medak", "Medchal–Malkajgiri", "Mulugu", "Nagarkurnool", 
    "Nalgonda", "Narayanpet", "Nirmal", "Nizamabad", "Peddapalli", 
    "Rajanna Sircilla", "Rangareddy", "Sangareddy", "Siddipet", "Suryapet", 
    "Vikarabad", "Wanaparthy", "Warangal", "Yadadri Bhuvanagiri", "Main"
  ];

  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [typedPlace, setTypedPlace] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    whatsappLink: ""
  });

  const nextStep = () => {
    setError("");
    setStep(s => s + 1);
  };

  const prevStep = () => {
    setError("");
    setStep(s => s - 1);
  };

  async function handleSendOTP(e) {
    if (e) e.preventDefault();
    if (!email) return setError("Please enter your email");
    
    const gmailRegex = /^[^\s@]+@gmail\.com$/;
    if (!gmailRegex.test(email)) {
      return setError("Enter valid email");
    }

    setBusy(true);
    setError("");
    try {
      await apiFetch("/api/auth/send-register-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      nextStep();
    } catch (err) {
      setError(err.message || "Failed to send OTP");
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyOTP(e) {
    if (e) e.preventDefault();
    if (!otp) return setError("Please enter the OTP");
    setBusy(true);
    setError("");
    try {
      await apiFetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      nextStep();
    } catch (err) {
      setError(err.message || "Invalid OTP");
    } finally {
      setBusy(false);
    }
  }

  async function onRegister(e) {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      return setError("Passwords do not match");
    }
    setBusy(true);
    setError("");
    
    try {
      await apiFetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          username: formData.username,
          password: formData.password,
          email,
          otp,
          district: selectedDistrict, 
          place: typedPlace,
          whatsappLink: formData.whatsappLink
        }),
      });
      setSuccess(true);
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  if (success) {
    return (
      <div className="login-page-wrapper" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="card" style={{ maxWidth: '400px', textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '4em', marginBottom: '20px', color: '#0d2866' }}>✅</div>
          <h2 style={{ marginBottom: '16px', color: '#0d2866' }}>Registration Submitted!</h2>
          <p className="muted" style={{ marginBottom: '24px', fontSize: '1.1em', color: '#475569', lineHeight: '1.6' }}>
            Your account is now pending approval. Please contact swarnamrutham3@gmail.com for more details.
          </p>
          <button 
            className="btn primary" 
            onClick={() => nav("/login")} 
            style={{ 
              width: '100%', 
              padding: '16px', 
              fontSize: '1em',
              fontWeight: '800'
            }}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page-wrapper" style={{ backgroundColor: '#0d2866', backgroundImage: 'none', gap: '40px', padding: '40px' }}>
      {step === 1 && <img src="/image1.jpg" alt="Left side" className="login-side-image" />}

      <div className="register-wizard-container" style={{ 
        display: 'flex', 
        gap: '30px', 
        width: '100%', 
        maxWidth: step === 1 ? '480px' : '900px', 
        justifyContent: 'center',
        alignItems: 'stretch',
        zIndex: 2 
      }}>
        
        {/* Card 1: Location Info (Shows when Step > 1) */}
        {step > 1 && (
          <div className="card" style={{ width: '320px', padding: '40px 30px', display: 'flex', flexDirection: 'column', background: 'white', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
            <div style={{ textAlign: 'center', marginBottom: '60px' }}>
              <img src="/logo.png" alt="Logo" style={{ width: '120px', height: '120px', objectFit: 'contain' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: '#64748b', marginBottom: '8px', display: 'block' }}>District</label>
                <div style={{ padding: '14px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', fontWeight: 'bold', color: '#0d2866', fontSize: '1.1em' }}>
                  {selectedDistrict}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: '#64748b', marginBottom: '8px', display: 'block' }}>Place</label>
                <div style={{ padding: '14px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', fontWeight: 'bold', color: '#0d2866', fontSize: '1.1em' }}>
                  {typedPlace}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Card 2: Main Form Activity */}
        <div className="card" style={{ 
          flex: step === 1 ? 'none' : 1, 
          width: step === 1 ? '480px' : 'auto', 
          padding: '40px', 
          background: 'white', 
          borderRadius: '24px', 
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          minHeight: '500px'
        }}>
            {step === 1 && (
              <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <img src="/logo.png" alt="Logo" style={{ width: '100px', height: '100px', objectFit: 'contain' }} />
              </div>
            )}

            {error && step !== 2 && step !== 4 && <div className="error" style={{ marginBottom: '20px' }}>{error}</div>}

            {step === 1 && (
              <form onSubmit={(e) => { e.preventDefault(); if(selectedDistrict && typedPlace) nextStep(); }}>
                <h2 style={{ color: '#0d2866', marginBottom: '20px', textAlign: 'center', fontSize: '2em', fontWeight: 'bold' }}>Vikasa Tarangini</h2>
                
                <div className="field">
                  <label>District</label>
                  <select
                    className="input"
                    value={selectedDistrict}
                    onChange={(e) => setSelectedDistrict(e.target.value)}
                    required
                    style={{ appearance: 'auto' }}
                  >
                    <option value="">-- Select District --</option>
                    {districts.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div className="field" style={{ marginTop: '20px' }}>
                  <label>Place Name</label>
                  <input
                    className="input"
                    value={typedPlace}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) {
                        setTypedPlace("");
                      } else {
                        setTypedPlace(val.charAt(0).toUpperCase() + val.slice(1).toLowerCase());
                      }
                    }}
                    placeholder="Enter village or town name"
                    required
                  />
                </div>

                <button className="btn primary" style={{ width: '100%', marginTop: '30px', padding: '16px', fontSize: '1.2em', fontWeight: 'bold' }} disabled={!selectedDistrict || !typedPlace}>
                  Next
                </button>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleSendOTP}>
                <h2 style={{ color: '#0d2866', marginBottom: '10px' }}>Verify Email</h2>
                <p className="muted" style={{ marginBottom: '30px' }}>Enter your email to receive a registration code.</p>

                <div className="field">
                  <label>Email Address</label>
                  <input
                    className="input"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEmail(val);
                      const gmailRegex = /^[^\s@]+@gmail\.com$/;
                      if (error === "Enter valid email" && gmailRegex.test(val)) {
                        setError("");
                      }
                    }}
                    placeholder="Enter your email"
                    required
                    autoFocus
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '30px' }}>
                  <button type="button" className="btn primary" onClick={prevStep} style={{ flex: 1 }}>Back</button>
                  <button type="submit" className="btn primary" style={{ flex: 2 }} disabled={busy || !email}>
                    {busy ? "Sending..." : "Send OTP"}
                  </button>
                </div>
                <div style={{ height: '30px', textAlign: 'center' }}>
                  {error && <p style={{ color: '#be123c', fontSize: '0.95em', marginTop: '8px', fontWeight: 'bold' }}>Enter valid email</p>}
                </div>
              </form>
            )}

            {step === 3 && (
              <form onSubmit={handleVerifyOTP}>
                <h2 style={{ color: '#0d2866', marginBottom: '10px' }}>Enter OTP</h2>
                <p className="muted" style={{ marginBottom: '30px' }}>Check your email {email} for the code.</p>

                <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginBottom: '30px' }}>
                  {[0, 1, 2, 3].map((idx) => (
                    <input
                      key={idx}
                      id={`otp-${idx}`}
                      className="input"
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={otp[idx] || ""}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        const newOtp = otp.split("");
                        
                        if (!val) {
                          // User deleted the character
                          newOtp[idx] = "";
                          setOtp(newOtp.join(""));
                          return;
                        }

                        // Take only the last character if someone pastes or types fast
                        const char = val.charAt(val.length - 1);
                        newOtp[idx] = char;
                        setOtp(newOtp.join(""));
                        
                        // Focus next
                        if (idx < 3) {
                          document.getElementById(`otp-${idx + 1}`)?.focus();
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Backspace" && !otp[idx] && idx > 0) {
                          document.getElementById(`otp-${idx - 1}`)?.focus();
                        }
                      }}
                      style={{ 
                        width: '60px', 
                        height: '70px', 
                        textAlign: 'center', 
                        fontSize: '2em', 
                        fontWeight: 'bold',
                        padding: 0
                      }}
                      autoFocus={idx === 0}
                      required
                    />
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '30px' }}>
                  <button type="button" className="btn primary" onClick={prevStep} style={{ flex: 1 }}>Back</button>
                  <button type="submit" className="btn primary" style={{ flex: 1 }} disabled={busy || otp.length < 4}>
                    {busy ? "Verifying..." : "Verify OTP"}
                  </button>
                </div>
                <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.9em' }}>
                  Didn't get the code? <button type="button" className="btn-link" onClick={handleSendOTP} style={{ background: 'none', border: 'none', color: '#0072ff', cursor: 'pointer', padding: 0 }}>Resend</button>
                </p>
              </form>
            )}

            {step === 4 && (
              <form onSubmit={onRegister}>
                <h2 style={{ color: '#0d2866', marginBottom: '20px' }}>Account Details</h2>

                <div className="field">
                  <label>Username</label>
                  <input
                    className="input"
                    value={formData.username}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) {
                        setFormData({...formData, username: ""});
                      } else {
                        setFormData({...formData, username: val.charAt(0).toUpperCase() + val.slice(1).toLowerCase()});
                      }
                    }}
                    placeholder="Choose a username"
                    required
                  />
                </div>

                <div style={{ display: 'flex', gap: '15px' }}>
                  <div className="field" style={{ flex: 1, position: 'relative' }}>
                    <label>Password</label>
                    <input
                      className="input"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      placeholder="••••••••"
                      required
                    />
                    <button 
                      type="button" 
                      onMouseEnter={() => setShowPassword(true)}
                      onMouseLeave={() => setShowPassword(false)}
                      style={{ position: 'absolute', right: '10px', bottom: '12px', background: 'none', border: 'none', cursor: 'pointer', outline: 'none', color: showPassword ? '#0d2866' : '#94a3b8' }}
                    >
                      {showPassword ? (
                         <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      ) : (
                         <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      )}
                    </button>
                  </div>
                  <div className="field" style={{ flex: 1, position: 'relative' }}>
                    <label>Confirm</label>
                    <input
                      className="input"
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                      placeholder="••••••••"
                      required
                    />
                    <button 
                      type="button" 
                      onMouseEnter={() => setShowConfirmPassword(true)}
                      onMouseLeave={() => setShowConfirmPassword(false)}
                      style={{ position: 'absolute', right: '10px', bottom: '12px', background: 'none', border: 'none', cursor: 'pointer', outline: 'none', color: showConfirmPassword ? '#0d2866' : '#94a3b8' }}
                    >
                      {showConfirmPassword ? (
                         <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      ) : (
                         <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      )}
                    </button>
                  </div>
                </div>

                <div style={{ height: '30px', textAlign: 'center' }}>
                  {(() => {
                    const pass = formData.password;
                    if (!pass) return null;
                    
                    if (pass.length < 8) {
                      return <p style={{ color: '#be123c', fontSize: '0.9em', marginTop: '5px', fontWeight: 'bold' }}>Password must be at least 8 characters</p>;
                    }
                    
                    const hasLetter = /[a-zA-Z]/.test(pass);
                    const hasNumber = /[0-9]/.test(pass);
                    const hasSymbol = /[^a-zA-Z0-9]/.test(pass);
                    
                    if (!hasLetter || !hasNumber || !hasSymbol) {
                      return <p style={{ color: '#be123c', fontSize: '0.9em', marginTop: '5px', fontWeight: 'bold' }}>Must contain letters, numbers & symbols</p>;
                    }
                    
                    if (formData.confirmPassword && pass !== formData.confirmPassword) {
                      return <p style={{ color: '#be123c', fontSize: '0.9em', marginTop: '5px', fontWeight: 'bold' }}>Passwords do not match</p>;
                    }
                    
                    return null;
                  })()}
                </div>

                <div className="field" style={{ marginTop: '25px' }}>
                  <label>WhatsApp Group Link (Optional)</label>
                  <input
                    className="input"
                    value={formData.whatsappLink}
                    onChange={(e) => setFormData({...formData, whatsappLink: e.target.value})}
                    placeholder="https://chat.whatsapp.com/..."
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button type="button" className="btn primary" onClick={prevStep} style={{ flex: 1 }}>Back</button>
                  <button type="submit" className="btn primary" style={{ flex: 1 }} disabled={busy || !formData.username || formData.password.length < 8}>
                    {busy ? "Registering..." : "Register"}
                  </button>
                </div>
              </form>
            )}

          <div style={{ textAlign: 'center', marginTop: '30px', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
            <Link to="/login" style={{ color: '#0d2866', fontWeight: '800', textDecoration: 'none' }}>Already have an account? Login</Link>
          </div>
        </div>
      </div>

      {step === 1 && <img src="/image2.jpg" alt="Right side" className="login-side-image" />}
    </div>
  );
}
