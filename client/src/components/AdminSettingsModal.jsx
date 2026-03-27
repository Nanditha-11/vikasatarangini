import React, { useState, useEffect } from "react";

export function AdminSettingsModal({ 
  isOpen, 
  onClose, 
  whatsappLink, 
  setWhatsappLink, 
  message, 
  setMessage, 
  onSave, 
  busy 
}) {
  const [error, setError] = useState("");
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ width: 'min(500px, 95vw)', textAlignment: 'left' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, color: '#0d2866', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>⚙️</span> Personal Settings
          </h3>
          <button 
            onClick={onClose} 
            style={{ background: 'none', border: 'none', fontSize: '1.5em', cursor: 'pointer', color: '#64748b' }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }}>
          <div className="field">
            <label style={{ color: '#0d2866', fontWeight: 'bold' }}>Default Welcome Message</label>
            <textarea
              className="input"
              style={{ 
                minHeight: '100px', 
                background: '#f8fafc',
                fontSize: '0.95em',
                lineHeight: '1.5'
              }}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter the default message sent to present students..."
            />
          </div>

          <div className="field">
            <label style={{ color: '#0d2866', fontWeight: 'bold' }}>WhatsApp Group Link</label>
            <input
              className="input"
              type="text"
              placeholder="https://chat.whatsapp.com/..."
              style={{ background: '#f8fafc' }}
              value={whatsappLink}
              onChange={(e) => setWhatsappLink(e.target.value)}
            />
            <p style={{ margin: '4px 0 0', fontSize: '0.8em', color: '#64748b' }}>
              Used to invite new students and included in automatic notifications.
            </p>
          </div>

          <div className="row" style={{ marginTop: '10px', gap: '15px' }}>
            <button 
              className="btn primary" 
              style={{ flex: 1, padding: '14px', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
              onClick={async () => {
                setError("");
                if (whatsappLink && !(/^https:\/\/(chat\.whatsapp\.com|wa\.me|api\.whatsapp\.com|www\.whatsapp\.com)\/.+/i.test(whatsappLink))) {
                  return setError("Invalid WhatsApp link format. Please use a valid group or contact link.");
                }
                const success = await onSave();
                if (success) onClose();
              }}
              disabled={busy}
            >
              {busy ? "Saving..." : "Save Changes"}
            </button>
            <button 
              className="btn" 
              style={{ flex: 1, padding: '14px', background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </button>
          </div>
          {error && <div style={{ color: '#ef4444', fontSize: '0.85em', marginTop: '12px', textAlign: 'center', fontWeight: 'bold' }}>⚠️ {error}</div>}
        </div>
      </div>
    </div>
  );
}
