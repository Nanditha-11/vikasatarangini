import React from "react";
import { useSearchParams } from "react-router-dom";

export function PaymentPage() {
  const [searchParams] = useSearchParams();
  const am = searchParams.get("am") || "0";
  const pn = searchParams.get("pn") || "Pandu";
  const pa = searchParams.get("pa") || "9848218182-2@ybl";
  const tn = searchParams.get("tn") || "Medicine_Fee";
  const name = tn.split('_')[1] || "Student";

  const upiUri = `upi://pay?pa=${pa}&pn=${encodeURIComponent(pn)}&am=${am}&tn=${encodeURIComponent(tn)}`;
  
  // Public QR Code API
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiUri)}`;

  const handlePay = (appPrefix) => {
    let deepLink = "";
    const params = `pa=${pa}&pn=${encodeURIComponent(pn)}&am=${am}&tn=${encodeURIComponent(tn)}`;
    
    if (appPrefix === 'phonepe') {
      deepLink = `phonepe://pay?${params}`;
    } else if (appPrefix === 'googlepay') {
      deepLink = `googlepay://upi/pay?${params}`;
    } else if (appPrefix === 'paytmmp') {
      deepLink = `paytmmp://upi/pay?${params}`;
    } else {
      deepLink = `upi://pay?${params}`;
    }
    
    window.location.href = deepLink;
  };

  const copyUpi = () => {
    navigator.clipboard.writeText(pa);
    alert("UPI ID Copied: " + pa);
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#f8fafc', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      padding: '24px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ 
        background: 'white', 
        padding: '32px', 
        borderRadius: '24px', 
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '440px',
        textAlign: 'center',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ margin: '0', fontSize: '1.75rem', fontWeight: '800', color: '#1e293b' }}>
            Hi {name},
          </h1>
          <p style={{ marginTop: '8px', fontSize: '1rem', color: '#64748b' }}>
            Ready for your session payment
          </p>
        </div>

        <div style={{ 
          background: '#f1f5f9',
          padding: '24px 16px',
          borderRadius: '16px',
          margin: '24px 0'
        }}>
          <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Amount Due
          </div>
          <div style={{ fontSize: '3rem', fontWeight: '900', color: '#0f172a', marginTop: '4px' }}>
            ₹{am}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', margin: '32px 0' }}>
          <button 
            onClick={() => handlePay('phonepe')}
            style={{ 
              background: '#5f259f', color: 'white', border: 'none', padding: '16px', borderRadius: '12px', 
              fontSize: '1.1rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}
          >
            <span>🟣</span> Pay with PhonePe
          </button>
          <button 
            onClick={() => handlePay('googlepay')}
            style={{ 
              background: '#4285f4', color: 'white', border: 'none', padding: '16px', borderRadius: '12px', 
              fontSize: '1.1rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}
          >
            <span>🔵</span> Pay with Google Pay
          </button>
          <button 
            onClick={() => handlePay('paytmmp')}
            style={{ 
              background: '#00baf2', color: 'white', border: 'none', padding: '16px', borderRadius: '12px', 
              fontSize: '1.1rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}
          >
            <span>🔵</span> Pay with Paytm
          </button>
          <button 
            onClick={() => handlePay('')}
            style={{ 
              background: '#334155', color: 'white', border: 'none', padding: '16px', borderRadius: '12px', 
              fontSize: '1.1rem', fontWeight: '700', cursor: 'pointer'
            }}
          >
            Other UPI Apps
          </button>
        </div>

        <div style={{ margin: '40px 0', borderTop: '2px dashed #e2e8f0', paddingTop: '32px' }}>
          <div style={{ marginBottom: '16px', fontWeight: '700', color: '#475569' }}>
            Or Scan This QR Code
          </div>
          <div style={{ display: 'inline-block', padding: '12px', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <img src={qrUrl} alt="Scanner" style={{ width: '200px', height: '200px', display: 'block' }} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '24px' }}>
          <button 
            onClick={copyUpi}
            style={{ 
              background: 'transparent', color: '#64748b', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '8px', 
              fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer'
            }}
          >
            Copy UPI ID: {pa}
          </button>
        </div>

        <div style={{ marginTop: '40px', color: '#94a3b8', fontSize: '0.875rem', fontStyle: 'italic' }}>
          Jai Srimannarayana! Thank you.
        </div>
      </div>
    </div>
  );
}
