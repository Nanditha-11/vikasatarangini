import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { apiFetch } from "../lib/api";

export function AttendanceHistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();

  useEffect(() => {
    apiFetch("/api/attendance/list/history")
      .then(setHistory)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout title="Attendance History">
      <div className="card" style={{ padding: '24px' }}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: '24px' }}>
          <h2 style={{ margin: 0 }}>Attendance Logs</h2>
          <button className="btn" onClick={() => nav("/")}>Back to Today</button>
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
              onClick={() => nav(`/history/${record.date}`)}
              >
                <div className="row" style={{ justifyContent: 'center', padding: '10px 0' }}>
                  <h3 style={{ margin: 0, color: '#0d2866', fontSize: '1.4em' }}>{record.date.split('-').reverse().join('-')}</h3>
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
