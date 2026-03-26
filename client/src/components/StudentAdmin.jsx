import { useState, useEffect } from "react";
import { apiFetch } from "../lib/api";

export function StudentAdmin({ onRefresh, busy, setBusy, setError, rows = [], viewDistrict, viewPlace }) {
  const [showAddManual, setShowAddManual] = useState(false);
  const [newStudent, setNewStudent] = useState({ slNo: "", name: "", fatherName: "", age: "", phone: "" });
  const [successData, setSuccessData] = useState(null);
  const [config, setConfig] = useState(null);
  const [adminProfile, setAdminProfile] = useState(null);

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

  const handleAddManual = async () => {
    if (!newStudent.name || !newStudent.phone) return alert("Name and Phone are required");
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
      
      const link = (config?.whatsappLink && config.whatsappLink.startsWith("http"))
        ? config.whatsappLink
        : (adminProfile?.whatsappLink || user?.whatsappLink || "");
      
      let num = res.student?.phone?.replace(/\D/g, "");
      if (num) {
        if (num.length === 10) num = "91" + num;
        const template = config?.inviteTemplate || `Jai Srimannarayana!\n\nWelcome to Vikasatarangini, {{name}}. Please join our official WhatsApp group by clicking the link below:\n\n{{link}}`;
        const inviteMsg = template.replace("{{name}}", res.student.name).replace("{{link}}", link);

        if (link && link.startsWith("http")) {
          setSuccessData({ phone: num, text: inviteMsg });
        } else {
          // If no link, just show a simple success message without the WhatsApp button
          alert("Student added successfully!");
        }
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
          <button className="btn primary" style={{ background: '#3b82f6', borderColor: '#3b82f6' }} onClick={() => setShowAddManual(!showAddManual)}>
            {showAddManual ? "✕ Close" : "👤 Add New Student"}
          </button>
        </div>
      </div>

      {showAddManual && (
        <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(255,255,255,0.6)', borderRadius: '12px' }}>
          <div style={{ marginBottom: '10px', fontSize: '0.9em', color: '#0072ff', fontWeight: 'bold' }}>
            Next Available Serial No: {(() => {
              const max = rows.reduce((m, r) => Math.max(m, parseInt(r.slNo) || 0), 0);
              return max + 1;
            })()}
          </div>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="field">
              <label>Student Name</label>
              <input className="input" value={newStudent.name} onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })} placeholder="Full Name" />
            </div>
            <div className="field">
              <label>Father Name</label>
              <input className="input" value={newStudent.fatherName} onChange={(e) => setNewStudent({ ...newStudent, fatherName: e.target.value })} placeholder="Father's Name" />
            </div>
            <div className="field">
              <label>Phone Number</label>
              <input className="input" value={newStudent.phone} onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })} placeholder="e.g. 9912345678" />
            </div>
            <div className="field" style={{ width: '100px' }}>
              <label>Age</label>
              <input className="input" type="number" value={newStudent.age} onChange={(e) => setNewStudent({ ...newStudent, age: e.target.value })} placeholder="Years" />
            </div>
          </div>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
            <span className="muted" style={{ fontSize: '0.85em' }}>
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
    </div>
  );
}
