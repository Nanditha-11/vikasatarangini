import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";

export function PublicStudentHistoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const nav = useNavigate();
  
  const [district, setDistrict] = useState(searchParams.get("district") || "");
  const [place, setPlace] = useState(searchParams.get("place") || "");
  const [identifier, setIdentifier] = useState(searchParams.get("identifier") || "");
  
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");
  const [selectedResult, setSelectedResult] = useState(null);

  const districts = [
    "Adilabad", "Bhadradri Kothagudem", "Hanumakonda", "Hyderabad", 
    "Jagtial", "Jangaon", "Jayashankar Bhupalpally", "Jogulamba Gadwal", 
    "Kamareddy", "Karimnagar", "Khammam", "Kumuram Bheem", "Mahabubabad", 
    "Mahabubnagar", "Mancherial", "Medak", "Medchal–Malkajgiri", "Mulugu", 
    "Nagarkurnool", "Nalgonda", "Narayanpet", "Nirmal", "Nizamabad", 
    "Peddapalli", "Rajanna Sircilla", "Rangareddy", "Sangareddy", "Siddipet", 
    "Suryapet", "Vikarabad", "Wanaparthy", "Warangal", "Yadadri Bhuvanagiri"
  ];

  const [places, setPlaces] = useState([]);
  const [loadingPlaces, setLoadingPlaces] = useState(false);

  useEffect(() => {
    if (!district) return;
    setLoadingPlaces(true);
    apiFetch(`/api/auth/places/${district}`)
      .then(data => {
        setPlaces([...new Set(data.map(p => p.charAt(0).toUpperCase() + p.slice(1)))]);
      })
      .catch(console.error)
      .finally(() => setLoadingPlaces(false));
  }, [district]);

  useEffect(() => {
    const d = searchParams.get("district");
    const p = searchParams.get("place");
    const i = searchParams.get("identifier");
    if (d && p && i) {
      handleSearch(d, p, i);
    }
  }, [searchParams]);

  async function handleSearch(d, p, i) {
    setLoading(true);
    setError("");
    setResults(null);
    setSelectedResult(null);
    try {
      const data = await apiFetch(`/api/public/student-history?district=${d}&place=${p}&identifier=${i}`);
      setResults(data);
      if (data.length === 1) {
        setSelectedResult(data[0]);
      }
    } catch (err) {
      setError(err.message || "No records found");
    } finally {
      setLoading(false);
    }
  }

  const onFormSubmit = (e) => {
    e.preventDefault();
    setSearchParams({ district, place, identifier });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    try {
      if (typeof dateStr === 'string' && dateStr.includes('-')) {
        const [y, m, d] = dateStr.split('-');
        if (y && m && d) {
          const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          return `${d} ${months[parseInt(m) - 1]} ${y}`;
        }
      }
      return new Date(dateStr).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="login-page-wrapper history-bg-blue" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '40px 20px' }}>
      <div className="history-container">
        <div style={{ marginBottom: '20px' }}>
          <button className="btn primary pill" onClick={() => nav("/login")} style={{ padding: '10px 24px' }}>
            ← Back to Admin Login
          </button>
        </div>
        
        <div className="history-header-public" style={{ border: 'none', marginBottom: '10px' }}>
          <h1 style={{ margin: 0, fontSize: '2rem', color: 'white' }}>Vikasa Tarangini</h1>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: '1rem' }}>Medicine Management System</p>
        </div>
        
        <div className="card history-page-card" style={{ padding: '35px', marginBottom: '30px', borderRadius: '24px' }}>
          <h2 style={{ color: '#0d2866', marginBottom: '10px', textAlign: 'center', fontSize: '2rem' }}>Tablet History Search</h2>
          <p style={{ color: '#64748b', textAlign: 'center', marginBottom: '35px', fontSize: '1.1rem' }}>Enter your details to view your medicine log</p>
          
          <form onSubmit={onFormSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <div className="field" style={{ margin: 0 }}>
              <label>District</label>
              <select className="input" value={district} onChange={(e) => setDistrict(e.target.value)} required style={{ appearance: 'auto' }}>
                <option value="">-- Select District --</option>
                {districts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>Place</label>
              <select className="input" value={place} onChange={(e) => setPlace(e.target.value)} required disabled={!district || loadingPlaces} style={{ appearance: 'auto' }}>
                <option value="">{loadingPlaces ? "Loading..." : "-- Select Place --"}</option>
                {places.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>Name or Phone</label>
              <input className="input" value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="Full Name or Phone" required />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn primary" disabled={loading} style={{ width: '100%', height: '48px', fontWeight: 'bold', fontSize: '1rem' }}>
                {loading ? "Searching..." : "Search History"}
              </button>
            </div>
          </form>
          {error && <div className="error" style={{ marginTop: 25, justifyContent: 'center' }}>{error}</div>}
        </div>

        {results && !selectedResult && (
          <div className="card history-page-card" style={{ padding: '30px', borderRadius: '24px' }}>
            <h3 style={{ color: '#0d2866', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Multiple Results Found</h3>
            <p style={{ color: '#64748b', marginBottom: '20px' }}>We found multiple students matching your search. Please select yours:</p>
            <div style={{ display: 'grid', gap: '15px' }}>
              {results.map((res, i) => (
                <div 
                  key={i} 
                  className="card search-result-item" 
                  onClick={() => setSelectedResult(res)}
                  style={{ padding: '18px 25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff' }}
                >
                  <div>
                    <h4 style={{ margin: 0, color: '#0d2866', fontSize: '1.2rem' }}>{res.student.name}</h4>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.95em', color: '#64748b' }}>Father: {res.student.fatherName}</p>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.85em', color: '#94a3b8' }}>ID: {res.student.slNo} • {res.student.phone}</p>
                  </div>
                  <button className="btn pill primary" style={{ pointerEvents: 'none' }}>Select Result</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedResult && (
          <div className="card history-page-card" style={{ padding: '40px', borderRadius: '24px' }}>
            <div className="history-header-public">
              <div>
                <h2 style={{ margin: 0, color: '#0d2866', fontSize: '2.2rem', fontStyle: 'italic', fontWeight: '900' }}>{selectedResult.student.name}</h2>
                <div style={{ display: 'flex', gap: '25px', marginTop: '12px' }}>
                  <span style={{ fontSize: '1rem', color: '#444' }}><strong>Father's Name:</strong> {selectedResult.student.fatherName}</span>
                  <span style={{ fontSize: '1rem', color: '#444' }}><strong>Phone:</strong> {selectedResult.student.phone}</span>
                </div>
              </div>
              {results && results.length > 1 && (
                <button className="btn" onClick={() => setSelectedResult(null)}>← Back to List</button>
              )}
            </div>

            <div className="history-stats-public">
              <div className="stat-pill" style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', border: 'none', padding: '20px' }}>
                <span className="label" style={{ color: '#0369a1', fontSize: '0.85rem' }}>Total Medicine Taken</span>
                <span className="value" style={{ fontSize: '2rem', color: '#0c4a6e' }}>
                  {selectedResult.history.reduce((a, b) => a + (b.quantity || 0), 0)} <span style={{ fontSize: '0.5em', fontWeight: 'normal' }}>Tablets</span>
                </span>
              </div>
              <div className="stat-pill" style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)', border: 'none', padding: '20px' }}>
                <span className="label" style={{ color: '#059669', fontSize: '0.85rem' }}>Days Attended</span>
                <span className="value" style={{ fontSize: '2rem', color: '#064e3b' }}>
                  {selectedResult.history.filter(h => h.present).length} <span style={{ fontSize: '0.5em', fontWeight: 'normal' }}>Sessions</span>
                </span>
              </div>
            </div>

            <div className="history-list">
              <h3 style={{ marginBottom: '25px', fontSize: '1.5rem', color: '#0f172a' }}>Attendance & Medicine Log</h3>
              <div className="timeline-header" style={{ padding: '12px 25px', background: '#f8fafc', borderRadius: '12px 12px 0 0', border: '1px solid #e2e8f0', borderBottom: 'none' }}>
                <div className="date">Date</div>
                <div className="status">Status</div>
                <div className="details" style={{ textAlign: 'left' }}>Medicine Details</div>
              </div>
              <div className="timeline" style={{ border: '1px solid #e2e8f0', borderRadius: '0 0 12px 12px', overflow: 'hidden' }}>
                {selectedResult.history.map((h, i) => (
                  <div key={i} className={`timeline-item ${h.present ? 'present' : 'absent'}`} style={{ borderRadius: 0, borderBottom: i === selectedResult.history.length - 1 ? 'none' : '1px solid #f1f5f9', padding: '18px 25px' }}>
                    <div className="date" style={{ fontSize: '1rem' }}>{formatDate(h.date)}</div>
                    <div className="status" style={{ fontSize: '0.95rem' }}>{h.present ? 'Present' : 'Absent'}</div>
                    <div className="details">
                      {h.present ? (
                        <>
                          <span className="qty" style={{ padding: '6px 12px', fontSize: '0.95rem' }}>{h.quantity} {h.quantity === 1 ? 'Tablet' : 'Tablets'}</span>
                          <span className="method" style={{ alignSelf: 'center' }}>{h.paymentMethod}</span>
                        </>
                      ) : (
                        <span className="absent-label">Not Attended</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
