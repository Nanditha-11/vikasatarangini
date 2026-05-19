import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { QRCodeSVG } from "qrcode.react";

export function PublicStudentHistoryPage() {
  const nav = useNavigate();
  const [step, setStep] = useState("phone"); // "phone", "otp", "results"
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [results, setResults] = useState(null);
  const [selectedStudentIdx, setSelectedStudentIdx] = useState(0);

  // Send OTP handler
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMsg("");
    try {
      const data = await apiFetch("/api/public/parent/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone })
      });
      if (data.success) {
        setSuccessMsg(data.message);
        setStep("otp");
      }
    } catch (err) {
      setError(err.message || "Failed to send verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP handler
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/api/public/parent/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: otp })
      });
      if (data.success) {
        setResults(data.results);
        setSelectedStudentIdx(0);
        setStep("results");
      }
    } catch (err) {
      setError(err.message || "Incorrect or expired OTP code.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setPhone("");
    setOtp("");
    setResults(null);
    setStep("phone");
    setError("");
    setSuccessMsg("");
  };

  const downloadQR = (studentName, slNo) => {
    const svgEl = document.getElementById(`qr-svg-${slNo}`);
    if (!svgEl) return;
    const svgString = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const URL = window.URL || window.webkitURL || window;
    const blobURL = URL.createObjectURL(svgBlob);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 400;
      canvas.height = 400;
      const context = canvas.getContext("2d");
      // Draw background
      context.fillStyle = "white";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 50, 50, 300, 300);
      const pngURL = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = pngURL;
      downloadLink.download = `${studentName.replace(/\s+/g, '_')}_QR.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    };
    image.src = blobURL;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const [y, m, d] = parts;
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return `${d} ${months[parseInt(m) - 1]} ${y}`;
      }
      return new Date(dateStr).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="login-page-wrapper history-bg-blue" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '40px 20px', boxSizing: 'border-box' }}>
      <div className="history-container" style={{ maxWidth: '600px', width: '100%', margin: '0 auto' }}>
        
        {/* Navigation back button */}
        {step !== "results" && (
          <div style={{ marginBottom: '20px' }}>
            <button className="btn primary pill" onClick={() => nav("/login")} style={{ padding: '10px 24px', fontWeight: 'bold' }}>
              ← Back to Admin Login
            </button>
          </div>
        )}

        {/* Logo / Header */}
        <div className="history-header-public" style={{ border: 'none', marginBottom: '20px', textAlign: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '2.2rem', color: 'white', fontWeight: '900' }}>Vikasa Tarangini</h1>
          <p style={{ margin: '5px 0 0', color: 'rgba(255,255,255,0.85)', fontSize: '1.05rem', fontWeight: '600' }}>
            📲 Parent Portal / పేరెంట్ పోర్టల్
          </p>
        </div>

        {/* 1. PHONE STEP */}
        {step === "phone" && (
          <div className="card history-page-card" style={{ padding: '40px 30px', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
            <h2 style={{ color: '#0d2866', marginBottom: '10px', textAlign: 'center', fontSize: '1.8rem', fontWeight: '800' }}>
              Download QR Code
            </h2>
            <p style={{ color: '#64748b', textAlign: 'center', marginBottom: '30px', fontSize: '1rem', lineHeight: '1.5' }}>
              Enter your registered mobile number. We will send a secure verification code to your WhatsApp.
              <br />
              <span style={{ color: '#0ea5e9', fontWeight: 'bold' }}>మీ రిజిస్టర్డ్ మొబైల్ నంబర్ రాయండి. వాట్సాప్ కు ఓటిపి వస్తుంది.</span>
            </p>

            <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="field" style={{ margin: 0 }}>
                <label style={{ fontWeight: 'bold', color: '#334155' }}>Phone Number / ఫోన్ నంబర్</label>
                <input
                  type="tel"
                  className="input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="E.g. 9876543210"
                  required
                  style={{ fontSize: '1.1rem', padding: '14px' }}
                />
              </div>
              <button
                type="submit"
                className="btn primary"
                disabled={loading}
                style={{
                  height: '52px',
                  fontWeight: 'bold',
                  fontSize: '1.1rem',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #25D366, #128C7E)',
                  borderColor: 'transparent',
                  color: 'white',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(37,211,102,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {loading ? "Sending OTP..." : "📲 Send OTP via WhatsApp"}
              </button>
            </form>
            {error && <div className="error" style={{ marginTop: 20, justifyContent: 'center' }}>{error}</div>}
          </div>
        )}

        {/* 2. OTP STEP */}
        {step === "otp" && (
          <div className="card history-page-card" style={{ padding: '40px 30px', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
            <h2 style={{ color: '#0d2866', marginBottom: '10px', textAlign: 'center', fontSize: '1.8rem', fontWeight: '800' }}>
              Enter Verification Code
            </h2>
            <p style={{ color: '#16a34a', textAlign: 'center', marginBottom: '25px', fontSize: '0.95rem', fontWeight: 'bold' }}>
              {successMsg || "Verification code sent to your WhatsApp!"}
            </p>

            <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="field" style={{ margin: 0 }}>
                <label style={{ fontWeight: 'bold', color: '#334155', textAlign: 'center', display: 'block', marginBottom: '10px' }}>
                  6-Digit OTP / ఓటిపి నంబర్
                </label>
                <input
                  type="text"
                  className="input"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter Code (E.g. 123456)"
                  maxLength={6}
                  required
                  style={{ fontSize: '1.6rem', letterSpacing: '8px', textAlign: 'center', padding: '12px' }}
                />
              </div>
              <button
                type="submit"
                className="btn primary"
                disabled={loading}
                style={{
                  height: '52px',
                  fontWeight: 'bold',
                  fontSize: '1.1rem',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #0d2866, #0072ff)',
                  borderColor: 'transparent',
                  color: 'white',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(13,40,102,0.3)'
                }}
              >
                {loading ? "Verifying..." : "Verify & View QR Codes"}
              </button>
            </form>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
              <button onClick={() => setStep("phone")} style={{ background: 'none', border: 'none', color: '#64748b', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' }}>
                Change Phone Number
              </button>
              <button onClick={handleSendOtp} style={{ background: 'none', border: 'none', color: '#0ea5e9', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' }}>
                Resend OTP
              </button>
            </div>
            {error && <div className="error" style={{ marginTop: 20, justifyContent: 'center' }}>{error}</div>}
          </div>
        )}

        {/* 3. RESULTS STEP */}
        {step === "results" && results && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Quick Sibling Selector */}
            {results.length > 1 && (
              <div className="card" style={{ padding: '16px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '8px', background: 'white' }}>
                <span style={{ fontSize: '0.85em', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Children Found / పిల్లలు:</span>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {results.map((res, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedStudentIdx(idx)}
                      style={{
                        padding: '10px 16px',
                        borderRadius: '30px',
                        border: 'none',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        fontSize: '0.95rem',
                        transition: 'all 0.2s',
                        background: selectedStudentIdx === idx ? 'linear-gradient(135deg, #0d2866, #0072ff)' : '#f1f5f9',
                        color: selectedStudentIdx === idx ? 'white' : '#475569',
                        boxShadow: selectedStudentIdx === idx ? '0 4px 10px rgba(13, 40, 102, 0.2)' : 'none'
                      }}
                    >
                      {res.student.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Display Selected Child Details */}
            {results[selectedStudentIdx] && (() => {
              const current = results[selectedStudentIdx];
              return (
                <div className="card history-page-card" style={{ padding: '30px', borderRadius: '24px', background: 'white', display: 'flex', flexDirection: 'column', gap: '25px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
                  
                  {/* Student Title */}
                  <div style={{ textAlign: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '20px' }}>
                    <h2 style={{ margin: 0, color: '#0d2866', fontSize: '2rem', fontWeight: '900' }}>
                      {current.student.name}
                    </h2>
                    <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '1rem', fontWeight: '500' }}>
                      ID: {current.student.slNo} • Father: {current.student.fatherName}
                    </p>
                    <p style={{ margin: '4px 0 0', color: '#0ea5e9', fontSize: '0.9rem', fontWeight: 'bold' }}>
                      📍 {current.place}, {current.district}
                    </p>
                  </div>

                  {/* QR Code Container */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
                    <div style={{ padding: '16px', background: 'white', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 8px 16px rgba(0,0,0,0.05)' }}>
                      <QRCodeSVG
                        id={`qr-svg-${current.student.slNo}`}
                        value={`${window.location.origin}/?mark=${current.student.slNo}`}
                        size={200}
                        level="M"
                        includeMargin={true}
                      />
                    </div>
                    <button
                      onClick={() => downloadQR(current.student.name, current.student.slNo)}
                      style={{
                        padding: '12px 24px',
                        background: '#0d2866',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50px',
                        fontWeight: 'bold',
                        fontSize: '0.95rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 10px rgba(13, 40, 102, 0.2)'
                      }}
                    >
                      💾 Save QR Code / స్క్రీన్‌షాట్ తీసుకోండి
                    </button>
                  </div>



                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                    <button
                      className="btn danger"
                      onClick={handleLogout}
                      style={{ flex: 1, padding: '14px', borderRadius: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
                    >
                      Logout / Log In with Another Phone
                    </button>
                  </div>

                </div>
              );
            })()}

          </div>
        )}

      </div>
    </div>
  );
}
