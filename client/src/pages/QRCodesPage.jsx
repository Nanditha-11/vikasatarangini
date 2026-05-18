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
      
      if (matchingStudents.length > 1) {
        const names = matchingStudents.map(s => s.name).join(", ");
        alert(`✅ QR Photos sent successfully to ${num} for all ${matchingStudents.length} family students: ${names}!`);
      } else {
        alert(`✅ QR Photo successfully sent to ${student.name}!`);
      }
    } catch (err) {
      console.error(err);
      alert(`❌ Failed to send: ${err.message}`);
    } finally {
      setSendingId(null);
    }
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
    </Layout>
  );
}
