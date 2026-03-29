import { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { Layout } from "../components/Layout";
import { apiFetch } from "../lib/api";

export function AttendanceHistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();

  const [searchParams] = useSearchParams();
  const location = useLocation();

  useEffect(() => {
    let url = "/api/attendance/list/history";
    if (location.search) url += location.search;
    
    apiFetch(url)
      .then(setHistory)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [location.search]);

  return (
    <Layout title="Attendance History">
      <div className="card" style={{ padding: '24px' }}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: '24px' }}>
          <h2 style={{ margin: 0 }}>Attendance Logs</h2>
          <button className="btn" onClick={() => nav(`/${location.search}`)}>Back to Today</button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>Loading history...</div>
        ) : history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>No history records found.</div>
        ) : (
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '15px' }}>
            {history.map((record) => (
              <div key={record.date} className="card h-card" style={{ 
                borderLeft: '4px solid #0d2866', 
                background: '#f8fafc',
                cursor: 'pointer',
                padding: '12px',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onClick={() => nav(`/history/${record.date}${location.search}`)}
              >
                <div style={{ padding: '10px 0', textAlign: 'center' }}>
                  <h3 style={{ margin: 0, color: '#0d2866', fontSize: '1.2em' }}>{record.date.split('-').reverse().join('-')}</h3>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <style>{`
        .h-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 20px rgba(13, 40, 102, 0.1);
        }
      `}</style>
    </Layout>
  );
}
