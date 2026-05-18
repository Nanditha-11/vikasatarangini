import { useState, useEffect } from "react";
import { apiFetch } from "../lib/api";

export function WhatsAppEditor({ message, setMessage, whatsappLink, setWhatsappLink, onSave, busy }) {
  const [editMsg, setEditMsg] = useState(false);
  const [editLink, setEditLink] = useState(false);
  const [botPhone, setBotPhone] = useState(null);
  const [copied, setCopied] = useState(false);
  
  const isValidLink = !whatsappLink || whatsappLink.startsWith("http");

  useEffect(() => {
    apiFetch("/api/whatsapp/status")
      .then(data => {
        if (data && data.phone) {
          setBotPhone(data.phone);
        }
      })
      .catch(err => console.error("Failed to fetch WhatsApp bot phone:", err));
  }, []);

  const shareText = "Hi Vikasatarangini! I want to receive my child's attendance card and updates.";
  const shareableUrl = botPhone 
    ? `https://wa.me/${botPhone}?text=${encodeURIComponent(shareText)}` 
    : "";

  const handleCopy = () => {
    if (!shareableUrl) return;
    navigator.clipboard.writeText(shareableUrl)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => console.error("Failed to copy link:", err));
  };

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

      {/* 3. Shareable Bot Link Box */}
      <div 
        className="card"
        style={{
          background: "rgba(18, 140, 126, 0.05)",
          padding: "20px",
          borderRadius: "20px",
          border: "1px solid rgba(18, 140, 126, 0.2)",
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        <h4 style={{ margin: 0, color: '#0f5132', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>📲</span> Get Parents to Chat First
        </h4>
        <p style={{ margin: 0, fontSize: '0.85em', color: '#146c43', lineHeight: '1.4' }}>
          Share this special link with parents. When they click it, it opens a chat with you and pre-writes a message so they can activate automated updates in one tap!
        </p>
        {botPhone ? (
          <div 
            style={{ 
              display: 'flex', 
              gap: '8px', 
              alignItems: 'center', 
              background: 'white', 
              padding: '6px 12px', 
              borderRadius: '12px', 
              border: '1px solid rgba(18, 140, 126, 0.15)' 
            }}
          >
            <span style={{ fontSize: '0.82em', color: '#198754', flex: 1, wordBreak: 'break-all', fontFamily: 'monospace' }}>
              {shareableUrl}
            </span>
            <button 
              className="btn" 
              style={{ 
                borderColor: '#198754', 
                color: 'white', 
                background: copied ? '#146c43' : '#198754', 
                padding: '6px 14px', 
                fontSize: '0.82em',
                fontWeight: 'bold',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                border: 'none',
                whiteSpace: 'nowrap'
              }}
              onClick={handleCopy}
            >
              {copied ? "Copied! ✓" : "Copy Link"}
            </button>
          </div>
        ) : (
          <div style={{ padding: '8px 12px', background: 'rgba(255,193,7,0.1)', borderRadius: '12px', fontSize: '0.82em', color: '#854d0e', textAlign: 'center', fontWeight: 'bold' }}>
            ⚠️ Link will generate once WhatsApp is linked & active.
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
