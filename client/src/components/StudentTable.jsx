import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { apiFetch } from "../lib/api";

export function StudentTable({ rows, filter, setFilter, onToggle, onMarkClick, onModifyClick, onUpdateQuantity, onDelete, onViewHistory, busy, viewMode, deletingSlNo, setDeletingSlNo, deletePass, setDeletePass, isMaster, viewDistrict, viewPlace }) {
  const navigate = useNavigate();
  const q = filter.trim().toLowerCase();
  const [qrStudent, setQrStudent] = useState(null);

  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : {};
  const district = viewDistrict || user.district || "Main";
  const place = viewPlace || user.place || "Main";
  
  const [networkIp, setNetworkIp] = useState(window.location.origin);

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

  const handleModifyClick = () => {
    navigate("/modify");
  };

  const visibleRows = useMemo(() => {
    // 1. Initial filter by presence
    const base = viewMode === "marking" ? rows.filter(r => !r.present) : rows.filter(r => r.present);

    // 2. Numerical Sort
    const sorted = [...base].sort((a, b) => (parseInt(a.slNo, 10) || 0) - (parseInt(b.slNo, 10) || 0));

    // 3. Search filter
    if (!q) return sorted;
    return sorted.filter(
      (r) =>
        String(r.slNo || "").toLowerCase().includes(q) ||
        String(r.phone || "").toLowerCase().includes(q) ||
        String(r.name || "").toLowerCase().includes(q) ||
        String(r.fatherName || "").toLowerCase().includes(q)
    );
  }, [rows, q, viewMode]);

  const isSearching = q.length > 0;

  return (
    <div className="card" style={{ marginTop: '24px' }}>
      <div className="row" style={{ marginBottom: '16px', justifyContent: 'center' }}>
        <div className="row" style={{ flex: 1, maxWidth: '800px', position: 'relative' }}>

          <input
            className="input"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search by ID, Name, Father Name or Phone..."
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
              className="btn"
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
                padding: '5px 15px',
                cursor: 'pointer'
              }}
            >
              &times;
            </button>
          )}
        </div>
      </div>

      {isSearching ? (
        visibleRows.length > 0 ? (
          <div className="search-results-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px', padding: '10px' }}>
            {visibleRows.map(r => (
              <div key={r.slNo} className="card p-4" style={{ borderLeft: '4px solid #3b82f6', background: '#f8fafc' }}>
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.2em' }}>{r.name}</h4>
                    <p className="muted" style={{ margin: '4px 0', fontSize: '0.9em' }}>
                      <b>Serial No:</b> {r.slNo} | <b>Age:</b> {r.age || 'N/A'}
                    </p>
                    <p className="muted" style={{ margin: '4px 0', fontSize: '0.9em' }}>
                      <b>Father Name:</b> {r.fatherName || 'N/A'}
                    </p>
                    <p className="muted" style={{ margin: '4px 0', fontSize: '0.9em' }}>
                      <b>Phone Number:</b> {r.phone}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      <button className="btn primary" style={{ flex: 1 }} onClick={() => onViewHistory(r)}>
                        View Details
                      </button>
                      <button className="btn" style={{ flex: 1, background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a' }} onClick={() => setQrStudent(r)}>
                        Generate QR
                      </button>
                    </div>

                                        <button 
                      className="btn" 
                      style={{ display: 'block', width: '100%', marginBottom: '8px', borderColor: '#25D366', color: '#25D366', fontWeight: 'bold' }} 
                      onClick={async () => {
                         const num = (r.phone || "").replace(/\D/g, '');
                         const encodedData = encodeURIComponent(r.slNo);
                         const qrUrl = `https://quickchart.io/qr?text=${encodedData}&size=300&ext=.png`;
                         const textStr = `Jai Srimannarayana!\n\nHere is your Attendance QR Code for Vikasatarangini:\n\nPlease save this image to your phone and show it for fast attendance!\n\n${qrUrl}`;
                         
                         const fullPhone = num.length === 10 ? '91' + num : num;
                         try {
                           await apiFetch("/api/whatsapp/send", {
                             method: "POST",
                             headers: { "Content-Type": "application/json" },
                             body: JSON.stringify({ phone: fullPhone, text: textStr })
                           });
                           alert("✅ WhatsApp QR message sent automatically!");
                         } catch (waErr) {
                           console.warn("Automated WhatsApp send failed, falling back to manual: ", waErr);
                           window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(textStr)}`, "_blank");
                         }
                      }}
                    >
                      📲 Send QR Code
                    </button>

                    {!isMaster && (
                      <>
                        {r.present && onModifyClick && (
                          !r.isVisiting ? (
                            <button className="btn" style={{ borderColor: '#2563eb', color: '#2563eb', width: '100%', marginBottom: '8px' }} onClick={() => onModifyClick(r)}>
                              Modify Details
                            </button>
                          ) : (
                            <span style={{ display: 'block', margin: '4px 0', fontSize: '0.8em', color: '#64748b', fontStyle: 'italic', fontWeight: 'bold', background: '#f1f5f9', padding: '5px', borderRadius: '4px', textAlign: 'center' }}>
                              Visitor (Read-Only)
                            </span>
                          )
                        )}
                        {!r.present && (
                          <button className="btn" style={{ borderColor: '#059669', color: '#059669', width: '100%', marginBottom: '8px' }} onClick={() => onMarkClick(r)}>
                            Mark Present
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 40px', background: '#f8fafc', borderRadius: '16px', border: '2px dashed #e2e8f0' }}>
            <div style={{ fontSize: '3em', marginBottom: '10px' }}>🔎</div>
            <h3 style={{ color: '#64748b', margin: '0 0 10px' }}>No local results for "{filter}"</h3>
            <p style={{ color: '#94a3b8' }}>This student is not in your branch list.</p>
          </div>
        )
      ) : (
        <div style={{ height: '40px' }} />
      )}

      {qrStudent && (
        <div className="modal-overlay" style={{ zIndex: 2000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ maxWidth: '400px', width: '95%', padding: '0', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', border: 'none', background: 'white' }}>
            <div style={{ background: '#f8fafc', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
              <h2 style={{ margin: 0, fontSize: '1.2em', color: '#1e293b' }}>Payment QR Code</h2>
              <button onClick={() => setQrStudent(null)} style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '1.5em', cursor: 'pointer' }}>&times;</button>
            </div>
            <div style={{ padding: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#0f172a' }}>{qrStudent.name}</h3>
              <p style={{ margin: '0 0 20px 0', color: '#64748b' }}>ID: {qrStudent.slNo}</p>
              <div style={{ padding: '16px', background: 'white', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                <QRCodeSVG 
                  value={`${networkIp}/?mark=${qrStudent.slNo}`}
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              </div>
              <p style={{ marginTop: '20px', color: '#94a3b8', fontSize: '0.9em', textAlign: 'center' }}>
                Scan this QR to open the payment page for this student.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
