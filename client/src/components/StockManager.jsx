export function StockManager({ openingStock, setOpeningStock, previousRemainingStock, prevStockStats, onSave, busy }) {
  const addedStock = openingStock - previousRemainingStock >= 0 ? openingStock - previousRemainingStock : 0;

  return (
    <div className="card" style={{ marginBottom: '24px', background: 'rgba(239, 246, 255, 0.4)' }}>
      <h3 style={{ marginBottom: '16px', fontSize: '1.2em' }}>Stock Management</h3>
      
      <div className="row" style={{ gap: '20px', flexWrap: 'wrap' }}>
        <div className="row" style={{ background: 'rgba(255,255,255,0.5)', padding: '12px 20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.8)' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="muted" style={{ fontSize: '0.85em', textTransform: 'uppercase' }}>Carryover from {prevStockStats.sold ? 'Previous Day' : 'History'}</span>
            <span style={{ fontSize: '1.1em', fontWeight: 'bold' }}>{previousRemainingStock} units</span>
          </div>
        </div>

        <div className="field" style={{ marginBottom: 0, flexDirection: 'row', alignItems: 'center', gap: '12px' }}>
          <label style={{ margin: 0, whiteSpace: 'nowrap' }}>+ New Stock Add:</label>
          <input
            type="number"
            className="input"
            style={{ width: '100px', fontWeight: 'bold', fontSize: '1.1em' }}
            value={addedStock}
            onChange={(e) => {
              const added = Number(e.target.value) || 0;
              setOpeningStock(previousRemainingStock + added);
            }}
          />
        </div>

        <div style={{ flex: 1 }} />

        <div className="row">
           <span className="pill" style={{ background: '#0d2866', color: 'white', borderColor: 'transparent', padding: '10px 20px', fontSize: '1em' }}>
            Total Opening: <b>{openingStock}</b>
          </span>
          <button 
            className="btn primary" 
            style={{ padding: '12px 24px' }}
            onClick={() => onSave(true)} 
            disabled={busy}
          >
            Update Stock
          </button>
        </div>
      </div>

      <div className="muted" style={{ marginTop: '12px', fontSize: '0.85em' }}>
        Last stats: Opening {prevStockStats.opening} | Sold {prevStockStats.sold} | Remaining {previousRemainingStock}
      </div>
    </div>
  );
}
