import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

export function StudentTable({ rows, filter, setFilter, onToggle, onMarkClick, onUpdateQuantity, onDelete, onViewHistory, busy, viewMode }) {
  const navigate = useNavigate();
  const q = filter.trim().toLowerCase();

  const handleModifyClick = () => {
    navigate("/modify");
  };
  
  const visibleRows = useMemo(() => {
    const base = viewMode === "marking" ? rows.filter(r => !r.present) : rows.filter(r => r.present);
    if (!q) return base;
    return base.filter(
      (r) =>
        String(r.slNo || "").toLowerCase().includes(q) ||
        String(r.phone || "").toLowerCase().includes(q) ||
        String(r.name || "").toLowerCase().includes(q) ||
        String(r.fatherName || "").toLowerCase().includes(q)
    );
  }, [rows, q, viewMode]);

  const isSearching = q.length > 0;

  return (
    <div className="card" style={{ marginTop: '24px' }}>
      <div className="row" style={{ marginBottom: '16px', justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0 }}>
          {isSearching ? `Search Results (${visibleRows.length})` : (viewMode === "marking" ? "Students" : "Present Students")}
        </h3>
        <div className="row" style={{ flex: 1, maxWidth: '400px', position: 'relative' }}>
          {viewMode === "marking" && (
            <button 
              className="btn primary" 
              onClick={handleModifyClick}
              style={{ marginRight: '10px', whiteSpace: 'nowrap' }}
            >
              Modify
            </button>
          )}
          <input
            className="input"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search by Name, Father Name or Phone..."
            style={{ flex: 1, paddingRight: '40px' }}
          />
          {filter && (
            <button 
              className="btn" 
              onClick={() => setFilter("")}
              style={{
                position: 'absolute',
                right: '5px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                fontSize: '1.2em',
                color: '#64748b',
                padding: '5px 10px',
                cursor: 'pointer'
              }}
            >
              &times;
            </button>
          )}
        </div>
      </div>

      {isSearching && visibleRows.length > 0 ? (
        <div className="search-results-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px', padding: '10px' }}>
          {visibleRows.map(r => (
            <div key={r.slNo} className="card p-4" style={{ borderLeft: '4px solid #3b82f6', background: '#f8fafc' }}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.2em' }}>{r.name}</h4>
                  <p className="muted" style={{ margin: '4px 0', fontSize: '0.9em' }}>
                    <b>Serial No:</b> {r.slNo} | <b>Age:</b> {r.age || 'N/A'}
                  </p>
                  <p className="muted" style={{ margin: '4px 0', fontSize: '0.9em' }}>
                    <b>Father Name:</b> {r.fatherName || 'N/A'}
                  </p>
                  <p className="muted" style={{ margin: '4px 0', fontSize: '0.9em' }}>
                    <b>Phone Number:</b> {r.phone}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <button className="btn primary" style={{ display: 'block', width: '100%', marginBottom: '8px' }} onClick={() => onViewHistory(r)}>
                    View Full History
                  </button>
                  {!r.present && (
                     <button className="btn" style={{ borderColor: '#059669', color: '#059669', width: '100%' }} onClick={() => onMarkClick(r)}>
                        Mark Present
                     </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="tableWrap">
          <table style={{ width: '100%', tableLayout: 'auto' }}>
            <thead>
              <tr>
                <th style={{ width: 110, textAlign: 'center' }}>ID</th>
                <th style={{ textAlign: 'left', paddingLeft: '30px' }}>Student Name</th>
                <th>Father Name</th>
                <th style={{ width: 80, textAlign: 'center' }}>Age</th>
                <th style={{ minWidth: '150px', textAlign: 'center' }}>Phone Number</th>
                {viewMode === "marking" ? (
                  <>
                    <th style={{ width: 100, textAlign: 'center' }}>Mark</th>
                  </>
                ) : (
                  <>
                    <th style={{ width: 120 }}>Method</th>
                    <th style={{ width: 60, textAlign: 'center' }}>Qty</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((r) => (
                <tr key={r.slNo} className={r.present ? "row-present" : ""}>
                  <td style={{ fontWeight: 'bold', textAlign: 'center' }}>{r.slNo}</td>
                  <td style={{ paddingLeft: '30px' }}>{r.name}</td>
                  <td className="muted" style={{ fontSize: '0.9em' }}>{r.fatherName || "-"}</td>
                  <td style={{ textAlign: 'center' }}>{r.age || "-"}</td>
                  <td className="muted" style={{ textAlign: 'center' }}>{r.phone}</td>
                  
                  {viewMode === "marking" ? (
                    <>
                      <td style={{ textAlign: 'center' }}>
                        {r.present ? (
                          <span style={{ color: '#059669', fontWeight: 'bold', fontSize: '1.2em' }}>✓</span>
                        ) : (
                          <button 
                            className="btn" 
                            style={{ padding: '2px 8px', fontSize: '0.8em', borderColor: '#059669', color: '#059669' }}
                            onClick={() => onMarkClick(r)}
                          >
                            Mark
                          </button>
                        )}
                      </td>
                    </>
                  ) : (
                    <>
                      <td><span className="pill" style={{ background: '#f3f4f6' }}>{r.paymentMethod}</span></td>
                      <td><b>{r.quantity}</b></td>
                    </>
                  )}
                </tr>
              ))}
              {visibleRows.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    {busy ? "Loading data..." : "No matching students found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
