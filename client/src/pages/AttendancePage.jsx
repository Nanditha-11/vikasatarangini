import { useState, useMemo, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Layout } from "../components/Layout";
import { apiFetch } from "../lib/api";
import { useAttendance } from "../hooks/useAttendance";
import { AttendanceHeader } from "../components/AttendanceHeader";
import { StudentAdmin } from "../components/StudentAdmin";
import { StudentTable } from "../components/StudentTable";
import { StudentHistoryLog } from "../components/StudentHistoryLog";
import { WhatsAppEditor } from "../components/WhatsAppEditor";
import { MarkingModal } from "../components/MarkingModal";
import { ModifyModal } from "../components/ModifyModal";
import { toIsoDate, todayParts } from "../lib/date";


export function AttendancePage() {
  const { date: paramDate } = useParams();
  const {
    date, setDate,
    rows, setRows,
    busy, setBusy,
    error, setError,
    info,
    message, setMessage,
    load,
    save
  } = useAttendance(paramDate);

  const [filter, setFilter] = useState("");
  const [viewMode, setViewMode] = useState("marking"); // marking | crosscheck | summary
  const [historyStudent, setHistoryStudent] = useState(null);
  const [markingStudent, setMarkingStudent] = useState(null);
  const [modifyingStudent, setModifyingStudent] = useState(null);

  const toggleStudent = (slNo, paymentMethod = "Cash", quantity = 1, forceUpdate = false) => {
    const nextRows = rows.map(r => {
      if (r.slNo === slNo) {
        const isCurrentlyPresent = !!r.present;
        const nextPresent = forceUpdate ? true : !isCurrentlyPresent;
        const nextQuantity = nextPresent ? (quantity || r.quantity || 1) : 0;
        return { 
          ...r, 
          present: nextPresent, 
          paymentMethod: nextPresent ? (paymentMethod || r.paymentMethod || "Cash") : "Cash",
          quantity: nextQuantity
        };
      }
      return r;
    });
    setRows(nextRows);
    save(false, nextRows).catch(console.error);
  };

  const handleConfirmMarking = async ({ qty, payment }) => {
    if (!markingStudent) return;
    
    // 1. Update state
    const slNo = markingStudent.slNo;
    const studentPhone = markingStudent.phone;
    const studentName = markingStudent.name;
    
    toggleStudent(slNo, payment, qty, true);
    
    // 2. Close modal
    setMarkingStudent(null);
    
    // 3. Prepare message
    let baseMsg = message || "Thank you for attending the session!";
    if (!baseMsg.includes("Jai Srimannarayana")) {
      baseMsg = "Jai Srimannarayana!\n" + baseMsg;
    }

    const amount = qty * 70;
    
    // Send ONLY the exact message displayed in the sidebar editor
    const finalMsg = baseMsg;
    
    const text = encodeURIComponent(finalMsg);
    const phone = studentPhone.replace(/\D/g, ''); 
    const fullPhone = phone.startsWith('91') ? phone : `91${phone}`;
    
    console.log(`[Auto-WhatsApp] Sending to ${fullPhone}: ${finalMsg}`);
    window.open(`https://api.whatsapp.com/send?phone=${fullPhone}&text=${text}`, "_blank");
  };

  const updateQuantity = (slNo, newQty) => {
    const nextRows = rows.map(r => 
      r.slNo === slNo ? { ...r, quantity: Number(newQty) } : r
    );
    setRows(nextRows);
    save(false, nextRows).catch(console.error);
  };

  const handleConfirmModification = async ({ qty, remark }) => {
    if (!modifyingStudent) return;
    
    // 1. Update state
    const slNo = modifyingStudent.slNo;
    const nextRows = rows.map(r => 
      r.slNo === slNo ? { ...r, quantity: qty, remark: remark } : r
    );
    setRows(nextRows);
    
    // 2. Save to DB
    await save(false, nextRows);
    
    // 3. Close modal
    setModifyingStudent(null);
  };

  const deleteStudent = async (slNo) => {
    const pass = prompt("Enter Admin Password to delete student:");
    if (!pass) return;
    try {
      setBusy(true);
      await apiFetch(`/api/students/${slNo}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pass })
      });
      load(date);
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDownloadPresent = () => {
    const baseUrl = window.location.origin === "http://localhost:5173" ? "http://localhost:5050" : "";
    window.open(`${baseUrl}/api/attendance/${date}/download?presentOnly=true&token=${localStorage.getItem("vt_token")}`, "_blank");
  };



  const { totalSold, presentCount, absentCount } = useMemo(() => {
    let sold = 0;
    let pres = 0;
    rows.forEach(r => {
      if (r.present) {
        pres++;
        sold += (Number(r.quantity) || 0);
      }
    });
    return {
      totalSold: sold,
      presentCount: pres,
      absentCount: rows.length - pres
    };
  }, [rows]);

  const paymentStats = useMemo(() => {
    let cashQty = 0;
    let onlineQty = 0;
    let freeQty = 0;
    
    rows.forEach(r => {
      if (r.present) {
        const qty = Number(r.quantity) || 0;
        if (r.paymentMethod === 'Cash') cashQty += qty;
        else if (r.paymentMethod === 'Online' || r.paymentMethod === 'Online Payment') onlineQty += qty;
        else if (r.paymentMethod === 'Free') freeQty += qty;
      }
    });

    const cashAmount = cashQty * 70;
    const onlineAmount = onlineQty * 70;
    const totalAmount = cashAmount + onlineAmount;

    return {
      cashQty, cashAmount,
      onlineQty, onlineAmount,
      freeQty, freeAmount: 0,
      totalAmount
    };
  }, [rows]);

  const summaryLists = useMemo(() => {
    // Only show "New Students" if they are truly new (added after the initial bulk import).
    // We treat students with slNo <= 493 as "existing" for today's summary.
    const allNew = info?.newStudents || [];
    const filteredNew = allNew.filter(s => Number(s.slNo) > 493);

    return {
      present: rows.filter(r => r.present),
      absent: rows.filter(r => !r.present),
      new: filteredNew
    };
  }, [rows, info]);

  return (
    <Layout>
      <AttendanceHeader 
        date={date} 
        setDate={setDate} 
        info={info} 
        presentCount={presentCount}
        absentCount={absentCount}
        totalCount={rows.length}
        soldCount={totalSold}
      />

      <div className="grid dashboard-grid" style={{ gap: '24px' }}>
        <div>
          <StudentAdmin 
            onRefresh={() => load(date)} 
            busy={busy} 
            rows={rows}
            setBusy={setBusy} 
            setError={setError} 
          />

          <div className="row" style={{ marginBottom: '16px', gap: '10px' }}>
            <button 
              className={`btn ${viewMode === 'marking' ? 'primary' : ''}`}
              onClick={() => setViewMode('marking')}
            >
              Marking Mode
            </button>
            <button 
              className={`btn ${viewMode === 'crosscheck' ? 'primary' : ''}`}
              onClick={() => setViewMode('crosscheck')}
            >
              Cross Check
            </button>
            <button 
              className={`btn ${viewMode === 'summary' ? 'primary' : ''}`}
              onClick={() => setViewMode('summary')}
            >
              Summary View
            </button>
            <button 
              className={`btn ${viewMode === 'payments' ? 'primary' : ''}`}
              onClick={() => setViewMode('payments')}
            >
              Total Amount
            </button>
            <div style={{ flex: 1 }} />
          </div>

          {viewMode === 'payments' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="card" style={{ background: 'linear-gradient(135deg, #0d2866, #0072ff)', color: 'white', textAlign: 'center', padding: '40px' }}>
                <h2 style={{ color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '1.2em' }}>Grand Total Amount</h2>
                <div style={{ fontSize: '4em', fontWeight: 'bold', margin: '15px 0' }}>₹{paymentStats.totalAmount}</div>
                <div style={{ color: 'rgba(255,255,255,0.8)' }}>Total Cash & Online Payments</div>
              </div>

              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                <div className="card" style={{ textAlign: 'center', padding: '30px 20px' }}>
                  <h3 style={{ color: '#059669', borderBottom: '3px solid #059669', paddingBottom: '12px', marginBottom: '20px' }}>Cash</h3>
                  <div style={{ fontSize: '2.5em', fontWeight: 'bold', color: '#059669', margin: '10px 0' }}>₹{paymentStats.cashAmount}</div>
                  <div className="pill" style={{ display: 'inline-block', marginTop: '10px', background: 'rgba(5, 150, 105, 0.1)', color: '#059669', border: 'none' }}>
                    {paymentStats.cashQty} {paymentStats.cashQty === 1 ? 'medicine' : 'medicines'}
                  </div>
                </div>
                <div className="card" style={{ textAlign: 'center', padding: '30px 20px' }}>
                  <h3 style={{ color: '#0ea5e9', borderBottom: '3px solid #0ea5e9', paddingBottom: '12px', marginBottom: '20px' }}>Online Payment</h3>
                  <div style={{ fontSize: '2.5em', fontWeight: 'bold', color: '#0ea5e9', margin: '10px 0' }}>₹{paymentStats.onlineAmount}</div>
                  <div className="pill" style={{ display: 'inline-block', marginTop: '10px', background: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9', border: 'none' }}>
                    {paymentStats.onlineQty} {paymentStats.onlineQty === 1 ? 'medicine' : 'medicines'}
                  </div>
                </div>
                <div className="card" style={{ textAlign: 'center', padding: '30px 20px' }}>
                  <h3 style={{ color: '#dc2626', borderBottom: '3px solid #dc2626', paddingBottom: '12px', marginBottom: '20px' }}>Free</h3>
                  <div style={{ fontSize: '2.5em', fontWeight: 'bold', color: '#dc2626', margin: '10px 0' }}>₹0</div>
                  <div className="pill" style={{ display: 'inline-block', marginTop: '10px', background: 'rgba(220, 38, 38, 0.1)', color: '#dc2626', border: 'none' }}>
                    {paymentStats.freeQty} {paymentStats.freeQty === 1 ? 'medicine' : 'medicines'}
                  </div>
                </div>
              </div>
            </div>
          ) : viewMode === 'summary' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="row" style={{ justifyContent: 'flex-end', gap: '10px' }}>
                <button 
                  className="btn primary" 
                  style={{ background: '#10b981', borderColor: '#10b981' }} 
                  onClick={() => {
                    const baseUrl = window.location.origin === "http://localhost:5173" ? "http://localhost:5050" : "";
                    window.open(`${baseUrl}/api/attendance/${date}/download?token=${localStorage.getItem("vt_token")}&t=${Date.now()}`, "_blank");
                  }}
                >
                  📥 Download Attendance Excel
                </button>
              </div>

              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                <div className="card">
                  <h3 style={{ color: '#059669', borderBottom: '2px solid #059669', paddingBottom: '8px' }}>Present ({summaryLists.present.length})</h3>
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {summaryLists.present.map(s => (
                      <li key={s.slNo} style={{ padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                        <b>{s.slNo}</b> - {s.name}
                      </li>
                    ))}
                    {summaryLists.present.length === 0 && <p className="muted">No students marked present.</p>}
                  </ul>
                </div>

                <div className="card">
                  <h3 style={{ color: '#dc2626', borderBottom: '2px solid #dc2626', paddingBottom: '8px' }}>Absent ({summaryLists.absent.length})</h3>
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {summaryLists.absent.map(s => (
                      <li key={s.slNo} style={{ padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                        <b>{s.slNo}</b> - {s.name}
                      </li>
                    ))}
                    {summaryLists.absent.length === 0 && <p className="muted">All students are present.</p>}
                  </ul>
                </div>

                <div className="card">
                  <h3 style={{ color: '#0ea5e9', borderBottom: '2px solid #0ea5e9', paddingBottom: '8px' }}>New Students ({summaryLists.new.length})</h3>
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {summaryLists.new.map(s => (
                      <li key={s.slNo} style={{ padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                        <b>{s.slNo}</b> - {s.name}
                      </li>
                    ))}
                    {summaryLists.new.length === 0 && <p className="muted">No new students today.</p>}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <StudentTable 
              rows={rows} 
              filter={filter} 
              setFilter={setFilter} 
              onToggle={toggleStudent} 
              onMarkClick={setMarkingStudent}
              onModifyClick={setModifyingStudent}
              onUpdateQuantity={updateQuantity}
              onDelete={deleteStudent}
              onViewHistory={setHistoryStudent}
              busy={busy}
              viewMode={viewMode}
            />
          )}
        </div>

        <div className="sidebar">
          <WhatsAppEditor 
            message={message} 
            setMessage={setMessage} 
            onSave={() => save(true)} 
            busy={busy} 
          />

          {error && <div className="error" style={{ marginTop: '16px' }}>{error}</div>}
        </div>
      </div>

      {historyStudent && (
        <StudentHistoryLog 
          student={historyStudent} 
          onClose={() => setHistoryStudent(null)} 
        />
      )}
      {markingStudent && (
        <MarkingModal 
          student={markingStudent} 
          isOpen={!!markingStudent} 
          onClose={() => setMarkingStudent(null)} 
          onConfirm={handleConfirmMarking}
        />
      )}
      {modifyingStudent && (
        <ModifyModal
          student={modifyingStudent}
          isOpen={!!modifyingStudent}
          onClose={() => setModifyingStudent(null)}
          onConfirm={handleConfirmModification}
        />
      )}
    </Layout>
  );
}
