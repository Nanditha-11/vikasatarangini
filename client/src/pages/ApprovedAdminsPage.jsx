import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';

const ApprovedAdminsPage = () => {
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
      setAdmins(data.filter(a => a.status === 'approved' && a.role === 'admin'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const removeAdmin = async (id) => {
    if (!window.confirm('Are you sure you want to remove access for this admin? They will be moved to the Denied Requests list.')) return;
    try {
      await apiFetch(`/api/admins/reject/${id}`, { method: 'POST' });
      fetchAdmins();
    } catch (err) {
      alert('Failed to remove access: ' + err.message);
    }
  };

  if (loading) return <div className="container" style={{ padding: '40px' }}><div className="card">Loading approved admins...</div></div>;
  if (error) return <div className="container" style={{ padding: '40px' }}><div className="error">{error}</div></div>;

  return (
    <div className="container" style={{ paddingTop: '20px' }}>
      <div className="card" style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '24px' }}>Authorized Administrators</h2>
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
                    <button 
                      onClick={() => removeAdmin(admin._id)}
                      className="btn danger"
                      style={{ padding: '8px 18px', fontSize: '14px', fontWeight: '700' }}
                    >
                      🗑️ Remove Access
                    </button>
                  </td>
                </tr>
              ))}
              {admins.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ padding: '40px', textAlign: 'center', fontStyle: 'italic', color: 'var(--muted)' }}>
                    No approved admin accounts found.
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

export default ApprovedAdminsPage;
