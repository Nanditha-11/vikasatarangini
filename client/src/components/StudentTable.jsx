import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

export function StudentTable({ rows, filter, setFilter, onToggle, onMarkClick, onModifyClick, onUpdateQuantity, onDelete, onViewHistory, busy, viewMode, deletingSlNo, setDeletingSlNo, deletePass, setDeletePass, isMaster }) {
  const navigate = useNavigate();
  const q = filter.trim().toLowerCase();

  const handleModifyClick = () => {
    navigate("/modify");
  };
  
  const visibleRows = useMemo(() => {
    // 1. Initial filter by presence
    const base = viewMode === "marking" ? rows.filter(r => !r.present) : rows.filter(r => r.present);
    
    // 2. Numerical Sort
    const sorted = [...base].sort((a, b) => (parseInt(a.slNo, 10) || 0) - (parseInt(b.slNo, 10) || 0));
    
    // 3. Search filter
    if (!q) return sorted;
    return sorted.filter(
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
      <div className="row" style={{ marginBottom: '16px', justifyContent: 'center' }}>
        <div className="row" style={{ flex: 1, maxWidth: '800px', position: 'relative' }}>
          
          <input
            className="input"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search by ID, Name, Father Name or Phone..."
            style={{ 
              flex: 1, 
              padding: '14px 20px', 
              paddingRight: '50px', 
              fontSize: '1.1em', 
              borderRadius: '10px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}
          />
          {filter && (
            <button 
              className="btn" 
              onClick={() => setFilter("")}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                fontSize: '1.5em',
                color: '#64748b',
                padding: '5px 15px',
                cursor: 'pointer'
              }}
            >
              &times;
            </button>
          )}
        </div>
      </div>

      {isSearching ? (
        visibleRows.length > 0 ? (
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
                        View Details
                      </button>
                      
                      {!isMaster && (
                        <>
                          {r.present && onModifyClick && (
                            <button className="btn" style={{ borderColor: '#2563eb', color: '#2563eb', width: '100%', marginBottom: '8px' }} onClick={() => onModifyClick(r)}>
                                Modify Details
                            </button>
                          )}
                          {!r.present && (
                            <button className="btn" style={{ borderColor: '#059669', color: '#059669', width: '100%', marginBottom: '8px' }} onClick={() => onMarkClick(r)}>
                                Mark Present
                            </button>
                          )}
                        </>
                      )}
                    </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
            No matching students found for "{filter}".
          </div>
        )
      ) : (
        <div style={{ height: '40px' }} />
      )}
    </div>
  );
}
