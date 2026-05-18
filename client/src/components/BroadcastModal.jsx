import React, { useState, useMemo, useRef } from "react";
import { apiFetch } from "../lib/api";

export function BroadcastModal({ isOpen, onClose, rows = [] }) {
  if (!isOpen) return null;

  // Filter unique students with valid phone numbers
  const studentsToSend = useMemo(() => {
    const seen = new Set();
    return rows.filter(r => {
      const clean = (r.phone || "").replace(/\D/g, '');
      if (clean.length < 10) return false;
      if (seen.has(clean)) return false;
      seen.add(clean);
      return true;
    });
  }, [rows]);

  const [message, setMessage] = useState("");
  const [personalized, setPersonalized] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failCount, setFailCount] = useState(0);
  const [errors, setErrors] = useState([]);
  const [completed, setCompleted] = useState(false);
  
  const abortRef = useRef(false);

  const handleSend = async () => {
    if (!message.trim()) {
      alert("Please enter a message to broadcast.");
      return;
    }

    setSending(true);
    setCompleted(false);
    setCurrentIndex(0);
    setSuccessCount(0);
    setFailCount(0);
    setErrors([]);
    abortRef.current = false;

    for (let i = 0; i < studentsToSend.length; i++) {
      if (abortRef.current) {
        console.log("Broadcast cancelled by user.");
        break;
      }

      const student = studentsToSend[i];
      setCurrentIndex(i);

      const cleanNum = student.phone.replace(/\D/g, '');
      const fullPhone = cleanNum.length === 10 ? '91' + cleanNum : cleanNum;

      const finalMsg = personalized
        ? `Jai Srimannarayana, ${student.name}!\n\n${message}`
        : `Jai Srimannarayana!\n\n${message}`;

      try {
        await apiFetch("/api/whatsapp/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: fullPhone, text: finalMsg })
        });
        setSuccessCount(prev => prev + 1);
      } catch (err) {
        console.error(`Failed sending to ${student.name}:`, err);
        setFailCount(prev => prev + 1);
        setErrors(prev => [...prev, `${student.name} (${student.phone}): ${err.message}`]);
      }

      // Add a small delay between sends to prevent WhatsApp spam blocks
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setSending(false);
    setCompleted(true);
    setCurrentIndex(studentsToSend.length);
  };

  const handleCancel = () => {
    abortRef.current = true;
    setSending(false);
  };

  const percent = studentsToSend.length > 0 
    ? Math.round((currentIndex / studentsToSend.length) * 100) 
    : 0;

  return (
    <div className="modal-overlay" style={{ zIndex: 4000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ maxWidth: '500px', width: '95%', padding: '0', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', border: 'none', background: 'white' }}>
        
        {/* Header */}
        <div style={{ background: '#f8fafc', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
          <h2 style={{ margin: 0, fontSize: '1.2em', color: '#1e293b', fontWeight: '800' }}>
            📢 WhatsApp Broadcast / బ్రాడ్‌కాస్ట్
          </h2>
          {!sending && (
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '1.8em', cursor: 'pointer', padding: 0 }}>&times;</button>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: '30px' }}>
          {!sending && !completed ? (
            <>
              {/* Target info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px 16px', borderRadius: '16px', marginBottom: '20px' }}>
                <span style={{ fontSize: '1.5em' }}>👥</span>
                <div>
                  <h4 style={{ color: '#16a34a', margin: 0, fontSize: '0.95em' }}>Target: {studentsToSend.length} Students</h4>
                  <p style={{ color: '#15803d', fontSize: '0.8em', margin: '2px 0 0' }}>All unique student contacts with valid phone numbers in this branch.</p>
                </div>
              </div>

              {/* Message inputs */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.9em', fontWeight: '700', color: '#475569', marginBottom: '8px' }}>
                  Write Custom Message
                </label>
                <textarea
                  className="input"
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message here..."
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    fontSize: '1em',
                    border: '1px solid #cbd5e1',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Personalization option */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                <input
                  type="checkbox"
                  id="personalize"
                  checked={personalized}
                  onChange={(e) => setPersonalized(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="personalize" style={{ fontSize: '0.9em', color: '#334155', fontWeight: '600', cursor: 'pointer' }}>
                  🙋‍♂️ Personalize (Automatically prefix with "Jai Srimannarayana, [Student Name]!")
                </label>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  className="btn"
                  onClick={onClose}
                  style={{ flex: 1, padding: '12px', borderRadius: '50px', background: '#cbd5e1', color: '#1e293b', border: 'none', fontWeight: 'bold' }}
                >
                  Cancel
                </button>
                <button
                  className="btn"
                  onClick={handleSend}
                  disabled={studentsToSend.length === 0 || !message.trim()}
                  style={{
                    flex: 2,
                    padding: '12px',
                    borderRadius: '50px',
                    background: studentsToSend.length === 0 || !message.trim() ? '#94a3b8' : 'linear-gradient(135deg, #25D366, #128C7E)',
                    color: 'white',
                    border: 'none',
                    fontWeight: 'bold',
                    boxShadow: '0 4px 12px rgba(37, 211, 102, 0.2)',
                    cursor: studentsToSend.length === 0 || !message.trim() ? 'not-allowed' : 'pointer'
                  }}
                >
                  🚀 Send Broadcast
                </button>
              </div>
            </>
          ) : sending ? (
            /* Progress view */
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0' }}>
              <h3 style={{ color: '#0f172a', margin: '0 0 8px 0' }}>Sending Messages...</h3>
              <p style={{ color: '#64748b', fontSize: '0.9em', margin: '0 0 20px 0' }}>
                Currently sending to student {currentIndex + 1} of {studentsToSend.length}
              </p>

              {/* Progress bar container */}
              <div style={{ width: '100%', height: '12px', background: '#f1f5f9', borderRadius: '50px', overflow: 'hidden', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
                <div 
                  style={{ 
                    width: `${percent}%`, 
                    height: '100%', 
                    background: 'linear-gradient(90deg, #25D366, #0ea5e9)', 
                    borderRadius: '50px',
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>

              {/* Status Counters */}
              <div style={{ display: 'flex', gap: '30px', marginBottom: '24px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2em', fontWeight: '800', color: '#16a34a' }}>{successCount}</div>
                  <div style={{ fontSize: '0.8em', color: '#64748b', fontWeight: 'bold' }}>✅ Sent</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2em', fontWeight: '800', color: '#ef4444' }}>{failCount}</div>
                  <div style={{ fontSize: '0.8em', color: '#64748b', fontWeight: 'bold' }}>❌ Failed</div>
                </div>
              </div>

              <div style={{ width: '100%', padding: '12px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                <span className="wa-loading-spin" style={{ width: '14px', height: '14px', border: '2px solid #cbd5e1', borderTopColor: '#25D366', borderRadius: '50%', display: 'inline-block' }}></span>
                <span style={{ fontSize: '0.85em', color: '#475569', fontWeight: '600' }}>
                  Active delivery: <strong style={{ color: '#0f172a' }}>{studentsToSend[currentIndex]?.name}</strong>
                </span>
              </div>

              <button
                className="btn danger"
                onClick={handleCancel}
                style={{ width: '100%', padding: '12px', borderRadius: '50px', fontWeight: 'bold' }}
              >
                🛑 Stop Broadcast
              </button>
            </div>
          ) : (
            /* Completed report view */
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 0' }}>
              <span style={{ fontSize: '3.5em', marginBottom: '15px' }}>🎉</span>
              <h3 style={{ color: '#16a34a', margin: '0 0 6px 0', fontSize: '1.3em' }}>Broadcast Complete!</h3>
              <p style={{ color: '#64748b', fontSize: '0.9em', margin: '0 0 24px 0' }}>
                Successfully processed all contacts in this branch.
              </p>

              <div style={{ width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                <div style={{ textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.8em', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Delivered</span>
                  <div style={{ fontSize: '2.5em', fontWeight: '900', color: '#16a34a', marginTop: '4px' }}>{successCount}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: '0.8em', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Failed</span>
                  <div style={{ fontSize: '2.5em', fontWeight: '900', color: '#ef4444', marginTop: '4px' }}>{failCount}</div>
                </div>
              </div>

              {/* Errors report */}
              {errors.length > 0 && (
                <div style={{ width: '100%', marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '0.85em', fontWeight: '800', color: '#ef4444', marginBottom: '8px', textTransform: 'uppercase' }}>
                    Failure Logs ({errors.length})
                  </label>
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', maxRawHeight: '140px', overflowY: 'auto', padding: '12px', boxSizing: 'border-box' }}>
                    {errors.map((err, idx) => (
                      <div key={idx} style={{ fontSize: '0.8em', color: '#991b1b', margin: '4px 0', borderBottom: '1px solid #fee2e2', paddingBottom: '4px' }}>
                        {err}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                className="btn primary"
                onClick={onClose}
                style={{ width: '100%', padding: '12px', borderRadius: '50px', background: 'linear-gradient(135deg, #0d2866, #0072ff)', color: 'white', border: 'none', fontWeight: 'bold' }}
              >
                Close Report
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
