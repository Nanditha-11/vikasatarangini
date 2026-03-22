import { useState } from "react";

export function WhatsAppEditor({ message, setMessage, onSave, busy }) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div 
      style={{
        background: "rgba(255, 193, 7, 0.05)",
        padding: "20px",
        borderRadius: "20px",
        marginBottom: "24px",
        border: "1px solid rgba(255, 193, 7, 0.2)",
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}
    >
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h4 style={{ margin: 0, color: '#854d0e', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🔔</span> WhatsApp Notification Message
        </h4>
        <button 
          className="btn" 
          style={{ borderColor: '#f59e0b', color: '#b45309', padding: '4px 12px', fontSize: '0.85em' }}
          onClick={() => setIsEditing(!isEditing)}
        >
          {isEditing ? "Cancel Edit" : "Modify Message"}
        </button>
      </div>

      {isEditing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <textarea
            className="input"
            style={{ 
              minHeight: '100px', 
              borderColor: '#f59e0b', 
              background: 'white',
              fontSize: '1em',
              lineHeight: '1.5'
            }}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <button 
            className="btn primary" 
            style={{ background: '#f59e0b', borderColor: '#f59e0b', alignSelf: 'flex-end' }}
            onClick={async () => {
              await onSave();
              setIsEditing(false);
            }}
            disabled={busy}
          >
            {busy ? "Saving..." : "Save Template"}
          </button>
        </div>
      ) : (
        <div style={{ padding: '12px', background: 'rgba(255,255,255,0.6)', borderRadius: '12px', fontStyle: 'italic', color: '#4b5563' }}>
          "{message}"
        </div>
      )}
      <p className="muted" style={{ margin: 0, fontSize: '0.8em' }}>
        This message will be sent automatically when you mark a student as present.
      </p>
    </div>
  );
}
