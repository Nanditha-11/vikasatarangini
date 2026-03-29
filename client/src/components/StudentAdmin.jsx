import { useState, useEffect } from "react";
import { apiFetch } from "../lib/api";

export function StudentAdmin({ onRefresh, busy, setBusy, setError, rows = [], viewDistrict, viewPlace, whatsappLink }) {
  const [showAddManual, setShowAddManual] = useState(false);
  const [newStudent, setNewStudent] = useState({ slNo: "", name: "", fatherName: "", age: "", phone: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [successData, setSuccessData] = useState(null);
  const [config, setConfig] = useState(null);
  const [adminProfile, setAdminProfile] = useState(null);
  const [inquiryPhone, setInquiryPhone] = useState("");
  const [inquiryResults, setInquiryResults] = useState(null);
  const [showInquiryModal, setShowInquiryModal] = useState(false);

  useEffect(() => {
    // 1. Fetch location defaults - include district/place for Master Admin
    let url = "/api/location-config";
    if (viewDistrict && viewPlace) {
      url += `?district=${encodeURIComponent(viewDistrict)}&place=${encodeURIComponent(viewPlace)}`;
    }

    apiFetch(url)
      .then(data => {
        console.log("[StudentAdmin] Loaded location config:", data);
        setConfig(data);
      })
      .catch(err => console.error("[StudentAdmin] Failed to load location config:", err));

    // 2. Fetch admin profile for their specific registration link
    apiFetch("/api/auth/me")
      .then(profile => {
        console.log("[StudentAdmin] Loaded admin profile:", profile);
        setAdminProfile(profile);
      })
      .catch(err => console.error("[StudentAdmin] Failed to load admin profile:", err));
  }, [viewDistrict, viewPlace]);

  const handleInquiry = async () => {
    if (!inquiryPhone || inquiryPhone.length !== 10) {
      alert("Please enter a valid 10-digit phone number");
      return;
    }
    setBusy(true);
    setInquiryResults(null);
    try {
      const data = await apiFetch(`/api/students/inquiry/${inquiryPhone}`);
      setInquiryResults(data.results || []);
      setShowInquiryModal(true);
    } catch (err) {
      setError(err.message || "Global Inquiry failed");
    } finally {
      setBusy(false);
    }
  };

  const handleAddManual = async () => {
    const errors = {};
    if (!newStudent.name.trim()) errors.name = "fill the required field";
    if (!newStudent.phone.trim()) errors.phone = "fill the required field";
    else if (newStudent.phone.length !== 10) errors.phone = "Phone must be exactly 10 digits";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setBusy(true);
    setError("");
    try {
      const res = await apiFetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newStudent),
      });
      // RESOLVE CORRECT LINK: 
      // 1. If we have a resolved config (from district/place search), it's the most accurate for the view.
      // 2. Fallback to admin profile or user localStorage.
      const userStr = localStorage.getItem("user");
      const user = userStr ? JSON.parse(userStr) : null;

      const link = (whatsappLink && whatsappLink.startsWith("http"))
        ? whatsappLink
        : (config?.whatsappLink && config.whatsappLink.startsWith("http"))
          ? config.whatsappLink
          : (adminProfile?.whatsappLink || user?.whatsappLink || "");

      let num = res.student?.phone?.replace(/\D/g, "");
      if (num) {
        if (num.length === 10) num = "91" + num;
        let template = config?.inviteTemplate || `Jai Srimannarayana!\n\nWelcome to Vikasatarangini, {{name}}. Please join our official WhatsApp group by clicking the link below:\n\n{{link}}`;
        if (!link || !link.startsWith("http")) {
          // Send a simplified message if no group link is available
          template = `Jai Srimannarayana!\n\nWelcome to Vikasatarangini, {{name}}.`;
        }
        const inviteMsg = template.replace("{{name}}", res.student.name).replace("{{link}}", link);

        setSuccessData({ phone: num, text: inviteMsg });
      }

      setNewStudent({ slNo: "", name: "", fatherName: "", age: "", phone: "" });
      onRefresh();
    } catch (err) {
      setError(err.message || "Failed to add student");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card" style={{ marginBottom: '24px', background: 'rgba(255, 255, 255, 0.4)' }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0 }}>Student Management</h3>
        <div className="row" style={{ gap: '10px' }}>
          <div className="row" style={{ gap: '10px', background: 'rgba(255,255,255,0.7)', padding: '5px 15px', borderRadius: '50px', border: '1px solid #e2e8f0' }}>
            <input 
              type="text" 
              placeholder="🔍 Search all locations by phone..." 
              value={inquiryPhone}
              onChange={(e) => setInquiryPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              onKeyDown={(e) => e.key === 'Enter' && handleInquiry()}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.9em', color: '#000000', fontWeight: 'bold' }}
            />
            <button className="btn" onClick={handleInquiry} disabled={busy} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0' }}>Search</button>
          </div>
          <button className="btn primary" style={{ background: '#3b82f6', borderColor: '#3b82f6', color: '#000000' }} onClick={() => setShowAddManual(!showAddManual)}>
            {showAddManual ? "✕ Close" : "👤 Add New Student"}
          </button>
        </div>
      </div>

      {showAddManual && (
        <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(255,255,255,0.6)', borderRadius: '12px' }}>
          <div style={{ marginBottom: '10px', fontSize: '0.9em', color: '#000000', fontWeight: '800' }}>
            Next Available Serial No: {(() => {
              const max = rows.reduce((m, r) => Math.max(m, parseInt(r.slNo) || 0), 0);
              return max + 1;
            })()}
          </div>
          <div className="grid" style={{ gridTemplateColumns: '1.5fr 1.5fr 1.2fr 0.8fr', gap: '12px' }}>
            <div className="field">
              <label>Student Name</label>
              <input
                className="input"
                style={{ textTransform: 'capitalize' }}
                value={newStudent.name}
                onChange={(e) => {
                  let val = e.target.value.replace(/[^a-zA-Z\s]/g, "");
                  // Automatically capitalize the first letter of each word but ALLOW subsequent capitals
                  const words = val.split(" ");
                  const capped = words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
                  setNewStudent({ ...newStudent, name: capped });
                  if (val.trim()) setFieldErrors({ ...fieldErrors, name: "" });
                }}
                placeholder="Full Name"
              />
              {fieldErrors.name && <div style={{ color: '#ef4444', fontSize: '0.75em', marginTop: '4px', fontWeight: 'bold' }}>{fieldErrors.name}</div>}
            </div>
            <div className="field">
              <label>Father Name</label>
              <input
                className="input"
                style={{ textTransform: 'capitalize' }}
                value={newStudent.fatherName}
                onChange={(e) => {
                  let val = e.target.value.replace(/[^a-zA-Z\s]/g, "");
                  const words = val.split(" ");
                  const capped = words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
                  setNewStudent({ ...newStudent, fatherName: capped });
                }}
                placeholder="Father's Name"
              />
            </div>
            <div className="field">
              <label>Phone Number</label>
              <input
                className="input"
                maxLength={10}
                value={newStudent.phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setNewStudent({ ...newStudent, phone: val });
                  if (val.length === 10) setFieldErrors({ ...fieldErrors, phone: "" });
                }}
                placeholder="e.g. 9912345678"
              />
              {fieldErrors.phone && <div style={{ color: '#ef4444', fontSize: '0.75em', marginTop: '4px', fontWeight: 'bold' }}>{fieldErrors.phone}</div>}
            </div>
            <div className="field">
              <label>Age</label>
              <input className="input" type="number" value={newStudent.age} onChange={(e) => setNewStudent({ ...newStudent, age: e.target.value })} placeholder="Years" />
            </div>
          </div>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
            <span style={{ fontSize: '0.85em', color: '#000000', fontWeight: '800' }}>
              ℹ️ A WhatsApp invite will be sent automatically after saving.
            </span>
            <button className="btn primary" onClick={handleAddManual} disabled={busy}>Save Student</button>
          </div>
        </div>
      )}

      {successData && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="card" style={{ maxWidth: '400px', textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '4em', marginBottom: '10px' }}>✅</div>
            <h3 style={{ margin: '0 0 10px' }}>Student Added!</h3>
            <p className="muted" style={{ marginBottom: '25px' }}>
              The student has been added successfully. Click below to send them the WhatsApp group invitation.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <a
                className="btn primary"
                style={{
                  background: '#25D366',
                  borderColor: '#25D366',
                  fontWeight: 'bold',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                href={`https://wa.me/${successData.phone}?text=${encodeURIComponent(successData.text)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  setSuccessData(null);
                  setShowAddManual(false);
                }}
              >
                📲 Send WhatsApp Invite
              </a>
              <button
                className="btn"
                onClick={() => {
                  setSuccessData(null);
                  setShowAddManual(false);
                }}
              >
                Not Now
              </button>
            </div>
          </div>
        </div>
      )}

      {showInquiryModal && (
        <div className="modal-overlay" style={{ zIndex: 1200 }}>
          <div className="card" style={{ maxWidth: '600px', width: '90%', padding: '0', overflow: 'hidden' }}>
            <div style={{ background: '#0d2866', color: 'white', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Global Inquiry Result</h3>
              <button onClick={() => setShowInquiryModal(false)} style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '1.2em', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: '20px', maxHeight: '70vh', overflowY: 'auto' }}>
              {inquiryResults?.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div style={{ fontSize: '3em' }}>🕵️</div>
                  <h3>No Record Found</h3>
                  <p className="muted">This phone number has not been registered in any location yet.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {inquiryResults.map((res, i) => (
                    <div key={i} className="card" style={{ border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '1.1em', color: '#0d2866', marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>📍 {res.place} ({res.district})</span>
                        <span style={{ color: '#000000', fontSize: '0.8em' }}>ID: {res.slNo}</span>
                      </div>
                      <div style={{ fontSize: '0.9em', marginBottom: '15px', color: '#475569' }}>
                        Student Name: <strong style={{color:'#000000'}}>{res.studentName}</strong>
                      </div>
                      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                        <div style={{ fontSize: '0.85em', fontWeight: 'bold', marginBottom: '8px' }}>Medicine History:</div>
                        {res.history?.length === 0 ? (
                          <div style={{ fontSize: '0.85em', color: '#64748b', fontStyle: 'italic' }}>No medicine intake recorded here.</div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            {res.history.map((h, j) => (
                              <div key={j} style={{ fontSize: '0.8em', display: 'flex', justifyContent: 'space-between', background: '#ffffff', padding: '5px 8px', borderRadius: '4px' }}>
                                <span>📅 {h.date}</span>
                                <span>💊 {h.quantity} qty</span>
                                <span style={{ color: '#0d2866', fontWeight: 'bold' }}>{h.paymentMethod}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ padding: '15px 20px', background: '#f1f5f9', textAlign: 'center' }}>
              <button className="btn primary" onClick={() => setShowInquiryModal(false)} style={{width:'100%'}}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
