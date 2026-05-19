import React, { useState, useMemo, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useAttendance } from "../hooks/useAttendance";
import { Layout } from "../components/Layout";
import { apiFetch } from "../lib/api";

export function QRCodesPage() {
  const { rows, busy, error } = useAttendance();
  const [filter, setFilter] = useState("");
  const [networkIp, setNetworkIp] = useState(window.location.origin);
  const [sendingId, setSendingId] = useState(null);

  // Bulk QR codes states
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkCurrentIndex, setBulkCurrentIndex] = useState(0);
  const [bulkSuccessCount, setBulkSuccessCount] = useState(0);
  const [bulkFailCount, setBulkFailCount] = useState(0);
  const [bulkCompleted, setBulkCompleted] = useState(false);
  const [bulkErrors, setBulkErrors] = useState([]);
  const abortBulkRef = React.useRef(false);

  useEffect(() => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      fetch('/api/public/network-ip')
        .then(res => res.json())
        .then(data => {
          if (data.ip) {
            setNetworkIp(`http://${data.ip}:5173`);
          }
        })
        .catch(err => console.error("Could not fetch network IP", err));
    }
  }, []);

  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : {};
  const district = user.district || "Main";
  const place = user.place || "Main";
  const whatsappLink = user.whatsappLink || "";

  const q = filter.trim().toLowerCase();

  const visibleRows = useMemo(() => {
    // Sort numerical by slNo
    const sorted = [...rows].sort((a, b) => (parseInt(a.slNo, 10) || 0) - (parseInt(b.slNo, 10) || 0));

    if (!q) return sorted;
    return sorted.filter(
      (r) =>
        String(r.slNo || "").toLowerCase().includes(q) ||
        String(r.name || "").toLowerCase().includes(q) ||
        String(r.phone || "").toLowerCase().includes(q)
    );
  }, [rows, q]);

  const handleSendQR = async (student) => {
    const phone = student.phone;
    if (!phone) {
      alert("❌ This student has no registered phone number!");
      return;
    }
    
    // Find all students sharing the exact same phone number
    const cleanTargetPhone = phone.replace(/\D/g, "");
    const matchingStudents = rows.filter(r => r.phone && r.phone.replace(/\D/g, "") === cleanTargetPhone);
    
    setSendingId(student.slNo);
    
    let num = cleanTargetPhone;
    if (num.length === 10) num = "91" + num;
    
    const groupLink = whatsappLink || "https://chat.whatsapp.com/I4HtF79W6msI5RftyIPgpd";
    
    try {
      // Loop and send the QR Code for each matching family member
      for (const st of matchingStudents) {
        const encodedData = encodeURIComponent(st.slNo);
        const qrUrl = `https://quickchart.io/qr?text=${encodedData}&size=300&ext=.png`;
        
        const textStr = `Jai Srimannarayana!\n\nHere is the Attendance QR Code for ${st.name} (ID: ${st.slNo}).\n\n🔗 Join Group: ${groupLink}\n\nPlease save this image to your phone and show it for fast attendance!\nదయచేసి ఈ చిత్రాన్ని మీ ఫోన్‌లో సేవ్ చేసుకోండి మరియు హాజరు త్వరగా నమోదు కావడానికి దీనిని చూపించండి!\n\n${qrUrl}`;
        
        await apiFetch("/api/whatsapp/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: num, text: textStr })
        });
      }
      
      let successMsg = "";
      let lastTextStr = "";
      if (matchingStudents.length > 1) {
        const names = matchingStudents.map(s => s.name).join(", ");
        successMsg = `✅ Automated QR Photos triggered for all ${matchingStudents.length} family students: ${names}!`;
        // Create a combined manual message text containing links to all QR codes for family
        lastTextStr = `Jai Srimannarayana!\n\nHere are the Attendance QR Codes for your children:\n\n` + 
          matchingStudents.map(st => `*${st.name}* (ID: ${st.slNo}):\nhttps://quickchart.io/qr?text=${encodeURIComponent(st.slNo)}&size=300&ext=.png`).join('\n\n') + 
          `\n\n🔗 Join Group: ${groupLink}\n\nPlease save these QR codes to your phone!`;
      } else {
        successMsg = `✅ Automated QR Photo triggered for ${student.name}!`;
        const encodedData = encodeURIComponent(student.slNo);
        const qrUrl = `https://quickchart.io/qr?text=${encodedData}&size=300&ext=.png`;
        lastTextStr = `Jai Srimannarayana!\n\nHere is the Attendance QR Code for ${student.name} (ID: ${student.slNo}).\n\n🔗 Join Group: ${groupLink}\n\nPlease save this image to your phone and show it for fast attendance!\n\n${qrUrl}`;
      }

      alert(successMsg);
    } catch (err) {
      console.error(err);
      alert(`❌ Failed to send: ${err.message}`);
    } finally {
      setSendingId(null);
    }
  };

  const handleSendBulk = async () => {
    // Group visibleRows by unique phone number
    const uniquePhonesMap = {};
    visibleRows.forEach(student => {
      if (!student.phone) return;
      const cleanPhone = student.phone.replace(/\D/g, "");
      if (!cleanPhone) return;
      if (!uniquePhonesMap[cleanPhone]) {
        uniquePhonesMap[cleanPhone] = [];
      }
      uniquePhonesMap[cleanPhone].push(student);
    });

    const queue = Object.keys(uniquePhonesMap).map(phone => ({
      phone: phone,
      students: uniquePhonesMap[phone]
    }));

    if (queue.length === 0) {
      alert("No students with valid phone numbers in the current filtered list!");
      return;
    }

    const confirmStart = window.confirm(`Are you sure you want to send QR Codes to ${queue.length} unique phone contacts (representing ${visibleRows.length} students)?`);
    if (!confirmStart) return;

    setBulkSending(true);
    setBulkCompleted(false);
    setBulkCurrentIndex(0);
    setBulkSuccessCount(0);
    setBulkFailCount(0);
    setBulkErrors([]);
    abortBulkRef.current = false;
    setShowBulkModal(true);

    const groupLink = whatsappLink || "https://chat.whatsapp.com/I4HtF79W6msI5RftyIPgpd";

    for (let i = 0; i < queue.length; i++) {
      if (abortBulkRef.current) {
        console.log("Bulk send cancelled by user.");
        break;
      }

      const item = queue[i];
      setBulkCurrentIndex(i);

      let num = item.phone;
      if (num.length === 10) num = "91" + num;

      try {
        // Send QR code for each student associated with this phone number
        for (const st of item.students) {
          const encodedData = encodeURIComponent(st.slNo);
          const qrUrl = `https://quickchart.io/qr?text=${encodedData}&size=300&ext=.png`;
          
          const textStr = `Jai Srimannarayana!\n\nHere is the Attendance QR Code for ${st.name} (ID: ${st.slNo}).\n\n🔗 Join Group: ${groupLink}\n\nPlease save this image to your phone and show it for fast attendance!\nదయచేసి ఈ చిత్రాన్ని మీ ఫోన్‌లో సేవ్ చేసుకోండి మరియు హాజరు త్వరగా నమోదు కావడానికి దీనిని చూపించండి!\n\n${qrUrl}`;
          
          await apiFetch("/api/whatsapp/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone: num, text: textStr })
          });
        }
        setBulkSuccessCount(prev => prev + 1);
      } catch (err) {
        console.error(`Failed bulk send to ${item.phone}:`, err);
        setBulkFailCount(prev => prev + 1);
        const studentNames = item.students.map(s => s.name).join(", ");
        setBulkErrors(prev => [...prev, `${studentNames} (${item.phone}): ${err.message}`]);
      }

      // Add a small delay between contacts
      await new Promise(resolve => setTimeout(resolve, 400));
    }

    setBulkSending(false);
    setBulkCompleted(true);
    setBulkCurrentIndex(queue.length);
  };

  return (
    <Layout title="All Student QR Codes">
      <style>
        {`
          @media print {
            .no-print, nav, header, .sidebar, .btn {
              display: none !important;
            }
            .card {
              box-shadow: none !important;
              border: none !important;
              background: white !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            body {
              background: white !important;
            }
          }
        `}
      </style>
      <div className="card" style={{ marginTop: '24px', padding: '30px' }}>
        <h2 className="no-print" style={{ color: '#0d2866', marginBottom: '20px' }}>Print / View Student QR Codes</h2>
        
        <div className="row no-print" style={{ marginBottom: '24px', position: 'relative', display: 'flex', gap: '15px' }}>
          <input
            className="input"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search by ID, Name or Phone..."
            style={{
              flex: 1,
              padding: '14px 20px',
              paddingRight: '50px',
              fontSize: '1.1em',
              borderRadius: '10px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}
          />
          {filter && (
            <button
              onClick={() => setFilter("")}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                fontSize: '1.5em',
                color: '#64748b',
                cursor: 'pointer'
              }}
            >
              &times;
            </button>
          )}
          <button 
            className="btn primary no-print" 
            onClick={() => window.print()}
            style={{ padding: '14px 24px', fontSize: '1.1em', background: '#0d2866', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            🖨️ Print Codes
          </button>
          <button 
            className="btn no-print" 
            onClick={handleSendBulk}
            disabled={visibleRows.length === 0}
            style={{ 
              padding: '14px 24px', 
              fontSize: '1.1em', 
              background: 'linear-gradient(135deg, #25D366, #128C7E)', 
              color: 'white', 
              border: 'none', 
              borderRadius: '10px', 
              cursor: 'pointer', 
              whiteSpace: 'nowrap',
              fontWeight: 'bold',
              boxShadow: '0 4px 12px rgba(37,211,102,0.15)'
            }}
          >
            📢 Send Bulk QR Codes
          </button>
        </div>

        {error && <div className="error">{error}</div>}
        {busy && <p style={{ color: '#64748b' }}>Loading students...</p>}

        {!busy && visibleRows.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', background: '#f8fafc', borderRadius: '16px' }}>
            <h3 style={{ color: '#64748b' }}>No students found for "{filter}"</h3>
          </div>
        )}

        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '24px' }}>
          {visibleRows.map(student => {
            return (
              <div key={student.slNo} className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '1.1em', color: '#1e293b' }}>{student.name}</h4>
                <p style={{ margin: '0 0 16px 0', fontSize: '0.9em', color: '#64748b' }}>ID: {student.slNo}</p>
                
                <div style={{ padding: '12px', background: 'white', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '16px' }}>
                  <QRCodeSVG 
                    value={`${networkIp}/?mark=${student.slNo}`}
                    size={160}
                    level="H"
                    includeMargin={true}
                  />
                </div>

                <button
                  className="btn no-print"
                  disabled={sendingId === student.slNo}
                  onClick={() => handleSendQR(student)}
                  style={{
                    width: '100%',
                    background: '#25D366',
                    borderColor: '#25D366',
                    color: 'white',
                    fontWeight: 'bold',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    fontSize: '0.9em'
                  }}
                >
                  {sendingId === student.slNo ? "⏳ Sending..." : "📲 Send to WhatsApp"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {showBulkModal && (
        <div className="modal-overlay" style={{ zIndex: 4000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
          <div className="card" style={{ maxWidth: '500px', width: '95%', padding: '0', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', border: 'none', background: 'white' }}>
            
            {/* Header */}
            <div style={{ background: '#f8fafc', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
              <h2 style={{ margin: 0, fontSize: '1.2em', color: '#1e293b', fontWeight: '800' }}>
                📲 Bulk QR Codes Broadcast
              </h2>
              {!bulkSending && (
                <button onClick={() => setShowBulkModal(false)} style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '1.8em', cursor: 'pointer', padding: 0 }}>&times;</button>
              )}
            </div>

            {/* Content */}
            <div style={{ padding: '30px' }}>
              {bulkSending ? (
                /* Progress view */
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0' }}>
                  <h3 style={{ color: '#0f172a', margin: '0 0 8px 0' }}>Sending QR Codes...</h3>
                  <p style={{ color: '#64748b', fontSize: '0.9em', margin: '0 0 20px 0' }}>
                    Processing contact {bulkCurrentIndex + 1} of {Math.max(1, bulkCurrentIndex + bulkSuccessCount + bulkFailCount)}
                  </p>

                  {/* Progress bar container */}
                  <div style={{ width: '100%', height: '12px', background: '#f1f5f9', borderRadius: '50px', overflow: 'hidden', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
                    <div 
                      style={{ 
                        width: `${Math.round((bulkCurrentIndex / Math.max(1, bulkCurrentIndex + bulkSuccessCount + bulkFailCount)) * 100)}%`, 
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
                      <div style={{ fontSize: '2em', fontWeight: '800', color: '#16a34a' }}>{bulkSuccessCount}</div>
                      <div style={{ fontSize: '0.8em', color: '#64748b', fontWeight: 'bold' }}>✅ Sent</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '2em', fontWeight: '800', color: '#ef4444' }}>{bulkFailCount}</div>
                      <div style={{ fontSize: '0.8em', color: '#64748b', fontWeight: 'bold' }}>❌ Failed</div>
                    </div>
                  </div>

                  <button
                    className="btn danger"
                    onClick={() => { abortBulkRef.current = true; setBulkSending(false); }}
                    style={{ width: '100%', padding: '12px', borderRadius: '50px', fontWeight: 'bold', background: '#ef4444', color: 'white', border: 'none', cursor: 'pointer' }}
                  >
                    🛑 Stop Sending
                  </button>
                </div>
              ) : (
                /* Completed report view */
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 0' }}>
                  <span style={{ fontSize: '3.5em', marginBottom: '15px' }}>🎉</span>
                  <h3 style={{ color: '#16a34a', margin: '0 0 6px 0', fontSize: '1.3em' }}>Bulk Sending Complete!</h3>
                  <p style={{ color: '#64748b', fontSize: '0.9em', margin: '0 0 24px 0' }}>
                    Finished transmitting QR codes to all unique parents.
                  </p>

                  <div style={{ width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                    <div style={{ textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.8em', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Delivered</span>
                      <div style={{ fontSize: '2.5em', fontWeight: '900', color: '#16a34a', marginTop: '4px' }}>{bulkSuccessCount}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: '0.8em', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Failed</span>
                      <div style={{ fontSize: '2.5em', fontWeight: '900', color: '#ef4444', marginTop: '4px' }}>{bulkFailCount}</div>
                    </div>
                  </div>

                  {/* Errors report */}
                  {bulkErrors.length > 0 && (
                    <div style={{ width: '100%', marginBottom: '24px' }}>
                      <label style={{ display: 'block', fontSize: '0.85em', fontWeight: '800', color: '#ef4444', marginBottom: '8px', textTransform: 'uppercase' }}>
                        Failure Logs ({bulkErrors.length})
                      </label>
                      <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', maxHeight: '140px', overflowY: 'auto', padding: '12px', boxSizing: 'border-box' }}>
                        {bulkErrors.map((err, idx) => (
                          <div key={idx} style={{ fontSize: '0.8em', color: '#991b1b', margin: '4px 0', borderBottom: '1px solid #fee2e2', paddingBottom: '4px', textAlign: 'left' }}>
                            {err}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    className="btn primary"
                    onClick={() => setShowBulkModal(false)}
                    style={{ width: '100%', padding: '12px', borderRadius: '50px', background: 'linear-gradient(135deg, #0d2866, #0072ff)', color: 'white', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    Close Report
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
