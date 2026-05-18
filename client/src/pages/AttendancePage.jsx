import { useState, useMemo, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { apiFetch } from "../lib/api";
import { useAttendance } from "../hooks/useAttendance";
import { AttendanceHeader } from "../components/AttendanceHeader";
import { StudentTable } from "../components/StudentTable";
import { StudentHistoryLog } from "../components/StudentHistoryLog";
import { WhatsAppEditor } from "../components/WhatsAppEditor";
import { StudentAdmin } from "../components/StudentAdmin";
import { MarkingModal } from "../components/MarkingModal";
import { ModifyModal } from "../components/ModifyModal";
import { BroadcastModal } from "../components/BroadcastModal";
import { toIsoDate, todayParts } from "../lib/date";


const DISTRICTS = [
  "Main", "Adilabad", "Bhadradri Kothagudem", "Hanumakonda", "Hyderabad",
  "Jagtial", "Jangaon", "Jayashankar Bhupalpally", "Jogulamba Gadwal",
  "Kamareddy", "Karimnagar", "Khammam", "Kumuram Bheem", "Mahabubabad",
  "Mahabubnagar", "Mancherial", "Medak", "Medchal–Malkajgiri", "Mulugu",
  "Nagarkurnool", "Nalgonda", "Narayanpet", "Nirmal", "Nizamabad",
  "Peddapalli", "Rajanna Sircilla", "Rangareddy", "Sangareddy", "Siddipet",
  "Suryapet", "Vikarabad", "Wanaparthy", "Warangal", "Yadadri Bhuvanagiri"
];

export function AttendancePage() {
  const { date: paramDate } = useParams();

  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const isMaster = user?.role === "master";

  const [viewDistrict, setViewDistrict] = useState(() => {
    const d = searchParams.get("district");
    if (isMaster && d) return d;
    return isMaster ? "Main" : "";
  });
  const [viewPlace, setViewPlace] = useState(() => {
    const p = searchParams.get("place");
    if (isMaster && p) return p;
    return isMaster ? "Main" : "";
  });
  const [places, setPlaces] = useState([]);

  // Sync with searchParams if they change (e.g. from links)
  useEffect(() => {
    if (isMaster) {
      const d = searchParams.get("district");
      const p = searchParams.get("place");
      if (d) setViewDistrict(d);
      if (p) setViewPlace(p);
    }
  }, [searchParams, isMaster]);

  const {
    date, setDate,
    rows, setRows,
    busy, setBusy,
    error, setError,
    info,
    message, setMessage,
    whatsappLink, setWhatsappLink,
    load,
    save
  } = useAttendance(paramDate, viewDistrict, viewPlace);

  const [filter, setFilter] = useState("");
  const [viewMode, setViewMode] = useState("marking"); // marking | crosscheck | summary
  const [historyStudent, setHistoryStudent] = useState(null);
  const [markingStudent, setMarkingStudent] = useState(null);
  const [modifyingStudent, setModifyingStudent] = useState(null);
  const [inquiryResults, setInquiryResults] = useState(null);
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);

  const handleGlobalInquiry = async (phone) => {
    const p = phone?.replace(/\D/g, "");
    if (!p || p.length !== 10) {
      alert("Please enter a valid 10-digit phone number");
      return;
    }
    setBusy(true);
    setInquiryResults(null);
    try {
      const data = await apiFetch(`/api/students/inquiry/${p}`);
      setInquiryResults(data.results || []);
      setShowInquiryModal(true);
    } catch (err) {
      setError(err.message || "Global Inquiry failed");
    } finally {
      setBusy(false);
    }
  };

  // Handle 'mark' parameter from scanner
  useEffect(() => {
    const markId = searchParams.get("mark");
    if (markId && rows.length > 0) {
      const student = rows.find(r => String(r.slNo) === markId);
      if (student) {
        if (isMaster) {
          alert(`QR Scanned: ${student.name} (ID: ${student.slNo}). \nNote: Master Admins are in read-only Audit Mode and cannot mark attendance.`);
        } else {
          setMarkingStudent(student);
        }
        // Clear the URL parameter so it doesn't re-trigger on refresh
        searchParams.delete("mark");
        setSearchParams(searchParams, { replace: true });
      } else if (!busy) {
        alert(`Student ID ${markId} not found in this branch.`);
        searchParams.delete("mark");
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [searchParams, rows, busy, setSearchParams, isMaster]);

  useEffect(() => {
    if (isMaster && viewDistrict) {
      apiFetch(`/api/auth/places/${viewDistrict}`)
        .then(setPlaces)
        .catch(err => console.error("Failed to fetch places for dashboard:", err));
    }
  }, [isMaster, viewDistrict]);

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

  const handleConfirmMarking = async ({ qty, payment, skipWhatsApp = false }) => {
    if (!markingStudent) return;

    // 1. Update state
    const slNo = markingStudent.slNo;
    const studentPhone = markingStudent.phone;
    const studentName = markingStudent.name;

    toggleStudent(slNo, payment, qty, true);

    // 2. Close modal
    setMarkingStudent(null);

    // 3. Prepare message
    if (!skipWhatsApp) {
      let baseMsg = message || "Thank you for attending the session!";
      if (!baseMsg.includes("Jai Srimannarayana")) {
        baseMsg = "Jai Srimannarayana!\n" + baseMsg;
      }

      // Generate and append unique QR Code URL (QuickChart for force .png previews on WhatsApp)
      const encodedData = encodeURIComponent(slNo);
      const qrUrl = `https://quickchart.io/qr?text=${encodedData}&size=300&ext=.png`;
      baseMsg += `\n\n📷 Your Attendance QR Code / మీ అటెండెన్స్ QR కోడ్:\n`;
      baseMsg += `Please save or screenshot this QR code. Show it when you arrive for faster attendance!\n`;
      baseMsg += `దయచేసి ఈ QR కోడ్‌ను సేవ్ లేదా స్క్రీన్‌షాట్ తీసుకోండి. హాజరు త్వరగా నమోదు కావడానికి మీరు వచ్చినప్పుడు దీనిని చూపించండి!\n\n`;
      baseMsg += `${qrUrl}`;

      const text = encodeURIComponent(baseMsg);
      const phone = studentPhone.replace(/\D/g, '');
      const fullPhone = phone.startsWith('91') ? phone : `91${phone}`;

      console.log(`[Auto-WhatsApp] Sending to ${fullPhone}: ${baseMsg}`);

      if (fullPhone && fullPhone.length >= 10) {
        try {
          await apiFetch("/api/whatsapp/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone: fullPhone, text: baseMsg })
          });
          console.log("✅ Attendance WhatsApp confirmation sent automatically!");
        } catch (waErr) {
          console.warn("Automated WhatsApp send failed, falling back to manual: ", waErr);
          window.open(`https://wa.me/${fullPhone}?text=${text}`, "_blank");
        }
      } else {
        alert("Invalid student phone number. Message not sent.");
      }
    }
  };

  const updateQuantity = (slNo, newQty) => {
    const nextRows = rows.map(r =>
      r.slNo === slNo ? { ...r, quantity: Number(newQty) } : r
    );
    setRows(nextRows);
    save(false, nextRows).catch(console.error);
  };

  const handleDownloadPresent = () => {
    const apiBase = import.meta.env.VITE_API_BASE || "";
    window.open(`${apiBase}/api/attendance/${date}/download?presentOnly=true&token=${localStorage.getItem("vt_token")}&t=${Date.now()}`, "_blank");
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

  const handleConfirmModify = async ({ qty, remark, skipWhatsApp = false }) => {
    if (!modifyingStudent) return;
    const sPhone = modifyingStudent.phone;
    const sName = modifyingStudent.name;
    const nextRows = rows.map(r =>
      r.slNo === modifyingStudent.slNo ? { ...r, quantity: Number(qty), remark: remark } : r
    );
    setRows(nextRows);
    await save(false, nextRows);
    setModifyingStudent(null);

    if (!skipWhatsApp) {
      let baseMsg = message || "Thank you for attending the session!";
      if (!baseMsg.includes("Jai Srimannarayana")) {
        baseMsg = "Jai Srimannarayana!\n" + baseMsg;
      }

      // Generate and append unique QR Code URL (QuickChart for force .png previews on WhatsApp)
      const encodedData = encodeURIComponent(modifyingStudent.slNo);
      const qrUrl = `https://quickchart.io/qr?text=${encodedData}&size=300&ext=.png`;
      baseMsg += `\n\n📷 Your Attendance QR Code / మీ అటెండెన్స్ QR కోడ్:\n`;
      baseMsg += `Please save or screenshot this QR code. Show it when you arrive for faster attendance!\n`;
      baseMsg += `దయచేసి ఈ QR కోడ్‌ను సేవ్ లేదా స్క్రీన్‌షాట్ తీసుకోండి. హాజరు త్వరగా నమోదు కావడానికి మీరు వచ్చినప్పుడు దీనిని చూపించండి!\n\n`;
      baseMsg += `${qrUrl}`;

      const text = encodeURIComponent(baseMsg);
      const phone = sPhone.replace(/\D/g, '');
      const fullPhone = phone.startsWith('91') ? phone : `91${phone}`;

      if (fullPhone && fullPhone.length >= 10) {
        try {
          await apiFetch("/api/whatsapp/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone: fullPhone, text: baseMsg })
          });
          console.log("✅ Attendance WhatsApp confirmation sent automatically!");
        } catch (waErr) {
          console.warn("Automated WhatsApp send failed, falling back to manual: ", waErr);
          window.open(`https://wa.me/${fullPhone}?text=${text}`, "_blank");
        }
      }
    }
  };

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
    // Show all students identified as new by the backend (created today)
    const filteredNew = info?.newStudents || [];

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
        user={user}
        viewDistrict={viewDistrict}
        viewPlace={viewPlace}
        setViewDistrict={setViewDistrict}
        setViewPlace={setViewPlace}
        districts={DISTRICTS}
        places={places}
      />

      <div className="grid dashboard-grid" style={{ gap: '24px' }}>
        <div>
          <StudentAdmin
            onRefresh={async () => await load(date, viewDistrict, viewPlace)}
            busy={busy}
            setBusy={setBusy}
            setError={setError}
            rows={rows}
            viewDistrict={viewDistrict}
            viewPlace={viewPlace}
            whatsappLink={whatsappLink}
            message={message}
            onMarkStudent={(s) => {
              // Add to rows locally so marking works instantly
              setRows(prev => {
                const exists = prev.find(r => r.slNo === s.slNo);
                if (exists) return prev;
                return [...prev, s];
              });
              setMarkingStudent(s);
            }}
            onGlobalInquiry={handleGlobalInquiry}
          />
          <div className="row" style={{ marginBottom: '16px', gap: '10px' }}>
            {(() => {
              const getModeStyle = (mode) => {
                const isActive = viewMode === mode;
                if (isActive) {
                  return {
                    background: 'linear-gradient(135deg, #0d2866, #0072ff)',
                    color: 'white',
                    border: 'none',
                    fontWeight: '700',
                    padding: '10px 20px',
                    boxShadow: '0 4px 12px rgba(13, 40, 102, 0.3)',
                    borderRadius: '50px'
                  };
                }
                return {
                  background: 'linear-gradient(135deg, #e0f2fe, #bae6fd)',
                  color: '#0369a1',
                  border: '1px solid #bae6fd',
                  fontWeight: '600',
                  padding: '10px 20px',
                  boxShadow: '0 2px 6px rgba(100, 150, 200, 0.1)',
                  borderRadius: '50px'
                };
              };
              return (
                <>
                  <button style={getModeStyle('marking')} onClick={() => setViewMode('marking')}>Marking Mode</button>
                  <button style={getModeStyle('crosscheck')} onClick={() => setViewMode('crosscheck')}>Cross Check</button>
                  <button style={getModeStyle('summary')} onClick={() => setViewMode('summary')}>Summary View</button>
                  <button style={getModeStyle('payments')} onClick={() => setViewMode('payments')}>Total Amount</button>
                  <button 
                    style={{
                      background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
                      color: 'white',
                      border: 'none',
                      fontWeight: '600',
                      padding: '10px 20px',
                      boxShadow: '0 2px 6px rgba(29, 78, 216, 0.2)',
                      borderRadius: '50px',
                      cursor: 'pointer'
                    }} 
                    onClick={() => {
                      const navigate = (window.location.href = '/scan');
                    }}
                  >
                    📷 Scanner
                  </button>
                  <button 
                    style={{
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: 'white',
                      border: 'none',
                      fontWeight: '600',
                      padding: '10px 20px',
                      boxShadow: '0 2px 6px rgba(16, 185, 129, 0.2)',
                      borderRadius: '50px',
                      cursor: 'pointer'
                    }} 
                    onClick={() => window.open('/qrcodes', '_blank')}
                  >
                    🖨️ QR Codes
                  </button>
                  <button 
                    style={{
                      background: 'linear-gradient(135deg, #25D366, #128C7E)',
                      color: 'white',
                      border: 'none',
                      fontWeight: '600',
                      padding: '10px 20px',
                      boxShadow: '0 2px 6px rgba(37, 211, 102, 0.2)',
                      borderRadius: '50px',
                      cursor: 'pointer'
                    }} 
                    onClick={() => setShowBroadcastModal(true)}
                  >
                    📢 Broadcast Message
                  </button>
                </>
              );
            })()}
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
                    const apiBase = import.meta.env.VITE_API_BASE || "";
                    window.open(`${apiBase}/api/attendance/${date}/download?token=${localStorage.getItem("vt_token")}&t=${Date.now()}`, "_blank");
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
                        <div style={{ fontWeight: 'bold' }}>{s.slNo} - {s.name}</div>
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
                        <div style={{ fontWeight: 'bold' }}>{s.slNo} - {s.name}</div>
                      </li>
                    ))}
                    {summaryLists.absent.length === 0 && <p className="muted">All students are present.</p>}
                  </ul>
                </div>

                <div className="card">
                  <h3 style={{ color: '#000000', borderBottom: '2px solid #000000', paddingBottom: '8px' }}>New Students ({summaryLists.new.length})</h3>
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {summaryLists.new.map(s => (
                      <li key={s.slNo} style={{ padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                        <div style={{ fontWeight: 'bold' }}>{s.slNo} - {s.name}</div>
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
              onViewHistory={setHistoryStudent}
              onGlobalSearch={handleGlobalInquiry}
              busy={busy}
              viewMode={viewMode}
              isMaster={isMaster}
              viewDistrict={viewDistrict}
              viewPlace={viewPlace}
            />
          )}
        </div>

        <div className="sidebar">
          {!isMaster && (
            <WhatsAppEditor
              message={message}
              setMessage={setMessage}
              whatsappLink={whatsappLink}
              setWhatsappLink={setWhatsappLink}
              onSave={() => save(true)}
              busy={busy}
            />
          )}

          {error && <div className="error" style={{ marginTop: '16px' }}>{error}</div>}
        </div>
      </div>

      {historyStudent && (
        <StudentHistoryLog
          student={historyStudent}
          onClose={() => setHistoryStudent(null)}
        />
      )}
      {!isMaster && markingStudent && (
        <MarkingModal
          student={markingStudent}
          isOpen={!!markingStudent}
          onClose={() => setMarkingStudent(null)}
          onConfirm={handleConfirmMarking}
        />
      )}
      {!isMaster && modifyingStudent && (
        <ModifyModal
          student={modifyingStudent}
          isOpen={!!modifyingStudent}
          onClose={() => setModifyingStudent(null)}
          onConfirm={handleConfirmModify}
        />
      )}

      <BroadcastModal
        isOpen={showBroadcastModal}
        onClose={() => setShowBroadcastModal(false)}
        rows={rows}
      />
      {showInquiryModal && (
        <div className="modal-overlay" style={{ zIndex: 2000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ maxWidth: '700px', width: '95%', padding: '0', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', border: 'none' }}>
            <div style={{ background: 'linear-gradient(135deg, #0d2866, #1e40af)', color: 'white', padding: '25px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.4em' }}>🔍 Global Student Record</h2>
                <div style={{ fontSize: '0.85em', opacity: 0.8, marginTop: '4px' }}>Found matching records in other locations</div>
              </div>
              <button onClick={() => setShowInquiryModal(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: '36px', height: '36px', borderRadius: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>

            <div style={{ padding: '30px', maxHeight: '75vh', overflowY: 'auto', background: '#f8fafc' }}>
              {inquiryResults?.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0' }}>
                  <div style={{ fontSize: '4em', marginBottom: '15px' }}>🕵️</div>
                  <h3 style={{ color: '#0d2866' }}>No Global Record Found</h3>
                  <p className="muted">This student has not been registered in any other branch yet.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                  {inquiryResults.map((res, i) => (
                    <div key={i} className="card" style={{ padding: '20px', border: '1px solid #e2e8f0', background: 'white', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', borderRadius: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '2px solid #f1f5f9', paddingBottom: '15px' }}>
                        <div>
                          <div style={{ fontSize: '0.75em', textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b', fontWeight: 'bold', marginBottom: '4px' }}>Location</div>
                          <div style={{ fontSize: '1.2em', fontWeight: 'bold', color: '#0d2866' }}>📍 {res.place}, {res.district}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.75em', textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b', fontWeight: 'bold', marginBottom: '4px' }}>Registered ID</div>
                          <div style={{ fontSize: '1.2em', fontWeight: 'bold', color: '#000' }}>#{res.slNo}</div>
                        </div>
                      </div>

                      <div style={{ marginBottom: '20px' }}>
                        <div style={{ fontSize: '0.75em', textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b', fontWeight: 'bold', marginBottom: '4px' }}>Full Name</div>
                        <div style={{ fontSize: '1.3em', fontWeight: '800', color: '#000' }}>{res.studentName}</div>
                      </div>

                      <div style={{ background: '#f1f5f9', borderRadius: '12px', padding: '15px' }}>
                        <div style={{ fontSize: '0.85em', fontWeight: 'bold', marginBottom: '12px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          📋 Medicine History
                        </div>
                        {res.history?.length === 0 ? (
                          <div style={{ fontSize: '0.9em', color: '#64748b', fontStyle: 'italic', padding: '10px', textAlign: 'center' }}>No medicine intake recorded here.</div>
                        ) : (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
                            {res.history.map((h, j) => (
                              <div key={j} style={{ display: 'flex', flexDirection: 'column', background: 'white', padding: '12px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                                <span style={{ fontSize: '0.85em', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>📅 {h.date}</span>
                                <span style={{ color: '#0d2866', fontSize: '1.1em', fontWeight: '900' }}>💊 {h.quantity} Qty</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ padding: '20px 30px', background: 'white', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn primary" onClick={() => setShowInquiryModal(false)} style={{ background: '#0d2866', borderRadius: '12px', padding: '12px 30px', fontWeight: 'bold' }}>Close Report</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
