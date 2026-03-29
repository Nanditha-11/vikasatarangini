import React, { useState, useEffect } from 'react';

export function ModifyModal({ student, isOpen, onClose, onConfirm }) {
  const [qty, setQty] = useState(1);
  const [remark, setRemark] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isOpen && student) {
      setQty(student.quantity || 1);
      setRemark(student.remark || '');
    }
  }, [isOpen, student]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setBusy(true);
    try {
      await onConfirm({ qty, remark });
      onClose();
    } catch (err) {
      alert(err.message || "Failed to save changes");
    } finally {
      setBusy(false);
    }
  };

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
        background: 'rgba(255, 255, 255, 0.95)',
        padding: '30px',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '450px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
        border: '1px solid rgba(255,255,255,0.3)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h2 style={{ margin: 0, color: '#1e40af', fontSize: '1.5rem' }}>Modify Attendance</h2>
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '1.2em', cursor: 'pointer', color: '#64748b' }}
          >
            &times;
          </button>
        </div>
        
        <p style={{ margin: '0 0 20px 0', color: '#374151', fontSize: '0.95rem' }}>
          Modifying <strong>{student?.name || "Student"}</strong> (ID: {student?.slNo}).
        </p>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1e40af' }}>Only Quantity</label>
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
              readOnly
              onChange={(e) => setQty(parseInt(e.target.value) || 1)}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '12px',
                border: '1px solid #d1d5db',
                fontSize: '1.1rem',
                textAlign: 'center',
                outline: 'none',
                height: '48px',
                backgroundColor: 'white'
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
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1e40af' }}>Review</label>
          <textarea
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder="Write a review..."
            rows="3"
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '12px',
              border: '1px solid #d1d5db',
              fontSize: '1rem',
              outline: 'none',
              resize: 'none',
              fontFamily: 'inherit'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              disabled={busy}
              onClick={() => onConfirm({ qty, remark, skipWhatsApp: true })}
              style={{
                flex: 1,
                padding: '14px 10px',
                borderRadius: '12px',
                border: '1px solid #1e40af',
                background: 'white',
                color: '#1e40af',
                fontWeight: '700',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              Update Only
            </button>
            <button
              disabled={busy}
              onClick={() => onConfirm({ qty, remark, skipWhatsApp: false })}
              style={{
                flex: 1.5,
                padding: '14px 10px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
                color: 'white',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                fontSize: '0.9rem'
              }}
            >
              Update & WhatsApp
            </button>
          </div>
          <button
            disabled={busy}
            onClick={onClose}
            style={{
              width: '100%',
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
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        /* Remove arrows from number input */
        input::-webkit-outer-spin-button,
        input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type=number] {
          -moz-appearance: textfield;
        }
      `}</style>
    </div>
  );
}
