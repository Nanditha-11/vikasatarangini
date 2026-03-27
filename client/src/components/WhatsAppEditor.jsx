import { useState } from "react";
 
export function WhatsAppEditor({ message, setMessage, whatsappLink, setWhatsappLink, onSave, busy }) {
  const [editMsg, setEditMsg] = useState(false);
  const [editLink, setEditLink] = useState(false);
  const isValidLink = !whatsappLink || whatsappLink.startsWith("http");
 
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>
      
      {/* 1. Message Box */}
      <div 
        className="card"
        style={{
          background: "rgba(255, 193, 7, 0.05)",
          padding: "20px",
          borderRadius: "20px",
          border: "1px solid rgba(255, 193, 7, 0.2)",
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h4 style={{ margin: 0, color: '#854d0e', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🔔</span> WhatsApp Message
          </h4>
          {!editMsg && (
            <button 
              className="btn" 
              style={{ borderColor: '#f59e0b', color: '#b45309', padding: '4px 12px', fontSize: '0.85em' }}
              onClick={() => setEditMsg(true)}
            >
              Modify
            </button>
          )}
        </div>
 
        {editMsg ? (
          <>
            <textarea
              className="input"
              style={{ 
                minHeight: '80px', 
                borderColor: '#f59e0b', 
                background: 'white',
                fontSize: '0.95em',
                lineHeight: '1.4'
              }}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <div className="row" style={{ justifyContent: 'flex-end', gap: '8px' }}>
              <button className="btn" style={{ padding: '5px 10px', fontSize: '0.8em' }} onClick={() => setEditMsg(false)}>Cancel</button>
              <button 
                className="btn primary" 
                style={{ background: '#f59e0b', borderColor: '#f59e0b', padding: '5px 12px', fontSize: '0.8em' }}
                onClick={async () => {
                   await onSave();
                   setEditMsg(false);
                }}
                disabled={busy}
              >
                {busy ? "Saving..." : "Save"}
              </button>
            </div>
          </>
        ) : (
          <div style={{ padding: '12px', background: 'rgba(255,255,255,0.6)', borderRadius: '12px', fontStyle: 'italic', color: '#4b5563', fontSize: '0.92em' }}>
            "{message}"
          </div>
        )}
      </div>
 
      {/* 2. Link Box */}
      <div 
        className="card"
        style={{
          background: "rgba(37, 211, 102, 0.05)",
          padding: "20px",
          borderRadius: "20px",
          border: "1px solid rgba(37, 211, 102, 0.2)",
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h4 style={{ margin: 0, color: '#166534', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🔗</span> WhatsApp Group Link
          </h4>
          {!editLink && (
            <div className="row" style={{ gap: '6px' }}>
              {whatsappLink && (
                <button 
                  className="btn" 
                  style={{ borderColor: '#22c55e', color: '#166534', padding: '4px 10px', fontSize: '0.8em' }}
                  onClick={() => window.open(whatsappLink, "_blank")}
                >
                  Visit
                </button>
              )}
              <button 
                className="btn" 
                style={{ borderColor: '#22c55e', color: '#166534', padding: '4px 12px', fontSize: '0.85em' }}
                onClick={() => setEditLink(true)}
              >
                {whatsappLink ? "Modify" : "Add"}
              </button>
            </div>
          )}
        </div>
 
        {editLink ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input
              className="input"
              style={{ 
                borderColor: isValidLink ? '#22c55e' : '#ef4444', 
                background: 'white',
                fontSize: '0.95em'
              }}
              value={whatsappLink}
              onChange={(e) => setWhatsappLink(e.target.value)}
              placeholder="https://chat.whatsapp.com/..."
            />
            {!isValidLink && <span style={{ color: '#ef4444', fontSize: '0.75em', fontWeight: 'bold' }}>invalid link</span>}
            
            <div className="row" style={{ justifyContent: 'flex-end', gap: '8px' }}>
              <button className="btn" style={{ padding: '5px 10px', fontSize: '0.8em' }} onClick={() => setEditLink(false)}>Cancel</button>
              <button 
                className="btn primary" 
                style={{ background: '#22c55e', borderColor: '#22c55e', padding: '5px 12px', fontSize: '0.8em' }}
                onClick={async () => {
                  if (!isValidLink) return alert("Please enter a valid link.");
                  await onSave();
                  setEditLink(false);
                }}
                disabled={busy}
              >
                {busy ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.4)', borderRadius: '12px', fontSize: '0.85em', color: '#166534', wordBreak: 'break-all' }}>
            {whatsappLink || "No link provided"}
          </div>
        )}
      </div>
      
      {!editMsg && !editLink && (
        <p style={{ margin: 0, fontSize: '0.75em', textAlign: 'center', color: '#1e293b', fontWeight: 'bold' }}>
          ℹ️ The message is used for attendance; the link is for new student invites.
        </p>
      )}
    </div>
  );
}
