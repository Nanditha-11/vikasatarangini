import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Layout } from "../components/Layout";
import { apiFetch } from "../lib/api";

function EditModal({ student, onClose, onSave, busy, error }) {
  const [formData, setFormData] = useState({ ...student, password: "" });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.password) return alert("Please enter the modification password");
    onSave(formData);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ width: '450px' }}>
        <h3>Modify Student Details</h3>
        <p className="muted">ID: {student.slNo}</p>
        
        {error && <div className="error" style={{ marginBottom: '15px' }}>{error}</div>}
        
        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          <div className="field">
            <label>Name</label>
            <input 
              className="input" 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
              required 
            />
          </div>
          <div className="field">
            <label>Father Name</label>
            <input 
              className="input" 
              value={formData.fatherName} 
              onChange={e => setFormData({...formData, fatherName: e.target.value})} 
            />
          </div>
          <div className="field">
            <label>Phone Number</label>
            <input 
              className="input" 
              value={formData.phone} 
              onChange={e => setFormData({...formData, phone: e.target.value})} 
              required 
            />
          </div>
          <div className="field">
            <label>Age</label>
            <input 
              className="input" 
              type="number" 
              value={formData.age || ''} 
              onChange={e => setFormData({...formData, age: e.target.value})} 
            />
          </div>
          <div className="field" style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
            <label style={{ color: '#0072ff' }}>Enter Password</label>
            <input 
              className="input" 
              type="text" 
              placeholder="Enter password to save"
              value={formData.password} 
              onChange={e => setFormData({...formData, password: e.target.value})} 
              autoComplete="off"
              required 
            />
          </div>

          <div className="row" style={{ justifyContent: 'center', marginTop: '24px', gap: '12px' }}>
            <button type="submit" className="btn primary" style={{ padding: '12px 24px' }} disabled={busy}>
              {busy ? "Saving..." : "Save Changes"}
            </button>
            <button type="button" className="btn" style={{ padding: '12px 24px' }} onClick={onClose} disabled={busy}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ModifyStudentsPage() {
  const [searchParams] = useSearchParams();
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const isMaster = user?.role === "master";

  const [students, setStudents] = useState([]);
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editingStudent, setEditingStudent] = useState(null);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    setBusy(true);
    try {
      const d = searchParams.get("district");
      const p = searchParams.get("place");
      let url = "/api/students";
      if (d && p) url += `?district=${encodeURIComponent(d)}&place=${encodeURIComponent(p)}`;
      
      const data = await apiFetch(url);
      setStudents(data.students || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async (data) => {
    setBusy(true);
    setError(""); // Clear previous errors
    try {
      await apiFetch(`/api/students/${data.slNo}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      setEditingStudent(null);
      loadStudents();
      alert("Student updated successfully!");
    } catch (err) {
      console.error("Save failure:", err);
      setError(err.message || "Failed to save changes");
    } finally {
      setBusy(false);
    }
  };

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    
    // Always sort by SL No numerically first
    const sorted = [...students].sort((a, b) => {
      const nA = parseInt(a.slNo, 10) || 0;
      const nB = parseInt(b.slNo, 10) || 0;
      return nA - nB;
    });

    if (!q) return sorted;
    return sorted.filter(s => 
      String(s.slNo).toLowerCase().includes(q) ||
      String(s.name || "").toLowerCase().includes(q) ||
      String(s.fatherName || "").toLowerCase().includes(q) ||
      String(s.phone || "").includes(q)
    );
  }, [students, filter]);

  return (
    <Layout>
      {isMaster && (
        <div className="card" style={{ background: '#fef3c7', color: '#92400e', textAlign: 'center', padding: '10px', marginBottom: '15px' }}>
          🔒 READ-ONLY AUDIT MODE: You are viewing student list for {searchParams.get("place")?.toUpperCase() || "MAIN"}. Modification is disabled.
        </div>
      )}

      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0 }}>All Students ({students.length})</h2>
          <div className="row" style={{ flex: 1, maxWidth: '400px' }}>
            <input 
              className="input" 
              placeholder="Search students to modify..." 
              value={filter} 
              onChange={e => setFilter(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="tableWrap card" style={{ padding: 0 }}>
        <table style={{ tableLayout: 'fixed', width: '100%' }}>
          <thead>
            <tr>
              <th style={{ width: '16.6%', textAlign: 'center' }}>ID</th>
              <th style={{ width: '16.6%', textAlign: 'center' }}>Name</th>
              <th style={{ width: '16.6%', textAlign: 'center' }}>Father Name</th>
              <th style={{ width: '16.6%', textAlign: 'center' }}>Age</th>
              <th style={{ width: '16.6%', textAlign: 'center' }}>Phone</th>
              <th style={{ width: '16.6%', textAlign: 'center' }}>Modify</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.slNo}>
                <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{s.slNo}</td>
                <td style={{ textAlign: 'center' }}>{s.name}</td>
                <td className="muted" style={{ textAlign: 'center' }}>{s.fatherName || '-'}</td>
                <td style={{ textAlign: 'center' }}>{s.age || '-'}</td>
                <td className="muted" style={{ textAlign: 'center' }}>{s.phone}</td>
                <td style={{ textAlign: 'center' }}>
                  <button 
                    className="btn" 
                    style={{ padding: '5px 15px', color: isMaster ? '#94a3b8' : '#0072ff', borderColor: isMaster ? '#e2e8f0' : '#0072ff', cursor: isMaster ? 'not-allowed' : 'pointer' }} 
                    onClick={() => !isMaster && setEditingStudent(s)}
                    disabled={isMaster}
                  >
                    {isMaster ? "View Only" : "Modify"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && !busy && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No students found.</div>
        )}
      </div>

      {editingStudent && (
        <EditModal 
          student={editingStudent} 
          onClose={() => { setEditingStudent(null); setError(""); }} 
          onSave={handleSave}
          busy={busy}
          error={error}
        />
      )}
    </Layout>
  );
}
