import { useNavigate } from "react-router-dom";
import { setToken } from "../lib/api";

export function Layout({ title, subtitle, children }) {
  const nav = useNavigate();
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const isMaster = user?.role === "master";

  return (
    <div className="container">
      <div className="topbar">
        <div className="brand" role="banner">
          <div className="logo" aria-hidden="true" />
          <div>
            <h1>{title || "Vikasatarangini – Attendance Management System"}</h1>
            <p>{subtitle || ""}</p>
          </div>
        </div>

        <div className="row" style={{ gap: '20px', flex: 1, justifyContent: 'center' }}>
          {!isMaster ? (
            <>
              <button className="btn" style={{ background: 'none', border: 'none', fontWeight: '600' }} onClick={() => nav("/")}>Home</button>
              <button className="btn" style={{ background: 'none', border: 'none', fontWeight: '600' }} onClick={() => nav("/history")}>Attendance History</button>
              <button className="btn" style={{ background: 'none', border: 'none', fontWeight: '600' }} onClick={() => nav("/about")}>About</button>
            </>
          ) : (
            <button 
              className="btn" 
              style={{ background: 'none', border: 'none', fontWeight: '700', color: '#2563eb', fontSize: '18px' }} 
              onClick={() => nav("/master-dashboard")}
            >
              Manage Admins
            </button>
          )}
        </div>

        <div className="actions">
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
      <div style={{ textAlign: 'center', marginTop: '40px', padding: '20px', borderTop: '1px solid #e2e8f0', color: '#94a3b8', fontSize: '13px' }}>
        Live Status: <b>Deployed Mar 26, 06:25 PM</b>
      </div>
    </div>
  );
}

