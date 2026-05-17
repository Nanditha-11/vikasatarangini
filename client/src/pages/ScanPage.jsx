import React, { useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";

export function ScanPage() {
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  const handleScan = (result) => {
    if (!result) return;
    
    let scannedText = "";
    if (Array.isArray(result) && result.length > 0) {
      scannedText = result[0].rawValue || result[0].text || String(result[0]);
    } else if (typeof result === "object" && result.text) {
      scannedText = result.text;
    } else if (typeof result === "string") {
      scannedText = result;
    }

    if (!scannedText) return;
    console.log("Scanned:", scannedText);
      
    const slNoRaw = String(scannedText).trim();
      
      try {
        if (slNoRaw.startsWith("http")) {
          const url = new URL(slNoRaw);
          const markParam = url.searchParams.get("mark");
          const studentIdParam = url.searchParams.get("studentId"); // Support old QR codes
          
          if (markParam) {
            navigate(`/?mark=${markParam}`);
          } else if (studentIdParam) {
            navigate(`/?mark=${studentIdParam}`);
          } else {
            setError(`Invalid QR URL: No student ID found.`);
          }
        } else if (/^\d+$/.test(slNoRaw)) {
          navigate(`/?mark=${slNoRaw}`);
        } else {
          setError(`Invalid QR Code format.`);
        }
      } catch (err) {
        setError(`Failed to parse QR Code.`);
      }
  };

  return (
    <Layout title="QR Scanner">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '24px' }}>
        <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '30px', textAlign: 'center' }}>
          <h2 style={{ color: '#0f172a', marginBottom: '8px' }}>📷 Scan Student QR</h2>
          <p style={{ color: '#64748b', marginBottom: '24px' }}>
            Point your camera at a student's QR code to open their payment page and mark attendance.
          </p>

          <div style={{ 
            borderRadius: '24px', 
            overflow: 'hidden', 
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)',
            border: '4px solid #f1f5f9'
          }}>
            <Scanner
              onScan={handleScan}
              onError={(err) => setError(err?.message || "Camera access denied. Please check your browser permissions.")}
              styles={{ container: { width: '100%', height: '100%' } }}
            />
          </div>

          {error && (
            <div style={{ marginTop: '20px', padding: '12px', background: '#fee2e2', color: '#b91c1c', borderRadius: '12px', fontWeight: 'bold' }}>
              {error}
            </div>
          )}

          <div style={{ marginTop: '24px' }}>
            <button 
              onClick={() => navigate("/")}
              className="btn"
              style={{ padding: '12px 24px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', fontWeight: '600' }}
            >
              ⬅ Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
