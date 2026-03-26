import { useMemo } from "react";
import { daysInMonth, toIsoDate, todayParts } from "../lib/date";

export function AttendanceHeader({ 
  date, setDate, info, presentCount, absentCount, totalCount, soldCount, user,
  viewDistrict, viewPlace, setViewDistrict, setViewPlace, districts, places
}) {
  const [yStr, mStr, dStr] = date.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  const d = Number(dStr);

  const dayOptions = useMemo(() => {
    const total = daysInMonth(y, m);
    return Array.from({ length: total }, (_, i) => i + 1);
  }, [y, m]);

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 21 }, (_, i) => currentYear - 10 + i);
  }, []);

  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const handleDateChange = (newY, newM, newD) => {
    setDate(toIsoDate(newY, newM, newD));
  };

  const goToToday = () => {
    const today = todayParts();
    setDate(toIsoDate(today.y, today.m, today.d));
  };

  return (
    <div className="attendance-header">
      <div className="date-top-selector card" style={{ padding: 'min(20px, 4vw) min(30px, 5vw)', marginBottom: '24px', display: 'flex', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg, #0d2866, #0072ff)', color: 'white', gap: '20px' }}>
        <div className="row" style={{ gap: '20px' }}>
          <div className="field" style={{ minWidth: '80px', marginBottom: 0 }}>
            <label style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 'bold', fontSize: '0.75em' }}>DATE</label>
            <select className="header-select" style={{ background: '#0d2866', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '4px', colorScheme: 'dark' }} value={d} onChange={(e) => handleDateChange(y, m, Number(e.target.value))}>
              {dayOptions.map(day => <option key={day} value={day} style={{ background: '#0d2866', color: 'white' }}>{String(day).padStart(2, '0')}</option>)}
            </select>
          </div>
          <div className="field" style={{ minWidth: '80px', marginBottom: 0 }}>
            <label style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 'bold', fontSize: '0.75em' }}>MONTH</label>
            <select className="header-select" style={{ background: '#0d2866', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '4px', colorScheme: 'dark' }} value={m} onChange={(e) => handleDateChange(y, Number(e.target.value), d)}>
              {months.map(month => <option key={month} value={month} style={{ background: '#0d2866', color: 'white' }}>{String(month).padStart(2, '0')}</option>)}
            </select>
          </div>
          <div className="field" style={{ minWidth: '100px', marginBottom: 0 }}>
            <label style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 'bold', fontSize: '0.75em' }}>YEAR</label>
            <select className="header-select" style={{ background: '#0d2866', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '4px', colorScheme: 'dark' }} value={y} onChange={(e) => handleDateChange(Number(e.target.value), m, d)}>
              {years.map(year => <option key={year} value={year} style={{ background: '#0d2866', color: 'white' }}>{year}</option>)}
            </select>
          </div>
          <button
            className="btn"
            style={{ alignSelf: 'flex-end', background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', padding: '10px 15px' }}
            onClick={goToToday}
          >
            Today
          </button>
        </div>

        <div style={{ textAlign: 'right' }}>
          <h1 style={{ margin: 0, fontSize: '1.6em', letterSpacing: '1px' }}>
            {new Date(date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </h1>
          {date === toIsoDate(todayParts().y, todayParts().m, todayParts().d) && (
            <span style={{ fontSize: '0.9em', background: '#34d399', color: '#064e3b', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>TODAY</span>
          )}
        </div>
      </div>

      <div className="row" style={{ justifyContent: 'space-between', marginBottom: '24px', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {user ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ background: 'rgba(13, 40, 102, 0.1)', color: '#0d2866', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8em', fontWeight: 'bold' }}>
                  ADMIN: {user.username}
                </span>
                {user.role === 'master' && (
                  <span style={{ background: '#f59e0b', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8em', fontWeight: 'bold' }}>MASTER</span>
                )}
              </div>

              {user.role === 'master' ? (
                <div className="row" style={{ gap: '12px', marginTop: '4px' }}>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <select 
                      className="input" 
                      style={{ padding: '6px 12px', fontSize: '0.9em', minWidth: '150px' }}
                      value={viewDistrict} 
                      onChange={e => setViewDistrict(e.target.value)}
                    >
                      {districts.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <select 
                      className="input" 
                      style={{ padding: '6px 12px', fontSize: '0.9em', minWidth: '150px' }}
                      value={viewPlace} 
                      onChange={e => setViewPlace(e.target.value)}
                      disabled={places.length === 0}
                    >
                      <option value="">-- Select Place --</option>
                      {places.map(p => {
                        const cap = p.charAt(0).toUpperCase() + p.slice(1);
                        return <option key={p} value={p}>{cap}</option>;
                      })}
                    </select>
                  </div>
                </div>
              ) : (
                <>
                  <span style={{ fontSize: '1.1em', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>{user.district}</span>
                  <h2 style={{ margin: 0, fontSize: '2.2em', fontStyle: 'italic', color: '#0d2866', lineHeight: '1.1' }}>
                    {user.place}
                  </h2>
                </>
              )}
            </>
          ) : (
            <h2 style={{ margin: 0, fontSize: '1.8em', fontStyle: 'italic', color: '#0d2866' }}>Home</h2>
          )}
        </div>

        {info && (
          <div className="row">
            <div className="stat-pill" style={{ padding: '8px 16px' }}>
              <span style={{ fontSize: '0.8em', color: '#64748b' }}>TOTAL</span>
              <span style={{ fontWeight: 'bold' }}>{totalCount ?? info.total}</span>
            </div>
            <div className="stat-pill" style={{ padding: '8px 16px', borderLeft: '4px solid #059669' }}>
              <span style={{ fontSize: '0.8em', color: '#059669' }}>PRESENT</span>
              <span style={{ fontWeight: 'bold', color: '#059669' }}>{presentCount ?? info.presentCount}</span>
            </div>
            <div className="stat-pill" style={{ padding: '8px 16px', borderLeft: '4px solid #dc2626' }}>
              <span style={{ fontSize: '0.8em', color: '#dc2626' }}>ABSENT</span>
              <span style={{ fontWeight: 'bold', color: '#dc2626' }}>{absentCount ?? info.absentCount}</span>
            </div>
            <div className="stat-pill" style={{ padding: '8px 16px', borderLeft: '4px solid #1e293b' }}>
              <span style={{ fontSize: '0.8em', color: '#1e293b' }}>SOLD</span>
              <span style={{ fontWeight: 'bold', color: '#1e293b' }}>{soldCount ?? 0}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
