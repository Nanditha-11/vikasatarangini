import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';

const MasterDashboard = () => {
  const [pendingAdmins, setPendingAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);
  const nav = useNavigate();

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/api/admins/all');
      if (Array.isArray(data)) {
        setPendingAdmins(data.filter(a => a.status === 'pending'));
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
    if (status === 'rejected' && confirmingId !== id) {
      setConfirmingId(id);
      return;
    }

    setConfirmingId(null);
    const action = status === 'approved' ? 'approve' : (status === 'rejected' ? 'reject' : 'pending');
    setProcessingId(id);
    try {
      await apiFetch(`/api/admins/${action}/${id}`, { method: 'POST' });
      setPendingAdmins(prev => prev.filter(a => a._id !== id));
      alert(`Admin ${status === 'approved' ? 'approved' : 'denied'} successfully.`);
    } catch (err) {
      alert('Action failed: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return <div className="container" style={{ padding: '40px' }}><div className="card">Loading Master Control Panel...</div></div>;
  if (error) return <div className="container" style={{ padding: '40px' }}><div className="error">{error}</div></div>;

  return (
    <div className="container" style={{ paddingTop: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', gap: '15px', flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, fontSize: '28px', color: '#1e293b' }}>New Requests</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => nav("/approved-admins")} className="btn primary" style={{ padding: '12px 20px' }}><span>✅</span> Approved Admins</button>
          <button onClick={() => nav("/denied-admins")} className="btn danger" style={{ padding: '12px 20px' }}><span>❌</span> Denied Requests</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '30px' }}>
        <h2 style={{ margin: '0 0 20px', fontSize: '22px' }}>Pending Registration Requests</h2>
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
              {pendingAdmins.map((admin) => (
                <tr key={admin._id}>
                  <td style={{ fontWeight: '700', fontSize: '18px', color: '#0f172a' }}>{admin.username}</td>
                  <td style={{ fontSize: '16px' }}>{admin.district}</td>
                  <td style={{ fontSize: '16px' }}>
                    <span 
                      style={{ color: '#0072ff', textDecoration: 'underline', cursor: 'pointer', fontWeight: '600' }} 
                      onClick={() => nav(`/?district=${admin.district}&place=${admin.place}`)}
                    >
                      {admin.place.charAt(0).toUpperCase() + admin.place.slice(1)}
                    </span>
                  </td>
                  <td className="muted" style={{ fontSize: '16px' }}>{admin.email}</td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button
                        disabled={processingId === admin._id}
                        onClick={() => updateStatus(admin._id, 'approved')}
                        className="btn primary"
                        style={{ padding: '6px 14px', fontSize: '13px', opacity: processingId === admin._id ? 0.5 : 1 }}
                      >
                        {processingId === admin._id ? '⏳' : '✅ Approve'}
                      </button>
                      <button
                        disabled={processingId === admin._id}
                        onClick={() => updateStatus(admin._id, 'rejected')}
                        className="btn"
                        style={{ padding: '6px 14px', fontSize: '13px', background: 'red !important', color: 'white', opacity: processingId === admin._id ? 0.5 : 1, border: 'none' }}
                      >
                        {processingId === admin._id ? '⏳' : '❌ Deny'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {pendingAdmins.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ padding: '40px', textAlign: 'center', fontStyle: 'italic', color: 'var(--muted)' }}>
                    No pending registration requests.
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
            <h3 style={{ margin: '0 0 10px', fontSize: '20px' }}>Deny Request?</h3>
            <p className="muted" style={{ marginBottom: '20px', fontSize: '15px' }}>
              Are you sure you want to deny access for <b>{pendingAdmins.find(a => a._id === confirmingId)?.username}</b>?
            </p>
            <div style={{ display: 'flex', gap: '15px' }}>
              <button
                onClick={() => updateStatus(confirmingId, 'rejected')}
                className="btn danger"
                style={{ flex: 1, padding: '12px', fontWeight: 'bold' }}
              >
                Deny Access
              </button>
              <button
                onClick={() => setConfirmingId(null)}
                className="btn"
                style={{ flex: 1, padding: '12px' }}
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

export default MasterDashboard;
