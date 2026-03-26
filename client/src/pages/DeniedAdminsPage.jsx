import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';

const DeniedAdminsPage = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const nav = useNavigate();

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      const data = await apiFetch('/api/admins/all');
      setAdmins(data.filter(a => a.status === 'rejected'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    const action = status === 'approved' ? 'approve' : 'pending';
    try {
      await apiFetch(`/api/admins/${action}/${id}`, { method: 'POST' });
      fetchAdmins();
    } catch (err) {
      alert('Action failed: ' + err.message);
    }
  };

  const deleteAdmin = async (id) => {
    const pass = prompt('Enter Master Password to delete forever:');
    if (pass !== 'swarnamrutham') {
      return alert('Incorrect password. Deletion cancelled.');
    }

    if (!window.confirm('Permanently delete this request? This cannot be undone.')) return;
    try {
      await apiFetch(`/api/admins/${id}?password=${encodeURIComponent(pass)}`, { method: 'DELETE' });
      fetchAdmins();
    } catch (err) {
      alert('Deletion failed: ' + err.message);
    }
  };

  if (loading) return <div className="container" style={{ padding: '40px' }}><div className="card">Loading denied requests...</div></div>;
  if (error) return <div className="container" style={{ padding: '40px' }}><div className="error">{error}</div></div>;

  return (
    <div className="container" style={{ paddingTop: '20px' }}>
      <div className="card" style={{ marginBottom: '30px', background: 'rgba(255, 241, 242, 0.4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '24px', color: '#9f1239' }}>Denied Requests</h2>
          </div>
          <button 
            onClick={() => nav("/master-dashboard")}
            className="btn"
            style={{ padding: '12px 24px' }}
          >
            <span>⬅️</span> Back to Requests
          </button>
        </div>
        
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>District</th>
                <th>Place</th>
                <th>Email</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr key={admin._id}>
                  <td style={{ fontWeight: '700', fontSize: '18px', color: '#0f172a' }}>{admin.username}</td>
                  <td style={{ fontSize: '16px' }}>{admin.district}</td>
                  <td style={{ fontSize: '16px' }}>{admin.place.charAt(0).toUpperCase() + admin.place.slice(1)}</td>
                  <td className="muted" style={{ fontSize: '16px' }}>{admin.email}</td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button 
                        onClick={() => updateStatus(admin._id, 'approved')}
                        className="btn primary"
                        style={{ padding: '8px 16px', fontSize: '13px', fontWeight: '700' }}
                        >
                        ✅ Re-Approve
                        </button>
                        <button 
                        onClick={() => deleteAdmin(admin._id)}
                        className="btn danger"
                        style={{ padding: '8px 16px', fontSize: '13px', fontWeight: '700' }}
                        >
                        🗑️ Delete Forever
                        </button>
                    </div>
                  </td>
                </tr>
              ))}
              {admins.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ padding: '40px', textAlign: 'center', fontStyle: 'italic', color: 'var(--muted)' }}>
                    No denied requests found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DeniedAdminsPage;
