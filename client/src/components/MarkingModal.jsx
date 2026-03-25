import React, { useState, useEffect } from 'react';

export function MarkingModal({ student, isOpen, onClose, onConfirm }) {
  const [qty, setQty] = useState(1);
  const [payment, setPayment] = useState('Cash');

  useEffect(() => {
    if (isOpen) {
      setQty(1);
      setPayment('Cash');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.9)',
        padding: '30px',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
        border: '1px solid rgba(255,255,255,0.3)'
      }}>
        <h2 style={{ margin: '0 0 10px 0', color: '#064e3b', fontSize: '1.5rem' }}>Mark Attendance</h2>
        <p style={{ margin: '0 0 20px 0', color: '#374151', fontSize: '1rem' }}>
          Marking <strong>{student?.name || "Student"}</strong> as present.
        </p>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#064e3b' }}>Quantity</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button 
              onClick={() => setQty(prev => Math.max(1, prev - 1))}
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                border: '1px solid #d1d5db',
                background: '#f9fafb',
                fontSize: '1.5rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#374151'
              }}
            >-</button>
            <input
              type="number"
              min="1"
              value={qty}
              onChange={(e) => setQty(parseInt(e.target.value) || 1)}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '12px',
                border: '1px solid #d1d5db',
                fontSize: '1.1rem',
                textAlign: 'center',
                outline: 'none',
                height: '48px'
              }}
            />
            <button 
               onClick={() => setQty(prev => prev + 1)}
               style={{
                 width: '48px',
                 height: '48px',
                 borderRadius: '12px',
                 border: '1px solid #d1d5db',
                 background: '#f9fafb',
                 fontSize: '1.5rem',
                 cursor: 'pointer',
                 display: 'flex',
                 alignItems: 'center',
                 justifyContent: 'center',
                 color: '#374151'
               }}
            >+</button>
          </div>
        </div>

        <div style={{ marginBottom: '30px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#064e3b' }}>Payment Method</label>
          <select
            value={payment}
            onChange={(e) => setPayment(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '12px',
              border: '1px solid #d1d5db',
              fontSize: '1rem',
              background: 'white',
              outline: 'none'
            }}
          >
            <option value="Cash">Cash</option>
            <option value="Online">Online</option>
            <option value="Free">Free</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '12px',
              border: '1px solid #d1d5db',
              background: '#f3f4f6',
              color: '#374151',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm({ qty, payment })}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              color: 'white',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
            }}
          >
            OK & Send WhatsApp
          </button>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
