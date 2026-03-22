import { useState, useEffect } from "react";
import { apiFetch } from "../lib/api";

export function StudentHistoryLog({ student, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const data = await apiFetch(`/api/attendance/student/${student.slNo}`);
        setHistory(data.history || []);
      } catch (err) {
        console.error("Failed to fetch history", err);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, [student.slNo]);

  const totalMeds = history.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
  const totalPresent = history.filter(h => h.present).length;

  return (
    <div className="history-overlay" onClick={onClose}>
      <div className="history-modal card" onClick={e => e.stopPropagation()}>
        <div className="history-header">
          <div>
            <h2 style={{ margin: 0, fontStyle: 'italic', color: '#065f46' }}>{student.name}</h2>
            <p className="muted" style={{ margin: '4px 0 0 0', fontSize: '1rem' }}>
              <strong>ID:</strong> {student.slNo}
            </p>
            <p className="muted" style={{ margin: '2px 0 0 0', fontSize: '1rem' }}>
              <strong>Father Name:</strong> {student.fatherName || "-"}
            </p>
            <p className="muted" style={{ margin: '2px 0 0 0', fontSize: '1rem' }}>
              <strong>Phone:</strong> {student.phone || "-"}
            </p>
          </div>
          <button className="btn" onClick={onClose}>&times;</button>
        </div>

        <div className="history-stats">
          <div className="stat-pill">
            <span className="label">Total Medicine</span>
            <span className="value">{totalMeds} Tablets</span>
          </div>
          <div className="stat-pill">
            <span className="label">Attendance</span>
            <span className="value">{totalPresent} Days</span>
          </div>
        </div>

        <div className="history-list">
          <h3>Attendance & Medicine Log</h3>
          {loading ? (
            <p>Loading records...</p>
          ) : history.length === 0 ? (
            <p className="muted">No attendance records found.</p>
          ) : (
            <div className="timeline">
              {history.map((h, i) => (
                <div key={i} className={`timeline-item ${h.present ? 'present' : 'absent'}`}>
                  <div className="date">
                    {new Date(h.date).toLocaleDateString("en-GB", { 
                      day: '2-digit', 
                      month: 'short', 
                      year: 'numeric' 
                    })}
                  </div>
                  <div className="status">{h.present ? 'Present' : 'Absent'}</div>
                  <div className="details">
                    {h.present ? (
                      <>
                        <span className="qty">{h.quantity} Tablets</span>
                        <span className="method">{h.paymentMethod}</span>
                      </>
                    ) : (
                      <span className="absent-label">Not Attended</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
