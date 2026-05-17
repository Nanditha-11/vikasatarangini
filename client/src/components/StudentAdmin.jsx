import { useState, useEffect } from "react";
import { apiFetch } from "../lib/api";
import { Scanner } from '@yudiel/react-qr-scanner';

export function StudentAdmin({ onRefresh, busy, setBusy, setError, rows = [], viewDistrict, viewPlace, whatsappLink, onMarkStudent }) {
  const [showAddManual, setShowAddManual] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [newStudent, setNewStudent] = useState({ slNo: "", name: "", fatherName: "", age: "", phone: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [successData, setSuccessData] = useState(null);
  const [config, setConfig] = useState(null);
  const [adminProfile, setAdminProfile] = useState(null);
  const [inquiryPhone, setInquiryPhone] = useState("");
  const [inquiryResults, setInquiryResults] = useState(null);
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [autoInquiryResults, setAutoInquiryResults] = useState(null);

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

  useEffect(() => {
    if (newStudent.phone?.length === 10) {
      apiFetch(`/api/students/inquiry/${newStudent.phone}`)
        .then(data => {
          if (data.results && data.results.length > 0) {
            setAutoInquiryResults(data.results);
          } else {
            setAutoInquiryResults(null);
          }
        })
        .catch(err => console.error("Auto-inquiry failed:", err));
    } else {
      setAutoInquiryResults(null);
    }
  }, [newStudent.phone]);

  const handleImportOnly = async (studentData) => {
    setBusy(true);
    try {
      const res = await apiFetch("/api/students/import-only", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(studentData),
      });
      
      // Update list before opening modal
      if (onRefresh) await onRefresh();
      
      setShowAddManual(false);
      setNewStudent({ slNo: "", name: "", fatherName: "", age: "", phone: "" });
      
      // Now open the marking modal for this new local student record
      if (onMarkStudent) onMarkStudent(res.student);
    } catch (err) {
      alert(err.message || "Failed to import student");
    } finally {
      setBusy(false);
    }
  };

  const handleInquiry = async (phoneOverride) => {
    const phoneToSearch = typeof phoneOverride === 'string' ? phoneOverride : inquiryPhone;
    if (!phoneToSearch || phoneToSearch.length !== 10) {
      alert("Please enter a valid 10-digit phone number");
      return;
    }
    setBusy(true);
    setInquiryResults(null);
    try {
      const data = await apiFetch(`/api/students/inquiry/${phoneToSearch}`);
      setInquiryResults(data.results || []);
      setShowInquiryModal(true);
    } catch (err) {
      setError(err.message || "Global Inquiry failed");
    } finally {
      setBusy(false);
    }
  };

  const handleQRScan = (detectedCodes) => {
    if (!detectedCodes || detectedCodes.length === 0) return;
    const value = detectedCodes[0].rawValue?.trim();
    if (!value) return;

    let searchVal = value;
    try {
      const obj = JSON.parse(value);
      if (obj.phone) searchVal = obj.phone;
      else if (obj.slNo) searchVal = String(obj.slNo);
    } catch {
      // Treat as raw string
    }

    const numOnly = searchVal.replace(/\D/g, '');
    const cleanSearchVal = searchVal.toLowerCase().trim();

    const localStudent = rows.find(r => {
      const slNoMatch = String(r.slNo) === searchVal || String(r.slNo) === numOnly;
      const phoneMatch = r.phone === searchVal || (numOnly.length >= 10 && r.phone?.includes(numOnly.slice(-10)));
      const nameMatch = r.name?.toLowerCase() === cleanSearchVal;
      return slNoMatch || phoneMatch || nameMatch;
    });

    if (localStudent) {
      if (onMarkStudent) onMarkStudent(localStudent);
      setShowScanner(false);
    } else {
      if (numOnly.length >= 10) {
        setInquiryPhone(numOnly.slice(-10));
        handleInquiry(numOnly.slice(-10));
        setShowScanner(false);
      } else {
        setError(`Student not found! The scanned QR code contained: "${value}".`);
        setShowScanner(false);
      }
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
        let inviteMsg = template.replace("{{name}}", res.student.name).replace("{{link}}", link);

        const encodedData = encodeURIComponent(`${res.student.phone} ${res.student.name}`);
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodedData}`;

        inviteMsg += `\n\n📷 *Your Attendance QR Code:*\nPlease save or screenshot this QR code. Show it when you arrive for faster attendance!`;

        setSuccessData({ phone: num, text: inviteMsg, qrUrl, studentName: res.student.name });
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
            <button className="btn" onClick={() => handleInquiry()} disabled={busy} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0' }}>Search</button>
          </div>
          <button className="btn primary" style={{ background: '#f59e0b', borderColor: '#f59e0b', color: '#000000' }} onClick={() => setShowScanner(!showScanner)}>
            {showScanner ? "✕ Close Scanner" : "📷 Scan QR"}
          </button>
          <button className="btn primary" style={{ background: '#3b82f6', borderColor: '#3b82f6', color: '#000000' }} onClick={() => setShowAddManual(!showAddManual)}>
            {showAddManual ? "✕ Close" : "👤 Add New Student"}
          </button>
        </div>
      </div>

      {showScanner && (
        <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(255,255,255,0.6)', borderRadius: '12px', textAlign: 'center' }}>
          <h4 style={{ margin: '0 0 10px 0' }}>Scan Student QR Code</h4>
          <div style={{ maxWidth: '400px', margin: '0 auto', borderRadius: '12px', overflow: 'hidden' }}>
            <Scanner onScan={handleQRScan} />
          </div>
          <p className="muted" style={{ marginTop: '10px' }}>Scanning will automatically try to find and mark the student.</p>
        </div>
      )}

      {showAddManual && (
        <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(255,255,255,0.6)', borderRadius: '12px' }}>
          <div style={{ marginBottom: '10px', fontSize: '0.9em', color: '#000000', fontWeight: '800' }}>
            Next Available Serial No: {(() => {
              const max = rows.reduce((m, r) => Math.max(m, parseInt(r.slNo) || 0), 0);
              return max + 1;
            })()}
          </div>
          {autoInquiryResults && (
            <div style={{ marginBottom: '15px', padding: '15px', background: '#eff6ff', border: '2px solid #3b82f6', borderRadius: '12px', color: '#1e40af' }}>
              <div style={{ fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontSize: '1.1em' }}>
                🔍 EXISTING STUDENT FOUND GLOBALLY!
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {autoInquiryResults.map((r, i) => (
                  <div key={i} style={{ padding: '15px', background: 'white', borderRadius: '12px', border: '1px solid #bfdbfe', color: '#000000', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div style={{ fontWeight: '900', fontSize: '1.2em', color: '#0d2866' }}>{r.studentName}</div>
                      <div style={{ background: '#0d2866', color: 'white', padding: '2px 10px', borderRadius: '50px', fontSize: '0.75em', fontWeight: 'bold' }}>ID: #{r.slNo}</div>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.9em', color: '#444' }}>
                      <div><strong>Father:</strong> {r.fatherName || 'N/A'}</div>
                      <div><strong>Age:</strong> {r.age || 'N/A'} yrs</div>
                      <div style={{ gridColumn: 'span 2' }}><strong>Main Location:</strong> 📍 {r.place} ({r.district})</div>
                    </div>

                    <div style={{ marginTop: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '10px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                      {(() => {
                        // Accessing it correctly: r is the mapped result item
                        const isMatch = rows.find(row => 
                          row.phone === newStudent.phone && 
                          row.name.toLowerCase() === r.studentName.toLowerCase()
                        );

                        if (isMatch?.present) {
                          return <div style={{ background: '#dcfce7', color: '#166534', padding: '8px 15px', borderRadius: '6px', fontSize: '0.85em', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                             ✅ {r.studentName} is Present!
                          </div>;
                        }
                        return <button 
                          onClick={() => handleImportOnly({
                            name: r.studentName,
                            fatherName: r.fatherName,
                            age: r.age,
                            phone: newStudent.phone,
                            originPlace: r.place,
                            originDistrict: r.district
                          })}
                          style={{ background: '#0d2866', border: 'none', color: 'white', borderRadius: '6px', padding: '8px 15px', fontSize: '0.85em', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          📝 Mark {r.studentName} Attendance
                        </button>;
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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
              <button
                className="btn primary"
                style={{
                  background: '#25D366',
                  borderColor: '#25D366',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  cursor: 'pointer'
                }}
                onClick={async () => {
                  try {
                    const response = await fetch(successData.qrUrl);
                    const blob = await response.blob();
                    const fileName = `${successData.studentName.replace(/\s+/g, '_')}_QR.png`;
                    const file = new File([blob], fileName, { type: blob.type });

                    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                      await navigator.share({
                        title: 'Attendance QR Code',
                        text: successData.text,
                        files: [file]
                      });
                    } else {
                      window.open(`https://wa.me/${successData.phone}?text=${encodeURIComponent(successData.text + '\n' + successData.qrUrl)}`, "_blank");
                    }
                  } catch (e) {
                    console.error("Native share failed", e);
                    window.open(`https://wa.me/${successData.phone}?text=${encodeURIComponent(successData.text + '\n' + successData.qrUrl)}`, "_blank");
                  }
                  setSuccessData(null);
                  setShowAddManual(false);
                }}
              >
                📲 Send WhatsApp Invite
              </button>
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
    </div>
  );
}
