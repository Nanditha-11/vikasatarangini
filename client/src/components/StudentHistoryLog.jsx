import { useState, useEffect } from "react";
import { apiFetch } from "../lib/api";

export function StudentHistoryLog({ student, onClose, publicHistory }) {
  const [history, setHistory] = useState(publicHistory || []);
  const [loading, setLoading] = useState(!publicHistory);

  useEffect(() => {
    if (publicHistory) return;
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
  }, [student.slNo, publicHistory]);

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
            <span className="value">{totalMeds} {totalMeds === 1 ? 'Tablet' : 'Tablets'}</span>
          </div>
          <div className="stat-pill">
            <span className="label">Attendance</span>
            <span className="value">{totalPresent} {totalPresent === 1 ? 'Day' : 'Days'}</span>
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
              <div className="timeline-header">
                <div className="date">Date</div>
                <div className="status">Status</div>
                <div className="details" style={{ textAlign: 'left' }}>Medicine Details</div>
              </div>
              {history.map((h, i) => (
                <div key={i} className={`timeline-item ${h.present ? 'present' : 'absent'}`}>
                  <div className="date">
                    {(() => {
                      if (!h.date) return "N/A";
                      try {
                        // Handle YYYY-MM-DD format directly to avoid timezone issues
                        if (typeof h.date === 'string' && h.date.includes('-')) {
                          const [y, m, d] = h.date.split('-');
                          if (y && m && d) {
                            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                            return `${d} ${months[parseInt(m) - 1]} ${y}`;
                          }
                        }
                        const dt = new Date(h.date);
                        return isNaN(dt.getTime()) ? h.date : dt.toLocaleDateString("en-GB", { 
                          day: '2-digit', 
                          month: 'short', 
                          year: 'numeric' 
                        });
                      } catch (e) {
                        return h.date || "Invalid Date";
                      }
                    })()}
                  </div>
                  <div className="status">{h.present ? 'Present' : 'Absent'}</div>
                  <div className="details">
                    {h.present ? (
                      <>
                        <span className="qty">{h.quantity} {h.quantity === 1 ? 'Tablet' : 'Tablets'}</span>
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
