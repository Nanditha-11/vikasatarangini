import { useNavigate } from "react-router-dom";
import { setToken } from "../lib/api";

export function Layout({ title, subtitle, children }) {
  const nav = useNavigate();

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
          <button className="btn" style={{ background: 'none', border: 'none', fontWeight: '600' }} onClick={() => nav("/")}>Dashboard</button>
          <button className="btn" style={{ background: 'none', border: 'none', fontWeight: '600' }} onClick={() => nav("/history")}>Attendance History</button>
          <button className="btn" style={{ background: 'none', border: 'none', fontWeight: '600' }} onClick={() => nav("/about")}>About</button>
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
    </div>
  );
}

