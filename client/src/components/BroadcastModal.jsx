import React, { useState, useMemo, useRef } from "react";
import { apiFetch } from "../lib/api";

export function BroadcastModal({ isOpen, onClose, rows = [], initialType = "custom" }) {
  if (!isOpen) return null;

  const [broadcastType, setBroadcastType] = useState(initialType); // custom | qrcodes | absent
  const [targetGroup, setTargetGroup] = useState(() => {
    if (initialType === "qrcodes") return "present";
    if (initialType === "absent") return "absent";
    return "all";
  });
  const [message, setMessage] = useState(() => {
    if (initialType === "qrcodes") return "త్వరగా హాజరు నమోదు కోసం, దయచేసి ఈ కింది QR కోడ్ను సేవ్ చేసుకోండి లేదా స్క్రీన్షాట్ తీసుకోండి. మీరు వచ్చినప్పుడు దీనిని చూపించండి.";
    if (initialType === "absent") return "ఈ రోజు మీరు స్వర్ణామృత ప్రాశనకు హాజరు కాలేదు. దయచేసి తదుపరి కార్యక్రమానికి హాజరుకాగలరు.";
    return "";
  });
  const [personalized, setPersonalized] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failCount, setFailCount] = useState(0);
  const [errors, setErrors] = useState([]);
  const [completed, setCompleted] = useState(false);
  const [transliterating, setTransliterating] = useState(false);

  const abortRef = useRef(false);

  const handleTransliterate = async () => {
    if (!message.trim()) return;
    setTransliterating(true);
    try {
      const res = await fetch(`https://inputtools.google.com/request?text=${encodeURIComponent(message)}&itc=te-t-i0-und&num=1&cp=0&cs=1&ie=utf-8&oe=utf-8&app=demopage`);
      const data = await res.json();
      if (data && data[0] === "SUCCESS" && data[1] && data[1][0] && data[1][0][1] && data[1][0][1][0]) {
        setMessage(data[1][0][1][0]);
      }
    } catch (err) {
      console.error("Transliteration failed:", err);
      alert("Transliteration failed. Please check your internet connection.");
    } finally {
      setTransliterating(false);
    }
  };

  // Filter unique students with valid phone numbers based on target group
  const studentsToSend = useMemo(() => {
    const seen = new Set();
    return rows.filter(r => {
      // Filter by presence status
      if (targetGroup === "present" && !r.present) return false;
      if (targetGroup === "absent" && r.present) return false;

      const clean = (r.phone || "").replace(/\D/g, '');
      if (clean.length < 10) return false;
      if (seen.has(clean)) return false;
      seen.add(clean);
      return true;
    });
  }, [rows, targetGroup]);

  // Adjust inputs automatically based on broadcast type
  const handleTypeChange = (type) => {
    setBroadcastType(type);
    if (type === "custom") {
      setTargetGroup("all");
      setMessage("");
    } else if (type === "qrcodes") {
      setTargetGroup("present");
      setMessage("త్వరగా హాజరు నమోదు కోసం, దయచేసి ఈ కింది QR కోడ్ను సేవ్ చేసుకోండి లేదా స్క్రీన్షాట్ తీసుకోండి. మీరు వచ్చినప్పుడు దీనిని చూపించండి.");
    } else if (type === "absent") {
      setTargetGroup("absent");
      setMessage("ఈ రోజు మీరు స్వర్ణామృత ప్రాశనకు హాజరు కాలేదు. దయచేసి తదుపరి కార్యక్రమానికి హాజరుకాగలరు.");
    }
  };

  // Build the message preview based on the first candidate student
  const firstStudent = studentsToSend[0] || { name: "Student Name", slNo: "123" };
  const getFinalMessage = (student) => {
    if (broadcastType === "custom") {
      return personalized
        ? `శ్రీమన్నారాయణ, ${student.name}!\n\n${message}`
        : `శ్రీమన్నారాయణ!\n\n${message}`;
    } else if (broadcastType === "qrcodes") {
      const encodedData = encodeURIComponent(student.slNo);
      const qrUrl = `https://quickchart.io/qr?text=${encodedData}&size=300&ext=.png`;
      return `శ్రీమన్నారాయణ, ${student.name}!\n\n${message}\n\n📷 మీ అటెండెన్స్ QR కోడ్ / Your Attendance QR Code:\n\n${qrUrl}`;
    } else if (broadcastType === "absent") {
      return `శ్రీమన్నారాయణ, ${student.name}!\n\n${message}`;
    }
    return message;
  };

  const previewMessage = useMemo(() => {
    return getFinalMessage(firstStudent);
  }, [firstStudent, broadcastType, message, personalized]);

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

      const finalMsg = getFinalMessage(student);

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

  // Recipient stats for labels
  const allCount = rows.filter(r => r.phone && r.phone.replace(/\D/g, '').length >= 10).length;
  const presentCount = rows.filter(r => r.present && r.phone && r.phone.replace(/\D/g, '').length >= 10).length;
  const absentCount = rows.filter(r => !r.present && r.phone && r.phone.replace(/\D/g, '').length >= 10).length;

  return (
    <div className="modal-overlay" style={{ zIndex: 4000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ maxWidth: '600px', width: '95%', padding: '0', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', border: 'none', background: 'white' }}>
        
        {/* Header */}
        <div style={{ background: '#f8fafc', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
          <h2 style={{ margin: 0, fontSize: '1.2em', color: '#1e293b', fontWeight: '800' }}>
            📢 WhatsApp Broadcast Campaign
          </h2>
          {!sending && (
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '1.8em', cursor: 'pointer', padding: 0 }}>&times;</button>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: '25px', maxHeight: '80vh', overflowY: 'auto' }}>
          {!sending && !completed ? (
            <>
              {/* Campaign Type Pills */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.85em', fontWeight: '800', color: '#475569', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  1. Choose Message Type
                </label>
                <div style={{ display: 'flex', gap: '8px', background: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
                  <button
                    type="button"
                    onClick={() => handleTypeChange("custom")}
                    style={{
                      flex: 1,
                      padding: '10px 8px',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '0.9em',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      background: broadcastType === "custom" ? 'white' : 'transparent',
                      color: broadcastType === "custom" ? '#0f172a' : '#64748b',
                      boxShadow: broadcastType === "custom" ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      transition: 'all 0.2s'
                    }}
                  >
                    📝 Custom Msg
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTypeChange("qrcodes")}
                    style={{
                      flex: 1,
                      padding: '10px 8px',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '0.9em',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      background: broadcastType === "qrcodes" ? 'white' : 'transparent',
                      color: broadcastType === "qrcodes" ? '#0f172a' : '#64748b',
                      boxShadow: broadcastType === "qrcodes" ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      transition: 'all 0.2s'
                    }}
                  >
                    🖨️ Send QR Codes
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTypeChange("absent")}
                    style={{
                      flex: 1,
                      padding: '10px 8px',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '0.9em',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      background: broadcastType === "absent" ? 'white' : 'transparent',
                      color: broadcastType === "absent" ? '#0f172a' : '#64748b',
                      boxShadow: broadcastType === "absent" ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      transition: 'all 0.2s'
                    }}
                  >
                    🚫 Absent Msg
                  </button>
                </div>
              </div>

              {/* Target Group Selector */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.85em', fontWeight: '800', color: '#475569', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  2. Select Target Group
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setTargetGroup("all")}
                    style={{
                      flex: 1,
                      padding: '12px 6px',
                      border: targetGroup === "all" ? '2px solid #3b82f6' : '1px solid #cbd5e1',
                      borderRadius: '12px',
                      fontSize: '0.85em',
                      fontWeight: 'bold',
                      background: targetGroup === "all" ? '#eff6ff' : 'white',
                      color: targetGroup === "all" ? '#1e40af' : '#475569',
                      cursor: 'pointer'
                    }}
                  >
                    👥 All Registered ({allCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetGroup("present")}
                    style={{
                      flex: 1,
                      padding: '12px 6px',
                      border: targetGroup === "present" ? '2px solid #10b981' : '1px solid #cbd5e1',
                      borderRadius: '12px',
                      fontSize: '0.85em',
                      fontWeight: 'bold',
                      background: targetGroup === "present" ? '#ecfdf5' : 'white',
                      color: targetGroup === "present" ? '#065f46' : '#475569',
                      cursor: 'pointer'
                    }}
                  >
                    ✅ Present Today ({presentCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetGroup("absent")}
                    style={{
                      flex: 1,
                      padding: '12px 6px',
                      border: targetGroup === "absent" ? '2px solid #f97316' : '1px solid #cbd5e1',
                      borderRadius: '12px',
                      fontSize: '0.85em',
                      fontWeight: 'bold',
                      background: targetGroup === "absent" ? '#fff7ed' : 'white',
                      color: targetGroup === "absent" ? '#9a3412' : '#475569',
                      cursor: 'pointer'
                    }}
                  >
                    🚫 Absent Today ({absentCount})
                  </button>
                </div>
              </div>

              {/* Message inputs */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ display: 'block', fontSize: '0.85em', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
                    3. Customize Message Body
                  </label>
                  <button
                    type="button"
                    onClick={handleTransliterate}
                    disabled={transliterating || !message.trim()}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: message.trim() ? '#2563eb' : '#94a3b8',
                      cursor: message.trim() ? 'pointer' : 'not-allowed',
                      fontSize: '0.8em',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      backgroundColor: message.trim() ? '#eff6ff' : 'transparent',
                      transition: 'all 0.2s',
                      outline: 'none'
                    }}
                    title="Type phonetically in English (e.g. 'namaskaram') and click to convert to Telugu"
                  >
                    {transliterating ? '⏳ Converting...' : '🔄 Convert to Telugu (Transliterate)'}
                  </button>
                </div>
                <textarea
                  className="input"
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type message text here..."
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    fontSize: '0.95em',
                    border: '1px solid #cbd5e1',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Personalization option (for custom) */}
              {broadcastType === "custom" && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                  <input
                    type="checkbox"
                    id="personalize"
                    checked={personalized}
                    onChange={(e) => setPersonalized(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <label htmlFor="personalize" style={{ fontSize: '0.9em', color: '#334155', fontWeight: '600', cursor: 'pointer' }}>
                    🙋‍♂️ Prefix automatically with "Jai Srimannarayana, [Student Name]!"
                  </label>
                </div>
              )}

              {/* Message Preview (WhatsApp bubble style) */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '0.85em', fontWeight: '800', color: '#475569', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  🔍 Message Preview (WhatsApp View)
                </label>
                <div style={{
                  background: '#efeae2',
                  backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")',
                  padding: '20px',
                  borderRadius: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start'
                }}>
                  <div style={{
                    background: '#e1ffc7',
                    padding: '12px',
                    borderRadius: '8px',
                    boxShadow: '0 1px 1px rgba(0,0,0,0.1)',
                    maxWidth: '85%',
                    alignSelf: 'flex-start',
                    position: 'relative'
                  }}>
                    {/* Simulated Text */}
                    <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.9em', color: '#1e293b', fontFamily: 'sans-serif', lineHeight: '1.4' }}>
                      {previewMessage.split('https://quickchart.io/')[0]}
                    </div>
                    {/* Simulated QR Thumbnail */}
                    {broadcastType === "qrcodes" && (
                      <div style={{ marginTop: '8px', background: 'white', padding: '8px', borderRadius: '6px', border: '1px solid #ccd', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <img 
                          src={`https://quickchart.io/qr?text=Preview&size=150`} 
                          alt="QR Preview" 
                          style={{ width: '120px', height: '120px' }} 
                        />
                        <span style={{ fontSize: '0.7em', color: '#64748b', marginTop: '4px', wordBreak: 'break-all' }}>
                          https://quickchart.io/qr?text={firstStudent.slNo || "123"}...
                        </span>
                      </div>
                    )}
                    <div style={{ textAlign: 'right', fontSize: '0.7em', color: '#888', marginTop: '4px' }}>
                      {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ✓✓
                    </div>
                  </div>
                </div>
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
                  🚀 Send to {studentsToSend.length} Candidates
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
