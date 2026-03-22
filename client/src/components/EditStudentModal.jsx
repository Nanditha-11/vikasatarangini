import React, { useState, useEffect } from "react";
import { apiFetch } from "../lib/api";

const EditStudentModal = ({ student, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    name: "",
    fatherName: "",
    age: "",
    phone: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (student) {
      setFormData({
        name: student.name || "",
        fatherName: student.fatherName || "",
        age: student.age || "",
        phone: student.phone || "",
        password: "",
      });
    }
  }, [student]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await apiFetch(`/api/students/${student.slNo}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      onUpdate(res.student);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to update student");
    } finally {
      setLoading(false);
    }
  };

  if (!student) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Modify Student (ID: {student.slNo})</h3>
        <p style={{ fontSize: "0.9rem", color: "#666", marginBottom: "1rem" }}>
          Please enter the admin password to save changes.
        </p>
        
        <form onSubmit={handleSubmit} className="marking-form">
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Father's Name</label>
            <input
              type="text"
              value={formData.fatherName}
              onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Age</label>
            <input
              type="number"
              value={formData.age}
              onChange={(e) => setFormData({ ...formData, age: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Phone Number</label>
            <input
              type="text"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          <div className="form-group" style={{ marginTop: "1rem", borderTop: "1px solid #eee", paddingTop: "1rem" }}>
            <label style={{ color: "red", fontWeight: "bold" }}>Admin Password *</label>
            <input
              type="password"
              required
              placeholder="Enter password to modify"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              style={{ borderColor: "red" }}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditStudentModal;
