import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { apiFetch } from "../lib/api";
import { StudentHistoryLog } from "../components/StudentHistoryLog";

export function AttendanceHistoryDetailPage() {
  const { date } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("present"); // present | absent | new
  const [paymentFilter, setPaymentFilter] = useState("all"); // all | cash | online | free
  const [historyStudent, setHistoryStudent] = useState(null);

  useEffect(() => {
    setLoading(true);
    apiFetch(`/api/attendance/${date}`)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [date]);

  if (loading) {
    return (
      <Layout title={`History: ${date.split('-').reverse().join('-')}`} subtitle="Loading details...">
        <div className="card" style={{ textAlign: 'center', padding: '50px' }}>Loading historical data...</div>
      </Layout>
    );
  }

  if (!data) {
    return (
      <Layout title={`History: ${date.split('-').reverse().join('-')}`} subtitle="Error">
        <div className="card" style={{ textAlign: 'center', padding: '50px', color: '#dc2626' }}>Could not load data for this date.</div>
      </Layout>
    );
  }

  const stats = data.present.reduce((acc, p) => {
    const qty = Number(p.quantity) || 0;
    const isOnline = p.paymentMethod === 'Online' || p.paymentMethod === 'Online Payment';
    const isCash = p.paymentMethod === 'Cash';
    const isFree = p.paymentMethod === 'Free';

    if (isCash) { acc.cashQty += qty; acc.cashAmount += qty * 70; }
    else if (isOnline) { acc.onlineQty += qty; acc.onlineAmount += qty * 70; }
    else if (isFree) { acc.freeQty += qty; }
    
    return acc;
  }, { cashQty: 0, cashAmount: 0, onlineQty: 0, onlineAmount: 0, freeQty: 0 });

  const rawList = activeTab === "present" ? data.present : activeTab === "absent" ? data.absent : data.newStudents;
  
  const list = activeTab === "present" ? rawList.filter(s => {
    if (paymentFilter === 'all') return true;
    if (paymentFilter === 'cash') return s.paymentMethod === 'Cash';
    if (paymentFilter === 'online') return s.paymentMethod === 'Online' || s.paymentMethod === 'Online Payment';
    if (paymentFilter === 'free') return s.paymentMethod === 'Free';
    return true;
  }) : rawList;

  return (
    <Layout title={`Attendance Report: ${date.split('-').reverse().join('-')}`} subtitle="Detailed historical record">
      <div className="card" style={{ padding: '24px' }}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: '24px' }}>
          <button className="btn" onClick={() => nav("/history")}>← Back to History</button>
          <h2 style={{ margin: 0 }}>{date.split('-').reverse().join('-')}</h2>
          <div style={{ flex: 1, maxWidth: '20px' }} />
        </div>

        <div className="row" style={{ gap: '15px', marginBottom: '24px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <div style={{ background: '#ecfdf5', border: '1px solid #059669', padding: '12px 20px', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '150px' }}>
            <span style={{ fontSize: '0.8em', color: '#059669', fontWeight: 'bold' }}>TOTAL AMOUNT</span>
            <span style={{ fontSize: '1.4em', fontWeight: 'bold', color: '#065f46' }}>₹{stats.cashAmount + stats.onlineAmount}</span>
          </div>

          <div style={{ background: '#f0f9ff', border: '1px solid #0ea5e9', padding: '12px 20px', borderRadius: '8px', display: 'flex', gap: '20px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.7em', color: '#0369a1', fontWeight: 'bold' }}>CASH</div>
              <div style={{ fontWeight: 'bold' }}>₹{stats.cashAmount} <span style={{ fontSize: '0.8em', fontWeight: 'normal' }}>({stats.cashQty})</span></div>
            </div>
            <div style={{ textAlign: 'center', borderLeft: '1px solid #bae6fd', paddingLeft: '20px' }}>
              <div style={{ fontSize: '0.7em', color: '#0369a1', fontWeight: 'bold' }}>ONLINE</div>
              <div style={{ fontWeight: 'bold' }}>₹{stats.onlineAmount} <span style={{ fontSize: '0.8em', fontWeight: 'normal' }}>({stats.onlineQty})</span></div>
            </div>
            <div style={{ textAlign: 'center', borderLeft: '1px solid #bae6fd', paddingLeft: '20px' }}>
              <div style={{ fontSize: '0.7em', color: '#0369a1', fontWeight: 'bold' }}>FREE</div>
              <div style={{ fontWeight: 'bold' }}>{stats.freeQty} <span style={{ fontSize: '0.8em', fontWeight: 'normal' }}>qty</span></div>
            </div>
          </div>
        </div>

        <div className="row" style={{ gap: '10px', marginBottom: '24px', justifyContent: 'center' }}>
          <button 
            className={`btn ${activeTab === 'present' ? 'primary' : ''}`}
            style={{ minWidth: '130px' }}
            onClick={() => setActiveTab('present')}
          >
            Present ({data.present.length})
          </button>
          <button 
            className={`btn ${activeTab === 'absent' ? 'primary' : ''}`}
            style={{ minWidth: '130px' }}
            onClick={() => setActiveTab('absent')}
          >
            Absent ({data.absent.length})
          </button>
          <button 
            className={`btn ${activeTab === 'new' ? 'primary' : ''}`}
            style={{ minWidth: '130px' }}
            onClick={() => setActiveTab('new')}
          >
            New students ({data.newStudents.length})
          </button>
        </div>

        {activeTab === 'present' && (
          <div className="row" style={{ gap: '10px', marginBottom: '20px', justifyContent: 'center', background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.9em', color: '#64748b', fontWeight: 'bold', marginRight: '10px' }}>Filter by Pay:</span>
            <button className={`btn pill ${paymentFilter === 'all' ? 'primary' : ''}`} onClick={() => setPaymentFilter('all')} style={{ padding: '4px 12px', fontSize: '0.85em' }}>All</button>
            <button className={`btn pill ${paymentFilter === 'cash' ? 'primary' : ''}`} onClick={() => setPaymentFilter('cash')} style={{ padding: '4px 12px', fontSize: '0.85em' }}>Cash</button>
            <button className={`btn pill ${paymentFilter === 'online' ? 'primary' : ''}`} onClick={() => setPaymentFilter('online')} style={{ padding: '4px 12px', fontSize: '0.85em' }}>Online</button>
            <button className={`btn pill ${paymentFilter === 'free' ? 'primary' : ''}`} onClick={() => setPaymentFilter('free')} style={{ padding: '4px 12px', fontSize: '0.85em' }}>Free</button>
          </div>
        )}

        <div className="tableWrap">
          <table style={{ width: '100%', tableLayout: 'auto' }}>
            <thead>
              <tr>
                <th style={{ width: 110, textAlign: 'center' }}>ID</th>
                <th style={{ textAlign: 'left', paddingLeft: '30px' }}>Name</th>
                <th>Father Name</th>
                <th style={{ width: 80, textAlign: 'center' }}>Age</th>
                <th style={{ textAlign: 'center' }}>Phone</th>
                {activeTab === 'present' && (
                  <>
                    <th style={{ width: 120, textAlign: 'center' }}>Method</th>
                    <th style={{ width: 80, textAlign: 'center' }}>Qty</th>
                    <th style={{ width: 100, textAlign: 'center' }}>Amount</th>
                  </>
                )}
                {activeTab === 'new' && <th style={{ width: 120, textAlign: 'center' }}>Status</th>}
              </tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.slNo}>
                  <td style={{ fontWeight: 'bold', textAlign: 'center' }}>{s.slNo}</td>
                  <td 
                    style={{ 
                      paddingLeft: '30px', 
                      color: '#2563eb', 
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                    onClick={() => setHistoryStudent(s)}
                  >
                    {s.name}
                  </td>
                  <td>{s.fatherName || "-"}</td>
                  <td style={{ textAlign: 'center' }}>{s.age || "-"}</td>
                  <td style={{ textAlign: 'center' }}>{s.phone || "-"}</td>
                  {activeTab === 'present' && (
                    <>
                      <td style={{ textAlign: 'center' }}><span className="pill" style={{ background: '#f3f4f6' }}>{s.paymentMethod}</span></td>
                      <td style={{ textAlign: 'center' }}><b>{s.quantity}</b></td>
                      <td style={{ textAlign: 'center' }}>₹{s.paymentMethod === 'Free' ? 0 : (s.quantity * 70)}</td>
                    </>
                  )}
                  {activeTab === 'new' && (
                    <td style={{ textAlign: 'center' }}>{s.present ? <span style={{color: '#059669'}}>Present</span> : <span style={{color: '#dc2626'}}>Absent</span>}</td>
                  )}
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    No students found in this category.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {historyStudent && (
        <StudentHistoryLog 
          student={historyStudent} 
          onClose={() => setHistoryStudent(null)} 
        />
      )}
    </Layout>
  );
}
