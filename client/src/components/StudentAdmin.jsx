import { useState, useEffect } from "react";
import { apiFetch } from "../lib/api";

export function StudentAdmin({ onRefresh, busy, setBusy, setError, rows = [] }) {
  const [showAddManual, setShowAddManual] = useState(false);
  const [newStudent, setNewStudent] = useState({ slNo: "", name: "", fatherName: "", age: "", phone: "" });
  const [config, setConfig] = useState(null);

  useEffect(() => {
    apiFetch("/api/location-config")
      .then(setConfig)
      .catch(err => console.error("Failed to load location config:", err));
  }, []);

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
      alert(`Added: ${res.student.name}`);

      let num = res.student?.phone?.replace(/\D/g, "");
      if (num) {
        if (num.length === 10) num = "91" + num;
        
        const link = config?.whatsappLink || "";
        const template = config?.inviteTemplate || `Jai Srimannarayana!\n\nWelcome to Vikasatarangini, {{name}}. Please join our official WhatsApp group by clicking the link below:\n\n{{link}}`;
        
        const inviteMsg = template
          .replace("{{name}}", res.student.name)
          .replace("{{link}}", link);

        if (link) {
          window.open(`https://api.whatsapp.com/send?phone=${num}&text=${encodeURIComponent(inviteMsg)}`, "_blank");
        } else {
          console.log("No WhatsApp link configured for this location, skipping auto-invite.");
        }
      }

      setShowAddManual(false);
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
          <div className="row" style={{ justifyContent: 'flex-end', marginTop: '10px' }}>
            <button className="btn primary" onClick={handleAddManual} disabled={busy}>Save Student</button>
          </div>
        </div>
      )}
    </div>
  );
}
