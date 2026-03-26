import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';

const DeniedAdminsPage = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);
  const [deletePass, setDeletePass] = useState('');
  const nav = useNavigate();

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/api/admins/all');
      if (Array.isArray(data)) {
        setAdmins(data.filter(a => a.status === 'rejected'));
      } else {
        setError('Unexpected data format');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    const action = status === 'approved' ? 'approve' : 'pending';
    setProcessingId(id);
    try {
      await apiFetch(`/api/admins/${action}/${id}`, { method: 'POST' });
      setAdmins(prev => prev.filter(a => a._id !== id));
      alert('Admin account re-approved successfully.');
    } catch (err) {
      alert('Action failed: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const deleteAdmin = async (id) => {
    if (confirmingId !== id) {
      setConfirmingId(id);
      setDeletePass('');
      return;
    }

    if (deletePass !== 'swarnamrutham') {
      return alert('Incorrect password.');
    }

    setConfirmingId(null);
    setProcessingId(id);
    try {
      await apiFetch(`/api/admins/${id}?password=${encodeURIComponent(deletePass)}`, { method: 'DELETE' });
      setAdmins(prev => prev.filter(a => a._id !== id));
      alert('Admin account permanently deleted.');
    } catch (err) {
      alert('Deletion failed: ' + err.message);
    } finally {
      setProcessingId(null);
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
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                      <button
                        disabled={processingId === admin._id}
                        onClick={() => updateStatus(admin._id, 'approved')}
                        className="btn primary"
                        style={{ padding: '8px 12px', fontSize: '13px', fontWeight: '700', opacity: processingId === admin._id ? 0.5 : 1 }}
                      >
                        {processingId === admin._id && !admin._beingDeleted ? '⏳...' : '✅ Re-Approve'}
                      </button>
                      <button
                        disabled={processingId === admin._id}
                        onClick={() => setConfirmingId(admin._id)}
                        className="btn danger"
                        style={{ padding: '8px 12px', fontSize: '13px', fontWeight: '700', opacity: processingId === admin._id ? 0.5 : 1 }}
                      >
                        {processingId === admin._id ? '⏳...' : '🗑️ Delete Forever'}
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
            background: '#ffffff',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
            border: '1px solid #e2e8f0',
            borderRadius: '20px'
          }}>
            <div style={{ fontSize: '40px', marginBottom: '20px' }}>⚠️</div>
            <h3 style={{ margin: '0 0 10px', fontSize: '20px' }}>Delete Permanently?</h3>
            <p className="muted" style={{ marginBottom: '20px' }}>
              Are you sure you want to delete <b>{admins.find(a => a._id === confirmingId)?.username}</b> forever?
              This action cannot be undone.
            </p>
            <div style={{ marginBottom: '20px' }}>
              <input
                type="password"
                placeholder="Enter Master Password"
                className="input"
                style={{ width: '100%', padding: '12px', fontSize: '14px', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '8px' }}
                value={deletePass}
                onChange={e => setDeletePass(e.target.value)}
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', gap: '15px' }}>
              <button
                onClick={() => deleteAdmin(confirmingId)}
                className="btn danger"
                style={{ flex: 1, padding: '12px', fontWeight: 'bold' }}
              >
                Delete Forever
              </button>
              <button
                onClick={() => { setConfirmingId(null); setDeletePass(''); }}
                className="btn"
                style={{ flex: 1, padding: '12px', background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', fontWeight: 'bold', borderRadius: '10px' }}
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

export default DeniedAdminsPage;
