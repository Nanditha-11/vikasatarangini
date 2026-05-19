import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { setToken, apiFetch } from "../lib/api";

export function Layout({ title, subtitle, children }) {
  const nav = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const isMaster = user?.role === "master";

  const currentPlace = isMaster ? (searchParams.get("place") || "Main") : (user?.place || "Main");
  const brandName = currentPlace === "Main" ? "Vikasa Tarangini" : `${currentPlace.charAt(0).toUpperCase() + currentPlace.slice(1)} Vikasa Tarangini`;

  const [waStatus, setWaStatus] = useState("disconnected"); // disconnected, connecting, connected
  const [waQr, setWaQr] = useState(null);
  const [showWaModal, setShowWaModal] = useState(false);

  const showWaModalRef = useRef(showWaModal);
  useEffect(() => {
    showWaModalRef.current = showWaModal;
  }, [showWaModal]);

  useEffect(() => {
    let active = true;
    const fetchStatus = async () => {
      try {
        const data = await apiFetch("/api/whatsapp/status");
        if (active) {
          setWaStatus(prev => {
            if (prev !== "connected" && data.status === "connected") {
              if (showWaModalRef.current) {
                alert("✅ WhatsApp Connected & Linked Successfully!");
              }
              setShowWaModal(false);
            }
            return data.status;
          });
          setWaQr(data.qr);
        }
      } catch (err) {
        console.error("Failed to fetch WhatsApp status:", err);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const handleLogoutWa = async () => {
    if (confirm("Are you sure you want to disconnect WhatsApp?")) {
      try {
        await apiFetch("/api/whatsapp/logout", { method: "POST" });
        alert("WhatsApp disconnected successfully");
      } catch (err) {
        alert("Failed to disconnect WhatsApp: " + err.message);
      }
    }
  };

  const renderWaStatus = () => {
    if (waStatus === "connected") {
      return (
        <span 
          style={{ 
            background: '#dcfce7', 
            color: '#16a34a', 
            fontSize: '0.85em', 
            fontWeight: '700', 
            padding: '6px 14px', 
            borderRadius: '20px', 
            border: '1px solid #bbf7d0',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer'
          }}
          onClick={handleLogoutWa}
          title="Click to Logout/Disconnect WhatsApp"
        >
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16a34a', display: 'inline-block' }}></span>
          WhatsApp Connected
        </span>
      );
    }

    if (waStatus === "connecting") {
      return (
        <span 
          style={{ 
            background: '#fef9c3', 
            color: '#ca8a04', 
            fontSize: '0.85em', 
            fontWeight: '700', 
            padding: '6px 14px', 
            borderRadius: '20px', 
            border: '1px solid #fef08a',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <style>{`
            @keyframes waspin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            .wa-loader-spin {
              animation: waspin 1s linear infinite;
            }
          `}</style>
          <span className="wa-loader-spin" style={{ width: '8px', height: '8px', borderRadius: '50%', border: '2px solid #ca8a04', borderTopColor: 'transparent', display: 'inline-block' }}></span>
          Connecting...
        </span>
      );
    }

    return (
      <button 
        className="btn" 
        onClick={() => setShowWaModal(true)}
        style={{ 
          background: 'linear-gradient(135deg, #25D366, #128C7E)', 
          color: 'white', 
          border: 'none', 
          fontWeight: '700', 
          padding: '8px 16px', 
          boxShadow: '0 4px 12px rgba(37, 211, 102, 0.2)', 
          borderRadius: '50px',
          fontSize: '0.85em',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        📲 Link WhatsApp
      </button>
    );
  };

  const getBtnStyle = (path) => {
    const isActive = location.pathname === path;
    if (isActive) {
      return {
        background: 'linear-gradient(135deg, #0d2866, #0072ff)',
        color: 'white',
        border: 'none',
        fontWeight: '700',
        padding: '10px 20px',
        boxShadow: '0 4px 12px rgba(13, 40, 102, 0.3)',
        borderRadius: '50px'
      };
    }
    return {
      background: 'linear-gradient(135deg, #e0f2fe, #bae6fd)',
      color: '#0369a1',
      border: '1px solid #bae6fd',
      fontWeight: '600',
      padding: '10px 20px',
      boxShadow: '0 2px 6px rgba(100, 150, 200, 0.1)',
      borderRadius: '50px'
    };
  };

  return (
    <div className="container">
      <div className="topbar">
        <div className="brand" role="banner">
          <img src="/logo.png" alt="Vikasa Tarangini Logo" className="logo" style={{
            objectFit: 'contain',
            background: 'linear-gradient(135deg, #e0f2fe, #bae6fd)',
            padding: '4px',
            borderRadius: '12px',
            border: '1px solid #bae6fd',
            boxShadow: '0 2px 8px rgba(100, 150, 200, 0.1)'
          }} />
          <div>
            <h1 style={{ margin: 0, fontSize: '1.4em', color: '#0d2866', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {brandName}
            </h1>
            <p style={{ margin: '2px 0 0', color: '#475569', fontSize: '0.8em', fontWeight: 'bold' }}>
              {title || "Attendance Management System"}
            </p>
          </div>
        </div>

        <div className="row" style={{ gap: '12px', flex: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
          {(!isMaster || location.search) && !['/master-dashboard', '/approved-admins', '/denied-admins'].includes(location.pathname) && (
            <>
              <button className="btn" style={getBtnStyle("/")} onClick={() => nav("/" + location.search)}>Home</button>
              <button className="btn" style={getBtnStyle("/history")} onClick={() => nav("/history" + location.search)}>Attendance History</button>
              <button className="btn" style={getBtnStyle("/modify")} onClick={() => nav("/modify" + location.search)}>Modify Students</button>
              <button className="btn" style={getBtnStyle("/about")} onClick={() => nav("/about" + location.search)}>About</button>
            </>
          )}
        </div>

        <div className="actions" style={{ gap: '10px', display: 'flex', alignItems: 'center' }}>
          {renderWaStatus()}
          {isMaster && (
            <button
              className="btn"
              style={{ ...getBtnStyle("/master-dashboard"), background: 'linear-gradient(135deg, #0d2866, #0072ff)', border: 'none', color: 'white' }}
              onClick={() => nav("/master-dashboard")}
            >
              Admin List
            </button>
          )}
          <button
            className="btn danger"
            onClick={() => {
              localStorage.removeItem("vt_token");
              nav("/login", { replace: true });
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {children}

      {showWaModal && (
        <div className="modal-overlay" style={{ zIndex: 3000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ maxWidth: '420px', width: '95%', padding: '0', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', border: 'none', background: 'white' }}>
            <div style={{ background: '#f8fafc', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
              <h2 style={{ margin: 0, fontSize: '1.2em', color: '#1e293b', fontWeight: '800' }}>📲 Link WhatsApp / వాట్సాప్ జోడించండి</h2>
              <button onClick={() => setShowWaModal(false)} style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '1.8em', cursor: 'pointer', padding: 0 }}>&times;</button>
            </div>
            <div style={{ padding: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              {waStatus === "expired" ? (
                <div style={{ padding: '20px 10px' }}>
                  <span style={{ fontSize: '3em', marginBottom: '10px', display: 'inline-block' }}>⚠️</span>
                  <h4 style={{ color: '#ef4444', margin: '0 0 10px 0', fontSize: '1.15em', fontWeight: '800' }}>Link Session Expired</h4>
                  <p style={{ color: '#64748b', fontSize: '0.9em', margin: '0 0 20px 0', lineHeight: '1.6' }}>
                    The WhatsApp pairing QR code has expired after 12 hours of inactivity. Please generate a new one.
                  </p>
                  <button
                    onClick={async () => {
                      try {
                        await apiFetch("/api/whatsapp/logout", { method: "POST" });
                      } catch (err) {
                        alert("Failed to regenerate QR: " + err.message);
                      }
                    }}
                    className="btn"
                    style={{ background: 'linear-gradient(135deg, #0d2866, #0072ff)', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '50px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 12px rgba(13, 40, 102, 0.2)' }}
                  >
                    🔄 Regenerate QR
                  </button>
                </div>
              ) : waQr ? (
                <>
                  <p style={{ margin: '0 0 20px 0', color: '#475569', fontSize: '0.95em', lineHeight: '1.5' }}>
                    Scan this QR code from your phone's WhatsApp to link it.
                    <br />
                    <span style={{ color: '#0284c7', fontWeight: 'bold' }}>Settings → Linked Devices → Link a Device</span>
                  </p>
                  <div style={{ padding: '16px', background: 'white', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 8px 16px rgba(0,0,0,0.05)' }}>
                    <QRCodeSVG value={waQr} size={220} level="M" includeMargin={true} />
                  </div>
                </>
              ) : (
                <div style={{ padding: '40px 20px' }}>
                  <style>{`
                    @keyframes waspin {
                      0% { transform: rotate(0deg); }
                      100% { transform: rotate(360deg); }
                    }
                    .wa-loading-spin {
                      animation: waspin 1s linear infinite;
                    }
                  `}</style>
                  <div className="wa-loading-spin" style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTopColor: '#25D366', borderRadius: '50%', margin: '0 auto 20px' }}></div>
                  <h4 style={{ color: '#334155', margin: '0 0 8px 0' }}>Generating QR Code...</h4>
                  <p style={{ color: '#64748b', fontSize: '0.9em', margin: 0 }}>
                    Please wait a moment while the server generates a login QR code.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
