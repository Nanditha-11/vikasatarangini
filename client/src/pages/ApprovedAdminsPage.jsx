import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { DistrictSettingsModal } from '../components/DistrictSettingsModal';

const ApprovedAdminsPage = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);
  const [selectedAdminForConfig, setSelectedAdminForConfig] = useState(null);
  const nav = useNavigate();

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/api/admins/all');
      if (Array.isArray(data)) {
        setAdmins(data.filter(a => a.status === 'approved' && a.role === 'admin'));
      } else {
        console.error('Expected array from /api/admins/all but got:', data);
        setError('Unexpected data format from server');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const removeAdmin = async (id) => {
    if (confirmingId !== id) {
      setConfirmingId(id);
      return;
    }

    setConfirmingId(null);
    setProcessingId(id);
    try {
      console.log('Sending removal request for:', id);
      const res = await apiFetch(`/api/admins/reject/${id}`, { method: 'POST' });
      console.log('Removal response:', res);
      // Optimistic locally
      setAdmins(prev => prev.filter(a => a._id !== id));
      alert('Admin removed and moved to Denied Requests.');
    } catch (err) {
      console.error('Removal failed:', err);
      alert('Failed to remove access: ' + err.message);
    } finally {
      setProcessingId(null);
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
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button
                        onClick={() => setSelectedAdminForConfig(admin)}
                        className="btn primary"
                        style={{ padding: '8px 12px', fontSize: '13px' }}
                      >
                        ⚙️ Settings
                      </button>
                      <button
                        disabled={processingId === admin._id}
                        onClick={() => setConfirmingId(admin._id)}
                        className="btn danger"
                        style={{ padding: '8px 12px', fontSize: '13px', fontWeight: '700', opacity: processingId === admin._id ? 0.5 : 1 }}
                      >
                        {processingId === admin._id ? '⏳...' : '🗑️ Remove Access'}
                      </button>
                    </div>
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

      {selectedAdminForConfig && (
        <DistrictSettingsModal
          admin={selectedAdminForConfig}
          onClose={() => setSelectedAdminForConfig(null)}
        />
      )}

      {confirmingId && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ 
            maxWidth: '400px', 
            width: '90%', 
            textAlign: 'center', 
            padding: '40px 30px', 
            background: '#eff6ff',
            boxShadow: '0 25px 50px -12px rgba(30, 64, 175, 0.15)',
            border: '2px solid #bfdbfe',
            borderRadius: '24px'
          }}>
            <div style={{ fontSize: '40px', marginBottom: '20px' }}>⚠️</div>
            <h3 style={{ margin: '0 0 10px', fontSize: '22px', color: '#1e293b' }}>Remove Access?</h3>
            <p className="muted" style={{ marginBottom: '25px', fontSize: '15px' }}>
              Are you sure you want to remove access for <b>{admins.find(a => a._id === confirmingId)?.username}</b>? 
              They will be moved to the Denied Requests list.
            </p>
            <div style={{ display: 'flex', gap: '15px' }}>
              <button 
                onClick={() => removeAdmin(confirmingId)}
                className="btn"
                style={{ flex: 1, padding: '14px', fontWeight: 'bold', background: '#e11d48', color: 'white', borderRadius: '12px', border: 'none' }}
              >
                Remove Access
              </button>
              <button 
                onClick={() => setConfirmingId(null)}
                className="btn"
                style={{ flex: 1, padding: '14px', background: '#e2e8f0', border: '2px solid #cbd5e1', color: '#1e293b', fontWeight: 'bold', borderRadius: '12px' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovedAdminsPage;
