import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { setToken } from "../lib/api";

export function Layout({ title, subtitle, children }) {
  const nav = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const isMaster = user?.role === "master";

  const currentPlace = isMaster ? (searchParams.get("place") || "Main") : (user?.place || "Main");
  const brandName = currentPlace === "Main" ? "Vikasa Tarangini" : `${currentPlace.charAt(0).toUpperCase() + currentPlace.slice(1)} Vikasa Tarangini`;

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

        <div className="actions" style={{ gap: '10px', display: 'flex' }}>
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
    </div>
  );
}
