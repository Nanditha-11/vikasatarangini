import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';

const MasterDashboard = () => {
  const [pendingAdmins, setPendingAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const nav = useNavigate();

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      const data = await apiFetch('/api/admins/all');
      setPendingAdmins(data.filter(a => a.status === 'pending'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    const action = status === 'approved' ? 'approve' : (status === 'rejected' ? 'reject' : 'pending');
    try {
      await apiFetch(`/api/admins/${action}/${id}`, { method: 'POST' });
      fetchAdmins();
    } catch (err) {
      alert('Action failed: ' + err.message);
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
                    <td style={{ fontSize: '16px' }}>{admin.place.charAt(0).toUpperCase() + admin.place.slice(1)}</td>
                    <td className="muted" style={{ fontSize: '16px' }}>{admin.email}</td>
                    <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button onClick={() => updateStatus(admin._id, 'approved')} className="btn primary" style={{ padding: '6px 14px', fontSize: '13px' }}>✅ Approve</button>
                        <button onClick={() => updateStatus(admin._id, 'rejected')} className="btn danger" style={{ padding: '6px 14px', fontSize: '13px' }}>❌ Deny</button>
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
    </div>
  );
};

export default MasterDashboard;
